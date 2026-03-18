"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
    Activity,
    ArrowRight,
    AlertTriangle,
    Database,
    Folder,
    GitBranch,
    Network,
    Search,
} from "lucide-react";
import { NavSidebar } from "@/components/Shared/NavSidebar";
import { ThemedSelect } from "@/components/Shared/ThemedSelect";

interface GraphStatsResponse {
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
}

interface GraphSpace {
    id: string;
    name: string;
    files: number;
    overview?: string | null;
}

interface SubgraphNode {
    id: string;
    type: string;
    label: string;
}

interface SubgraphEdge {
    id: string;
    source_id: string;
    target_id: string;
    type: string;
    confidence: number;
}

interface SubgraphResponse {
    nodes: SubgraphNode[];
    edges: SubgraphEdge[];
}

export default function GraphPage() {
    const router = useRouter();
    const [isNavSidebarOpen, setIsNavSidebarOpen] = useState(true);
    const [stats, setStats] = useState<GraphStatsResponse | null>(null);
    const [spaces, setSpaces] = useState<GraphSpace[]>([]);
    const [nodeId, setNodeId] = useState("");
    const [depth, setDepth] = useState("2");
    const [subgraph, setSubgraph] = useState<SubgraphResponse | null>(null);
    const [isLoadingSubgraph, setIsLoadingSubgraph] = useState(false);

    useEffect(() => {
        const stored = window.localStorage.getItem("evidenceos.nav-sidebar-open");
        if (stored !== null) {
            setIsNavSidebarOpen(stored === "true");
        }
        const params = new URLSearchParams(window.location.search);
        const initialVault = params.get("vault");
        if (initialVault) {
            setNodeId(initialVault);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem("evidenceos.nav-sidebar-open", String(isNavSidebarOpen));
    }, [isNavSidebarOpen]);

    const fetchGraphData = useCallback(async () => {
        const [statsRes, dashboardRes] = await Promise.all([
            fetch("/api/graph?mode=stats"),
            fetch("/api/graph?mode=dashboard"),
        ]);

        if (statsRes.ok) {
            setStats(await statsRes.json());
        }
        if (dashboardRes.ok) {
            const data = await dashboardRes.json();
            setSpaces(data.spaces || []);
        }
    }, []);

    useEffect(() => {
        fetchGraphData().catch((error) => console.error("Failed to fetch graph data:", error));
    }, [fetchGraphData]);

    const loadSubgraph = async (targetNodeId: string = nodeId) => {
        if (!targetNodeId.trim()) return;

        setIsLoadingSubgraph(true);
        try {
            const params = new URLSearchParams({
                mode: "subgraph",
                center: targetNodeId.trim(),
                depth,
            });
            const res = await fetch(`/api/graph?${params.toString()}`);
            if (res.ok) {
                setSubgraph(await res.json());
            } else {
                setSubgraph(null);
            }
        } finally {
            setIsLoadingSubgraph(false);
        }
    };

    return (
        <div className="flex h-[100dvh] bg-zinc-50 font-sans text-zinc-900 overflow-hidden selection:bg-orange-100 selection:text-orange-900">
            <NavSidebar
                nodeCount={stats?.nodeCount}
                isOpen={isNavSidebarOpen}
                onToggle={() => setIsNavSidebarOpen((open) => !open)}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/70">
                <div className="max-w-[1280px] mx-auto px-6 py-8 flex flex-col gap-8">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500 font-mono mb-3">Live Graph</p>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Graph Explorer</h1>
                            <p className="mt-2 max-w-2xl text-sm text-zinc-500 leading-relaxed">
                                Inspect how vaults, documents, chunks, entities, and investigations are actually connected. This page is wired to the live graph API rather than demo data.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push(nodeId ? `/contradictions?vault=${encodeURIComponent(nodeId)}` : '/contradictions')}
                            className="rounded-xl border border-zinc-200 bg-white text-zinc-700 px-4 py-3 text-sm font-medium hover:border-orange-300 transition-colors flex items-center gap-2"
                        >
                            <AlertTriangle size={14} /> Compare Contradictions
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase">
                                <Database size={14} /> Nodes
                            </div>
                            <div className="mt-3 text-3xl font-bold tracking-tight text-zinc-950">{stats?.nodeCount ?? "—"}</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase">
                                <GitBranch size={14} /> Edges
                            </div>
                            <div className="mt-3 text-3xl font-bold tracking-tight text-zinc-950">{stats?.edgeCount ?? "—"}</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase">
                                <Folder size={14} /> Vaults
                            </div>
                            <div className="mt-3 text-3xl font-bold tracking-tight text-zinc-950">{spaces.length}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-6">
                        <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-5">
                                <Search size={16} className="text-orange-500" />
                                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Subgraph Lookup</h2>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3">
                                <input
                                    value={nodeId}
                                    onChange={(event) => setNodeId(event.target.value)}
                                    placeholder="Enter a node ID or vault ID"
                                    className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none focus:border-orange-300 focus:bg-white"
                                />
                                <ThemedSelect
                                    value={depth}
                                    onChange={setDepth}
                                    options={[
                                        { value: "1", label: "Depth 1", description: "Immediate neighbors" },
                                        { value: "2", label: "Depth 2", description: "Broader context" },
                                        { value: "3", label: "Depth 3", description: "Wide exploration" },
                                    ]}
                                    buttonClassName="h-[48px] justify-between px-4 min-w-[120px] bg-[rgba(255,250,243,0.9)]"
                                    minMenuWidthClassName="min-w-[180px]"
                                />
                                <button
                                    onClick={() => loadSubgraph()}
                                    className="rounded-xl bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
                                >
                                    Explore <ArrowRight size={14} />
                                </button>
                            </div>

                            <div className="mt-6 space-y-4">
                                {isLoadingSubgraph && <p className="text-sm text-zinc-500">Loading subgraph…</p>}
                                {!isLoadingSubgraph && subgraph && (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
                                                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Subgraph Nodes</div>
                                                <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">{subgraph.nodes.length}</div>
                                            </div>
                                            <div className="rounded-xl bg-zinc-50 border border-zinc-200 p-4">
                                                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Subgraph Edges</div>
                                                <div className="mt-2 text-2xl font-bold tracking-tight text-zinc-900">{subgraph.edges.length}</div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-zinc-200 overflow-hidden">
                                            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 text-xs font-mono uppercase tracking-wider text-zinc-500">Nodes</div>
                                            <div className="max-h-[240px] overflow-y-auto custom-scrollbar divide-y divide-zinc-100">
                                                {subgraph.nodes.map((node) => (
                                                    <button
                                                        key={node.id}
                                                        onClick={() => {
                                                            setNodeId(node.id);
                                                            loadSubgraph(node.id);
                                                        }}
                                                        className="w-full text-left px-4 py-3 hover:bg-zinc-50 transition-colors"
                                                    >
                                                        <div className="text-sm font-medium text-zinc-900">{node.label}</div>
                                                        <div className="text-[11px] font-mono text-zinc-500 mt-1">{node.type} · {node.id}</div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-zinc-200 overflow-hidden">
                                            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 text-xs font-mono uppercase tracking-wider text-zinc-500">Edges</div>
                                            <div className="max-h-[220px] overflow-y-auto custom-scrollbar divide-y divide-zinc-100">
                                                {subgraph.edges.map((edge) => (
                                                    <div key={edge.id} className="px-4 py-3">
                                                        <div className="text-sm font-medium text-zinc-900">{edge.type}</div>
                                                        <div className="text-[11px] font-mono text-zinc-500 mt-1">confidence {edge.confidence?.toFixed?.(2) ?? edge.confidence}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-6">
                            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Activity size={16} className="text-orange-500" />
                                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Distribution</h2>
                                </div>
                                <div className="grid grid-cols-1 gap-4">
                                    <div>
                                        <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Nodes By Type</div>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(stats?.nodesByType || {}).map(([type, count]) => (
                                                <span key={type} className="px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
                                                    {type}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Edges By Type</div>
                                        <div className="flex flex-wrap gap-2">
                                            {Object.entries(stats?.edgesByType || {}).map(([type, count]) => (
                                                <span key={type} className="px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">
                                                    {type}: {count}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-4">
                                    <Network size={16} className="text-orange-500" />
                                    <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Vault Entry Points</h2>
                                </div>
                                <div className="space-y-3">
                                    {spaces.map((space) => (
                                        <button
                                            key={space.id}
                                            onClick={() => {
                                                setNodeId(space.id);
                                                loadSubgraph(space.id);
                                            }}
                                            className="w-full text-left rounded-xl border border-zinc-200 bg-zinc-50 hover:bg-white px-4 py-3 transition-colors"
                                        >
                                            <div className="text-sm font-medium text-zinc-900">{space.name}</div>
                                            <div className="text-[11px] font-mono text-zinc-500 mt-1">{space.files} files</div>
                                            {space.overview && (
                                                <p className="mt-2 text-xs text-zinc-500 line-clamp-2">{space.overview}</p>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
