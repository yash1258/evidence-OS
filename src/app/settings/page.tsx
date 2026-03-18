"use client";

import React, { useEffect, useState } from "react";
import { NavSidebar } from "@/components/Shared/NavSidebar";
import { motion } from "framer-motion";
import {
    CheckCircle2,
    Cpu,
    Database,
    HardDrive,
    ShieldCheck,
    SlidersHorizontal,
} from "lucide-react";

interface SystemState {
    models: {
        primary: string;
        fallback: string | null;
        embedding: string;
    };
    services: {
        geminiConfigured: boolean;
        openRouterConfigured: boolean;
        chroma: {
            host: string;
            port: string;
            connected: boolean;
            error: string | null;
        };
        storage: {
            database: string;
            uploads: string;
        };
    };
    stats: {
        nodeCount: number;
        edgeCount: number;
    };
    vaultCount: number;
    commands: {
        fixtureValidation: string;
    };
}

export default function SettingsPage() {
    const [isNavSidebarOpen, setIsNavSidebarOpen] = useState(() => {
        if (typeof window === "undefined") return true;
        const stored = window.localStorage.getItem("evidenceos.nav-sidebar-open");
        return stored !== null ? stored === "true" : true;
    });
    const [systemState, setSystemState] = useState<SystemState | null>(null);

    useEffect(() => {
        fetch("/api/system")
            .then((response) => response.json())
            .then((data) => setSystemState(data))
            .catch((error) => console.error("Failed to fetch system state:", error));
    }, []);

    useEffect(() => {
        window.localStorage.setItem("evidenceos.nav-sidebar-open", String(isNavSidebarOpen));
    }, [isNavSidebarOpen]);

    return (
        <div className="flex h-[100dvh] bg-zinc-50 font-sans text-zinc-900 overflow-hidden selection:bg-orange-100 selection:text-orange-900">
            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');
        body { font-family: 'Outfit', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.3); border-radius: 10px; }
      `,
            }} />

            <NavSidebar
                nodeCount={systemState?.stats?.nodeCount}
                isOpen={isNavSidebarOpen}
                onToggle={() => setIsNavSidebarOpen((open) => !open)}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/70">
                <div className="max-w-[1200px] mx-auto px-6 py-8 flex flex-col gap-8">
                    <div>
                        <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500 font-mono mb-3">System</p>
                        <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Settings & Models</h1>
                        <p className="mt-2 max-w-2xl text-sm text-zinc-500 leading-relaxed">
                            This page exposes the live model stack and storage configuration used by the current app, replacing the previous placeholder settings surface.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase">
                                <Cpu size={14} /> Primary Model
                            </div>
                            <div className="mt-3 text-sm font-semibold text-zinc-900">{systemState?.models.primary || "—"}</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase">
                                <Database size={14} /> Embedding Model
                            </div>
                            <div className="mt-3 text-sm font-semibold text-zinc-900">{systemState?.models.embedding || "—"}</div>
                        </div>
                        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                            <div className="flex items-center gap-2 text-zinc-500 text-xs font-mono uppercase">
                                <SlidersHorizontal size={14} /> Fallback
                            </div>
                            <div className="mt-3 text-sm font-semibold text-zinc-900">{systemState?.models.fallback || "Disabled"}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <ShieldCheck size={16} className="text-orange-500" />
                                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Service Health</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                                    <span className="text-sm text-zinc-700">Gemini API</span>
                                    <span className={`text-xs font-mono ${systemState?.services.geminiConfigured ? "text-emerald-600" : "text-rose-500"}`}>
                                        {systemState?.services.geminiConfigured ? "Configured" : "Missing Key"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                                    <span className="text-sm text-zinc-700">OpenRouter</span>
                                    <span className={`text-xs font-mono ${systemState?.services.openRouterConfigured ? "text-emerald-600" : "text-zinc-400"}`}>
                                        {systemState?.services.openRouterConfigured ? "Configured" : "Disabled"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                                    <span className="text-sm text-zinc-700">Chroma</span>
                                    <div className="text-right">
                                        <div className={`text-xs font-mono ${systemState?.services.chroma.connected ? "text-emerald-600" : "text-rose-500"}`}>
                                            {systemState?.services.chroma.connected ? "Connected" : "Unavailable"}
                                        </div>
                                        <div className="text-[11px] font-mono text-zinc-500 mt-1">
                                            {systemState?.services.chroma.host}:{systemState?.services.chroma.port}
                                        </div>
                                        {!systemState?.services.chroma.connected && systemState?.services.chroma.error && (
                                            <div className="text-[11px] text-rose-500 mt-1 max-w-[280px] leading-relaxed">
                                                {systemState.services.chroma.error}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.05 }}
                            className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm"
                        >
                            <div className="flex items-center gap-2 mb-5">
                                <HardDrive size={16} className="text-orange-500" />
                                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Storage State</h2>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                                    <span className="text-sm text-zinc-700">SQLite</span>
                                    <span className="text-xs font-mono text-zinc-500">{systemState?.services.storage.database || "—"}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                                    <span className="text-sm text-zinc-700">Uploads Directory</span>
                                    <span className="text-xs font-mono text-zinc-500">{systemState?.services.storage.uploads || "—"}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                                    <span className="text-sm text-zinc-700">Vault Count</span>
                                    <span className="text-xs font-mono text-zinc-500">{systemState?.vaultCount ?? "—"}</span>
                                </div>
                                <div className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-200 px-4 py-3">
                                    <span className="text-sm text-zinc-700">Graph State</span>
                                    <span className="text-xs font-mono text-zinc-500">
                                        {systemState ? `${systemState.stats.nodeCount} nodes / ${systemState.stats.edgeCount} edges` : "—"}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    </div>

                    <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-5">
                            <CheckCircle2 size={16} className="text-orange-500" />
                            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">Operational Commands</h2>
                        </div>
                        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-4">
                            <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 mb-2">Fixture Validation</div>
                            <div className="text-sm font-mono text-zinc-800">{systemState?.commands.fixtureValidation || "npm run validate:fixtures"}</div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
