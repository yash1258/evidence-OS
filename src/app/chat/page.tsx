"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Terminal,
    PanelRightClose,
    PanelRightOpen,
    Network,
    Quote,
    FileText,
    Send,
    Paperclip,
    Database
} from 'lucide-react';

import { FileIcon } from '@/components/Shared/FileIcon';
import { DynamicThinkingState } from '@/components/Shared/DynamicThinkingState';
import { AgentReasoningBlock } from '@/components/Shared/AgentReasoningBlock';
import { NavSidebar } from '@/components/Shared/NavSidebar';
import { ContextSidebar } from '@/components/Shared/ContextSidebar';

// --- TYPES ---

interface VaultFile {
    id: number;
    name: string;
    type: string;
    size: string;
    status: string;
}

interface Vault {
    id: string;
    name: string;
}

interface AgentSource {
    documentId?: string;
    chunkId?: string;
    chunkIndex?: number;
    filename?: string;
    preview?: string;
    content?: string;
}

interface Citation {
    id: number;
    text: string;
    ref: string;
    chunk: string;
}

interface ReasoningStep {
    step: string;
    details: string;
    time: string;
}

interface Message {
    id: string;
    role: 'user' | 'agent';
    content?: string;
    status?: 'thinking' | 'complete';
    reasoning?: ReasoningStep[];
    citations?: Citation[];
}

interface GraphNodeResponse {
    id: string;
    label: string;
    type: string;
    vaultId?: string | null;
    properties?: {
        size?: string;
    };
}

type ChatStreamEvent =
    | { type: 'thinking_step'; step: { type?: string; toolName?: string; toolArgs?: Record<string, unknown>; result?: unknown } }
    | { type: 'text'; token: string }
    | { type: 'answer'; answer: string; sources?: AgentSource[]; sessionId?: string }
    | { type: 'error'; error: string };

function formatThinkingDetails(step: ChatStreamEvent & { type: 'thinking_step' }): ReasoningStep {
    const stepLabel = step.step.type === 'tool_call'
        ? `Action: ${step.step.toolName || 'Reasoning'}`
        : step.step.type === 'tool_result'
        ? `Result: ${step.step.toolName || 'Observation'}`
        : 'Reasoning';

    const detailsSource = step.step.type === 'tool_call' ? step.step.toolArgs : step.step.result;
    const details = detailsSource
        ? JSON.stringify(detailsSource).slice(0, 240)
        : 'Working through the next step.';

    return {
        step: stepLabel,
        details,
        time: '~',
    };
}

// --- MAIN PAGE ---

