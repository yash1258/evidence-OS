import { ChromaClient, Collection } from "chromadb";

const COLLECTION_NAME = "evidence_os";
const DEFAULT_CHROMA_URL = "http://localhost:8000";

let client: ChromaClient | null = null;
let collection: Collection | null = null;

function getChromaUrl(): string {
  return process.env.CHROMA_URL || DEFAULT_CHROMA_URL;
}

function getChromaConnectionConfig(): { host: string; port: number; ssl: boolean } {
  const rawUrl = getChromaUrl();

  try {
    const url = new URL(rawUrl);
    return {
      host: url.hostname,
      port: Number(url.port || (url.protocol === "https:" ? 443 : 80)),
      ssl: url.protocol === "https:",
    };
  } catch {
    throw new Error(`Invalid CHROMA_URL: ${rawUrl}`);
  }
}

function formatChromaTarget(): string {
  const { host, port, ssl } = getChromaConnectionConfig();
  return `${ssl ? "https" : "http"}://${host}:${port}`;
}

function getClient(): ChromaClient {
  if (!client) {
    const config = getChromaConnectionConfig();
    client = new ChromaClient(config);
  }
  return client;
}

export async function getCollection(): Promise<Collection> {
  if (!collection) {
    const chromaClient = getClient();
    try {
      collection = await chromaClient.getOrCreateCollection({
        name: COLLECTION_NAME,
        metadata: { "hnsw:space": "cosine" },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        embeddingFunction: { generate: () => [] } as any,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown Chroma error";
      throw new Error(`Chroma is unavailable at ${formatChromaTarget()}. Start the server or update CHROMA_URL. ${detail}`);
    }
  }
  return collection;
}

export interface VectorDocument {
  id: string;
  embedding: number[];
  metadata: Record<string, string | number | boolean>;
  document?: string;
}

export async function addVectors(docs: VectorDocument[]): Promise<void> {
  const col = await getCollection();
  await col.add({
    ids: docs.map((d) => d.id),
    embeddings: docs.map((d) => d.embedding),
    metadatas: docs.map((d) => d.metadata),
    documents: docs.map((d) => d.document || ""),
  });
}

export interface QueryResult {
  id: string;
  score: number;
  metadata: Record<string, string | number | boolean>;
  document: string;
}

export async function queryVectors(
  embedding: number[],
  nResults: number = 5,
  whereFilter?: Record<string, unknown>
): Promise<QueryResult[]> {
  const col = await getCollection();

  const queryParams: {
    queryEmbeddings: number[][];
    nResults: number;
    where?: Record<string, unknown>;
  } = {
    queryEmbeddings: [embedding],
    nResults,
  };

  if (whereFilter && Object.keys(whereFilter).length > 0) {
    queryParams.where = whereFilter;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = await col.query(queryParams as any);

  if (!results.ids || !results.ids[0]) return [];

  return results.ids[0].map((id, i) => ({
    id,
    score: results.distances?.[0]?.[i] ?? 0,
    metadata: (results.metadatas?.[0]?.[i] ?? {}) as Record<string, string | number | boolean>,
    document: results.documents?.[0]?.[i] ?? "",
  }));
}

export async function deleteVectors(ids: string[]): Promise<void> {
  const col = await getCollection();
  await col.delete({ ids });
}

export async function deleteByDocumentId(documentId: string): Promise<void> {
  const col = await getCollection();
  await col.delete({
    where: { documentId },
  });
}

export async function getChromaHealth(): Promise<{ connected: boolean; target: string; error?: string }> {
  try {
    const chromaClient = getClient();
    await chromaClient.version();
    return {
      connected: true,
      target: formatChromaTarget(),
    };
  } catch (error) {
    return {
      connected: false,
      target: formatChromaTarget(),
      error: error instanceof Error ? error.message : "Unknown Chroma error",
    };
  }
}
