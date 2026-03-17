import { v4 as uuidv4 } from "uuid";
import path from "path";
import fs from "fs";
import { chunkContent } from "./chunking";
import { embedContent } from "./embedding";
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

/**
 * Generate metadata for a document using Gemini 3 Flash
 */
async function generateMetadata(
  contentPreview: string,
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
Content preview:
${contentPreview.substring(0, 2000)}

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

    // 2. Insert document record (processing state)
    insertDocument({
      id: documentId,
      filename,
      originalName,
      mimeType,
      fileSize: fileBuffer.length,
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

    // 3. Chunk content
    onProgress?.("Analyzing content structure...");
    const contentForChunking =
      mimeType.startsWith("text/") || mimeType === "text/plain" || mimeType === "text/markdown"
        ? fileBuffer.toString("utf-8")
        : fileBuffer;
    const chunks = chunkContent(contentForChunking, mimeType, originalName);

    if (chunks.length === 0) {
        throw new Error("No content could be extracted from this file.");
    }

    // 4. Generate AI metadata from first chunk preview
    onProgress?.("Generating metadata with AI...");
    const previewText = chunks[0]?.preview || originalName;
    const metadata = await generateMetadata(previewText, originalName, mimeType);

    // 5. Embed chunks in parallel batches
    onProgress?.(`Embedding ${chunks.length} chunk(s) in parallel...`);
    
    // Batch size for concurrency control
    const BATCH_SIZE = 5;
    const vectorDocs = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      onProgress?.(`Embedding chunk batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`);
      
      const batchResults = await Promise.all(batch.map(async (chunk, batchIdx) => {
        const index = i + batchIdx;
        const chunkId = `${documentId}_chunk_${index}`;
        
        // Embed the chunk
        const embedding = await embedContent(chunk.content, chunk.mimeType);
        
        // Store chunk record in SQLite
        insertChunk({
          id: chunkId,
          documentId,
          chunkIndex: index,
          contentPreview: chunk.preview,
          mimeType: chunk.mimeType,
          metadata: {
            tags: metadata.tags,
            contentType: metadata.contentType,
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
          },
          document: chunk.preview,
        };
      }));

      vectorDocs.push(...batchResults);
    }

    // 6. Batch add vectors to ChromaDB
    onProgress?.("Storing in vector database...");
    await addVectors(vectorDocs);

    // 7. Build knowledge graph
    onProgress?.("Building knowledge graph...");
    const chunkIds = chunks.map((_, i) => `${documentId}_chunk_${i}`);
    const chunkPreviews = chunks.map((c) => c.preview);
    const graphResult = await buildGraphForDocument(
      documentId,
      originalName,
      mimeType,
      metadata.summary,
      metadata.tags,
      metadata.entities,
      chunkIds,
      chunkPreviews,
      vaultId, // pass vaultId to graph builder
      onProgress
    );

    // 8. Update document with metadata
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
