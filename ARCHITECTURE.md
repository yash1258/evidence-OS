# EvidenceOS Architecture

EvidenceOS utilizes a **Graph/Vector Hybrid Architecture** designed to optimize both deep semantic search and deterministic relationship traversal, while minimizing local memory usage.

This document outlines the system components, data flow, and deployment strategy.

## 1. System Components

The architecture is split between a local frontend/agent engine and a remote vector database.

### 1.1 Local Environment (Your Machine)
- **Next.js Server**: Handles the React frontend, API routes, and agent orchestration.
- **SQLite Database (`evidence.db`)**: Stores the **Knowledge Graph** (nodes and edges) and document metadata. SQLite is extremely lightweight and fast for local pathfinding (Breadth-First Search).
- **Gemini Reasoning Engine**: The application securely calls the Gemini API (**`gemini-3-flash-preview`**) to power the agent's reasoning loop and multimodal embeddings (**`gemini-embedding-2-preview`**).

### 1.2 Remote Environment (VPS: 152.53.164.238)
- **ChromaDB**: The vector database used for semantic similarity search. ChromaDB is heavily RAM-dependent because it keeps vector indexes in memory for fast mathematical distance calculations.
- **Docker**: ChromaDB runs inside a Docker container (`port 8001`) on your remote Linux VPS to entirely offload the RAM and CPU requirements from your local machine.

---

## 2. Ingestion Data Flow

When a document is uploaded to EvidenceOS, it passes through a multi-stage pipeline that builds both the vector index and the knowledge graph.

### Stage 1: Parsing & Chunking (Local)
1. The document is parsed to extract text and metadata.
2. The text is split into smaller, overlapping "chunks" for focused retrieval.

### Stage 2: Vector Embedding & Storage (Remote API Call)
1. The chunks are sent to the `gemini-embedding-2-preview` API to generate high-dimensional vectors in a shared multimodal space.
2. The chunks and their vectors are sent over the internet to the **remote ChromaDB server** (`http://152.53.164.238:8001`).

### Stage 3: Graph Construction (Local SQLite)
After vector storage succeeds, `src/lib/ingestion/graphBuilder.ts` constructs the Knowledge Graph using a three-tier approach:

* **Tier 1: Structural Edges (Deterministic)**
  * Creates `document` and `chunk` nodes.
  * Links them with `contains` and `next_chunk` edges to preserve original reading order.
* **Tier 2: Semantic & Entity Edges (Fast)**
  * Extracts named entities and creates `co_mentions` edges between documents sharing the same entities.
  * Queries the remote ChromaDB for similar chunks and creates probabilistic `semantic_similar` edges.
* **Tier 3: AI-Inferred Edges (Agentic)**
  * Uses Gemini 3 Flash to read document summaries and autonomously generate higher-order relationship edges: `contradicts`, `references`, `amends`, and `supports`.

---

## 3. Agent Traversal Strategy

Instead of relying purely on vector similarity (RAG), the EvidenceOS agent (`src/lib/agent/`) leverages **Graph RAG**.

When the user asks a question, the agent has access to specific graph-traversal tools:

1. **`searchKnowledgeBase`**: Performs a standard remote vector search, but automatically expands the results to include their 1-hop graph neighbors in the local SQLite DB.
2. **`traverse_edges`**: Navigates from a known node along specific edge types (e.g., following a `contradicts` edge to find opposing evidence).
3. **`find_connections`**: Runs a local Breadth-First Search in SQLite to find the shortest logical path between two different documents.
4. **`find_contradictions`**: Instantly surfaces pre-calculated `contradicts` edges.

### Learning Loop
Finally, when the agent completes an investigation, it calls `saveInvestigationNode()`. This permanently writes the agent's reasoning chain back into the SQLite graph as an `investigation` node linked to its sources, allowing the system to learn from past queries.
