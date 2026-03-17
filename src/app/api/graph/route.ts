import { NextResponse } from "next/server";
import {
  getGraphStats,
  getSubgraph,
  getNode,
  getNeighbors,
  getEdgesByType,
  getNodesByType,
  listVaults,
} from "@/lib/storage/database";
import { buildVaultOverview } from "@/lib/overview/vaultOverview";

/**
 * GET /api/graph
 * Returns the full graph, a subgraph around a node, or graph stats.
 *
 * Query params:
 * - mode=stats   → graph overview stats (node/edge counts by type)
 * - mode=subgraph&center=<nodeId>&depth=<n> → local neighborhood
 * - mode=neighbors&nodeId=<id>&edgeType=<type> → direct neighbors
 * - mode=full    → all nodes + edges (⚠ can be large)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "stats";

    // Graph stats
    if (mode === "stats") {
      const stats = getGraphStats();
      return NextResponse.json(stats);
    }

    // Subgraph around a node
    if (mode === "subgraph") {
      const center = searchParams.get("center");
      const depth = parseInt(searchParams.get("depth") || "2", 10);
      if (!center) {
        return NextResponse.json({ error: "center parameter required" }, { status: 400 });
      }
      const node = getNode(center);
      if (!node) {
        return NextResponse.json({ error: "Node not found" }, { status: 404 });
      }
      const subgraph = getSubgraph(center, depth);
      return NextResponse.json(subgraph);
    }

    // Direct neighbors of a node
    if (mode === "neighbors") {
      const nodeId = searchParams.get("nodeId");
      const edgeType = searchParams.get("edgeType") || undefined;
      if (!nodeId) {
        return NextResponse.json({ error: "nodeId parameter required" }, { status: 400 });
      }
      const neighbors = getNeighbors(nodeId, edgeType);
      return NextResponse.json({
        nodeId,
        neighbors: neighbors.map((n) => ({
          node: { id: n.node.id, type: n.node.type, label: n.node.label },
          edge: { type: n.edge.type, confidence: n.edge.confidence, evidence: n.edge.evidence },
        })),
      });
    }

    // Edges by type
    if (mode === "edges") {
      const edgeType = searchParams.get("type");
      if (!edgeType) {
        return NextResponse.json({ error: "type parameter required" }, { status: 400 });
      }
      const edges = getEdgesByType(edgeType);
      return NextResponse.json({ type: edgeType, edges });
    }

    if (mode === "overview") {
      const vaultId = searchParams.get("vaultId") || undefined;
      const focus = searchParams.get("focus") || undefined;
      const overview = await buildVaultOverview(vaultId, focus);
      return NextResponse.json(overview);
    }

    // Full graph (all nodes + edges) — for visualization
    if (mode === "full") {
      const allTypes = ["vault", "document", "audio", "image", "chunk", "entity", "investigation"];
      const allNodes = allTypes.flatMap((t) => getNodesByType(t));

      // Get all edges by scanning node neighbors
      const edgeTypes = ["contains", "references", "contradicts", "amends", "supports", "co_mentions", "semantic_similar", "next_chunk", "belongs_to"];
      const allEdges = edgeTypes.flatMap((t) => getEdgesByType(t, 0.0));

      // Deduplicate edges
      const uniqueEdges = Array.from(new Map(allEdges.map((e) => [e.id, e])).values());

      return NextResponse.json({
        nodes: allNodes.map((n) => ({
          id: n.id,
          type: n.type,
          label: n.label,
          vaultId: n.vault_id,
          properties: n.properties,
        })),
        edges: uniqueEdges.map((e) => ({
          id: e.id,
          source: e.source_id,
          target: e.target_id,
          type: e.type,
          weight: e.weight,
          confidence: e.confidence,
        })),
      });
    }

    // Dashboard aggregate data
    if (mode === "dashboard") {
      // --- Knowledge Spaces (Vaults) ---
      const vaults = listVaults();
      const spaces = vaults.map((vault) => {
        const vaultDocs = getNodesByType("document", vault.id);
        const vaultChunks = getNodesByType("chunk", vault.id);
        const vaultNode = getNode(vault.id);
        return {
          id: vault.id,
          name: vault.name,
          type: "vault",
          files: vaultDocs.length,
          chunks: vaultChunks.length,
          size: `${vaultDocs.length} docs, ${vaultChunks.length} chunks`,
          lastSync: vault.created_at,
          overview: vaultNode?.properties?.overview || null,
          overviewStats: vaultNode?.properties?.overviewStats || null,
          overviewNeedsRefresh: Boolean(vaultNode?.properties?.overviewNeedsRefresh),
          status: "synced",
          capacity: Math.max(1, vaultChunks.length),
        };
      });

      // Include a global/unassigned space for older data
      const globalDocs = getNodesByType("document").filter(n => !n.vault_id);
      const globalChunks = getNodesByType("chunk").filter(n => !n.vault_id);
      if (globalDocs.length > 0 || globalChunks.length > 0) {
        spaces.unshift({
          id: "global",
          name: "Global Namespace",
          type: "local",
          files: globalDocs.length,
          chunks: globalChunks.length,
          size: `${globalDocs.length} docs, ${globalChunks.length} chunks`,
          lastSync: "Live",
          overview: null,
          overviewStats: null,
          overviewNeedsRefresh: false,
          status: "synced",
          capacity: Math.max(1, globalChunks.length),
        });
      }

      // --- Recent Investigations ---
      const investigationNodes = getNodesByType("investigation");
      const investigations = investigationNodes
        .sort((a, b) => {
          const aTime = a.properties?.created_at || a.created_at || "";
          const bTime = b.properties?.created_at || b.created_at || "";
          return String(bTime).localeCompare(String(aTime));
        })
        .slice(0, 4)
        .map((inv) => {
          const neighbors = getNeighbors(inv.id, "references", 0.0);
          return {
            id: inv.id,
            title: inv.label || "Untitled Investigation",
            excerpt: inv.properties?.answerPreview || inv.properties?.query || "No summary available.",
            time: inv.created_at || "Unknown",
            sources: neighbors.length,
          };
        });

      // --- Graph Stats for the status bar ---
      const stats = getGraphStats();

      return NextResponse.json({ spaces, investigations, stats });
    }

    return NextResponse.json({ error: "Invalid mode. Use: stats, subgraph, neighbors, edges, full, overview, dashboard" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Graph query failed" },
      { status: 500 }
    );
  }
}
