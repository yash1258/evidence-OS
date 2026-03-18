"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { NavSidebar } from "@/components/Shared/NavSidebar";
import { ArrowRight, FileText, Layers, Network, ScanSearch } from "lucide-react";

interface ChunkRecord {
    id: string;
    chunkIndex: number;
    contentPreview: string;
    mimeType: string;
    metadata: Record<string, unknown>;
}

interface DocumentRecord {
    id: string;
    originalName: string;
    mimeType: string;
    contentType: string;
    summary: string;
    tags: string[];
    entities: string[];
    chunkCount: number;
    vault_id: string | null;
    uploadedAt: string;
}

interface DocumentPayload {
    document: DocumentRecord;
    nodeProperties?: Record<string, unknown>;
    fullContent: string | null;
    chunks: ChunkRecord[];
}

function formatChunkLabel(chunk: ChunkRecord): string {
    const pageStart = typeof chunk.metadata?.pageStart === "number" ? chunk.metadata.pageStart : undefined;
    const pageEnd = typeof chunk.metadata?.pageEnd === "number" ? chunk.metadata.pageEnd : undefined;
    const documentPageCount = typeof chunk.metadata?.documentPageCount === "number" ? chunk.metadata.documentPageCount : undefined;
    const windowNumber = typeof chunk.metadata?.windowNumber === "number" ? chunk.metadata.windowNumber : undefined;
    const windowCount = typeof chunk.metadata?.windowCount === "number" ? chunk.metadata.windowCount : undefined;
    const startSeconds = typeof chunk.metadata?.startSeconds === "number" ? chunk.metadata.startSeconds : undefined;
    const endSeconds = typeof chunk.metadata?.endSeconds === "number" ? chunk.metadata.endSeconds : undefined;

    if (pageStart !== undefined) {
        const pageLabel = pageEnd !== undefined && pageEnd !== pageStart ? `Pages ${pageStart}-${pageEnd}` : `Page ${pageStart}`;
        if (windowCount !== undefined && windowCount > 1 && windowNumber !== undefined && documentPageCount !== undefined) {
            return `Part ${windowNumber}/${windowCount} · ${pageLabel} of ${documentPageCount}`;
        }
        if (documentPageCount !== undefined) {
            return `${pageLabel} of ${documentPageCount}`;
        }
        return pageLabel;
    }
    if (startSeconds !== undefined) {
        const formatTime = (totalSeconds: number) => {
            const safe = Math.max(0, Math.floor(totalSeconds));
            const minutes = Math.floor(safe / 60);
            const seconds = safe % 60;
            return `${minutes}:${seconds.toString().padStart(2, "0")}`;
        };
        return endSeconds !== undefined ? `${formatTime(startSeconds)}-${formatTime(endSeconds)}` : formatTime(startSeconds);
    }
    return `Chunk ${chunk.chunkIndex}`;
}

