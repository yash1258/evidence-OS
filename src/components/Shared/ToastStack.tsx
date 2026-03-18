"use client";

import React, { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export interface ToastItem {
  id: string;
  title: string;
  message: string;
  tone?: "error" | "success" | "info";
}

interface ToastStackProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const toneStyles = {
  error: {
    icon: AlertTriangle,
    iconClass: "text-rose-500",
    ringClass: "border-rose-200/80 bg-white/95",
    accentClass: "from-rose-500/10 via-orange-500/10 to-transparent",
  },
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-500",
    ringClass: "border-emerald-200/80 bg-white/95",
    accentClass: "from-emerald-500/10 via-lime-400/10 to-transparent",
  },
  info: {
    icon: Info,
    iconClass: "text-orange-500",
    ringClass: "border-orange-200/80 bg-white/95",
    accentClass: "from-orange-500/10 via-amber-400/10 to-transparent",
  },
} as const;

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  return (
    <div className="fixed top-5 right-5 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-3 pointer-events-none">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const tone = toneStyles[toast.tone || "error"];
          const Icon = tone.icon;

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -10, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              className={`pointer-events-auto relative overflow-hidden rounded-2xl border shadow-[0_18px_50px_-28px_rgba(24,24,27,0.4)] backdrop-blur-xl ${tone.ringClass}`}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${tone.accentClass} pointer-events-none`} />
              <div className="relative flex items-start gap-3 px-4 py-3.5">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-zinc-200 bg-white shadow-sm">
                  <Icon size={16} className={tone.iconClass} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold tracking-tight text-zinc-900">{toast.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-zinc-600">{toast.message}</p>
                </div>
                <button
                  onClick={() => onDismiss(toast.id)}
                  className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label={`Dismiss ${toast.title}`}
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export function useToastStack(autoDismissMs: number = 4200) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, ...toast }]);
    return id;
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;

    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismissToast(toast.id), autoDismissMs)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [autoDismissMs, dismissToast, toasts]);

  return {
    toasts,
    pushToast,
    dismissToast,
  };
}
