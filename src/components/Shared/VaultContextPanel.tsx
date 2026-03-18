"use client";

import React from "react";
import { motion } from "framer-motion";
import {
  ArrowUpRight,
  Database,
  Lock,
  Plus,
  ScanSearch,
  X,
} from "lucide-react";
import { FileIcon } from "./FileIcon";

interface VaultFile {
  id: number | string;
  name: string;
  type: string;
  size: string;
  status: string;
  documentId?: string;
  summary?: string;
}

interface VaultContextPanelProps {
  vaultFiles: VaultFile[];
  vectorCount?: string;
  onClose?: () => void;
  onNewInvestigation?: () => void;
  onUploadClick?: () => void;
  onImportUrlClick?: () => void;
  onOpenFile?: (file: VaultFile) => void;
  onInvestigateFile?: (file: VaultFile) => void;
  onSummarizeFile?: (file: VaultFile) => void;
}

export function VaultContextPanel({
  vaultFiles,
  vectorCount = "0",
  onClose,
  onNewInvestigation,
  onUploadClick,
  onImportUrlClick,
  onOpenFile,
  onInvestigateFile,
  onSummarizeFile,
}: VaultContextPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 240, damping: 24 }}
      className="app-panel w-[380px] max-w-[min(380px,calc(100vw-2rem))] rounded-[1.75rem] p-4 shadow-[0_22px_48px_-26px_rgba(77,52,22,0.38)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="app-kicker text-[10px] font-mono uppercase">Vault Context</p>
          <h3 className="mt-1 text-base font-semibold tracking-tight text-zinc-950">
            Active Sources
          </h3>
          <p className="mt-1 text-xs text-stone-600">
            Add sources, inspect indexed files, or launch a file-scoped investigation.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl p-2 text-stone-400 transition-colors hover:bg-orange-50 hover:text-stone-800"
          aria-label="Close vault context"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onNewInvestigation}
          className="app-button-primary rounded-2xl px-3 py-3 text-xs font-medium"
        >
          <span className="flex items-center justify-center gap-1.5">
            <Plus size={14} /> New
          </span>
        </button>
        <button
          type="button"
          onClick={onUploadClick}
          className="app-button-secondary rounded-2xl px-3 py-3 text-xs font-medium"
        >
          <span className="flex items-center justify-center gap-1.5">
            <Database size={14} /> Upload
          </span>
        </button>
        <button
          type="button"
          onClick={onImportUrlClick}
          className="app-button-secondary rounded-2xl px-3 py-3 text-xs font-medium"
        >
          <span className="flex items-center justify-center gap-1.5">
            <ArrowUpRight size={14} /> Import
          </span>
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between rounded-2xl border border-stone-200/70 bg-[rgba(255,248,239,0.82)] px-4 py-3 text-[11px] font-mono">
        <span className="text-stone-500">Indexed Files</span>
        <span className="text-stone-900">{vaultFiles.length}</span>
        <span className="text-stone-500">Vectors</span>
        <span className="text-stone-900">{vectorCount}</span>
      </div>

      <div className="mt-4 max-h-[360px] overflow-y-auto custom-scrollbar pr-1">
        {vaultFiles.length > 0 ? (
          <div className="flex flex-col gap-2">
            {vaultFiles.map((file) => (
              <div
                key={file.id}
                className="rounded-2xl border border-stone-200/70 bg-[rgba(255,252,247,0.82)] px-3 py-3 transition-colors hover:border-orange-200 hover:bg-[rgba(255,248,241,0.96)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenFile?.(file)}
                    className="flex min-w-0 items-start gap-2 text-left"
                  >
                    <div className="mt-0.5 h-8 w-8 shrink-0 rounded-xl border border-orange-100/80 bg-orange-50/80 flex items-center justify-center">
                      <FileIcon type={file.type} size={15} className="text-orange-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-zinc-900">
                        {file.name}
                      </div>
                      {file.summary ? (
                        <div className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-stone-600">
                          {file.summary}
                        </div>
                      ) : (
                        <div className="mt-1 text-[11px] text-stone-500">{file.type}</div>
                      )}
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onSummarizeFile?.(file)}
                      className="app-chip rounded-xl px-2.5 py-1.5 text-[10px] font-medium hover:border-orange-300 hover:text-orange-700"
                    >
                      <span className="flex items-center gap-1">
                        <ScanSearch size={11} /> Summary
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onInvestigateFile?.(file)}
                      className="app-button-secondary rounded-xl px-2.5 py-1.5 text-[10px] font-medium"
                    >
                      <span className="flex items-center gap-1">
                        <ArrowUpRight size={11} /> Investigate
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-200 bg-[rgba(255,248,239,0.72)] px-4 py-10 text-center">
            <Database size={22} className="mx-auto text-stone-400" />
            <p className="mt-3 text-sm font-medium text-zinc-800">
              No files indexed in this vault
            </p>
            <p className="mt-1 text-xs text-stone-500">
              Upload a document or import a source to start building project memory.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between text-[11px] font-mono text-stone-500">
        <span className="flex items-center gap-1.5">
          <Lock size={12} className="text-stone-500" /> Local-Only
        </span>
        <span>{vectorCount} nodes</span>
      </div>
    </motion.div>
  );
}
