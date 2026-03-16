import { embedText } from "@/lib/ingestion/embedding";
import { queryVectors } from "@/lib/storage/vectorStore";
import {
  getDocument,
  getChunksByDocument,
  getChunk,
  listDocuments as dbListDocuments,
  getNeighbors,
  getNode,
  getNodesByType,
  getEdgesByType,
  findPath,
} from "@/lib/storage/database";
import { getProvider } from "./providers";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// ---- Tool Implementations ----

export async function searchKnowledgeBase(args: {
  query: string;
  contentType?: string;
  maxResults?: number;
  vaultId?: string;
}): Promise<Record<string, unknown>> {
  const { query, contentType, maxResults = 5, vaultId } = args;

  // Embed the query
  const embedding = await embedText(query, "RETRIEVAL_QUERY");

  // Build metadata filter
  const whereFilter: Record<string, unknown> = {};
  if (contentType) {
    whereFilter.contentType = contentType;
  }
  if (vaultId) {
    whereFilter.vaultId = vaultId;
  }

  // Search ChromaDB
  const results = await queryVectors(embedding.values, maxResults, whereFilter);

  return {
    results: results.map((r) => ({
      chunkId: r.id,
      documentId: r.metadata.documentId,
      filename: r.metadata.filename,
      contentType: r.metadata.contentType,
      chunkIndex: r.metadata.chunkIndex,
      preview: r.document || r.metadata.preview,
      relevanceScore: (1 - r.score).toFixed(3), // cosine distance to similarity
    })),
    totalResults: results.length,
    // Graph expansion: surface connected nodes for top results
    graphConnections: await getGraphExpansion(results.slice(0, 3)),
  };
}

/** Graph expansion on search results: find contradictions, references, etc. */
async function getGraphExpansion(
  results: Array<{ id: string; metadata: Record<string, string | number | boolean> }>
): Promise<Array<{ chunkId: string; connections: Array<{ nodeId: string; nodeLabel: string; edgeType: string; confidence: number; evidence: string }> }>> {
  const expanded = [];
  for (const r of results) {
    const neighbors = getNeighbors(r.id, undefined, 0.6);
    // Filter to interesting edge types (skip structural edges like contains/next_chunk)
    const interestingEdges = neighbors.filter(
      (n) => !['contains', 'next_chunk', 'belongs_to'].includes(n.edge.type)
    );
    if (interestingEdges.length > 0) {
      expanded.push({
        chunkId: r.id,
        connections: interestingEdges.slice(0, 5).map((n) => ({
          nodeId: n.node.id,
          nodeLabel: n.node.label,
          edgeType: n.edge.type,
          confidence: n.edge.confidence,
          evidence: n.edge.evidence,
        })),
      });
    }
  }
  return expanded;
}

export async function getDocumentContent(args: {
  documentId: string;
  chunkId?: string;
}): Promise<Record<string, unknown>> {
  const { documentId, chunkId } = args;

  if (chunkId) {
    const chunk = getChunk(chunkId);
    if (!chunk) return { error: "Chunk not found" };

    // Try to read actual content for text files
    const doc = getDocument(chunk.documentId);
    if (doc && (doc.mimeType.startsWith("text/") || doc.mimeType === "text/plain")) {
      const filePath = path.join(UPLOADS_DIR, doc.filename);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf-8");
        return {
          chunkId: chunk.id,
          documentId: chunk.documentId,
          content,
          preview: chunk.contentPreview,
          mimeType: chunk.mimeType,
        };
      }
    }

    return {
      chunkId: chunk.id,
      documentId: chunk.documentId,
      preview: chunk.contentPreview,
      mimeType: chunk.mimeType,
      metadata: chunk.metadata,
    };
  }

  const doc = getDocument(documentId);
  if (!doc) return { error: "Document not found" };

  const chunks = getChunksByDocument(documentId);

  // For text documents, read the actual content
  let fullContent: string | undefined;
  if (doc.mimeType.startsWith("text/") || doc.mimeType === "text/plain") {
    const filePath = path.join(UPLOADS_DIR, doc.filename);
    if (fs.existsSync(filePath)) {
      fullContent = fs.readFileSync(filePath, "utf-8");
    }
  }

  return {
    documentId: doc.id,
    filename: doc.originalName,
    mimeType: doc.mimeType,
    contentType: doc.contentType,
    summary: doc.summary,
    tags: doc.tags,
    entities: doc.entities,
    chunkCount: doc.chunkCount,
    content: fullContent,
    chunks: chunks.map((c) => ({
      id: c.id,
      index: c.chunkIndex,
      preview: c.contentPreview,
    })),
  };
}

