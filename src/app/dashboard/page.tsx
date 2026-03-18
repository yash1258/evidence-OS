"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
    Plus,
    MessageSquare,
    CheckCircle2,
    ArrowUpRight,
    Search,
    Clock,
    FileText,
    Sparkles,
    ArrowRight,
    Folder,
    ChevronRight,
    Cpu,
    Activity,
    Upload,
    AlertCircle,
    Database,
    Network,
    Terminal,
    Link2
} from 'lucide-react';

import { MagneticButton } from '@/components/Shared/MagneticButton';
import { NavSidebar } from '@/components/Shared/NavSidebar';
import { ToastStack, useToastStack } from '@/components/Shared/ToastStack';
import { ThemedSelect } from '@/components/Shared/ThemedSelect';
import { YouTubeImportModal } from '@/components/Shared/YouTubeImportModal';
import { getNoticeFromError } from '@/lib/ui/errorNotice';

// --- TYPES ---

interface KnowledgeSpace {
    id: string;
    name: string;
    files: number;
    size: string;
    lastSync: string;
    overview?: string | null;
    overviewNeedsRefresh?: boolean;
    overviewStats?: {
        topTags?: Array<{ value: string; count: number }>;
        keyThemes?: string[];
        riskSignals?: string[];
        followUpQuestions?: string[];
        relationshipCounts?: Record<string, number>;
    } | null;
}

interface Investigation {
    id: string;
    title: string;
    excerpt: string;
    sources: number;
    time: string;
}

interface GraphStats {
    nodeCount: number;
    totalNodes?: number;
    edgeCount: number;
}

// --- CONFIGURATION & TOKENS ---
const SPRING_CONFIG = { type: "spring", stiffness: 120, damping: 20 } as const;

const SUGGESTED_PROMPTS = [
    "Summarize this whole project",
    "Find contradictions across my evidence",
    "List all entities in the knowledge graph"
];

// --- MAIN LAYOUT ---

