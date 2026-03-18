import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { chunkContent } from "./chunking";
import { embedContent, embedText } from "./embedding";
import { addVectors } from "@/lib/storage/vectorStore";
import {
  insertDocument,
  updateDocument,
  insertChunk,
  updateNodeProperties,
} from "@/lib/storage/database";
import { buildGraphForDocument } from "./graphBuilder";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

export interface IngestResult {
  documentId: string;
  filename: string;
  chunkCount: number;
  status: "ready" | "error";
  error?: string;
  graph?: {
    nodesCreated: number;
    edgesCreated: number;
    insights: string[];
  };
}

interface PreparedDocumentInput {
  documentId?: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  chunks: Array<{
    content: string | Buffer;
    mimeType: string;
    preview: string;
    metadata?: Record<string, unknown>;
  }>;
  vaultId?: string;
  onProgress?: (step: string) => void;
  storedContent?: string | Buffer;
  fileExtension?: string;
  graphNodeProperties?: Record<string, unknown>;
}

/**
 * Generate metadata for a document using Gemini 3 Flash
 */
async function generateMetadata(
  contentPreview: string,
  additionalContext: string,
  filename: string,
  mimeType: string
): Promise<{ summary: string; tags: string[]; contentType: string; entities: string[] }> {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("No API key");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{
        role: "user",
        parts: [{
          text: `Analyze the following content and return a JSON object with these fields:
- "summary": a one-line description (max 100 chars)
- "tags": array of 3-5 topic tags (lowercase, no spaces, use hyphens)
- "contentType": one of: meeting, report, study-notes, business, personal, technical, legal, medical, creative, general
- "entities": array of key entities mentioned (people, organizations, dates, places)

Filename: ${filename}
MIME Type: ${mimeType}
Primary preview:
${contentPreview.substring(0, 2000)}

Additional context:
${additionalContext.substring(0, 4000)}

Return ONLY the JSON object, no markdown fencing.`
        }]
      }],
    });

    const text = response.text?.trim() || "";
    // Clean potential markdown fencing
    const cleaned = text.replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      summary: parsed.summary || filename,
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
      contentType: parsed.contentType || "general",
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    };
  } catch (error) {
    console.error("Metadata generation failed:", error);
    // Fallback if metadata generation fails
    return {
      summary: filename,
      tags: [],
      contentType: "general",
      entities: [],
    };
  }
}

function buildStoredFilename(documentId: string, originalName: string, fileExtension?: string): string {
  const ext = fileExtension || path.extname(originalName) || "";
  return `${documentId}${ext}`;
}

