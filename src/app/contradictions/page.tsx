"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, CheckCircle2, Scale, SplitSquareVertical } from "lucide-react";
import { NavSidebar } from "@/components/Shared/NavSidebar";

interface EdgeRecord {
    id: string;
    source_id: string;
    target_id: string;
    type: string;
    confidence: number;
    evidence: string;
    method: string;
}

interface NodeRecord {
    id: string;
    label: string;
    type: string;
    properties?: {
        summary?: string;
    };
}

interface GraphPayload {
    nodes: NodeRecord[];
}

interface VaultSpace {
    id: string;
    name: string;
}

export default function ContradictionsPage() {
    const router = useRouter();
    const [isNavSidebarOpen, setIsNavSidebarOpen] = useState(() => {
        if (typeof window === "undefined") return true;
        const stored = window.localStorage.getItem("evidenceos.nav-sidebar-open");
        return stored !== null ? stored === "true" : true;
    });
    const [activeMode, setActiveMode] = useState<"contradicts" | "supports">("contradicts");
    const [vaults, setVaults] = useState<VaultSpace[]>([]);
    const [activeVaultId, setActiveVaultId] = useState(() => {
        if (typeof window === "undefined") return "all";
        const params = new URLSearchParams(window.location.search);
        return params.get("vault") || "all";
    });
    const [nodes, setNodes] = useState<NodeRecord[]>([]);
    const [edges, setEdges] = useState<EdgeRecord[]>([]);

    useEffect(() => {
        window.localStorage.setItem("evidenceos.nav-sidebar-open", String(isNavSidebarOpen));
    }, [isNavSidebarOpen]);

    useEffect(() => {
        Promise.all([
            fetch("/api/graph?mode=dashboard").then((response) => response.json()),
            fetch("/api/graph?mode=full").then((response) => response.json()),
        ])
            .then(([dashboard, full]: [{ spaces?: VaultSpace[] }, GraphPayload]) => {
                setVaults((dashboard.spaces || []).filter((space) => space.id !== "global"));
                setNodes(full.nodes || []);
            })
            .catch((error) => console.error("Failed to fetch graph workspace state:", error));
    }, []);

    useEffect(() => {
        const params = new URLSearchParams({
            mode: "edges",
            type: activeMode,
        });
        if (activeVaultId !== "all") {
            params.set("vaultId", activeVaultId);
        }

        fetch(`/api/graph?${params.toString()}`)
            .then((response) => response.json())
            .then((data: { edges?: EdgeRecord[] }) => setEdges(data.edges || []))
            .catch((error) => console.error("Failed to fetch contradiction edges:", error));
    }, [activeMode, activeVaultId]);

    const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

    return (
        <div className="flex h-[100dvh] bg-zinc-50 font-sans text-zinc-900 overflow-hidden selection:bg-orange-100 selection:text-orange-900">
            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body { font-family: 'Outfit', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.3); border-radius: 10px; }
      `,
            }} />

            <NavSidebar
                isOpen={isNavSidebarOpen}
                onToggle={() => setIsNavSidebarOpen((open) => !open)}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/70">
                <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col gap-8">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500 font-mono mb-3">Analysis</p>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Contradictions & Support</h1>
                        <p className="mt-2 max-w-2xl text-sm text-zinc-500 leading-relaxed">
                            Compare where the vault disagrees with itself, and where multiple sources reinforce the same claim. This page is powered by live graph edge data rather than placeholder comparisons.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => setActiveMode("contradicts")}
                            className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${activeMode === "contradicts" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"}`}
                        >
                            <span className="inline-flex items-center gap-2"><AlertTriangle size={14} /> Contradictions</span>
                        </button>
                        <button
                            onClick={() => setActiveMode("supports")}
                            className={`px-4 py-2 rounded-xl border text-sm font-medium transition-colors ${activeMode === "supports" ? "bg-zinc-900 text-white border-zinc-900" : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"}`}
                        >
                            <span className="inline-flex items-center gap-2"><CheckCircle2 size={14} /> Support Signals</span>
                        </button>
                        <select
                            value={activeVaultId}
                            onChange={(event) => setActiveVaultId(event.target.value)}
                            className="ml-auto rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm text-zinc-700 outline-none"
                        >
                            <option value="all">All Vaults</option>
                            {vaults.map((vault) => (
                                <option key={vault.id} value={vault.id}>{vault.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {edges.length === 0 ? (
                            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
                                <SplitSquareVertical size={28} className="mx-auto text-zinc-400 mb-3" />
                                <p className="text-lg font-semibold text-zinc-900">No {activeMode === "contradicts" ? "contradictions" : "support signals"} detected yet</p>
                                <p className="mt-2 text-sm text-zinc-500">
                                    Ingest more files in the active vault or ask the system for a project-wide summary to trigger relationship analysis.
                                </p>
                            </div>
                        ) : (
                            edges.map((edge) => {
                                const source = nodeMap.get(edge.source_id);
                                const target = nodeMap.get(edge.target_id);

                                return (
                                    <div key={edge.id} className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                                                <Scale size={12} className="text-orange-500" />
                                                {edge.method} · confidence {edge.confidence.toFixed(2)}
                                            </div>
                                            <button
                                                onClick={() => router.push(`/graph?center=${encodeURIComponent(edge.source_id)}`)}
                                                className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                                            >
                                                Open in Graph
                                            </button>
                                        </div>

                                        <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
                                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Source</p>
                                                <h2 className="text-sm font-semibold text-zinc-900">{source?.label || edge.source_id}</h2>
                                                <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                                                    {typeof source?.properties?.summary === "string" ? source.properties.summary : "No summary available."}
                                                </p>
                                                <button
                                                    onClick={() => router.push(`/documents/${encodeURIComponent(edge.source_id)}`)}
                                                    className="mt-4 text-xs font-medium text-orange-700 hover:text-orange-800 inline-flex items-center gap-1"
                                                >
                                                    Inspect document <ArrowRight size={12} />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-center text-zinc-300">
                                                <ArrowRight size={18} />
                                            </div>

                                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                                <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Target</p>
                                                <h2 className="text-sm font-semibold text-zinc-900">{target?.label || edge.target_id}</h2>
                                                <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                                                    {typeof target?.properties?.summary === "string" ? target.properties.summary : "No summary available."}
                                                </p>
                                                <button
                                                    onClick={() => router.push(`/documents/${encodeURIComponent(edge.target_id)}`)}
                                                    className="mt-4 text-xs font-medium text-orange-700 hover:text-orange-800 inline-flex items-center gap-1"
                                                >
                                                    Inspect document <ArrowRight size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4 rounded-2xl border border-zinc-200 bg-white p-4">
                                            <p className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Evidence</p>
                                            <p className="text-sm text-zinc-700 leading-relaxed">{edge.evidence || "No evidence string available."}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
