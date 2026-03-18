"use client";

import React from 'react';
import { motion } from 'framer-motion';
import {
    Database,
    Plus,
    ArrowUpRight,
    ScanSearch,
    Lock,
    Settings,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { FileIcon } from './FileIcon';

interface VaultFile {
    id: number | string;
    name: string;
    type: string;
    size: string;
    status: string;
    documentId?: string;
    summary?: string;
}

interface ContextSidebarProps {
    className?: string;
    vaultFiles: VaultFile[];
    isOpen?: boolean;
    onToggle?: () => void;
    onNewInvestigation?: () => void;
    onUploadClick?: () => void;
    onImportUrlClick?: () => void;
    onSettingsClick?: () => void;
    onOpenFile?: (file: VaultFile) => void;
    onInvestigateFile?: (file: VaultFile) => void;
    onSummarizeFile?: (file: VaultFile) => void;
    vectorCount?: string;
}

export const ContextSidebar = ({ 
    className, 
    vaultFiles, 
    isOpen = true,
    onToggle,
    onNewInvestigation, 
    onUploadClick,
    onImportUrlClick,
    onSettingsClick,
    onOpenFile,
    onInvestigateFile,
    onSummarizeFile,
    vectorCount = "24.8M"
}: ContextSidebarProps) => {
    const compact = !isOpen;

    return (
        <motion.aside
            animate={{ width: isOpen ? 304 : 88 }}
            transition={{ type: "spring", stiffness: 230, damping: 28 }}
            className={cn(
                "app-dark-sidebar shrink-0 border app-dark-line flex flex-col justify-between text-stone-300 relative z-20 shadow-[12px_0_32px_-20px_rgba(0,0,0,0.45)] rounded-[1.8rem] overflow-hidden",
                className
            )}
        >
            {/* Header */}
            <div className={cn("h-14 border-b app-dark-line flex items-center", compact ? "justify-center px-3" : "justify-between px-4")}>
                <div className={cn("flex items-center", compact ? "justify-center" : "gap-2")}>
                    <div className="w-6 h-6 rounded-lg app-dark-card flex items-center justify-center">
                        <Database size={12} className="text-amber-200" />
                    </div>
                    {!compact && <span className="font-semibold text-sm text-stone-100 tracking-tight">Vault Context</span>}
                </div>
                {compact ? null : (
                    <div className="flex items-center gap-1">
                        <button onClick={onSettingsClick} className="text-stone-500 hover:text-stone-200 transition-colors p-1.5 rounded-lg hover:bg-white/[0.05]">
                            <Settings size={16} />
                        </button>
                        <button onClick={onToggle} className="text-stone-500 hover:text-stone-200 transition-colors p-1.5 rounded-lg hover:bg-white/[0.05]">
                            <PanelLeftClose size={16} />
                        </button>
                    </div>
                )}
                {compact ? (
                    <button onClick={onToggle} className="absolute inset-0 flex items-center justify-center text-stone-400 hover:text-stone-100 transition-colors" aria-label="Open vault context">
                        <PanelLeftOpen size={16} />
                    </button>
                ) : null}
            </div>

            {/* Middle Content */}
            <div className={cn("flex-1 overflow-y-auto py-4 custom-scrollbar", compact ? "px-2" : "px-3")}>
                {compact ? (
                    <div className="flex flex-col items-center gap-2">
                        <button onClick={onNewInvestigation} className="w-11 h-11 rounded-2xl app-dark-card flex items-center justify-center text-amber-200 hover:text-amber-100 transition-colors" title="New investigation">
                            <Plus size={16} />
                        </button>
                        <button onClick={onUploadClick} className="w-11 h-11 rounded-2xl bg-white/[0.04] border app-dark-line flex items-center justify-center text-stone-300 hover:text-stone-100 transition-colors" title="Upload file">
                            <Database size={16} />
                        </button>
                        <button onClick={onImportUrlClick} className="w-11 h-11 rounded-2xl bg-white/[0.04] border app-dark-line flex items-center justify-center text-stone-300 hover:text-stone-100 transition-colors" title="Import URL">
                            <ArrowUpRight size={16} />
                        </button>
                        <div className="mt-3 w-11 rounded-2xl bg-white/[0.04] border app-dark-line px-2 py-3 text-center">
                            <div className="text-[9px] font-mono uppercase tracking-wider text-stone-500">Files</div>
                            <div className="mt-1 text-sm font-semibold text-stone-100">{vaultFiles.length}</div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <button 
                            onClick={onNewInvestigation}
                            className="app-button-primary w-full transition-colors py-2.5 px-3 rounded-xl flex items-center gap-2 text-sm font-medium"
                        >
                            <Plus size={16} /> New Investigation
                        </button>

                        <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-500">Local Vault</span>
                                <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Indexed
                                </span>
                            </div>

                            <div className="mb-2 grid grid-cols-2 gap-2">
                                <div 
                                    onClick={onUploadClick}
                                    className="border border-dashed app-dark-line rounded-2xl p-4 flex flex-col items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] hover:border-amber-200/15 transition-colors cursor-pointer group"
                                >
                                    <Database size={20} className="text-stone-500 group-hover:text-amber-300 transition-colors" />
                                    <div className="text-center">
                                        <p className="text-xs text-stone-300 font-medium">Upload File</p>
                                        <p className="text-[10px] text-stone-500 font-mono mt-0.5">PDF, Audio, Images</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onImportUrlClick}
                                    className="border border-dashed app-dark-line rounded-2xl p-4 flex flex-col items-center justify-center gap-2 bg-white/[0.03] hover:bg-white/[0.06] hover:border-amber-200/15 transition-colors cursor-pointer group text-left"
                                >
                                    <ArrowUpRight size={20} className="text-stone-500 group-hover:text-amber-300 transition-colors" />
                                    <div className="text-center">
                                        <p className="text-xs text-stone-300 font-medium">Import URL</p>
                                        <p className="text-[10px] text-stone-500 font-mono mt-0.5">YouTube</p>
                                    </div>
                                </button>
                            </div>

                            <div className="flex flex-col gap-0.5">
                                {vaultFiles.length > 0 ? (
                                    vaultFiles.map(file => (
                                        <div key={file.id} className="group px-2 py-2 rounded-xl hover:bg-white/[0.05] transition-colors border border-transparent hover:border-amber-200/10">
                                            <div className="flex items-start justify-between gap-2">
                                                <button
                                                    onClick={() => onOpenFile?.(file)}
                                                    className="flex items-center gap-2 truncate pr-2 min-w-0 text-left"
                                                >
                                                    <FileIcon type={file.type} size={14} className="text-stone-500 group-hover:text-amber-200 shrink-0" />
                                                    <div className="min-w-0">
                                                        <span className="block text-xs text-stone-300 group-hover:text-stone-100 truncate">{file.name}</span>
                                                        {file.summary && (
                                                            <span className="block text-[10px] text-stone-500 truncate mt-0.5">{file.summary}</span>
                                                        )}
                                                    </div>
                                                </button>
                                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => onSummarizeFile?.(file)}
                                                        className="w-6 h-6 rounded-lg bg-white/[0.04] border app-dark-line text-stone-400 hover:text-stone-100 hover:border-amber-200/15 transition-colors flex items-center justify-center"
                                                        title="Summarize file"
                                                        aria-label={`Summarize ${file.name}`}
                                                    >
                                                        <ScanSearch size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => onInvestigateFile?.(file)}
                                                        className="w-6 h-6 rounded-lg bg-white/[0.04] border app-dark-line text-stone-400 hover:text-stone-100 hover:border-amber-200/15 transition-colors flex items-center justify-center"
                                                        title="Investigate file"
                                                        aria-label={`Investigate ${file.name}`}
                                                    >
                                                        <ArrowUpRight size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="px-2 py-4 text-center">
                                        <p className="text-[10px] text-stone-500 font-mono">No files indexed in this vault</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer Hardware Status */}
            {!compact ? (
                <div className="p-4 border-t app-dark-line text-[10px] font-mono text-stone-500 flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5"><Lock size={12} className="text-stone-600" /> Privacy</span>
                        <span className="text-emerald-400">Local-Only</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span>Vectors</span>
                        <span className="text-stone-200">{vectorCount} Nodes</span>
                    </div>
                </div>
            ) : (
                <div className="p-3 border-t app-dark-line text-center">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-stone-500">Nodes</div>
                    <div className="mt-1 text-sm font-semibold text-stone-100">{vectorCount}</div>
                </div>
            )}
        </motion.aside>
    );
};
