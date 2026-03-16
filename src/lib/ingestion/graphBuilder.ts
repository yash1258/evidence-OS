import { v4 as uuidv4 } from "uuid";
import {
  insertNode,
  insertEdge,
  getNodesByType,
  updateNodeNeighbors,
  type GraphNode,
} from "@/lib/storage/database";
import { queryVectors } from "@/lib/storage/vectorStore";
import { embedText } from "./embedding";

// ---- Types ----

export interface GraphBuildResult {
  nodeId: string;
  chunkNodeIds: string[];
  entityNodeIds: string[];
  edgesCreated: number;
  insights: string[]; // Proactive alerts (contradictions, etc.)
}

// ---- Tier 1: Structural Edges (Deterministic, Instant) ----

/**
 * Create the document node and chunk nodes with structural edges.
 * This is deterministic and always runs synchronously during ingest.
 */
export function buildStructuralGraph(
  documentId: string,
  originalName: string,
  mimeType: string,
  summary: string,
  tags: string[],
  entities: string[],
  chunkIds: string[],
  chunkPreviews: string[],
  vaultId?: string
): { docNodeId: string; chunkNodeIds: string[] } {
  // Determine node type from mime
  let nodeType: GraphNode["type"] = "document";
  if (mimeType.startsWith("audio/")) nodeType = "audio";
  else if (mimeType.startsWith("image/")) nodeType = "image";

  // 1. Create document node
  insertNode({
    id: documentId,
    type: nodeType,
    label: originalName,
    properties: { mimeType, summary, tags, entities, chunkCount: chunkIds.length },
    vault_id: vaultId || null,
    embedding_id: null,
  });

  // 2. Create vault membership edge if vault specified
  if (vaultId) {
    insertEdge({
      id: uuidv4(),
      source_id: documentId,
      target_id: vaultId,
      type: "belongs_to",
      weight: 1.0,
      confidence: 1.0,
      evidence: "",
      method: "structural",
      metadata: {},
    });
  }

  // 3. Create chunk nodes with contains + next_chunk edges
  const chunkNodeIds: string[] = [];
  for (let i = 0; i < chunkIds.length; i++) {
    const chunkNodeId = chunkIds[i];
    chunkNodeIds.push(chunkNodeId);

    insertNode({
      id: chunkNodeId,
      type: "chunk",
      label: `${originalName} #${i + 1}`,
      properties: {
        chunkIndex: i,
        preview: (chunkPreviews[i] || "").substring(0, 200),
        parentDocument: documentId,
      },
      vault_id: vaultId || null,
      embedding_id: chunkNodeId, // chunk ID = embedding ID in ChromaDB
    });

    // contains edge: doc → chunk
    insertEdge({
      id: uuidv4(),
      source_id: documentId,
      target_id: chunkNodeId,
      type: "contains",
      weight: 1.0,
      confidence: 1.0,
      evidence: "",
      method: "structural",
      metadata: { chunkIndex: i },
    });

    // next_chunk edge: sequential ordering
    if (i > 0) {
      insertEdge({
        id: uuidv4(),
        source_id: chunkNodeIds[i - 1],
        target_id: chunkNodeId,
        type: "next_chunk",
        weight: 1.0,
        confidence: 1.0,
        evidence: "",
        method: "structural",
        metadata: {},
      });
    }
  }

  return { docNodeId: documentId, chunkNodeIds };
}

// ---- Tier 2a: Entity Edges (Fast, string matching) ----

/**
 * Create entity nodes and co_mentions edges.
 * Links the new document to existing documents that share entities.
 */