export default function DocumentInspectorPage() {
    const router = useRouter();
    const params = useParams<{ id: string }>();
    const [isNavSidebarOpen, setIsNavSidebarOpen] = useState(() => {
        if (typeof window === "undefined") return true;
        const stored = window.localStorage.getItem("evidenceos.nav-sidebar-open");
        return stored !== null ? stored === "true" : true;
    });
    const [payload, setPayload] = useState<DocumentPayload | null>(null);

    useEffect(() => {
        window.localStorage.setItem("evidenceos.nav-sidebar-open", String(isNavSidebarOpen));
    }, [isNavSidebarOpen]);

    useEffect(() => {
        if (!params?.id) return;

        fetch(`/api/documents/${encodeURIComponent(params.id)}`)
            .then((response) => response.json())
            .then((data) => setPayload(data))
            .catch((error) => console.error("Failed to fetch document payload:", error));
    }, [params?.id]);

    const document = payload?.document;
    const chunks = payload?.chunks || [];
    const sourceUrl = typeof payload?.nodeProperties?.sourceUrl === "string" ? payload.nodeProperties.sourceUrl : "";
    const sourceChannel = typeof payload?.nodeProperties?.channel === "string" ? payload.nodeProperties.channel : "";
    const sourceType = typeof payload?.nodeProperties?.sourceType === "string" ? payload.nodeProperties.sourceType : "";
    const buildAskParams = () => {
        const search = new URLSearchParams();
        if (document?.vault_id) {
            search.set("vault", document.vault_id);
        }
        return search;
    };

    return (
        <div className="flex h-[100dvh] bg-zinc-50 font-sans text-zinc-900 overflow-hidden selection:bg-orange-100 selection:text-orange-900">
            <NavSidebar
                isOpen={isNavSidebarOpen}
                onToggle={() => setIsNavSidebarOpen((open) => !open)}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/70">
                <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col gap-8">
                    {!document ? (
                        <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
                            <FileText size={28} className="mx-auto text-zinc-400 mb-3" />
                            <p className="text-lg font-semibold text-zinc-900">Loading document inspector…</p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-start justify-between gap-6">
                                <div>
                                    <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500 font-mono mb-3">Document Inspector</p>
                                    <h1 className="text-3xl font-bold tracking-tight text-zinc-950">{document.originalName}</h1>
                                    <p className="mt-2 max-w-2xl text-sm text-zinc-500 leading-relaxed">
                                        {document.summary || "No summary available yet."}
                                    </p>
                                </div>
                                <div className="flex flex-wrap gap-3 justify-end">
                                    <button
                                        onClick={() => {
                                            const params = buildAskParams();
                                            params.set("q", `Summarize the document "${document.originalName}" in detail. Document ID: ${document.id}.`);
                                            router.push(`/chat?${params.toString()}`);
                                        }}
                                        className="rounded-xl bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                                    >
                                        <ScanSearch size={14} /> Summarize
                                    </button>
                                    <button
                                        onClick={() => {
                                            const params = buildAskParams();
                                            params.set("q", `Investigate the document "${document.originalName}". Explain what it is about, key claims, important entities, and any links or contradictions it may have. Document ID: ${document.id}.`);
                                            router.push(`/chat?${params.toString()}`);
                                        }}
                                        className="rounded-xl border border-zinc-200 bg-white text-zinc-700 px-4 py-3 text-sm font-medium hover:border-zinc-300 transition-colors flex items-center gap-2"
                                    >
                                        <ArrowRight size={14} /> Investigate
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                                    <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Content Type</div>
                                    <div className="mt-3 text-sm font-semibold text-zinc-900">{document.contentType}</div>
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                                    <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Mime Type</div>
                                    <div className="mt-3 text-sm font-semibold text-zinc-900">{document.mimeType}</div>
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                                    <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Chunks</div>
                                    <div className="mt-3 text-sm font-semibold text-zinc-900">{document.chunkCount}</div>
                                </div>
                                <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                                    <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Uploaded</div>
                                    <div className="mt-3 text-sm font-semibold text-zinc-900">{document.uploadedAt}</div>
                                </div>
                            </div>

                            {(sourceUrl || sourceChannel || sourceType) && (
                                <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Network size={16} className="text-orange-500" />
                                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Source Context</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {sourceType && (
                                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Source Type</div>
                                                <div className="mt-3 text-sm font-semibold text-zinc-900">{sourceType}</div>
                                            </div>
                                        )}
                                        {sourceChannel && (
                                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Channel</div>
                                                <div className="mt-3 text-sm font-semibold text-zinc-900">{sourceChannel}</div>
                                            </div>
                                        )}
                                        {sourceUrl && (
                                            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                                <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Source URL</div>
                                                <a
                                                    href={sourceUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-3 block truncate text-sm font-semibold text-orange-700 hover:text-orange-800"
                                                >
                                                    {sourceUrl}
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-[0.92fr_1.08fr] gap-6">
                                <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Layers size={16} className="text-orange-500" />
                                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Metadata</h2>
                                    </div>
                                    <div className="space-y-5">
                                        <div>
                                            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Tags</div>
                                            <div className="flex flex-wrap gap-2">
                                                {document.tags.map((tag) => (
                                                    <span key={tag} className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-xs text-orange-700">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Entities</div>
                                            <div className="flex flex-wrap gap-2">
                                                {document.entities.map((entity) => (
                                                    <span key={entity} className="px-3 py-1.5 rounded-full bg-zinc-50 border border-zinc-200 text-xs text-zinc-700">{entity}</span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Network size={16} className="text-orange-500" />
                                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Chunk Map</h2>
                                    </div>
                                    <div className="space-y-3 max-h-[520px] overflow-y-auto custom-scrollbar">
                                        {chunks.map((chunk) => (
                                            <div key={chunk.id} className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                                                <div className="flex items-center justify-between gap-3">
                                                    <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">{formatChunkLabel(chunk)}</p>
                                                    <span className="text-[10px] font-mono text-zinc-400">{chunk.mimeType}</span>
                                                </div>
                                                <p className="mt-3 text-sm text-zinc-700 leading-relaxed">{chunk.contentPreview}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {payload?.fullContent && (
                                <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                                    <div className="flex items-center gap-2 mb-4">
                                        <FileText size={16} className="text-orange-500" />
                                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Full Text</h2>
                                    </div>
                                    <pre className="whitespace-pre-wrap text-sm text-zinc-700 leading-relaxed bg-zinc-50 border border-zinc-200 rounded-2xl p-4 max-h-[420px] overflow-y-auto custom-scrollbar">
                                        {payload.fullContent}
                                    </pre>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
