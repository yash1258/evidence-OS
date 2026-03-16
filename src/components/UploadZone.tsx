"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UploadSimple, FileText, SpinnerGap } from "@phosphor-icons/react";

interface UploadZoneProps {
  onUploadComplete: () => void;
}

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Upload failed");
      }

      setUploadStatus({
        text: `${file.name} indexed (${result.chunkCount} chunks)`,
        type: "success",
      });
      onUploadComplete();

      setTimeout(() => setUploadStatus(null), 4000);
    } catch (err) {
      setUploadStatus({
        text: err instanceof Error ? err.message : "Upload failed",
        type: "error",
      });
      setTimeout(() => setUploadStatus(null), 5000);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFile(e.target.files[0]);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none"
            style={{ background: "rgba(255, 255, 255, 0.7)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -10 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="flex flex-col items-center gap-6 p-12 bg-white rounded-[2rem] border border-blue-200 shadow-[0_30px_60px_-20px_rgba(2,132,199,0.15)]"
            >
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center text-blue-500"
              >
                <UploadSimple weight="duotone" size={40} />
              </motion.div>
              <div className="text-center">
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">Drop to Index</h3>
                <p className="text-sm mt-2 font-medium text-slate-500 max-w-[30ch]">
                  The agent will automatically read, tag, and embed your documents.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="relative"
        onDragOver={handleDrag}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDrop={handleDrop}
      >
        <label
          className="group relative overflow-hidden flex items-center gap-3 px-5 py-3.5 cursor-pointer tactile-btn rounded-[1.25rem] border premium-shadow bg-white"
          style={{
            borderColor: "var(--color-border-subtle)",
          }}
        >
          <input
            type="file"
            className="hidden"
            onChange={handleFileSelect}
            accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.webm"
            disabled={isUploading}
          />
          
          <div className="relative z-10 flex shrink-0 w-8 h-8 rounded-full bg-white items-center justify-center shadow-sm border border-slate-100">
            {isUploading ? (
              <SpinnerGap weight="bold" size={16} className="text-blue-500 animate-spin" />
            ) : (
              <FileText weight="duotone" size={18} className="text-slate-600 group-hover:text-blue-500 transition-colors" />
            )}
          </div>
          
          <div className="relative z-10 flex flex-col items-start gap-0.5 min-w-0">
            <span className="text-[13px] font-semibold text-slate-900 leading-none">
              {isUploading ? "Integrating Data..." : "Add Content"}
            </span>
            <span className="text-[11px] font-medium text-slate-500 truncate whitespace-nowrap leading-none">
              PDF, Audio, Image, Text
            </span>
          </div>

          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        </label>

        <AnimatePresence>
          {uploadStatus && (
            <motion.p
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute top-full left-0 right-0 mt-2 text-[11px] px-1 font-semibold text-center"
              style={{ color: uploadStatus.type === "success" ? "var(--color-accent)" : "#ef4444" }}
            >
              {uploadStatus.text}
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