export function buildEntityEdges(
  documentId: string,
  entities: string[],
  vaultId?: string
): string[] {
  const entityNodeIds: string[] = [];
  if (!entities || entities.length === 0) return entityNodeIds;

  for (const entityName of entities) {
    const normalizedName = entityName.toLowerCase().trim();
    if (!normalizedName) continue;

    const entityNodeId = `entity_${normalizedName.replace(/[^a-z0-9]/g, "_")}`;
    entityNodeIds.push(entityNodeId);

    // Create entity node (INSERT OR IGNORE — may already exist)
    insertNode({
      id: entityNodeId,
      type: "entity",
      label: entityName,
      properties: { normalizedName },
      vault_id: vaultId || null,
      embedding_id: null,
    });

    // Create co_mentions edge: document → entity
    insertEdge({
      id: uuidv4(),
      source_id: documentId,
      target_id: entityNodeId,
      type: "co_mentions",
      weight: 1.0,
      confidence: 1.0,
      evidence: `Entity "${entityName}" found in document`,
      method: "structural",
      metadata: {},
    });

    // Find other documents that also mention this entity
    // and create cross-document co_mentions edges
    const existingDocs = getNodesByType("document").concat(
      getNodesByType("audio"),
      getNodesByType("image")
    );
    for (const existingDoc of existingDocs) {
      if (existingDoc.id === documentId) continue;
      const existingEntities = (existingDoc.properties?.entities as string[]) || [];
      const match = existingEntities.some(
        (e) => (e as string).toLowerCase().trim() === normalizedName
      );
      if (match) {
        // Cross-document co_mentions edge
        insertEdge({
          id: uuidv4(),
          source_id: documentId,
          target_id: existingDoc.id,
          type: "co_mentions",
          weight: 0.8,
          confidence: 0.9,
          evidence: `Both documents mention "${entityName}"`,
          method: "semantic",
          metadata: { sharedEntity: entityName },
        });
      }
    }
  }

  return entityNodeIds;
}

// ---- Tier 2b: Semantic Similarity Edges (Computed) ----

/**
 * Find existing chunks that are highly similar to the new chunks.
 * Creates semantic_similar edges for cosine similarity >= threshold.
 */
export async function buildSemanticEdges(
  newChunkIds: string[],
  chunkPreviews: string[],
  documentId: string,
  threshold: number = 0.85
): Promise<number> {
  let edgesCreated = 0;

  for (let i = 0; i < newChunkIds.length; i++) {
    const preview = chunkPreviews[i];
    if (!preview || preview.length < 20) continue;

    try {
      // Embed the chunk preview as a query
      const embedding = await embedText(preview.substring(0, 500), "RETRIEVAL_QUERY");

      // Query ChromaDB for similar chunks, excluding same document
      const results = await queryVectors(embedding.values, 5, {
        documentId: { $ne: documentId },
      });

      for (const result of results) {
        const similarity = 1 - result.score; // cosine distance to similarity
        if (similarity >= threshold) {
          insertEdge({
            id: uuidv4(),
            source_id: newChunkIds[i],
            target_id: result.id,
            type: "semantic_similar",
            weight: similarity,
            confidence: similarity,
            evidence: `Cosine similarity: ${similarity.toFixed(3)}`,
            method: "semantic",
            metadata: { similarity: similarity.toFixed(3) },
          });
          edgesCreated++;
        }
      }
    } catch {
      // Skip on embedding errors — non-critical
      continue;
    }
  }

  return edgesCreated;
}

// ---- Tier 3: AI-Inferred Edges (Async, Background) ----

/**
 * Use Gemini to detect relational edges between the new document
 * and existing documents. Runs asynchronously after ingest completes.
 * Returns proactive insight alerts.
 */