async function ingestPreparedDocument({
  documentId = uuidv4(),
  originalName,
  mimeType,
  fileSize,
  chunks,
  vaultId,
  onProgress,
  storedContent,
  fileExtension,
  graphNodeProperties,
}: PreparedDocumentInput): Promise<IngestResult> {
  const filename = buildStoredFilename(documentId, originalName, fileExtension);
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    if (storedContent !== undefined) {
      onProgress?.("Saving imported source...");
      if (typeof storedContent === "string") {
        fs.writeFileSync(filePath, storedContent, "utf-8");
      } else {
        fs.writeFileSync(filePath, storedContent);
      }
    }

    insertDocument({
      id: documentId,
      filename,
      originalName,
      mimeType,
      fileSize,
      contentType: "general",
      summary: "",
      tags: [],
      entities: [],
      chunkCount: 0,
      status: "processing",
      vault_id: vaultId || null,
    });

    if (vaultId) {
      updateNodeProperties(vaultId, {
        overview: "",
        overviewGeneratedAt: null,
        overviewNeedsRefresh: true,
      });
    }

    if (chunks.length === 0) {
      throw new Error("No content could be extracted from this source.");
    }

    onProgress?.("Generating metadata with AI...");
    const previewText = chunks[0]?.preview || originalName;
    const metadataContext = chunks
      .slice(0, 3)
      .map((chunk, index) => `Chunk ${index + 1}: ${chunk.preview}${chunk.metadata ? `\nMetadata: ${JSON.stringify(chunk.metadata)}` : ""}`)
      .join("\n\n");
    const metadata = await generateMetadata(previewText, metadataContext, originalName, mimeType);

    onProgress?.(`Embedding ${chunks.length} chunk(s) in parallel...`);
    const BATCH_SIZE = 5;
    const vectorDocs = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      onProgress?.(`Embedding chunk batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`);

      const batchResults = await Promise.all(batch.map(async (chunk, batchIdx) => {
        const index = i + batchIdx;
        const chunkId = `${documentId}_chunk_${index}`;
        let embedding;

        try {
          embedding = await embedContent(chunk.content, chunk.mimeType);
        } catch (error) {
          const fallbackText = typeof chunk.metadata?.fallbackText === "string" ? chunk.metadata.fallbackText : "";
          if (chunk.mimeType === "application/pdf" && fallbackText.trim().length > 0) {
            embedding = await embedText(fallbackText);
          } else {
            throw error;
          }
        }

        insertChunk({
          id: chunkId,
          documentId,
          chunkIndex: index,
          contentPreview: chunk.preview,
          mimeType: chunk.mimeType,
          metadata: {
            tags: metadata.tags,
            contentType: metadata.contentType,
            ...(chunk.metadata || {}),
          },
        });

        return {
          id: chunkId,
          embedding: embedding.values,
          metadata: {
            documentId,
            chunkIndex: index,
            filename: originalName,
            mimeType: chunk.mimeType,
            contentType: metadata.contentType,
            tags: metadata.tags.join(","),
            preview: chunk.preview.substring(0, 500),
            vaultId: vaultId || "",
            ...(chunk.metadata || {}),
          },
          document: chunk.preview,
        };
      }));

      vectorDocs.push(...batchResults);
    }

    onProgress?.("Storing in vector database...");
    await addVectors(vectorDocs);

    onProgress?.("Building knowledge graph...");
    const chunkIds = chunks.map((_, index) => `${documentId}_chunk_${index}`);
    const chunkPreviews = chunks.map((chunk) => chunk.preview);
    const graphResult = await buildGraphForDocument(
      documentId,
      originalName,
      mimeType,
      metadata.summary,
      metadata.tags,
      metadata.entities,
      chunkIds,
      chunkPreviews,
      vaultId,
      onProgress,
      graphNodeProperties
    );

    updateDocument(documentId, {
      contentType: metadata.contentType,
      summary: metadata.summary,
      tags: metadata.tags,
      entities: metadata.entities,
      chunkCount: chunks.length,
      status: "ready",
    });

    onProgress?.("Done!");
    return {
      documentId,
      filename: originalName,
      chunkCount: chunks.length,
      status: "ready",
      graph: {
        nodesCreated: 1 + graphResult.chunkNodeIds.length + graphResult.entityNodeIds.length,
        edgesCreated: graphResult.edgesCreated,
        insights: graphResult.insights,
      },
    };
  } catch (error) {
    console.error("Ingestion failed:", error);
    try {
      updateDocument(documentId, { status: "error" });
    } catch {
      // ignore
    }

    return {
      documentId,
      filename: originalName,
      chunkCount: 0,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Main ingestion pipeline
 * 1. Save file to disk
 * 2. Chunk content
 * 3. Generate metadata with AI
 * 4. Embed each chunk (PARALLEL)
 * 5. Store vectors + metadata
 */
export async function ingestFile(
  fileBuffer: Buffer,
  originalName: string,
  mimeType: string,
  vaultId?: string,
  onProgress?: (step: string) => void
): Promise<IngestResult> {
  const documentId = uuidv4();
  const ext = path.extname(originalName) || "";
  const filename = `${documentId}${ext}`;
  const filePath = path.join(UPLOADS_DIR, filename);

  try {
    // 1. Save file
    onProgress?.("Saving file...");
    fs.writeFileSync(filePath, fileBuffer);

    // 2. Chunk content
    onProgress?.("Analyzing content structure...");
    const contentForChunking =
      mimeType.startsWith("text/") || mimeType === "text/plain" || mimeType === "text/markdown"
        ? fileBuffer.toString("utf-8")
        : fileBuffer;
    const chunks = await chunkContent(contentForChunking, mimeType, originalName, filePath);
    return await ingestPreparedDocument({
      documentId,
      originalName,
      mimeType,
      fileSize: fileBuffer.length,
      chunks,
      vaultId,
      onProgress,
    });
  } catch (error) {
    console.error("Ingestion failed:", error);
    // Update document status to error
    try {
      updateDocument(documentId, { status: "error" });
    } catch { /* ignore */ }

    return {
      documentId,
      filename: originalName,
      chunkCount: 0,
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function ingestPreparedTextDocument(options: {
  originalName: string;
  mimeType: string;
  content: string;
  chunks: Array<{
    content: string | Buffer;
    mimeType: string;
    preview: string;
    metadata?: Record<string, unknown>;
  }>;
  vaultId?: string;
  onProgress?: (step: string) => void;
  fileExtension?: string;
  graphNodeProperties?: Record<string, unknown>;
}): Promise<IngestResult> {
  return ingestPreparedDocument({
    originalName: options.originalName,
    mimeType: options.mimeType,
    fileSize: Buffer.byteLength(options.content, "utf-8"),
    chunks: options.chunks,
    vaultId: options.vaultId,
    onProgress: options.onProgress,
    storedContent: options.content,
    fileExtension: options.fileExtension,
    graphNodeProperties: options.graphNodeProperties,
  });
}
