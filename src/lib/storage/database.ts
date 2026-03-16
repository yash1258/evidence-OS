import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "evidence.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const fs = require("fs");
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vaults (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      contentType TEXT DEFAULT 'general',
      summary TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      entities TEXT DEFAULT '[]',
      chunkCount INTEGER DEFAULT 0,
      status TEXT DEFAULT 'processing',
      vault_id TEXT REFERENCES vaults(id) ON DELETE SET NULL,
      uploadedAt TEXT DEFAULT (datetime('now')),
      processedAt TEXT
    );

    CREATE TABLE IF NOT EXISTS chunks (
      id TEXT PRIMARY KEY,
      documentId TEXT NOT NULL,
      chunkIndex INTEGER NOT NULL,
      contentPreview TEXT DEFAULT '',
      mimeType TEXT NOT NULL,
      metadata TEXT DEFAULT '{}',
      FOREIGN KEY (documentId) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      title TEXT DEFAULT 'New Chat',
      createdAt TEXT DEFAULT (datetime('now')),
      updatedAt TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      sessionId TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      thinkingSteps TEXT DEFAULT '[]',
      sources TEXT DEFAULT '[]',
      createdAt TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (sessionId) REFERENCES chat_sessions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS graph_nodes (
      id           TEXT PRIMARY KEY,
      type         TEXT NOT NULL,
      label        TEXT NOT NULL,
      properties   TEXT DEFAULT '{}',
      vault_id     TEXT,
      embedding_id TEXT,
      neighbors    TEXT DEFAULT '[]',
      created_at   TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS graph_edges (
      id           TEXT PRIMARY KEY,
      source_id    TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
      target_id    TEXT NOT NULL REFERENCES graph_nodes(id) ON DELETE CASCADE,
      type         TEXT NOT NULL,
      weight       REAL DEFAULT 1.0,
      confidence   REAL DEFAULT 1.0,
      evidence     TEXT DEFAULT '',
      method       TEXT DEFAULT 'structural',
      metadata     TEXT DEFAULT '{}',
      created_at   TEXT DEFAULT (datetime('now')),
      UNIQUE(source_id, target_id, type)
    );

    CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks(documentId);
    CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(sessionId);
    CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
    CREATE INDEX IF NOT EXISTS idx_documents_contentType ON documents(contentType);
    CREATE INDEX IF NOT EXISTS idx_edges_source ON graph_edges(source_id, type);
    CREATE INDEX IF NOT EXISTS idx_edges_target ON graph_edges(target_id, type);
    CREATE INDEX IF NOT EXISTS idx_edges_type ON graph_edges(type, confidence);
    CREATE INDEX IF NOT EXISTS idx_nodes_type ON graph_nodes(type);
    CREATE INDEX IF NOT EXISTS idx_nodes_vault ON graph_nodes(vault_id);
  `);
}

// ---- Vault CRUD ----

export interface VaultRecord {
  id: string;
  name: string;
  created_at: string;
}

export function createVault(id: string, name: string): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO vaults (id, name)
    VALUES (?, ?)
  `).run(id, name);
}

export function listVaults(): VaultRecord[] {
  const db = getDb();
  return db.prepare("SELECT * FROM vaults ORDER BY created_at DESC").all() as VaultRecord[];
}

export function getVault(id: string): VaultRecord | undefined {
  const db = getDb();
  return db.prepare("SELECT * FROM vaults WHERE id = ?").get(id) as VaultRecord | undefined;
}

// ---- Document CRUD ----

export interface DocumentRecord {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  contentType: string;
  summary: string;
  tags: string[];
  entities: string[];
  chunkCount: number;
  status: string;
  vault_id: string | null;
  uploadedAt: string;
  processedAt: string | null;
}