export async function buildAIEdges(
  documentId: string,
  documentSummary: string,
  documentName: string
): Promise<{ edgesCreated: number; insights: string[] }> {
  const insights: string[] = [];
  let edgesCreated = 0;

  // Get summaries of existing documents for comparison
  const existingDocs = getNodesByType("document").concat(
    getNodesByType("audio"),
    getNodesByType("image")
  );
  const otherDocs = existingDocs.filter((d) => d.id !== documentId);

  if (otherDocs.length === 0) return { edgesCreated, insights };

  // Build context for AI analysis
  const docSummaries = otherDocs
    .slice(0, 20) // Limit to 20 docs for context window
    .map((d) => `[${d.id}] "${d.label}": ${(d.properties?.summary as string) || "No summary"}`)
    .join("\n");

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return { edgesCreated, insights };

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are a document relationship analyzer. Analyze the NEW document against the EXISTING documents and identify relationships.

NEW DOCUMENT:
Name: "${documentName}"
Summary: ${documentSummary}

EXISTING DOCUMENTS:
${docSummaries}

For each relationship found, return a JSON array of objects with these fields:
- "target_id": the ID of the related existing document (from brackets above)
- "type": one of "references", "contradicts", "amends", "supports"
- "confidence": 0.0 to 1.0
- "evidence": a brief explanation of WHY this relationship exists

Rules:
- Only report relationships you are confident about (confidence >= 0.6)
- "contradicts" = the documents contain conflicting information
- "references" = one document cites or directly mentions content from another
- "amends" = the new document updates or supersedes an existing one
- "supports" = the documents corroborate each other's claims

Return ONLY the JSON array, no markdown fencing. Return [] if no relationships found.`,
    });

    const text = response.text?.trim() || "[]";
    const cleaned = text
      .replace(/^```json?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();
    const relationships = JSON.parse(cleaned);

    if (Array.isArray(relationships)) {
      for (const rel of relationships) {
        if (!rel.target_id || !rel.type || !rel.confidence) continue;
        if (rel.confidence < 0.6) continue;

        // Verify target exists
        const targetNode = otherDocs.find((d) => d.id === rel.target_id);
        if (!targetNode) continue;

        insertEdge({
          id: uuidv4(),
          source_id: documentId,
          target_id: rel.target_id,
          type: rel.type,
          weight: rel.confidence,
          confidence: rel.confidence,
          evidence: rel.evidence || "",
          method: "ai_inferred",
          metadata: { model: "gemini-3-flash-preview" },
        });
        edgesCreated++;

        // Generate proactive insight for contradictions
        if (rel.type === "contradicts") {
          insights.push(
            `⚠️ Contradiction detected: "${documentName}" conflicts with "${targetNode.label}" — ${rel.evidence} (confidence: ${rel.confidence.toFixed(2)})`
          );
        }
        if (rel.type === "amends") {
          insights.push(
            `📝 "${documentName}" appears to update/amend "${targetNode.label}" — ${rel.evidence}`
          );
        }
      }
    }
  } catch (error) {
    console.error("AI edge detection failed:", error);
    // AI edge detection is non-critical — fail silently
  }

  return { edgesCreated, insights };
}

// ---- Orchestrator ----

/**
 * Full graph construction pipeline for a newly ingested document.
 * Called after vector storage is complete.
 *
 * Stage 1 (sync): Structural + Entity edges — instant
 * Stage 2 (sync): Semantic similarity edges — fast but needs embeddings
 * Stage 3 (async-safe): AI relationship edges — slower, non-blocking
 */
export async function buildGraphForDocument(
  documentId: string,
  originalName: string,
  mimeType: string,
  summary: string,
  tags: string[],
  entities: string[],
  chunkIds: string[],
  chunkPreviews: string[],
  vaultId?: string,
  onProgress?: (step: string) => void
): Promise<GraphBuildResult> {
  let totalEdges = 0;
  const allInsights: string[] = [];

  // Stage 1: Structural graph (instant)
  onProgress?.("Building knowledge graph nodes...");
  const { docNodeId, chunkNodeIds } = buildStructuralGraph(
    documentId,
    originalName,
    mimeType,
    summary,
    tags,
    entities,
    chunkIds,
    chunkPreviews,
    vaultId
  );
  // Count structural edges: contains + next_chunk + belongs_to
  totalEdges += chunkIds.length + Math.max(0, chunkIds.length - 1) + (vaultId ? 1 : 0);

  // Stage 2a: Entity edges (fast)
  onProgress?.("Linking shared entities across documents...");
  const entityNodeIds = buildEntityEdges(documentId, entities, vaultId);
  totalEdges += entityNodeIds.length; // co_mentions edges to entities

  // Stage 2b: Semantic similarity edges (needs embedding calls)
  onProgress?.("Detecting semantic connections...");
  const semanticEdges = await buildSemanticEdges(
    chunkNodeIds,
    chunkPreviews,
    documentId
  );
  totalEdges += semanticEdges;

  // Stage 3: AI relationship edges (slower, but still runs in ingest for now)
  onProgress?.("Analyzing document relationships...");
  const { edgesCreated: aiEdges, insights } = await buildAIEdges(
    documentId,
    summary,
    originalName
  );
  totalEdges += aiEdges;
  allInsights.push(...insights);

  // Update materialized neighbor lists for affected nodes
  onProgress?.("Updating graph topology...");
  updateNodeNeighbors(docNodeId);
  for (const cid of chunkNodeIds) {
    updateNodeNeighbors(cid);
  }

  return {
    nodeId: docNodeId,
    chunkNodeIds,
    entityNodeIds,
    edgesCreated: totalEdges,
    insights: allInsights,
  };
}
