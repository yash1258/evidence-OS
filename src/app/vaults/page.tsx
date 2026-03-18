"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
    AlertTriangle,
    ArrowRight,
    CheckCircle2,
    Clock3,
    Database,
    FileText,
    FolderPlus,
    Image as ImageIcon,
    Layers3,
    Link2,
    Search,
    Upload,
    Youtube,
    AudioLines,
    ScanSearch,
} from "lucide-react";
import { NavSidebar } from "@/components/Shared/NavSidebar";
import { MagneticButton } from "@/components/Shared/MagneticButton";
import { ToastStack, useToastStack } from "@/components/Shared/ToastStack";
import { YouTubeImportModal } from "@/components/Shared/YouTubeImportModal";
import { FileIcon } from "@/components/Shared/FileIcon";
import { getNoticeFromError } from "@/lib/ui/errorNotice";

interface VaultSpace {
    id: string;
    name: string;
    files: number;
    chunks: number;
    size: string;
    lastSync: string;
    overview?: string | null;
    overviewNeedsRefresh?: boolean;
    overviewStats?: {
        topTags?: Array<{ value: string; count: number }>;
        keyThemes?: string[];
        riskSignals?: string[];
        followUpQuestions?: string[];
    } | null;
}

interface GraphNodeResponse {
    id: string;
    type: string;
    label: string;
    vaultId?: string | null;
    properties?: Record<string, unknown>;
}

interface VaultSource {
    id: string;
    name: string;
    type: "document" | "audio" | "image";
    summary?: string;
    mimeType?: string;
    contentType?: string;
    sourceType?: string;
}

type SourceFilter = "all" | "documents" | "audio" | "images" | "imports";

const spring = { type: "spring", stiffness: 140, damping: 20 } as const;

function inferFileKind(source: VaultSource): "pdf" | "audio" | "image" {
    if (source.type === "audio") return "audio";
    if (source.type === "image") return "image";
    return "pdf";
}