export function insertDocument(doc: Omit<DocumentRecord, "uploadedAt" | "processedAt">) {
  const db = getDb();
  db.prepare(`
    INSERT INTO documents (id, filename, originalName, mimeType, fileSize, contentType, summary, tags, entities, chunkCount, status, vault_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    doc.id, doc.filename, doc.originalName, doc.mimeType, doc.fileSize,
    doc.contentType, doc.summary, JSON.stringify(doc.tags),
    JSON.stringify(doc.entities), doc.chunkCount, doc.status, doc.vault_id || null
  );
}

export function updateDocument(id: string, updates: Partial<Pick<DocumentRecord, "contentType" | "summary" | "tags" | "entities" | "chunkCount" | "status">>) {
  const db = getDb();
  const sets: string[] = [];
  const values: unknown[] = [];

  if (updates.contentType !== undefined) { sets.push("contentType = ?"); values.push(updates.contentType); }
  if (updates.summary !== undefined) { sets.push("summary = ?"); values.push(updates.summary); }
  if (updates.tags !== undefined) { sets.push("tags = ?"); values.push(JSON.stringify(updates.tags)); }
  if (updates.entities !== undefined) { sets.push("entities = ?"); values.push(JSON.stringify(updates.entities)); }
  if (updates.chunkCount !== undefined) { sets.push("chunkCount = ?"); values.push(updates.chunkCount); }
  if (updates.status !== undefined) {
    sets.push("status = ?"); values.push(updates.status);
    if (updates.status === "ready") {
      sets.push("processedAt = datetime('now')");
    }
  }

  if (sets.length === 0) return;
  values.push(id);
  db.prepare(`UPDATE documents SET ${sets.join(", ")} WHERE id = ?`).run(...values);
}

export function getDocument(id: string): DocumentRecord | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM documents WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    ...row,
    tags: JSON.parse(row.tags as string),
    entities: JSON.parse(row.entities as string),
  } as DocumentRecord;
}

export function listDocuments(filter?: { contentType?: string; status?: string; vaultId?: string }): DocumentRecord[] {
  const db = getDb();
  let query = "SELECT * FROM documents";
  const conditions: string[] = [];
  const values: unknown[] = [];

  if (filter?.contentType) { conditions.push("contentType = ?"); values.push(filter.contentType); }
  if (filter?.status) { conditions.push("status = ?"); values.push(filter.status); }
  if (filter?.vaultId) { conditions.push("vault_id = ?"); values.push(filter.vaultId); }

  if (conditions.length > 0) query += " WHERE " + conditions.join(" AND ");
  query += " ORDER BY uploadedAt DESC";

  const rows = db.prepare(query).all(...values) as Record<string, unknown>[];
  return rows.map(row => ({
    ...row,
    tags: JSON.parse(row.tags as string),
    entities: JSON.parse(row.entities as string),
  })) as DocumentRecord[];
}

export function deleteDocument(id: string) {
  const db = getDb();
  db.prepare("DELETE FROM documents WHERE id = ?").run(id);
}

// ---- Chunk CRUD ----

export interface ChunkRecord {
  id: string;
  documentId: string;
  chunkIndex: number;
  contentPreview: string;
  mimeType: string;
  metadata: Record<string, unknown>;
}

export function insertChunk(chunk: ChunkRecord) {
  const db = getDb();
  db.prepare(`
    INSERT INTO chunks (id, documentId, chunkIndex, contentPreview, mimeType, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(chunk.id, chunk.documentId, chunk.chunkIndex, chunk.contentPreview, chunk.mimeType, JSON.stringify(chunk.metadata));
}

export function getChunksByDocument(documentId: string): ChunkRecord[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM chunks WHERE documentId = ? ORDER BY chunkIndex").all(documentId) as Record<string, unknown>[];
  return rows.map(row => ({
    ...row,
    metadata: JSON.parse(row.metadata as string),
  })) as ChunkRecord[];
}

export function getChunk(id: string): ChunkRecord | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM chunks WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return { ...row, metadata: JSON.parse(row.metadata as string) } as ChunkRecord;
}

// ---- Chat CRUD ----

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface MessageRecord {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  thinkingSteps: unknown[];
  sources: unknown[];
  createdAt: string;
}

export function createChatSession(id: string, title?: string): ChatSession {
  const db = getDb();
  db.prepare("INSERT INTO chat_sessions (id, title) VALUES (?, ?)").run(id, title || "New Chat");
  return db.prepare("SELECT * FROM chat_sessions WHERE id = ?").get(id) as ChatSession;
}

export function listChatSessions(): ChatSession[] {
  const db = getDb();
  return db.prepare("SELECT * FROM chat_sessions ORDER BY updatedAt DESC").all() as ChatSession[];
}

export function insertMessage(msg: Omit<MessageRecord, "createdAt">) {
  const db = getDb();
  db.prepare(`
    INSERT INTO messages (id, sessionId, role, content, thinkingSteps, sources)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(msg.id, msg.sessionId, msg.role, msg.content, JSON.stringify(msg.thinkingSteps), JSON.stringify(msg.sources));
  db.prepare("UPDATE chat_sessions SET updatedAt = datetime('now') WHERE id = ?").run(msg.sessionId);
}

export function getMessages(sessionId: string): MessageRecord[] {
  const db = getDb();
  const rows = db.prepare("SELECT * FROM messages WHERE sessionId = ? ORDER BY createdAt ASC").all(sessionId) as Record<string, unknown>[];
  return rows.map(row => ({
    ...row,
    thinkingSteps: JSON.parse(row.thinkingSteps as string),
    sources: JSON.parse(row.sources as string),
  })) as MessageRecord[];
}

// ---- Graph Node CRUD ----

export interface GraphNode {
  id: string;
  type: 'vault' | 'document' | 'audio' | 'image' | 'chunk' | 'entity' | 'investigation';
  label: string;
  properties: Record<string, unknown>;
  vault_id: string | null;
  embedding_id: string | null;
  neighbors: string[];
  created_at: string;
}

export function insertNode(node: Omit<GraphNode, 'created_at' | 'neighbors'>): void {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO graph_nodes (id, type, label, properties, vault_id, embedding_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(node.id, node.type, node.label, JSON.stringify(node.properties), node.vault_id, node.embedding_id);
}

export function getNode(id: string): GraphNode | undefined {
  const db = getDb();
  const row = db.prepare("SELECT * FROM graph_nodes WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    ...row,
    properties: JSON.parse(row.properties as string),
    neighbors: JSON.parse(row.neighbors as string),
  } as GraphNode;
}

export function getNodesByType(type: string, vaultId?: string): GraphNode[] {
  const db = getDb();
  let query = "SELECT * FROM graph_nodes WHERE type = ?";
  const params: unknown[] = [type];
  if (vaultId) {
    query += " AND vault_id = ?";
    params.push(vaultId);
  }
  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  return rows.map(row => ({
    ...row,
    properties: JSON.parse(row.properties as string),
    neighbors: JSON.parse(row.neighbors as string),
  })) as GraphNode[];
}

export function deleteNode(id: string): void {
  const db = getDb();
  db.prepare("DELETE FROM graph_nodes WHERE id = ?").run(id);
}

export function updateNodeNeighbors(nodeId: string): void {
  const db = getDb();
  const edges = db.prepare(
    "SELECT target_id FROM graph_edges WHERE source_id = ? UNION SELECT source_id FROM graph_edges WHERE target_id = ?"
  ).all(nodeId, nodeId) as Array<{ target_id?: string; source_id?: string }>;
  const neighborIds = edges.map(e => e.target_id || e.source_id).filter(Boolean);
  db.prepare("UPDATE graph_nodes SET neighbors = ? WHERE id = ?").run(JSON.stringify(neighborIds), nodeId);
}

// ---- Graph Edge CRUD ----

export interface GraphEdge {
  id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight: number;
  confidence: number;
  evidence: string;
  method: 'structural' | 'semantic' | 'ai_inferred';
  metadata: Record<string, unknown>;
  created_at: string;
}

export function insertEdge(edge: Omit<GraphEdge, 'created_at'>): void {
  const db = getDb();
  db.prepare(`
    INSERT OR REPLACE INTO graph_edges (id, source_id, target_id, type, weight, confidence, evidence, method, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    edge.id, edge.source_id, edge.target_id, edge.type,
    edge.weight, edge.confidence, edge.evidence, edge.method,
    JSON.stringify(edge.metadata)
  );
}

export function getNeighbors(
  nodeId: string,
  edgeType?: string,
  minConfidence: number = 0.6
): Array<{ node: GraphNode; edge: GraphEdge }> {
  const db = getDb();
  let query = `
    SELECT e.*, n.*,
      e.id as edge_id, e.type as edge_type, e.metadata as edge_metadata, e.created_at as edge_created_at,
      n.id as node_id, n.type as node_type, n.properties as node_properties, n.created_at as node_created_at
    FROM graph_edges e
    JOIN graph_nodes n ON (
      (e.source_id = ? AND n.id = e.target_id) OR
      (e.target_id = ? AND n.id = e.source_id)
    )
    WHERE e.confidence >= ?
  `;
  const params: unknown[] = [nodeId, nodeId, minConfidence];

  if (edgeType) {
    query += " AND e.type = ?";
    params.push(edgeType);
  }
  query += " ORDER BY e.confidence DESC, e.weight DESC";

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => ({
    node: {
      id: row.node_id as string,
      type: row.node_type as string,
      label: row.label as string,
      properties: JSON.parse(row.properties as string),
      vault_id: row.vault_id as string | null,
      embedding_id: row.embedding_id as string | null,
      neighbors: JSON.parse(row.neighbors as string),
      created_at: row.node_created_at as string,
    } as GraphNode,
    edge: {
      id: row.edge_id as string,
      source_id: row.source_id as string,
      target_id: row.target_id as string,
      type: row.edge_type as string,
      weight: row.weight as number,
      confidence: row.confidence as number,
      evidence: row.evidence as string,
      method: row.method as 'structural' | 'semantic' | 'ai_inferred',
      metadata: JSON.parse(row.edge_metadata as string),
      created_at: row.edge_created_at as string,
    } as GraphEdge,
  }));
}

export function getEdgesByType(type: string, minConfidence: number = 0.6, vaultId?: string): GraphEdge[] {
  const db = getDb();
  let query = "SELECT * FROM graph_edges WHERE type = ? AND confidence >= ?";
  const params: unknown[] = [type, minConfidence];

  if (vaultId) {
    query = `
      SELECT e.*
      FROM graph_edges e
      JOIN graph_nodes n ON e.source_id = n.id
      WHERE e.type = ? AND e.confidence >= ? AND n.vault_id = ?
    `;
    params.push(vaultId);
  } else {
    query += " ORDER BY confidence DESC";
  }

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  return rows.map(row => ({
    ...row,
    metadata: JSON.parse(row.metadata as string),
  })) as GraphEdge[];
}

export function findPath(
  startId: string,
  endId: string,
  maxDepth: number = 4
): Array<{ node_id: string; edge: GraphEdge | null }> {
  const db = getDb();
  // BFS shortest path
  const visited = new Set<string>();
  const parent = new Map<string, { from: string; edge: GraphEdge | null }>();
  const queue: string[] = [startId];
  visited.add(startId);
  parent.set(startId, { from: '', edge: null });

  let depth = 0;
  while (queue.length > 0 && depth < maxDepth) {
    const levelSize = queue.length;
    for (let i = 0; i < levelSize; i++) {
      const current = queue.shift()!;
      if (current === endId) {
        // Reconstruct path
        const path: Array<{ node_id: string; edge: GraphEdge | null }> = [];
        let node = endId;
        while (node) {
          const p = parent.get(node)!;
          path.unshift({ node_id: node, edge: p.edge });
          node = p.from;
        }
        return path;
      }

      // Get neighbors
      const edges = db.prepare(
        "SELECT * FROM graph_edges WHERE (source_id = ? OR target_id = ?) AND confidence >= 0.6"
      ).all(current, current) as Record<string, unknown>[];

      for (const row of edges) {
        const neighborId = (row.source_id as string) === current
          ? (row.target_id as string)
          : (row.source_id as string);
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          parent.set(neighborId, {
            from: current,
            edge: { ...row, metadata: JSON.parse(row.metadata as string) } as GraphEdge,
          });
          queue.push(neighborId);
        }
      }
    }
    depth++;
  }

  return []; // No path found
}

