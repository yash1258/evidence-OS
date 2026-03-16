"use client";

import { useEffect, useState } from "react";
import UploadZone from "./UploadZone";
import { motion, AnimatePresence } from "framer-motion";
import { FilePdf, ImageSquare, Waveform, FileText, Trash, Database } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface Document {
  id: string;
  originalName: string;
  mimeType: string;
  contentType: string;
  summary: string;
  tags: string[];
  chunkCount: number;
  uploadedAt: string;
}

interface SidebarProps {
  onDocumentsChange?: () => void;
}

function FileIcon({ mimeType, size = 18 }: { mimeType: string; size?: number }) {
  if (mimeType.startsWith("image/")) return <ImageSquare size={size} weight="duotone" className="text-sky-500" />;
  if (mimeType.startsWith("audio/")) return <Waveform size={size} weight="duotone" className="text-violet-500" />;
  if (mimeType === "application/pdf") return <FilePdf size={size} weight="duotone" className="text-rose-500" />;
  return <FileText size={size} weight="duotone" className="text-slate-500" />;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Sidebar({ onDocumentsChange }: SidebarProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
      onDocumentsChange?.();
    } catch {
      /* fetch docs again if delete failed */
      fetchDocuments();
    }
  };

  return (
    <aside className="bento-card flex flex-col h-full w-full">
      {/* ── Brand ── */}
      <div className="flex items-center gap-3 mb-6 shrink-0">
        <div className="w-10 h-10 rounded-[14px] bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Database weight="duotone" size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-[16px] font-bold tracking-tighter text-zinc-950 leading-none mb-1">
            EvidenceOS
          </h1>
          <p className="text-[12px] font-bold text-zinc-500 leading-none tracking-tight">
            Knowledge Agent
          </p>
        </div>
      </div>

      {/* ── Upload ── */}
      <div className="mb-6 shrink-0">
        <UploadZone onUploadComplete={() => {
          fetchDocuments();
          onDocumentsChange?.();
        }} />
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 shrink-0 px-1">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Indexed Memory
        </span>
        <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
          {documents.length}
        </span>
      </div>

      {/* ── Intelligent List ── */}
      <div className="flex-1 overflow-y-auto -mx-2 px-2 pb-4 relative">
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-[1rem] bg-slate-100 animate-pulse-slow" style={{ animationDelay: `${i * 150}ms` }} />
            ))}
          </div>
        ) : documents.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center h-full text-center px-4"
          >
            <div className="w-12 h-12 rounded-2xl bg-zinc-50 flex items-center justify-center mb-3 shadow-sm border border-zinc-100/50">
              <Database weight="duotone" size={24} className="text-zinc-300" />
            </div>
            <p className="text-sm font-bold tracking-tight text-zinc-900">Empty Knowledge Base</p>
            <p className="text-[12px] text-zinc-500 mt-1 max-w-[20ch] font-medium leading-tight">
              Documents you index will logically order here.
            </p>
          </motion.div>
        ) : (
          <motion.ul layout className="flex flex-col gap-1.5 focus-visible:outline-none">
            <AnimatePresence initial={false}>
              {documents.map((doc) => (
                <motion.li
                  layout
                  layoutId={doc.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, height: 0, marginBottom: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  key={doc.id}
                  className="group relative flex items-start gap-3 p-3 rounded-[1.25rem] bg-white border border-transparent hover:border-zinc-200/60 hover:premium-shadow transition-all duration-300 overflow-hidden"
                >
                  <div className="shrink-0 mt-0.5 bg-zinc-50/50 p-1.5 rounded-xl border border-zinc-100 group-hover:bg-white transition-colors shadow-sm">
                    <FileIcon mimeType={doc.mimeType} />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-[13px] font-bold tracking-tight text-zinc-950 truncate mr-2">
                        {doc.originalName}
                      </p>
                      <span className="text-[10px] font-mono font-bold text-zinc-400 shrink-0">
                        {formatRelativeTime(doc.uploadedAt)}
                      </span>
                    </div>

                    {doc.summary && (
                      <p className="text-[11px] font-medium text-zinc-500 truncate mb-1.5 tracking-tight">
                        {doc.summary}
                      </p>
                    )}

                    {doc.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-0.5">
                        {doc.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="text-[9px] font-bold px-1.5 py-0.5 bg-zinc-50 text-zinc-500 rounded-md border border-zinc-100/50 uppercase tracking-wide leading-none"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-white via-white to-transparent pl-4 py-2">
                    <button
                      onClick={(e) => { e.preventDefault(); handleDelete(doc.id); }}
                      className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 transition-colors tactile-btn"
                    >
                      <Trash weight="bold" size={14} />
                    </button>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>

      {/* ── Status indicator ── */}
      <div className="mt-4 pt-4 shrink-0 flex items-center justify-between border-t border-slate-100/80">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
            Node Online
          </span>
        </div>
        <span className="text-[10px] font-mono font-semibold text-slate-400 bg-slate-50 px-2 py-1 rounded-md">
          Gemini 3 Flash
        </span>
      </div>
    </aside>
  );
}