export async function analyzeContent(args: {
  content: string;
  analysisType: string;
}): Promise<Record<string, unknown>> {
  const { content, analysisType } = args;
  const provider = getProvider();

  const prompt = `Perform a ${analysisType} analysis on the following content and return the results in a structured format:

Content:
${content.substring(0, 4000)}

Analysis type: ${analysisType}
Return the analysis as a JSON object.`;

  const response = await provider.generateContent(
    [{ role: "user", content: prompt }],
    "You are an expert content analyst. Return structured JSON analysis results.",
    []
  );

  try {
    const cleaned = (response.text || "").replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { analysis: response.text, type: analysisType };
  }
}

export async function compareDocuments(args: {
  documentIds: string[];
  comparisonType: string;
}): Promise<Record<string, unknown>> {
  const { documentIds, comparisonType } = args;

  // Gather content from all documents
  const docContents: Array<{ id: string; name: string; content: string }> = [];
  for (const docId of documentIds) {
    const result = await getDocumentContent({ documentId: docId });
    docContents.push({
      id: docId,
      name: (result.filename as string) || docId,
      content: ((result.content as string) || (result.summary as string) || "").substring(0, 3000),
    });
  }

  const provider = getProvider();
  const prompt = `Compare the following documents and identify ${comparisonType}:

${docContents.map((d, i) => `--- Document ${i + 1}: ${d.name} ---\n${d.content}`).join("\n\n")}

Comparison type: ${comparisonType}
Return a structured JSON comparison.`;

  const response = await provider.generateContent(
    [{ role: "user", content: prompt }],
    "You are an expert document analyst. Compare the provided documents and return structured JSON results.",
    []
  );

  try {
    const cleaned = (response.text || "").replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { comparison: response.text, type: comparisonType };
  }
}

