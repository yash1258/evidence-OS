"use client";

import React from 'react';
import {
    Database,
    Plus,
    ArrowUpRight,
    ScanSearch,
    Lock,
    Settings
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
    onNewInvestigation, 
    onUploadClick,
    onImportUrlClick,
    onSettingsClick,
    onOpenFile,
    onInvestigateFile,
    onSummarizeFile,
    vectorCount = "24.8M"
}: ContextSidebarProps) => {
    return (
        <aside className={cn(
            "w-[280px] shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between text-zinc-300 relative z-20 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.5)]",
            className
        )}>
            {/* Header */}
            <div className="h-14 border-b border-zinc-800/60 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <Database size={12} className="text-zinc-100" />
                    </div>
                    <span className="font-semibold text-sm text-zinc-100 tracking-tight">Vault Context</span>
                </div>
                <button onClick={onSettingsClick} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <Settings size={16} />
                </button>
            </div>

            {/* Middle Content */}
            <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6 custom-scrollbar">
                <button 
                    onClick={onNewInvestigation}
                    className="w-full bg-zinc-100 text-zinc-900 hover:bg-white transition-colors py-2 px-3 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm"
                >
                    <Plus size={16} /> New Investigation
                </button>

                <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">Local Vault</span>
                        <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Indexed
                        </span>
                    </div>

                    <div className="mb-2 grid grid-cols-2 gap-2">
                        <div 
                            onClick={onUploadClick}
                            className="border border-dashed border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-colors cursor-pointer group"
                        >
                            <Database size={20} className="text-zinc-600 group-hover:text-orange-500 transition-colors" />
                            <div className="text-center">
                                <p className="text-xs text-zinc-400 font-medium">Upload File</p>
                                <p className="text-[10px] text-zinc-600 font-mono mt-0.5">PDF, Audio, Images</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onImportUrlClick}
                            className="border border-dashed border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-colors cursor-pointer group text-left"
                        >
                            <ArrowUpRight size={20} className="text-zinc-600 group-hover:text-orange-500 transition-colors" />
                            <div className="text-center">
                                <p className="text-xs text-zinc-400 font-medium">Import URL</p>
                                <p className="text-[10px] text-zinc-600 font-mono mt-0.5">YouTube</p>
                            </div>
                        </button>
                    </div>

                    <div className="flex flex-col gap-0.5">
                        {vaultFiles.length > 0 ? (
                            vaultFiles.map(file => (
                                <div key={file.id} className="group px-2 py-2 rounded-md hover:bg-zinc-800/50 transition-colors">
                                    <div className="flex items-start justify-between gap-2">
                                        <button
                                            onClick={() => onOpenFile?.(file)}
                                            className="flex items-center gap-2 truncate pr-2 min-w-0 text-left"
                                        >
                                            <FileIcon type={file.type} size={14} className="text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                                            <div className="min-w-0">
                                                <span className="block text-xs text-zinc-400 group-hover:text-zinc-200 truncate">{file.name}</span>
                                                {file.summary && (
                                                    <span className="block text-[10px] text-zinc-600 truncate mt-0.5">{file.summary}</span>
                                                )}
                                            </div>
                                        </button>
                                        <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onSummarizeFile?.(file)}
                                                className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors flex items-center justify-center"
                                                title="Summarize file"
                                                aria-label={`Summarize ${file.name}`}
                                            >
                                                <ScanSearch size={12} />
                                            </button>
                                            <button
                                                onClick={() => onInvestigateFile?.(file)}
                                                className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors flex items-center justify-center"
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
                                <p className="text-[10px] text-zinc-600 font-mono">No files indexed in this vault</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer Hardware Status */}
            <div className="p-4 border-t border-zinc-800/60 bg-zinc-950 text-[10px] font-mono text-zinc-500 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5"><Lock size={12} className="text-zinc-600" /> Privacy</span>
                    <span className="text-emerald-500">Local-Only</span>
                </div>
                <div className="flex items-center justify-between">
                    <span>Vectors</span>
                    <span className="text-zinc-300">{vectorCount} Nodes</span>
                </div>
            </div>
        </aside>
    );
};
