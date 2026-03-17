"use client";

import React, { useEffect, useState } from "react";
import { NavSidebar } from "@/components/Shared/NavSidebar";
import { motion } from "framer-motion";
import { ArrowRight, Clock, FileText, MessageSquare, Search } from "lucide-react";
import { useRouter } from "next/navigation";

interface InvestigationSession {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    lastUserMessage: string | null;
    lastAssistantAnswer: string | null;
    lastSources: number;
}

export default function InvestigationsPage() {
    const router = useRouter();
    const [isNavSidebarOpen, setIsNavSidebarOpen] = useState(() => {
        if (typeof window === "undefined") return true;
        const stored = window.localStorage.getItem("evidenceos.nav-sidebar-open");
        return stored !== null ? stored === "true" : true;
    });
    const [sessions, setSessions] = useState<InvestigationSession[]>([]);

    useEffect(() => {
        fetch("/api/investigations")
            .then((response) => response.json())
            .then((data) => setSessions(data.sessions || []))
            .catch((error) => console.error("Failed to fetch investigations:", error));
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
                isOpen={isNavSidebarOpen}
                onToggle={() => setIsNavSidebarOpen((open) => !open)}
            />

            <main className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-50/70">
                <div className="max-w-[1100px] mx-auto px-6 py-8 flex flex-col gap-8">
                    <div className="flex items-start justify-between gap-6">
                        <div>
                            <p className="text-[11px] uppercase tracking-[0.24em] text-zinc-500 font-mono mb-3">Workspace</p>
                            <h1 className="text-3xl font-bold tracking-tight text-zinc-950">Investigations</h1>
                            <p className="mt-2 max-w-2xl text-sm text-zinc-500 leading-relaxed">
                                This page replaces the old placeholder history path with a live session list built from persisted chat sessions and messages.
                            </p>
                        </div>
                        <button
                            onClick={() => router.push("/chat")}
                            className="rounded-xl bg-zinc-900 text-white px-4 py-3 text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2"
                        >
                            New Investigation <ArrowRight size={14} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {sessions.length === 0 ? (
                            <div className="rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
                                <Search size={28} className="mx-auto text-zinc-400 mb-3" />
                                <p className="text-lg font-semibold text-zinc-900">No investigations yet</p>
                                <p className="mt-2 text-sm text-zinc-500">Start a new investigation from chat and it will appear here.</p>
                            </div>
                        ) : (
                            sessions.map((session, index) => (
                                <motion.button
                                    key={session.id}
                                    initial={{ opacity: 0, y: 12 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    onClick={() => router.push(`/chat?session=${encodeURIComponent(session.id)}`)}
                                    className="text-left rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm hover:border-orange-300 hover:shadow-[0_8px_30px_-15px_rgba(249,115,22,0.2)] transition-all"
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="w-8 h-8 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                                    <MessageSquare size={14} className="text-zinc-600" />
                                                </div>
                                                <h2 className="text-sm font-semibold text-zinc-900 truncate">{session.title}</h2>
                                            </div>
                                            <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 ml-10">
                                                {session.lastAssistantAnswer || session.lastUserMessage || "No content yet."}
                                            </p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 shrink-0">
                                            <span className="px-2 py-1 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-600">
                                                {session.lastSources} sources
                                            </span>
                                            <span className="text-[10px] font-mono text-zinc-400 flex items-center gap-1">
                                                <Clock size={10} /> {session.updatedAt}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-4 text-[11px] font-mono text-zinc-500">
                                        <span className="flex items-center gap-1"><FileText size={11} /> {session.messageCount} messages</span>
                                        <span>{session.createdAt}</span>
                                    </div>
                                </motion.button>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