export async function extractStructuredData(args: {
  documentId: string;
  extractionType: string;
}): Promise<Record<string, unknown>> {
  const docResult = await getDocumentContent({ documentId: args.documentId });
  const content = (docResult.content as string) || (docResult.summary as string) || "";

  const provider = getProvider();
  const prompt = `Extract ${args.extractionType} from the following document:

${content.substring(0, 4000)}

Extraction type: ${args.extractionType}
Return the extracted data as a structured JSON object.`;

  const response = await provider.generateContent(
    [{ role: "user", content: prompt }],
    "You are a data extraction specialist. Extract the requested information and return structured JSON.",
    []
  );

  try {
    const cleaned = (response.text || "").replace(/^```json?\n?/i, "").replace(/\n?```$/i, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return { extracted: response.text, type: args.extractionType };
  }
}

export async function summarizeDocument(args: {
  documentId: string;
  level: string;
}): Promise<Record<string, unknown>> {
  const docResult = await getDocumentContent({ documentId: args.documentId });
  const content = (docResult.content as string) || (docResult.summary as string) || "";

  const provider = getProvider();
  const levelInstructions: Record<string, string> = {
    brief: "Provide a 2-3 sentence summary.",
    detailed: "Provide a comprehensive summary covering all key points, organized by topic.",
    executive: "Provide an executive summary with key findings, recommendations, and action items.",
  };

  const prompt = `Summarize the following document at the ${args.level} level:

${levelInstructions[args.level] || levelInstructions.detailed}

Document: ${(docResult.filename as string) || "Unknown"}
Content:
${content.substring(0, 6000)}`;

  const response = await provider.generateContent(
    [{ role: "user", content: prompt }],
    "You are an expert summarizer. Provide clear, accurate summaries.",
    []
  );

  return {
    documentId: args.documentId,
    filename: docResult.filename,
    level: args.level,
    summary: response.text,
  };
}

export async function listDocumentsToolFn(args: {
  contentType?: string;
  vaultId?: string;
}): Promise<Record<string, unknown>> {
  const docs = dbListDocuments({ vaultId: args.vaultId });
  const filteredDocs = args.contentType 
    ? docs.filter(d => d.contentType === args.contentType && d.status === "ready")
    : docs.filter(d => d.status === "ready");

  return {
    documents: filteredDocs.map((d) => ({
      id: d.id,
      filename: d.originalName,
      mimeType: d.mimeType,
      contentType: d.contentType,
      summary: d.summary,
      tags: d.tags,
      chunkCount: d.chunkCount,
      uploadedAt: d.uploadedAt,
    })),
    totalCount: filteredDocs.length,
  };
}

// ---- Graph Tool Implementations ----

export async function traverseEdges(args: {
  nodeId: string;
  edgeType?: string;
  minConfidence?: number;
}): Promise<Record<string, unknown>> {
  const { nodeId, edgeType, minConfidence = 0.6 } = args;

  const node = getNode(nodeId);
  if (!node) return { error: `Node not found: ${nodeId}` };

  const neighbors = getNeighbors(nodeId, edgeType, minConfidence);

  return {
    sourceNode: {
      id: node.id,
      type: node.type,
      label: node.label,
    },
    connections: neighbors.map((n) => ({
      node: {
        id: n.node.id,
        type: n.node.type,
        label: n.node.label,
        summary: n.node.properties?.summary || n.node.properties?.preview || "",
      },
      edge: {
        type: n.edge.type,
        confidence: n.edge.confidence,
        evidence: n.edge.evidence,
        method: n.edge.method,
      },
    })),
    totalConnections: neighbors.length,
  };
}

export async function findConnectionsFn(args: {
  sourceId: string;
  targetId: string;
  maxDepth?: number;
}): Promise<Record<string, unknown>> {
  const { sourceId, targetId, maxDepth = 4 } = args;

  const sourceNode = getNode(sourceId);
  const targetNode = getNode(targetId);
  if (!sourceNode) return { error: `Source node not found: ${sourceId}` };
  if (!targetNode) return { error: `Target node not found: ${targetId}` };

  const path = findPath(sourceId, targetId, maxDepth);

  if (path.length === 0) {
    return {
      connected: false,
      message: `No connection found between "${sourceNode.label}" and "${targetNode.label}" within ${maxDepth} hops`,
    };
  }

  // Enrich path with node labels
  const enrichedPath = path.map((step) => {
    const node = getNode(step.node_id);
    return {
      nodeId: step.node_id,
      nodeLabel: node?.label || step.node_id,
      nodeType: node?.type || "unknown",
      edge: step.edge
        ? {
            type: step.edge.type,
            confidence: step.edge.confidence,
            evidence: step.edge.evidence,
          }
        : null,
    };
  });

  return {
    connected: true,
    hops: path.length - 1,
    path: enrichedPath,
  };
}

export async function getEntityNetwork(args: {
  entityName: string;
  vaultId?: string;
}): Promise<Record<string, unknown>> {
  const { entityName, vaultId } = args;
  const normalizedSearch = entityName.toLowerCase().trim();

  // Find matching entity nodes (fuzzy), constrained by vault
  const entityNodes = getNodesByType("entity", vaultId);
  const matches = entityNodes.filter((n) => {
    const normalizedLabel = n.label.toLowerCase().trim();
    return (
      normalizedLabel.includes(normalizedSearch) ||
      normalizedSearch.includes(normalizedLabel)
    );
  });

  if (matches.length === 0) {
    return {
      found: false,
      message: `No entity matching "${entityName}" found in the knowledge graph`,
      suggestion: "Try using traverse_edges or search_knowledge_base instead",
    };
  }

  // Get connected documents for each matching entity
  const networks = matches.map((entity) => {
    const neighbors = getNeighbors(entity.id, "co_mentions", 0.0);
    return {
      entity: entity.label,
      entityId: entity.id,
      connectedDocuments: neighbors.map((n) => ({
        id: n.node.id,
        label: n.node.label,
        type: n.node.type,
        summary: n.node.properties?.summary || "",
      })),
      documentCount: neighbors.length,
    };
  });

  return {
    found: true,
    entityMatches: matches.length,
    networks,
  };
}

export async function findContradictions(args: {
  scope?: string;
  vaultId?: string;
}): Promise<Record<string, unknown>> {
  const { scope = "all", vaultId } = args;

  let contradictionEdges;
  if (scope === "all") {
    contradictionEdges = getEdgesByType("contradicts", 0.0, vaultId);
  } else {
    // scope is a document ID — get contradictions for that doc
    const neighbors = getNeighbors(scope, "contradicts", 0.0);
    contradictionEdges = neighbors.map((n) => n.edge);
  }

  if (contradictionEdges.length === 0) {
    return {
      found: false,
      message: "No contradictions detected in the knowledge base",
    };
  }

  const contradictions = contradictionEdges.map((edge) => {
    const sourceNode = getNode(edge.source_id);
    const targetNode = getNode(edge.target_id);
    return {
      source: {
        id: edge.source_id,
        label: sourceNode?.label || edge.source_id,
        type: sourceNode?.type || "unknown",
      },
      target: {
        id: edge.target_id,
        label: targetNode?.label || edge.target_id,
        type: targetNode?.type || "unknown",
      },
      confidence: edge.confidence,
      evidence: edge.evidence,
      method: edge.method,
    };
  });

  return {
    found: true,
    totalContradictions: contradictions.length,
    contradictions,
  };
}

// ---- Tool Executor ----

const toolMap: Record<string, (args: Record<string, unknown>) => Promise<Record<string, unknown>>> = {
  search_knowledge_base: searchKnowledgeBase as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  get_document_content: getDocumentContent as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  analyze_content: analyzeContent as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  compare_documents: compareDocuments as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  extract_structured_data: extractStructuredData as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  summarize_document: summarizeDocument as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  list_documents: listDocumentsToolFn as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  traverse_edges: traverseEdges as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  find_connections: findConnectionsFn as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  get_entity_network: getEntityNetwork as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
  find_contradictions: findContradictions as unknown as (args: Record<string, unknown>) => Promise<Record<string, unknown>>,
};

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const fn = toolMap[name];
  if (!fn) {
    return { error: `Unknown tool: ${name}` };
  }
  try {
    return await fn(args);
  } catch (error) {
    return {
      error: `Tool ${name} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}
