import { ChromaClient, Collection } from "chromadb";

const COLLECTION_NAME = "evidence_os";

let client: ChromaClient | null = null;
let collection: Collection | null = null;

function getClient(): ChromaClient {
  if (!client) {
    client = new ChromaClient({
      path: process.env.CHROMA_URL || "http://localhost:8000",
    });
  }
  return client;
}

export async function getCollection(): Promise<Collection> {
  if (!collection) {
    const chromaClient = getClient();
    collection = await chromaClient.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: { "hnsw:space": "cosine" },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      embeddingFunction: { generate: () => [] } as any,
    });
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
