"use client";

import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link2, Youtube } from "lucide-react";
import { MagneticButton } from "@/components/Shared/MagneticButton";

interface YouTubeImportModalProps {
  isOpen: boolean;
  value: string;
  isImporting: boolean;
  error?: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}

export function YouTubeImportModal({
  isOpen,
  value,
  isImporting,
  error,
  onChange,
  onClose,
  onSubmit,
}: YouTubeImportModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            className="w-[460px] max-w-[92vw] rounded-[1.75rem] border border-zinc-200 bg-white p-6 shadow-xl"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-600">
                <Youtube size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-mono uppercase tracking-[0.24em] text-zinc-500">Import Source</p>
                <h3 className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">Import YouTube Transcript</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">
                  Paste a YouTube URL and EvidenceOS will fetch the transcript, chunk it by time range, and ingest it into the active vault.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                YouTube URL
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 focus-within:border-orange-300 focus-within:bg-white">
                <Link2 size={16} className="shrink-0 text-zinc-400" />
                <input
                  value={value}
                  onChange={(event) => onChange(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      onSubmit();
                    }
                  }}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full bg-transparent text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
                  autoFocus
                />
              </div>
              {error ? (
                <p className="mt-2 text-xs text-red-600">{error}</p>
              ) : (
                <p className="mt-2 text-xs text-zinc-400">
                  Works best when the video has public captions or auto-generated subtitles available.
                </p>
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-500 hover:bg-zinc-100"
              >
                Cancel
              </button>
              <MagneticButton
                type="button"
                onClick={onSubmit}
                disabled={!value.trim() || isImporting}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {isImporting ? "Importing..." : "Import Transcript"}
              </MagneticButton>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