export default function ChatPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isNavSidebarOpen, setIsNavSidebarOpen] = useState(true);
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [activeCitation, setActiveCitation] = useState<Citation | null>(null);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [vaultFiles, setVaultFiles] = useState<VaultFile[]>([]);
    const [vaults, setVaults] = useState<Vault[]>([]);
    const [activeVaultId, setActiveVaultId] = useState('global');
    const [graphStats, setGraphStats] = useState<{ nodeCount: number } | null>(null);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const stored = window.localStorage.getItem('evidenceos.nav-sidebar-open');
        if (stored !== null) {
            setIsNavSidebarOpen(stored === 'true');
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem('evidenceos.nav-sidebar-open', String(isNavSidebarOpen));
    }, [isNavSidebarOpen]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const query = params.get('q');
        const vault = params.get('vault');

        if (query) {
            setInputValue(query);
        }
        if (vault) {
            setActiveVaultId(vault);
        }
    }, []);

    const fetchData = useCallback(async () => {
        try {
            // Fetch graph stats for the sidebar
            const statsRes = await fetch('/api/graph?mode=dashboard');
            if (statsRes.ok) {
                const statsData = await statsRes.json();
                setGraphStats(statsData.stats);
            }

            // Fetch files
            const res = await fetch('/api/graph?mode=full');
            if (res.ok) {
                const data = await res.json();
                const nodes: GraphNodeResponse[] = Array.isArray(data.nodes) ? data.nodes : [];
                const filteredNodes = nodes.filter((node) =>
                    ['document', 'audio', 'image'].includes(node.type) &&
                    (activeVaultId === 'global' ? !node.vaultId : node.vaultId === activeVaultId)
                );
                const docs = filteredNodes.map((node, i) => ({
                        id: i + 1,
                        name: node.label || node.id,
                        type: node.type === 'audio' ? 'audio' : node.type === 'image' ? 'image' : 'pdf',
                        size: node.properties?.size || 'N/A',
                        status: 'indexed',
                    }));
                setVaultFiles(docs);
            }

            // Fetch available vaults
            const vRes = await fetch('/api/vaults');
            if (vRes.ok) {
                const data = await vRes.json();
                setVaults(data);
            }
        } catch (err) {
            console.error('Failed to fetch chat data:', err);
        }
    }, [activeVaultId]);

    // Fetch actual vault files and vaults
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);
            if (activeVaultId !== 'global') {
                formData.append('vaultId', activeVaultId);
            }

            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Upload failed');
            
            await fetchData(); // Refresh file list and stats
        } catch (err) {
            console.error('Upload error:', err);
        }
    };

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userContent = inputValue;
        const newMsg: Message = { id: Date.now().toString(), role: 'user', content: userContent };
        setMessages(prev => [...prev, newMsg]);
        setInputValue("");

        // Add thinking state
        const thinkingId = (Date.now() + 1).toString();
        setMessages(prev => [...prev, { id: thinkingId, role: 'agent', status: 'thinking' }]);

        try {
            const bodyPayload = { 
                message: userContent, 
                sessionId,
                ...(activeVaultId !== 'global' ? { vaultId: activeVaultId } : {})
            };

            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyPayload),
            });

            if (!res.ok) throw new Error('Chat request failed');

            const reader = res.body?.getReader();
            if (!reader) throw new Error('No response stream');

            const decoder = new TextDecoder();
            const thinkingSteps: ReasoningStep[] = [];
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.startsWith('data: ')) continue;
                    const payload = line.slice(6).trim();
                    if (payload === '[DONE]') continue;

                    try {
                        const parsed = JSON.parse(payload) as ChatStreamEvent;

                        if (parsed.type === 'thinking_step') {
                            thinkingSteps.push(formatThinkingDetails(parsed));
                            // Also update the message in state to show the latest thinking step if needed
                            setMessages(prev => prev.map(msg => msg.id === thinkingId ? {
                                ...msg,
                                reasoning: [...thinkingSteps]
                            } : msg));
                        }

                        if (parsed.type === 'text') {
                            setMessages(prev => prev.map(msg => msg.id === thinkingId ? {
                                ...msg,
                                content: (msg.content || '') + parsed.token
                            } : msg));
                        }

                        if (parsed.type === 'answer') {
                            if (parsed.sessionId) setSessionId(parsed.sessionId);

                            const citations: Citation[] = (parsed.sources || []).map((src, i) => ({
                                id: i + 1,
                                text: src.filename || `Source ${i + 1}`,
                                ref: typeof src.chunkIndex === 'number' ? `Chunk ${src.chunkIndex}` : 'Document',
                                chunk: src.preview || src.content || '',
                            }));

                            setMessages(prev => prev.map(msg => msg.id === thinkingId ? {
                                id: thinkingId,
                                role: 'agent',
                                status: 'complete',
                                reasoning: thinkingSteps.length > 0 ? thinkingSteps : (msg.reasoning || [
                                    { step: 'Action: AgentLoop', details: 'Direct response generated', time: '~' }
                                ]),
                                content: parsed.answer, // Final full answer
                                citations,
                            } : msg));
                        }

                        if (parsed.type === 'error') {
                            setMessages(prev => prev.map(msg => msg.id === thinkingId ? {
                                id: thinkingId,
                                role: 'agent',
                                status: 'complete',
                                reasoning: [],
                                content: `Error: ${parsed.error}`,
                                citations: [],
                            } : msg));
                        }
                    } catch { /* skip malformed stream frame */ }
                }
            }
        } catch (err) {
            setMessages(prev => prev.map(msg => msg.id === thinkingId ? {
                id: thinkingId,
                role: 'agent',
                status: 'complete',
                reasoning: [],
                content: `Failed to get response: ${err instanceof Error ? err.message : 'Unknown error'}`,
                citations: [],
            } : msg));
        }
    };

    const openInspector = (citation: Citation) => {
        setActiveCitation(citation);
        setIsInspectorOpen(true);
    };

    return (
        <div className="flex h-[100dvh] bg-white font-sans text-zinc-900 overflow-hidden selection:bg-orange-100 selection:text-orange-900">
            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        body { font-family: 'Outfit', sans-serif; }
        .font-mono { font-family: 'JetBrains Mono', monospace; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.4); border-radius: 10px; }
      `}} />

            {/* Leftmost Navigation */}
            <NavSidebar
                nodeCount={graphStats?.nodeCount}
                isOpen={isNavSidebarOpen}
                onToggle={() => setIsNavSidebarOpen((open) => !open)}
            />

            {/* Secondary Context Sidebar */}
            <ContextSidebar 
                vaultFiles={vaultFiles} 
                onNewInvestigation={() => {
                    setMessages([]);
                    setSessionId(null);
                }}
                onUploadClick={() => fileInputRef.current?.click()}
                vectorCount={graphStats?.nodeCount?.toString()}
            />

            <input 
                ref={fileInputRef} 
                type="file" 
                className="hidden" 
                onChange={handleFileUpload} 
                accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp,.mp3,.wav,.webm" 
            />

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col bg-zinc-50 relative min-w-0 transition-all duration-300">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                <header className="h-14 bg-white/80 backdrop-blur-md border-b border-zinc-200/60 flex items-center justify-between px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <h1 className="text-sm font-semibold text-zinc-800 truncate">Agentic Investigation</h1>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-500">Active Session</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-md p-1 shadow-sm shrink-0">
                            <span className="text-[10px] uppercase font-mono text-zinc-500 px-2 font-semibold">Active Vault:</span>
                            <select
                                value={activeVaultId}
                                onChange={(e) => setActiveVaultId(e.target.value)}
                                className="text-xs font-medium text-zinc-900 bg-transparent border-none outline-none py-0.5 cursor-pointer min-w-[120px]"
                            >
                                <option value="global">Global Namespace</option>
                                {vaults.map(v => (
                                    <option key={v.id} value={v.id}>{v.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="w-px h-4 bg-zinc-200" />
                        <button className="text-xs font-medium text-zinc-500 hover:text-zinc-900 flex items-center gap-1.5 transition-colors shrink-0">
                            <Network size={14} /> Knowledge Graph
                        </button>
                        <div className="w-px h-4 bg-zinc-200" />
                        <button
                            onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                            className={`p-1.5 rounded-md transition-colors ${isInspectorOpen ? 'bg-zinc-200 text-zinc-900' : 'text-zinc-500 hover:bg-zinc-100'}`}
                        >
                            {isInspectorOpen ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
                        </button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-16 py-8 relative z-0 custom-scrollbar scroll-smooth">
                    <div className="max-w-3xl mx-auto w-full">
                        {messages.length === 0 ? (
                             <div className="h-full flex flex-col items-center justify-center text-center opacity-40 mt-[10vh]">
                                <Terminal size={48} className="mb-4 text-zinc-400" />
                                <h3 className="text-xl font-bold text-zinc-900">Start a New Investigation</h3>
                                <p className="text-sm text-zinc-500 max-w-[300px] mt-2 font-medium">Ask the agent about your files, or drop new documents into the vault context.</p>
                             </div>
                        ) : (
                            messages.map((msg) => {
                                const isUser = msg.role === 'user';
                                if (msg.status === 'thinking') {
                                    return <DynamicThinkingState key={msg.id} />;
                                }

                                return (
                                    <motion.div
                                        key={msg.id}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-8`}
                                    >
                                        <div className={`flex gap-4 max-w-[95%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                                            <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm ${isUser ? 'bg-white border-zinc-200 text-zinc-600' : 'bg-zinc-900 border-zinc-800 text-white'}`}>
                                                {isUser ? <Search size={14} /> : <Terminal size={14} />}
                                            </div>

                                            <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0`}>
                                                <div className="flex items-center gap-2 mb-1.5 px-1">
                                                    <span className="text-xs font-medium text-zinc-800">{isUser ? 'User' : 'EvidenceOS'}</span>
                                                    <span className="text-[10px] text-zinc-400 font-mono">{isUser ? 'Local Client' : 'ReAct Model'}</span>
                                                </div>

                                                <div className={`relative px-5 py-4 text-sm leading-relaxed ${isUser ? 'bg-white border border-zinc-200/80 shadow-sm rounded-2xl rounded-tr-sm text-zinc-800' : 'bg-transparent text-zinc-800 w-full'}`}>
                                                    {!isUser && msg.reasoning && <AgentReasoningBlock reasoning={msg.reasoning} />}
                                                    <div className="whitespace-pre-wrap">{msg.content}</div>
                                                    {!isUser && msg.citations && msg.citations.length > 0 && (
                                                        <div className="mt-4 pt-4 border-t border-zinc-200/60 flex flex-wrap gap-2">
                                                            {msg.citations.map((cite) => (
                                                                <button
                                                                    key={cite.id}
                                                                    onClick={() => openInspector(cite)}
                                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-md text-[11px] font-mono shadow-sm transition-all ${activeCitation?.id === cite.id && isInspectorOpen
                                                                        ? 'bg-zinc-900 border-zinc-900 text-white'
                                                                        : 'bg-white border-zinc-200 text-zinc-600 hover:border-orange-400 hover:text-orange-600'
                                                                        }`}
                                                                >
                                                                    <span className="text-zinc-400">[{cite.id}]</span>
                                                                    <FileText size={12} />
                                                                    <span className="truncate max-w-[150px]">{cite.text}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })
                        )}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent sticky bottom-0 z-10 pt-12">
                    <div className="max-w-3xl mx-auto w-full relative">
                        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05),inset_0_2px_0_rgba(255,255,255,1)] p-2 flex flex-col gap-2 focus-within:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1),inset_0_2px_0_rgba(255,255,255,1)] focus-within:border-zinc-300 transition-all">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Ask the agent to investigate your vault..."
                                className="w-full max-h-[200px] min-h-[44px] bg-transparent resize-none outline-none px-3 py-2 text-sm text-zinc-800 placeholder:text-zinc-400"
                                rows={1}
                            />

                            <div className="flex items-center justify-between px-2 pb-1">
                                <div className="flex items-center gap-1">
                                    <button className="p-2 text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors">
                                        <Paperclip size={18} />
                                    </button>
                                    <div className="h-4 w-px bg-zinc-200 mx-1" />
                                    <button className="px-2 py-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 rounded-md transition-colors flex items-center gap-1.5">
                                        <Search size={14} /> Deep Search
                                    </button>
                                </div>
                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={handleSend}
                                    disabled={!inputValue.trim()}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${inputValue.trim() ? 'bg-zinc-900 text-white shadow-md cursor-pointer hover:bg-zinc-800' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Send size={14} className={inputValue.trim() ? 'ml-0.5' : ''} />
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Source Inspector (Right) */}
            <AnimatePresence>
                {isInspectorOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 340, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        className="shrink-0 bg-white border-l border-zinc-200/60 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col z-20"
                    >
                        <div className="h-14 border-b border-zinc-200/60 flex items-center justify-between px-4 bg-zinc-50/80 backdrop-blur-sm shrink-0 w-[340px]">
                            <div className="flex items-center gap-2">
                                <Search size={14} className="text-orange-500" />
                                <span className="font-semibold text-sm text-zinc-800">Source Inspector</span>
                            </div>
                            <button onClick={() => setIsInspectorOpen(false)} className="text-zinc-400 hover:text-zinc-800 transition-colors p-1">
                                <PanelRightClose size={16} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar w-[340px]">
                            {activeCitation ? (
                                <div className="flex flex-col gap-6">
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                            <FileIcon type={activeCitation.text.includes('wav') ? 'audio' : 'pdf'} size={20} className="text-zinc-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-zinc-900 truncate max-w-[240px]">{activeCitation.text}</h3>
                                            <p className="text-xs text-zinc-500 font-mono mt-0.5">{activeCitation.ref}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Quote size={14} className="text-zinc-400" />
                                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-800">Extracted Chunk</span>
                                        </div>
                                        <p className="relative text-sm text-zinc-700 leading-relaxed font-serif p-3 bg-white border border-zinc-200 shadow-sm rounded-md">
                                            {activeCitation.chunk}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                    <Database size={32} className="text-zinc-400 mb-4" />
                                    <p className="text-sm text-zinc-600 font-medium">No Source Selected</p>
                                </div>
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>
        </div>
    );
}