export default function VaultsPage() {
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isNavSidebarOpen, setIsNavSidebarOpen] = useState(true);
    const [spaces, setSpaces] = useState<VaultSpace[]>([]);
    const [nodes, setNodes] = useState<GraphNodeResponse[]>([]);
    const [graphNodeCount, setGraphNodeCount] = useState<number | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedVaultId, setSelectedVaultId] = useState("");
    const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");

    const [isCreateVaultModalOpen, setIsCreateVaultModalOpen] = useState(false);
    const [newVaultName, setNewVaultName] = useState("");

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importUrl, setImportUrl] = useState("");
    const [isImportingUrl, setIsImportingUrl] = useState(false);
    const [importError, setImportError] = useState("");

    const [uploadStatus, setUploadStatus] = useState<"uploading" | "success" | "error" | null>(null);
    const [uploadFileName, setUploadFileName] = useState("");
    const [uploadError, setUploadError] = useState("");
    const { toasts, pushToast, dismissToast } = useToastStack();

    const notifyError = useCallback((error: unknown, fallbackTitle: string) => {
        const notice = getNoticeFromError(error, fallbackTitle);
        pushToast({ ...notice, tone: "error" });
        return notice;
    }, [pushToast]);

    useEffect(() => {
        const stored = window.localStorage.getItem("evidenceos.nav-sidebar-open");
        if (stored !== null) {
            setIsNavSidebarOpen(stored === "true");
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem("evidenceos.nav-sidebar-open", String(isNavSidebarOpen));
    }, [isNavSidebarOpen]);

    const fetchVaultData = useCallback(async () => {
        const [dashboardRes, fullGraphRes] = await Promise.all([
            fetch("/api/graph?mode=dashboard"),
            fetch("/api/graph?mode=full"),
        ]);

        if (dashboardRes.ok) {
            const data = await dashboardRes.json();
            const liveSpaces: VaultSpace[] = Array.isArray(data.spaces) ? data.spaces : [];
            setSpaces(liveSpaces);
            setGraphNodeCount(data?.stats?.nodeCount);
            if (!selectedVaultId && liveSpaces.length > 0) {
                setSelectedVaultId(liveSpaces[0].id);
            }
        }

        if (fullGraphRes.ok) {
            const data = await fullGraphRes.json();
            setNodes(Array.isArray(data.nodes) ? data.nodes : []);
        }
    }, [selectedVaultId]);

    useEffect(() => {
        fetchVaultData().catch((error) => {
            console.error("Failed to fetch vault data:", error);
            notifyError(error, "Sync failed");
        });
    }, [fetchVaultData, notifyError]);

    const filteredSpaces = useMemo(() => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return spaces;
        return spaces.filter((space) => {
            const haystack = [
                space.name,
                space.overview || "",
                ...(space.overviewStats?.keyThemes || []),
                ...(space.overviewStats?.topTags?.map((tag) => tag.value) || []),
            ].join(" ").toLowerCase();
            return haystack.includes(query);
        });
    }, [spaces, searchQuery]);

    useEffect(() => {
        if (filteredSpaces.length > 0 && !filteredSpaces.some((space) => space.id === selectedVaultId)) {
            setSelectedVaultId(filteredSpaces[0].id);
        }
    }, [filteredSpaces, selectedVaultId]);

    const selectedVault = spaces.find((space) => space.id === selectedVaultId) || filteredSpaces[0] || null;

    const allSelectedSources = useMemo(() => {
        if (!selectedVault) return [];
        return nodes
            .filter((node) => {
                const isSourceNode = ["document", "audio", "image"].includes(node.type);
                const inScope = selectedVault.id === "global" ? !node.vaultId : node.vaultId === selectedVault.id;
                return isSourceNode && inScope;
            })
            .map((node) => ({
                id: node.id,
                name: node.label,
                type: node.type as VaultSource["type"],
                summary: typeof node.properties?.summary === "string" ? node.properties.summary : "",
                mimeType: typeof node.properties?.mimeType === "string" ? node.properties.mimeType : "",
                contentType: typeof node.properties?.contentType === "string" ? node.properties.contentType : "",
                sourceType: typeof node.properties?.sourceType === "string" ? node.properties.sourceType : "",
            }));
    }, [nodes, selectedVault]);

    const selectedSources = useMemo(() => {
        return allSelectedSources.filter((source) => {
            if (sourceFilter === "all") return true;
            if (sourceFilter === "documents") return source.type === "document";
            if (sourceFilter === "audio") return source.type === "audio";
            if (sourceFilter === "images") return source.type === "image";
            if (sourceFilter === "imports") return source.sourceType === "youtube";
            return true;
        });
    }, [allSelectedSources, sourceFilter]);

    const selectedSourceStats = useMemo(() => ({
        documents: allSelectedSources.filter((source) => source.type === "document" && source.sourceType !== "youtube").length,
        audio: allSelectedSources.filter((source) => source.type === "audio").length,
        images: allSelectedSources.filter((source) => source.type === "image").length,
        imports: allSelectedSources.filter((source) => source.sourceType === "youtube").length,
    }), [allSelectedSources]);

    const handleCreateVault = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!newVaultName.trim()) return;

        try {
            const res = await fetch("/api/vaults", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: newVaultName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to create vault");
            setNewVaultName("");
            setIsCreateVaultModalOpen(false);
            await fetchVaultData();
            setSelectedVaultId(data.id);
        } catch (error) {
            console.error("Failed to create vault:", error);
            notifyError(error, "Vault creation failed");
        }
    };

    const handleFileUpload = async (file: File | undefined) => {
        if (!file || !selectedVault) return;
        setUploadStatus("uploading");
        setUploadFileName(file.name);
        setUploadError("");

        try {
            const formData = new FormData();
            formData.append("file", file);
            if (selectedVault.id !== "global") {
                formData.append("vaultId", selectedVault.id);
            }

            const res = await fetch("/api/upload", { method: "POST", body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Upload failed");

            setUploadStatus("success");
            await fetchVaultData();
            setTimeout(() => setUploadStatus(null), 2200);
        } catch (error) {
            const notice = notifyError(error, "Upload failed");
            setUploadStatus("error");
            setUploadError(notice.message);
            setTimeout(() => setUploadStatus(null), 4000);
        }
    };

    const handleYouTubeImport = async () => {
        if (!importUrl.trim() || !selectedVault) return;

        setIsImportingUrl(true);
        setImportError("");

        try {
            const res = await fetch("/api/import/youtube", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    url: importUrl.trim(),
                    ...(selectedVault.id !== "global" ? { vaultId: selectedVault.id } : {}),
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "YouTube import failed");

            setIsImportModalOpen(false);
            setImportUrl("");
            setUploadStatus("success");
            setUploadFileName(data.filename || "YouTube transcript");
            await fetchVaultData();
            setTimeout(() => setUploadStatus(null), 2400);
        } catch (error) {
            const notice = notifyError(error, "Import failed");
            setImportError(notice.message);
            setUploadStatus("error");
            setUploadError(notice.message);
            setTimeout(() => setUploadStatus(null), 4000);
        } finally {
            setIsImportingUrl(false);
        }
    };

    return (
        <div className="flex h-[100dvh] bg-zinc-50 font-sans text-zinc-900 overflow-hidden selection:bg-orange-100 selection:text-orange-900">
            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body { font-family: 'Outfit', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.32); border-radius: 10px; }
      `,
            }} />

            <NavSidebar
                nodeCount={graphNodeCount}
                isOpen={isNavSidebarOpen}
                onToggle={() => setIsNavSidebarOpen((open) => !open)}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/70">
                <div className="max-w-[1360px] mx-auto px-6 py-8 flex flex-col gap-8">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500 font-mono mb-3">Vault Command Center</p>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Knowledge Vault</h1>
                            <p className="mt-2 max-w-3xl text-sm text-zinc-500 leading-relaxed">
                                Manage vaults as first-class memory objects. Inspect their source mix, freshness, and quick paths into chat, graph exploration, contradictions, and source inspection.
                            </p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                            <button onClick={() => setIsCreateVaultModalOpen(true)} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:border-zinc-300 transition-colors flex items-center gap-2">
                                <FolderPlus size={14} /> Create Vault
                            </button>
                            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-medium text-zinc-700 hover:border-zinc-300 transition-colors flex items-center gap-2">
                                <Upload size={14} /> Upload File
                            </button>
                            <button
                                onClick={() => {
                                    setImportError("");
                                    setIsImportModalOpen(true);
                                }}
                                className="rounded-xl bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                            >
                                <Link2 size={14} /> Import URL
                            </button>
                        </div>
                    </div>

                    <div className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3">
                            <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                                <Search size={16} className="text-zinc-400 shrink-0" />
                                <input
                                    value={searchQuery}
                                    onChange={(event) => setSearchQuery(event.target.value)}
                                    placeholder="Search vaults by name, themes, or overview"
                                    className="w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                                />
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] font-mono uppercase tracking-wider text-zinc-500">{spaces.length} vaults</span>
                                <span className="px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-[11px] font-mono uppercase tracking-wider text-zinc-500">{graphNodeCount ?? "—"} nodes</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 mb-4">
                                <Layers3 size={16} className="text-orange-500" />
                                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Vault Registry</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredSpaces.map((space, index) => {
                                    const isActive = selectedVault?.id === space.id;
                                    return (
                                        <motion.button
                                            key={space.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.03 }}
                                            onClick={() => setSelectedVaultId(space.id)}
                                            className={`relative overflow-hidden rounded-[1.75rem] border p-5 text-left transition-all ${isActive ? "border-orange-300 bg-orange-50/50 shadow-[0_10px_30px_-18px_rgba(249,115,22,0.35)]" : "border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-[0_10px_30px_-20px_rgba(24,24,27,0.18)]"}`}
                                        >
                                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.08),transparent_45%)] pointer-events-none" />
                                            <div className="relative z-10">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`h-9 w-9 rounded-2xl border flex items-center justify-center ${isActive ? "border-orange-200 bg-white text-orange-700" : "border-zinc-200 bg-zinc-50 text-zinc-600"}`}>
                                                                <Database size={16} />
                                                            </div>
                                                            <div className="min-w-0">
                                                                <h3 className="text-sm font-semibold text-zinc-950 truncate">{space.name}</h3>
                                                                <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{space.size}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {space.overviewNeedsRefresh ? (
                                                        <span className="px-2 py-1 rounded-md bg-amber-50 border border-amber-100 text-[10px] font-mono text-amber-700">stale</span>
                                                    ) : (
                                                        <span className="px-2 py-1 rounded-md bg-emerald-50 border border-emerald-100 text-[10px] font-mono text-emerald-700">fresh</span>
                                                    )}
                                                </div>

                                                <p className="mt-4 text-sm text-zinc-600 leading-relaxed line-clamp-3">
                                                    {space.overview || "No vault overview generated yet. Import sources or run a project-wide summary to build one."}
                                                </p>

                                                <div className="mt-4 flex flex-wrap gap-2">
                                                    {(space.overviewStats?.keyThemes || []).slice(0, 2).map((theme) => (
                                                        <span key={theme} className="px-2.5 py-1 rounded-full bg-zinc-50 border border-zinc-200 text-[11px] text-zinc-600">{theme}</span>
                                                    ))}
                                                </div>

                                                <div className="mt-5 flex items-center justify-between text-[11px] font-mono text-zinc-500">
                                                    <span className="flex items-center gap-1.5"><Clock3 size={11} /> {space.lastSync}</span>
                                                    <span>{space.chunks} chunks</span>
                                                </div>
                                            </div>
                                        </motion.button>
                                    );
                                })}
                            </div>
                        </div>

                        {selectedVault && (
                            <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                                <div className="flex items-center justify-between gap-4">
                                    <div>
                                        <p className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Selected Vault</p>
                                        <h2 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">{selectedVault.name}</h2>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => router.push(selectedVault.id !== "global" ? `/chat?vault=${encodeURIComponent(selectedVault.id)}` : "/chat")} className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors">Open Chat</button>
                                        <button onClick={() => router.push(selectedVault.id !== "global" ? `/graph?vault=${encodeURIComponent(selectedVault.id)}` : "/graph")} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-300 transition-colors">Graph</button>
                                        <button onClick={() => router.push(selectedVault.id !== "global" ? `/contradictions?vault=${encodeURIComponent(selectedVault.id)}` : "/contradictions")} className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-300 transition-colors">Contradictions</button>
                                    </div>
                                </div>

                                <p className="mt-4 text-sm text-zinc-600 leading-relaxed">
                                    {selectedVault.overview || "This vault is ready for source ingestion. Add files or imports, then ask the agent for a project-wide summary to build overview memory."}
                                </p>

                                <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                                    <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4"><div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Documents</div><div className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">{selectedSourceStats.documents}</div></div>
                                    <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4"><div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Audio</div><div className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">{selectedSourceStats.audio}</div></div>
                                    <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4"><div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">Images</div><div className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">{selectedSourceStats.images}</div></div>
                                    <div className="rounded-2xl bg-zinc-50 border border-zinc-200 p-4"><div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">URL Imports</div><div className="mt-2 text-2xl font-bold tracking-tight text-zinc-950">{selectedSourceStats.imports}</div></div>
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2">
                                    {(selectedVault.overviewStats?.keyThemes || []).slice(0, 4).map((theme) => (
                                        <span key={theme} className="px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100 text-xs text-orange-700">{theme}</span>
                                    ))}
                                    {(selectedVault.overviewStats?.followUpQuestions || []).slice(0, 1).map((question) => (
                                        <button key={question} onClick={() => router.push(`/chat?vault=${encodeURIComponent(selectedVault.id)}&q=${encodeURIComponent(question)}`)} className="px-3 py-1.5 rounded-full bg-white border border-zinc-200 text-xs text-zinc-600 hover:border-orange-300 hover:text-orange-700 transition-colors">
                                            {question}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-4">
                                    {uploadStatus === "uploading" ? (
                                        <div className="flex items-center gap-3 text-sm text-zinc-700"><Upload size={16} className="text-orange-500" />Ingesting {uploadFileName} into {selectedVault.name}...</div>
                                    ) : uploadStatus === "success" ? (
                                        <div className="flex items-center gap-3 text-sm text-emerald-700"><CheckCircle2 size={16} />{uploadFileName} added successfully.</div>
                                    ) : uploadStatus === "error" ? (
                                        <div className="flex items-center gap-3 text-sm text-red-700"><AlertTriangle size={16} />{uploadError}</div>
                                    ) : (
                                        <div className="flex flex-wrap items-center gap-2">
                                            <button onClick={() => fileInputRef.current?.click()} className="rounded-xl bg-white border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-300 transition-colors flex items-center gap-2"><Upload size={13} /> Add File</button>
                                            <button onClick={() => { setImportError(""); setIsImportModalOpen(true); }} className="rounded-xl bg-white border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-300 transition-colors flex items-center gap-2"><Youtube size={13} /> Import YouTube</button>
                                            <button onClick={() => router.push(`/chat?vault=${encodeURIComponent(selectedVault.id)}&q=${encodeURIComponent("What is this whole project about?")}`)} className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors flex items-center gap-2"><ScanSearch size={13} /> Refresh via Chat</button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {selectedVault && (
                        <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <FileText size={16} className="text-orange-500" />
                                        <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Source Browser</h2>
                                    </div>
                                    <p className="mt-1 text-sm text-zinc-500">Browse this vault’s sources and jump straight into file-level investigations.</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {[
                                        { id: "all", label: "All", icon: Database },
                                        { id: "documents", label: "Docs", icon: FileText },
                                        { id: "audio", label: "Audio", icon: AudioLines },
                                        { id: "images", label: "Images", icon: ImageIcon },
                                        { id: "imports", label: "Imports", icon: Youtube },
                                    ].map((filter) => {
                                        const Icon = filter.icon;
                                        const active = sourceFilter === filter.id;
                                        return (
                                            <button
                                                key={filter.id}
                                                onClick={() => setSourceFilter(filter.id as SourceFilter)}
                                                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors flex items-center gap-1.5 ${active ? "bg-zinc-900 border-zinc-900 text-white" : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"}`}
                                            >
                                                <Icon size={12} /> {filter.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {selectedSources.length === 0 ? (
                                    <div className="col-span-full rounded-[1.5rem] border border-dashed border-zinc-200 bg-zinc-50 p-10 text-center">
                                        <Database size={24} className="mx-auto text-zinc-400 mb-3" />
                                        <p className="text-sm font-medium text-zinc-700">No sources in this filter yet</p>
                                        <p className="mt-1 text-xs text-zinc-500">Upload files or import a YouTube transcript into this vault.</p>
                                    </div>
                                ) : (
                                    selectedSources.map((source, index) => (
                                        <motion.div
                                            key={source.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.02 }}
                                            className="rounded-[1.5rem] border border-zinc-200 bg-zinc-50/70 p-4 hover:border-zinc-300 hover:bg-white transition-colors"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-9 w-9 rounded-2xl border border-zinc-200 bg-white flex items-center justify-center shrink-0">
                                                            <FileIcon type={inferFileKind(source)} size={16} className="text-zinc-600" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h3 className="text-sm font-semibold text-zinc-900 truncate">{source.name}</h3>
                                                            <p className="text-[11px] font-mono text-zinc-500 mt-0.5">{source.sourceType === "youtube" ? "youtube import" : source.type}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-1 rounded-md bg-white border border-zinc-200 text-[10px] font-mono text-zinc-500">{source.mimeType || source.contentType || source.type}</span>
                                            </div>

                                            <p className="mt-4 text-sm leading-relaxed text-zinc-600 line-clamp-3">{source.summary || "No source summary generated yet."}</p>

                                            <div className="mt-4 flex items-center gap-2 flex-wrap">
                                                <button onClick={() => router.push(`/documents/${encodeURIComponent(source.id)}`)} className="rounded-xl bg-white border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-300 transition-colors">Inspect</button>
                                                <button onClick={() => router.push(`/chat?vault=${encodeURIComponent(selectedVault.id)}&q=${encodeURIComponent(`Summarize the document "${source.name}" in detail. Document ID: ${source.id}.`)}`)} className="rounded-xl bg-white border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:border-zinc-300 transition-colors">Summarize</button>
                                                <button onClick={() => router.push(`/chat?vault=${encodeURIComponent(selectedVault.id)}&q=${encodeURIComponent(`Investigate the document "${source.name}". Explain what it is about, key claims, important entities, and any links or contradictions it may have. Document ID: ${source.id}.`)}`)} className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 transition-colors flex items-center gap-1.5">Investigate <ArrowRight size={12} /></button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.webm" onChange={(event) => handleFileUpload(event.target.files?.[0])} />

            <AnimatePresence>
                {isCreateVaultModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 10 }}
                            transition={spring}
                            className="w-[420px] max-w-[92vw] rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-xl"
                        >
                            <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-zinc-500">Create Vault</p>
                            <h3 className="mt-2 text-xl font-semibold tracking-tight text-zinc-950">New Knowledge Vault</h3>
                            <p className="mt-2 text-sm text-zinc-500">Create a new project scope, then add sources and start building memory.</p>
                            <form onSubmit={handleCreateVault} className="mt-5 flex flex-col gap-4">
                                <input
                                    value={newVaultName}
                                    onChange={(event) => setNewVaultName(event.target.value)}
                                    placeholder="Example: Learn Context Graphs"
                                    className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-800 outline-none focus:border-orange-300 focus:bg-white"
                                    autoFocus
                                />
                                <div className="flex items-center justify-end gap-3">
                                    <button type="button" onClick={() => setIsCreateVaultModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100">Cancel</button>
                                    <MagneticButton type="submit" disabled={!newVaultName.trim()} className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Create Vault</MagneticButton>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <YouTubeImportModal
                isOpen={isImportModalOpen}
                value={importUrl}
                isImporting={isImportingUrl}
                error={importError}
                onChange={setImportUrl}
                onClose={() => {
                    setIsImportModalOpen(false);
                    setImportError("");
                }}
                onSubmit={handleYouTubeImport}
            />
            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