export default function Dashboard() {
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const [activeScope, setActiveScope] = useState('all');
    const [isNavSidebarOpen, setIsNavSidebarOpen] = useState(true);

    // --- LIVE DATA STATE ---
    const [knowledgeSpaces, setKnowledgeSpaces] = useState<KnowledgeSpace[]>([]);
    const [recentInvestigations, setRecentInvestigations] = useState<Investigation[]>([]);
    const [graphStats, setGraphStats] = useState<GraphStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const [isDragging, setIsDragging] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<'uploading' | 'success' | 'error' | null>(null);
    const [uploadFileName, setUploadFileName] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [targetVaultId, setTargetVaultId] = useState('global');
    const [isCreateVaultModalOpen, setIsCreateVaultModalOpen] = useState(false);
    const [newVaultName, setNewVaultName] = useState('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [importUrl, setImportUrl] = useState('');
    const [isImportingUrl, setIsImportingUrl] = useState(false);
    const [importError, setImportError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const { toasts, pushToast, dismissToast } = useToastStack();

    const notifyError = useCallback((error: unknown, fallbackTitle: string) => {
        const notice = getNoticeFromError(error, fallbackTitle);
        pushToast({ ...notice, tone: 'error' });
        return notice;
    }, [pushToast]);

    const fetchDashboardData = useCallback(async () => {
        try {
            const res = await fetch('/api/graph?mode=dashboard');
            if (res.ok) {
                const data = await res.json();
                setKnowledgeSpaces(data.spaces || []);
                setRecentInvestigations(data.investigations || []);
                setGraphStats(data.stats || null);
            }
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            notifyError(err, 'Sync failed');
        } finally {
            setIsLoading(false);
        }
    }, [notifyError]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        const stored = window.localStorage.getItem('evidenceos.nav-sidebar-open');
        if (stored !== null) {
            setIsNavSidebarOpen(stored === 'true');
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem('evidenceos.nav-sidebar-open', String(isNavSidebarOpen));
    }, [isNavSidebarOpen]);

    // --- VAULT HANDLER ---
    const handleCreateVault = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newVaultName.trim()) return;
        try {
            const res = await fetch('/api/vaults', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newVaultName.trim() }),
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Failed to create vault');
            }
            setTargetVaultId(data.id);
            setNewVaultName('');
            setIsCreateVaultModalOpen(false);
            fetchDashboardData();
        } catch (err) {
            console.error('Failed to create vault:', err);
            notifyError(err, 'Vault creation failed');
        }
    };

    // --- UPLOAD HANDLER ---
    const handleFileUpload = async (file: File | undefined) => {
        if (!file) return;
        setUploadStatus('uploading');
        setUploadFileName(file.name);
        setUploadError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            if (targetVaultId !== 'global') {
                formData.append('vaultId', targetVaultId);
            }
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Upload failed');
            setUploadStatus('success');
            // Re-fetch dashboard data to show updated counts
            setTimeout(() => {
                fetchDashboardData();
                setUploadStatus(null);
            }, 2000);
        } catch (err) {
            const notice = notifyError(err, 'Upload failed');
            setUploadStatus('error');
            setUploadError(notice.message);
            setTimeout(() => setUploadStatus(null), 4000);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer?.files?.[0];
        if (file) handleFileUpload(file);
    };

    const handleYouTubeImport = async () => {
        if (!importUrl.trim()) return;

        setIsImportingUrl(true);
        setImportError('');

        try {
            const res = await fetch('/api/import/youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: importUrl.trim(),
                    ...(targetVaultId !== 'global' ? { vaultId: targetVaultId } : {}),
                }),
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'YouTube import failed');
            }

            setUploadStatus('success');
            setUploadFileName(data.filename || 'YouTube transcript');
            setIsImportModalOpen(false);
            setImportUrl('');
            fetchDashboardData();
            setTimeout(() => setUploadStatus(null), 2500);
        } catch (err) {
            const notice = notifyError(err, 'Import failed');
            setImportError(notice.message);
            setUploadStatus('error');
            setUploadError(notice.message);
            setTimeout(() => setUploadStatus(null), 4000);
        } finally {
            setIsImportingUrl(false);
        }
    };

    const handleOmnibarSubmit = () => {
        if (!searchQuery.trim()) return;
        const params = new URLSearchParams({ q: searchQuery.trim() });
        if (activeScope !== 'all') {
            params.set('vault', activeScope);
        }
        router.push(`/chat?${params.toString()}`);
    };

    const handleSuggestedPrompt = (prompt: string, scopeId?: string) => {
        const params = new URLSearchParams({ q: prompt });
        const effectiveScope = scopeId && scopeId !== 'all' ? scopeId : activeScope !== 'all' ? activeScope : undefined;
        if (effectiveScope) {
            params.set('vault', effectiveScope);
        }
        router.push(`/chat?${params.toString()}`);
    };

    const activeSuggestedPrompts =
        activeScope !== 'all'
            ? knowledgeSpaces.find((space) => space.id === activeScope)?.overviewStats?.followUpQuestions?.slice(0, 3) || SUGGESTED_PROMPTS
            : SUGGESTED_PROMPTS;

    const containerVariants = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.08 } }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        show: { opacity: 1, y: 0, transition: SPRING_CONFIG }
    };

    return (
        <div className="app-shell flex h-[100dvh] font-sans text-zinc-900 overflow-hidden selection:bg-orange-100 selection:text-orange-900">
            <NavSidebar
                nodeCount={graphStats?.nodeCount}
                isOpen={isNavSidebarOpen}
                onToggle={() => setIsNavSidebarOpen((open) => !open)}
            />

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col relative min-w-0 overflow-y-auto custom-scrollbar">
                <div className="app-page-grid absolute inset-0 bg-[size:32px_32px] pointer-events-none -z-10 opacity-60" />
                <div className="absolute top-0 right-0 w-[50vw] h-[50vw] bg-[radial-gradient(circle_at_top_right,rgba(199,106,46,0.08),transparent_50%)] pointer-events-none -z-10 blur-3xl" />

                <header className="app-toolbar h-14 flex items-center justify-end px-6 lg:px-8 sticky top-0 z-30 shrink-0">
                    <div className="flex items-center gap-4 shrink-0">
                        <button
                            onClick={() => searchInputRef.current?.focus()}
                            className="flex items-center gap-2 text-xs font-medium text-stone-500 hover:text-stone-900 transition-colors"
                        >
                            <Search size={14} /> <span className="hidden sm:inline">Search OS</span>
                        </button>
                        <div className="w-px h-4 bg-stone-200" />
                        <div className="w-7 h-7 rounded-full bg-[#231917] text-orange-50 flex items-center justify-center shadow-sm font-mono text-[10px] cursor-pointer border border-amber-200/10 shrink-0 hover:bg-[#31211d] transition-colors">
                            ME
                        </div>
                    </div>
                </header>

                <motion.div
                    className="p-5 md:p-8 lg:p-10 flex flex-col gap-10 max-w-[1200px] mx-auto w-full flex-1"
                    variants={containerVariants}
                    initial="hidden"
                    animate="show"
                >
                    {/* HERO: The Omnibar */}
                    <motion.div variants={itemVariants} className="flex flex-col items-center text-center mt-2 md:mt-6 mb-2">
                        <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tighter text-zinc-900 mb-6 text-balance leading-tight">
                            What do you want to investigate?
                        </h1>

                        <div className={`app-panel w-full max-w-2xl rounded-[1.7rem] transition-all duration-300 flex flex-col overflow-hidden relative ${isFocused
                            ? 'border-orange-500/45 shadow-[0_18px_42px_-18px_rgba(199,106,46,0.22)] ring-4 ring-orange-500/10'
                            : ''
                            }`}>
                            <div className="flex items-center px-4 py-3.5 border-b border-stone-200/70 bg-white/80 relative z-10">
                                <Sparkles size={18} className={`shrink-0 mr-3 transition-colors ${isFocused ? 'text-orange-500' : 'text-stone-400'}`} />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    placeholder="Ask about your documents, cross-reference files, or extract data..."
                                    className="flex-1 bg-transparent border-none outline-none text-base text-zinc-800 placeholder:text-zinc-400 min-w-0"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleOmnibarSubmit(); }}
                                />
                                <div className="flex items-center gap-3 shrink-0 ml-2">
                                    <MagneticButton
                                        disabled={!searchQuery}
                                        onClick={handleOmnibarSubmit}
                                        className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${searchQuery ? 'app-button-primary shadow-md' : 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200/70'}`}
                                    >
                                        <ArrowRight size={14} className={searchQuery ? 'ml-0.5' : ''} />
                                    </MagneticButton>
                                </div>
                            </div>

                            <div className="bg-[linear-gradient(180deg,rgba(255,246,233,0.7),rgba(255,251,245,0.88))] px-4 py-2.5 flex items-center gap-3 overflow-x-auto no-scrollbar relative z-0">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 shrink-0 font-semibold flex items-center gap-1">
                                    <Database size={10} /> Context:
                                </span>
                                <button
                                    onClick={() => setActiveScope('all')}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${activeScope === 'all' ? 'app-chip-active' : 'text-stone-500 hover:text-stone-700'}`}
                                >
                                    All Vaults
                                </button>
                                {knowledgeSpaces.length > 0 && <div className="w-px h-3 bg-stone-200 shrink-0" />}
                                {knowledgeSpaces.map((space) => (
                                    <button
                                        key={space.id}
                                        onClick={() => setActiveScope(space.id)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition-all shrink-0 ${activeScope === space.id ? 'app-chip-active' : 'text-stone-500 hover:text-stone-700'}`}
                                    >
                                        <Folder size={12} className={activeScope === space.id ? 'text-blue-500' : ''} /> {space.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-wrap justify-center gap-2 mt-5">
                            {activeSuggestedPrompts.map((prompt, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSuggestedPrompt(prompt)}
                                    className="app-chip px-3.5 py-1.5 rounded-full text-xs hover:border-orange-300 hover:text-orange-700 hover:shadow-sm transition-all cursor-pointer"
                                >
                                    {prompt}
                                </button>
                            ))}
                        </div>
                    </motion.div>

                    {/* ROW 1: Evidence Vault + Upload */}
                    <motion.div variants={itemVariants} className="flex flex-col gap-5">
                        <div className="flex items-center justify-between">
                            <h2 className="text-[13px] font-bold tracking-wider text-zinc-900 uppercase">Evidence Vault</h2>
                            <div className="flex items-center gap-3">
                                <ThemedSelect
                                    label="Target"
                                    value={targetVaultId}
                                    onChange={setTargetVaultId}
                                    options={[
                                        { value: 'global', label: 'Global Namespace' },
                                        ...knowledgeSpaces.map((space) => ({
                                            value: space.id,
                                            label: space.name,
                                        })),
                                    ]}
                                    buttonClassName="shadow-sm"
                                    minMenuWidthClassName="min-w-[220px]"
                                />
                                <button
                                    onClick={() => setIsCreateVaultModalOpen(true)}
                                    className="app-button-secondary text-[11px] font-semibold transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-xl shadow-sm"
                                >
                                    <Folder size={12} /> New Vault
                                </button>
                                <button
                                    onClick={() => {
                                        setImportError('');
                                        setIsImportModalOpen(true);
                                    }}
                                    className="app-button-secondary text-[11px] font-semibold transition-colors flex items-center gap-1 px-2.5 py-1.5 rounded-xl shadow-sm"
                                >
                                    <Link2 size={12} /> Import URL
                                </button>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="app-button-primary text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-md px-2.5 py-1.5 rounded-xl"
                                >
                                    <Plus size={12} /> Upload File
                                </button>
                            </div>
                            <input ref={fileInputRef} type="file" className="hidden" accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.webm" onChange={(e) => handleFileUpload(e.target.files?.[0])} />
                        </div>

                        <div
                            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                            onDragLeave={() => setIsDragging(false)}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`w-full rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                                isDragging
                                    ? 'border-orange-400 bg-orange-50/50 scale-[1.01]'
                                    : uploadStatus === 'success'
                                    ? 'border-emerald-300 bg-emerald-50/30'
                                    : uploadStatus === 'error'
                                    ? 'border-red-300 bg-red-50/30'
                                    : 'border-stone-200/80 bg-[rgba(255,252,247,0.88)] hover:border-orange-200/70 hover:bg-[rgba(255,249,241,0.95)]'
                            }`}
                        >
                            {uploadStatus === 'uploading' ? (
                                <>
                                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                        <Cpu size={24} className="text-orange-500" />
                                    </motion.div>
                                    <span className="text-sm font-medium text-zinc-700">Ingesting {uploadFileName}...</span>
                                    <span className="text-[11px] text-zinc-400 font-mono">Chunking → Embedding → Graph building</span>
                                </>
                            ) : uploadStatus === 'success' ? (
                                <>
                                    <CheckCircle2 size={24} className="text-emerald-500" />
                                    <span className="text-sm font-medium text-emerald-700">{uploadFileName} ingested successfully</span>
                                </>
                            ) : uploadStatus === 'error' ? (
                                <>
                                    <AlertCircle size={24} className="text-red-500" />
                                    <span className="text-sm font-medium text-red-700">{uploadError}</span>
                                </>
                            ) : (
                                <>
                                    <Upload size={24} className={isDragging ? 'text-orange-500' : 'text-zinc-400'} />
                                    <span className="text-sm font-medium text-zinc-600">
                                        {isDragging ? 'Drop to ingest' : 'Drop files here or click to upload'}
                                    </span>
                                    <span className="text-[10px] text-zinc-400 font-mono">PDF, TXT, MD, Images, Audio — auto-chunked</span>
                                </>
                            )}
                        </div>

                        {knowledgeSpaces.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {knowledgeSpaces.map((space) => (
                                    <div key={space.id} className="app-panel rounded-[1.6rem] p-4 flex flex-col hover:border-orange-300 hover:shadow-[0_18px_38px_-24px_rgba(199,106,46,0.25)] transition-all cursor-pointer group relative overflow-hidden">
                                        <div className="flex items-start justify-between mb-4 relative z-10">
                                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-sm bg-orange-50/80 border-orange-100/70 text-orange-700 group-hover:bg-white transition-colors">
                                                <Database size={16} />
                                            </div>
                                        </div>
                                        <div className="relative z-10 flex-1">
                                            <h3 className="text-[13px] font-bold text-zinc-900 truncate mb-1" title={space.name}>{space.name}</h3>
                                            <div className="flex items-center gap-2 text-[11px] text-stone-500 font-mono">
                                                <span className="bg-orange-50 px-1.5 py-0.5 rounded text-[10px] text-orange-700 border border-orange-100">{space.files} files</span>
                                                <span>{space.size}</span>
                                            </div>
                                            {space.overviewStats?.topTags && space.overviewStats.topTags.length > 0 && (
                                                <div className="mt-2 flex flex-wrap gap-1.5">
                                                    {space.overviewStats.topTags.slice(0, 2).map((tag) => (
                                                        <span key={tag.value} className="px-1.5 py-0.5 rounded bg-orange-50 border border-orange-100 text-[10px] font-mono text-orange-700">
                                                            {tag.value}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            {space.overviewStats?.keyThemes && space.overviewStats.keyThemes.length > 0 && (
                                                <p className="mt-2 text-[11px] leading-relaxed text-stone-600">
                                                    Themes: {space.overviewStats.keyThemes.slice(0, 3).join(', ')}
                                                </p>
                                            )}
                                            {space.overview && (
                                                <p className="mt-2 text-[11px] leading-relaxed text-stone-600 line-clamp-3">
                                                    {space.overview}
                                                </p>
                                            )}
                                            {space.overviewStats?.riskSignals && space.overviewStats.riskSignals.length > 0 && (
                                                <p className="mt-2 text-[11px] leading-relaxed text-stone-500 line-clamp-2">
                                                    {space.overviewStats.riskSignals[0]}
                                                </p>
                                            )}
                                            {space.overviewStats?.followUpQuestions && space.overviewStats.followUpQuestions.length > 0 && (
                                                <div className="mt-3 flex flex-wrap gap-1.5">
                                                    {space.overviewStats.followUpQuestions.slice(0, 2).map((question) => (
                                                        <button
                                                            key={question}
                                                            onClick={(event) => {
                                                                event.stopPropagation();
                                                                handleSuggestedPrompt(question, space.id);
                                                            }}
                                                            className="app-chip px-2 py-1 rounded-md text-[10px] font-medium hover:border-orange-300 hover:text-orange-700 transition-colors"
                                                        >
                                                            {question}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                            {!space.overview && space.overviewNeedsRefresh && (
                                                <p className="mt-2 text-[11px] leading-relaxed text-zinc-400">
                                                    Project overview will refresh on the next project-wide summary.
                                                </p>
                                            )}
                                        </div>
                                        <div className="mt-5 relative z-10 flex flex-col gap-2">
                                            <div className="flex items-center justify-between text-[10px] font-mono">
                                                <span className="text-emerald-600 font-semibold flex items-center gap-1"><CheckCircle2 size={10} /> Indexed</span>
                                                <span className="text-stone-500 flex items-center gap-1"><Clock size={9} /> {space.lastSync}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : !isLoading && (
                            <div className="text-center py-6 text-sm text-zinc-400">
                                No evidence ingested yet.
                            </div>
                        )}
                    </motion.div>

                    {/* ROW 2: Activity & Trust */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                        <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[13px] font-bold tracking-wider text-zinc-900 uppercase">Recent Investigations</h2>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => router.push(activeScope !== 'all' ? `/contradictions?vault=${encodeURIComponent(activeScope)}` : '/contradictions')}
                                        className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1"
                                    >
                                        Compare Conflicts <ArrowUpRight size={12} />
                                    </button>
                                    <button
                                        onClick={() => router.push('/investigations')}
                                        className="text-[11px] font-semibold text-stone-500 hover:text-stone-900 transition-colors flex items-center gap-1"
                                    >
                                        View History <ArrowUpRight size={12} />
                                    </button>
                                </div>
                            </div>

                            <div className="app-panel rounded-[1.6rem] flex flex-col overflow-hidden">
                                {recentInvestigations.length > 0 ? recentInvestigations.map((inv, idx) => (
                                    <div key={inv.id} className={`p-4 hover:bg-orange-50/40 transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${idx !== recentInvestigations.length - 1 ? 'border-b border-stone-200/60' : ''}`}>
                                        <div className="flex flex-col min-w-0 flex-1">
                                            <div className="flex items-center gap-2.5 mb-1.5">
                                                <div className="p-1 rounded bg-orange-50 border border-orange-100/70 group-hover:bg-orange-100 transition-colors shrink-0">
                                                    <MessageSquare size={12} className="text-orange-600 transition-colors" />
                                                </div>
                                                <h4 className="text-sm font-semibold text-zinc-900 truncate">{inv.title}</h4>
                                            </div>
                                            <p className="text-xs text-stone-600 truncate pl-7">{inv.excerpt}</p>
                                        </div>
                                        <div className="flex items-center sm:justify-end gap-5 shrink-0 pl-7 sm:pl-0 mt-2 sm:mt-0">
                                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-orange-50/70 border border-orange-100 text-[10px] font-mono text-orange-700">
                                                <FileText size={10} /> {inv.sources} sources
                                            </div>
                                            <span className="text-[10px] font-mono text-stone-500 w-12 text-right">{inv.time}</span>
                                            <ChevronRight size={16} className="text-stone-400" />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="p-8 text-center">
                                        <p className="text-sm text-zinc-400 mb-2">No investigations yet</p>
                                    </div>
                                )}
                            </div>
                        </motion.div>

                        <motion.div variants={itemVariants} className="lg:col-span-1 flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-[13px] font-bold tracking-wider text-zinc-900 uppercase">System Integrity</h2>
                            </div>

                            <div className="app-dark-sidebar rounded-[1.6rem] border shadow-[0_10px_30px_-15px_rgba(0,0,0,0.5)] p-5 flex flex-col gap-6 relative overflow-hidden h-full group">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(20,17,15,0.94)_100%)] pointer-events-none" />

                                <div className="relative z-10 flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                                            <CheckCircle2 size={20} className="text-emerald-300" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-stone-50 tracking-tight">Zero-Trust Active</h3>
                                            <p className="text-[10px] font-mono text-stone-400 mt-0.5">Daemon running locally.</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="relative z-10 flex flex-col gap-1 flex-1 justify-center app-dark-card rounded-2xl p-3">
                                    <div className="flex items-center justify-between py-1.5 border-b app-dark-line last:border-0">
                                        <span className="text-[11px] font-mono text-stone-400 flex items-center gap-2"><Network size={12} /> Graph Nodes</span>
                                        <span className="text-[11px] font-mono font-semibold text-stone-200">{graphStats?.totalNodes ?? graphStats?.nodeCount ?? '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b app-dark-line last:border-0">
                                        <span className="text-[11px] font-mono text-stone-400 flex items-center gap-2"><Activity size={12} /> Graph Edges</span>
                                        <span className="text-[11px] font-mono font-semibold text-stone-200">{graphStats?.edgeCount ?? '—'}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-1.5 border-b app-dark-line last:border-0">
                                        <span className="text-[11px] font-mono text-stone-400 flex items-center gap-2"><Cpu size={12} /> Agent Core</span>
                                        <span className="text-[11px] font-mono font-semibold text-emerald-300 text-right">Gemini ReAct</span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => router.push(activeScope !== 'all' ? `/graph?vault=${encodeURIComponent(activeScope)}` : '/graph')}
                                    className="relative z-10 w-full py-2.5 rounded-xl bg-white/[0.04] border app-dark-line hover:bg-white/[0.08] transition-colors text-xs font-medium text-stone-200 flex items-center justify-center gap-2"
                                >
                                    <Terminal size={14} /> View Telemetry Logs
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </main>

            {/* CREATE VAULT MODAL */}
            <AnimatePresence>
                {isCreateVaultModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/40 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="app-panel rounded-[1.6rem] shadow-xl p-6 w-[400px] max-w-[90vw] flex flex-col gap-4"
                        >
                            <h3 className="text-lg font-bold text-zinc-900">Create New Vault</h3>
                            <form onSubmit={handleCreateVault} className="flex flex-col gap-4 mt-2">
                                <input
                                    type="text"
                                    placeholder="Vault Name"
                                    value={newVaultName}
                                    onChange={(e) => setNewVaultName(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-[rgba(255,250,243,0.9)] outline-none text-sm transition-all focus:border-orange-300"
                                    autoFocus
                                />
                                <div className="flex items-center justify-end gap-3 mt-2">
                                    <button
                                        type="button"
                                        onClick={() => setIsCreateVaultModalOpen(false)}
                                        className="px-4 py-2 rounded-xl text-xs font-semibold text-stone-500 hover:bg-orange-50"
                                    >
                                        Cancel
                                    </button>
                                    <MagneticButton
                                        type="submit"
                                        disabled={!newVaultName.trim()}
                                        className="app-button-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
                                    >
                                        Create Vault
                                    </MagneticButton>
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
                    setImportError('');
                }}
                onSubmit={handleYouTubeImport}
            />
            <ToastStack toasts={toasts} onDismiss={dismissToast} />
        </div>
    );
}