export function getSubgraph(
  centerId: string,
  depth: number = 2,
  minConfidence: number = 0.6
): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const db = getDb();
  const visitedNodes = new Set<string>();
  const collectedEdges: GraphEdge[] = [];
  const queue: string[] = [centerId];
  visitedNodes.add(centerId);

  let currentDepth = 0;
  while (queue.length > 0 && currentDepth < depth) {
    const levelSize = queue.length;
    for (let i = 0; i < levelSize; i++) {
      const current = queue.shift()!;
      const edges = db.prepare(
        "SELECT * FROM graph_edges WHERE (source_id = ? OR target_id = ?) AND confidence >= ?"
      ).all(current, current, minConfidence) as Record<string, unknown>[];

      for (const row of edges) {
        const edge = { ...row, metadata: JSON.parse(row.metadata as string) } as GraphEdge;
        collectedEdges.push(edge);
        const neighborId = edge.source_id === current ? edge.target_id : edge.source_id;
        if (!visitedNodes.has(neighborId)) {
          visitedNodes.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
    currentDepth++;
  }

  // Fetch all visited nodes
  const nodeIds = Array.from(visitedNodes);
  const nodes: GraphNode[] = [];
  for (const nid of nodeIds) {
    const node = getNode(nid);
    if (node) nodes.push(node);
  }

  // Deduplicate edges
  const uniqueEdges = Array.from(new Map(collectedEdges.map(e => [e.id, e])).values());

  return { nodes, edges: uniqueEdges };
}

export function getGraphStats(): { nodeCount: number; edgeCount: number; nodesByType: Record<string, number>; edgesByType: Record<string, number> } {
  const db = getDb();
  const nodeCount = (db.prepare("SELECT COUNT(*) as c FROM graph_nodes").get() as { c: number }).c;
  const edgeCount = (db.prepare("SELECT COUNT(*) as c FROM graph_edges").get() as { c: number }).c;

  const nodeRows = db.prepare("SELECT type, COUNT(*) as c FROM graph_nodes GROUP BY type").all() as Array<{ type: string; c: number }>;
  const nodesByType: Record<string, number> = {};
  nodeRows.forEach(r => { nodesByType[r.type] = r.c; });

  const edgeRows = db.prepare("SELECT type, COUNT(*) as c FROM graph_edges GROUP BY type").all() as Array<{ type: string; c: number }>;
  const edgesByType: Record<string, number> = {};
  edgeRows.forEach(r => { edgesByType[r.type] = r.c; });

  return { nodeCount, edgeCount, nodesByType, edgesByType };
}
