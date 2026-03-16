// @ts-nocheck
"use client";
import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Database,
    FileText,
    Headphones,
    Image as ImageIcon,
    Search,
    Terminal,
    Cpu,
    Lock,
    Paperclip,
    Send,
    ChevronDown,
    Settings,
    Plus,
    MoreHorizontal,
    FolderDot,
    CheckCircle2,
    PanelRightClose,
    PanelRightOpen,
    Network,
    AtSign,
    Quote
} from 'lucide-react';

// --- CONFIGURATION & TOKENS ---
const ACCENT_ORANGE = "text-orange-500";
const SPRING_CONFIG = { type: "spring", stiffness: 120, damping: 20 };

// --- MOCK DATA ---
const MOCK_VAULT_FILES = [];

const INITIAL_MESSAGES = [];

// --- COMPONENTS ---

const FileIcon = ({ type, size = 16, className = "" }) => {
    switch (type) {
        case 'pdf': return <FileText size={size} className={className} />;
        case 'audio': return <Headphones size={size} className={className} />;
        case 'image': return <ImageIcon size={size} className={className} />;
        default: return <FileText size={size} className={className} />;
    }
};

const DynamicThinkingState = () => {
    const [phase, setPhase] = useState(0);
    const phases = [
        "Vectorizing query...",
        "Scanning ChromaDB...",
        "Retrieving context chunks...",
        "Cross-referencing entities...",
        "Synthesizing logical output..."
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setPhase((p) => (p < phases.length - 1 ? p + 1 : p));
        }, 800);
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="flex flex-col gap-2 p-4 bg-zinc-50 border border-zinc-200/60 rounded-xl mb-8 w-fit min-w-[280px]">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-zinc-800">
                <Cpu size={14} className="text-orange-500 animate-pulse" /> Agent is reasoning...
            </div>
            <div className="text-[11px] font-mono text-zinc-500 flex items-center gap-2">
                <Terminal size={10} /> {phases[phase]}
            </div>
            <div className="w-full h-1 bg-zinc-200 rounded-full overflow-hidden mt-1">
                <motion.div
                    className="h-full bg-orange-400"
                    initial={{ width: "0%" }}
                    animate={{ width: `${((phase + 1) / phases.length) * 100}%` }}
                    transition={{ ease: "easeInOut" }}
                />
            </div>
        </div>
    );
};

const AgentReasoningBlock = memo(({ reasoning }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mb-4 bg-zinc-50 border border-zinc-200/60 rounded-xl overflow-hidden shadow-sm">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-2.5 flex items-center justify-between bg-white hover:bg-zinc-50 transition-colors text-xs font-mono"
            >
                <div className="flex items-center gap-2 text-zinc-600">
                    <Cpu size={14} className={ACCENT_ORANGE} />
                    <span className="font-semibold text-zinc-800">Agent Trace Log</span>
                    <span className="text-zinc-400">({reasoning.length} operations)</span>
                </div>
                <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={14} className="text-zinc-400" />
                </motion.div>
            </button>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-zinc-200/60 bg-zinc-950 text-zinc-300 font-mono text-[11px] p-4 overflow-x-auto"
                    >
                        <div className="space-y-2">
                            {reasoning.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-3">
                                    <span className="text-zinc-600 shrink-0 mt-0.5">[{step.time || '~'}]</span>
                                    <div className="flex flex-col">
                                        <span className="text-orange-400 font-medium">{step.step}</span>
                                        <span className="text-zinc-500">{step.details}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 text-emerald-400 mt-2 pt-2 border-t border-zinc-800">
                                <CheckCircle2 size={12} />
                                <span>Synthesis complete. Generating response.</span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
});

export default function App() {
    const [messages, setMessages] = useState(INITIAL_MESSAGES);
    const [inputValue, setInputValue] = useState("");
    const [isInspectorOpen, setIsInspectorOpen] = useState(false);
    const [activeCitation, setActiveCitation] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [vaultFiles, setVaultFiles] = useState(MOCK_VAULT_FILES);
    const [vaults, setVaults] = useState([]);
    const [activeVaultId, setActiveVaultId] = useState('global');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Fetch actual vault files from the graph API
    useEffect(() => {
        async function fetchVaultFiles() {
            try {
                const res = await fetch('/api/graph?mode=full');
                if (res.ok) {
                    const data = await res.json();
                    const docs = (data.nodes || [])
                        .filter((n) => ['document', 'audio', 'image'].includes(n.type))
                        .map((n, i) => ({
                            id: i + 1,
                            name: n.label || n.id,
                            type: n.type === 'audio' ? 'audio' : n.type === 'image' ? 'image' : 'pdf',
                            size: n.properties?.size || 'N/A',
                            status: 'indexed',
                        }));
                    if (docs.length > 0) setVaultFiles(docs);
                }
            } catch (err) {
                console.error('Failed to fetch vault files:', err);
            }
        }
        fetchVaultFiles();

        // Fetch available vaults
        async function fetchVaults() {
            try {
                const res = await fetch('/api/vaults');
                if (res.ok) {
                    const data = await res.json();
                    setVaults(data);
                }
            } catch (err) {
                console.error('Failed to fetch vaults:', err);
            }
        }
        fetchVaults();
    }, []);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userContent = inputValue;
        const newMsg = { id: Date.now().toString(), role: 'user', content: userContent };
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
            const thinkingSteps = [];
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
                        const parsed = JSON.parse(payload);

                        if (parsed.type === 'thinking_step') {
                            thinkingSteps.push({
                                step: `Action: ${parsed.step.tool || 'Reasoning'}`,
                                details: parsed.step.input || parsed.step.result || '',
                                time: '~',
                            });
                        }

                        if (parsed.type === 'answer') {
                            if (parsed.sessionId) setSessionId(parsed.sessionId);

                            // Build citations from sources
                            const citations = (parsed.sources || []).map((src, i) => ({
                                id: i + 1,
                                text: src.metadata?.source || `Source ${i + 1}`,
                                ref: `Chunk ${src.metadata?.chunkIndex ?? i}`,
                                chunk: src.content || '',
                            }));

                            setMessages(prev => prev.map(msg => msg.id === thinkingId ? {
                                id: thinkingId,
                                role: 'agent',
                                status: 'complete',
                                reasoning: thinkingSteps.length > 0 ? thinkingSteps : [
                                    { step: 'Action: AgentLoop', details: 'Direct response generated', time: '~' }
                                ],
                                content: parsed.answer,
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
                    } catch (e) { /* skip malformed JSON lines */ }
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

    const openInspector = (citation) => {
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
      `}} />

            {/* LEFT SIDEBAR: The System/Vault (Dark Mode) */}
            <aside className="w-[280px] shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between text-zinc-300 relative z-20 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.5)]">
                {/* Header */}
                <div className="h-14 border-b border-zinc-800/60 flex items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                            <Database size={12} className="text-zinc-100" />
                        </div>
                        <span className="font-semibold text-sm text-zinc-100 tracking-tight">EvidenceOS</span>
                    </div>
                    <button className="text-zinc-500 hover:text-zinc-300 transition-colors">
                        <Settings size={16} />
                    </button>
                </div>

                {/* Middle Content */}
                <div className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-6 custom-scrollbar">
                    <button className="w-full bg-zinc-100 text-zinc-900 hover:bg-white transition-colors py-2 px-3 rounded-lg flex items-center gap-2 text-sm font-medium shadow-sm">
                        <Plus size={16} /> New Investigation
                    </button>

                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500">Local Vault</span>
                            <span className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-500">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Indexed
                            </span>
                        </div>

                        <div className="border border-dashed border-zinc-800 rounded-xl p-4 flex flex-col items-center justify-center gap-2 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-colors cursor-pointer group mb-2">
                            <Database size={20} className="text-zinc-600 group-hover:text-orange-500 transition-colors" />
                            <div className="text-center">
                                <p className="text-xs text-zinc-400 font-medium">Drop files to embed</p>
                                <p className="text-[10px] text-zinc-600 font-mono mt-0.5">PDF, Audio, Images</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-0.5">
                            {vaultFiles.map(file => (
                                <div key={file.id} className="flex items-center justify-between group px-2 py-1.5 rounded-md hover:bg-zinc-800/50 cursor-pointer">
                                    <div className="flex items-center gap-2 truncate pr-2">
                                        <FileIcon type={file.type} size={14} className="text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                                        <span className="text-xs text-zinc-400 group-hover:text-zinc-200 truncate">{file.name}</span>
                                    </div>
                                    <MoreHorizontal size={14} className="text-zinc-600 opacity-0 group-hover:opacity-100 shrink-0" />
                                </div>
                            ))}
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
                        <span className="text-zinc-300">24.8M Nodes</span>
                    </div>
                </div>
            </aside>

            {/* CENTER: Main Chat Area */}
            <main className="flex-1 flex flex-col bg-zinc-50 relative min-w-0 transition-all duration-300">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                <header className="h-14 bg-white/80 backdrop-blur-md border-b border-zinc-200/60 flex items-center justify-between px-6 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <h1 className="text-sm font-semibold text-zinc-800 truncate">Q3 Financial Risks vs Audio</h1>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-500">Trace_ID: 8x4A9</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-zinc-100 border border-zinc-200 rounded-md p-1 shadow-sm shrink-0">
                            <span className="text-[10px] uppercase font-mono text-zinc-500 px-2 font-semibold">Active Context:</span>
                            <select
                                value={activeVaultId}
                                onChange={(e) => setActiveVaultId(e.target.value)}
                                className="text-xs font-medium text-zinc-900 bg-transparent border-none outline-none py-0.5 cursor-pointer min-w-[120px]"
                            >
                                <option value="global">Global Namespace (All Info)</option>
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
                        {messages.map((msg) => {
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
                                                                <span className={activeCitation?.id === cite.id && isInspectorOpen ? 'text-zinc-400' : 'text-zinc-400'}>[{cite.id}]</span>
                                                                <FileText size={12} className={activeCitation?.id === cite.id && isInspectorOpen ? 'text-zinc-400' : ''} />
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
                        })}
                        <div ref={messagesEndRef} className="h-4" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-gradient-to-t from-zinc-50 via-zinc-50 to-transparent sticky bottom-0 z-10 pt-12">
                    <div className="max-w-3xl mx-auto w-full relative">
                        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05),inset_0_2px_0_rgba(255,255,255,1)] p-2 flex flex-col gap-2 focus-within:shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1),inset_0_2px_0_rgba(255,255,255,1)] focus-within:border-zinc-300 transition-all">
                            <div className="flex items-center gap-2 px-2 pt-1 pb-1 overflow-x-auto no-scrollbar">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-100 border border-zinc-200 text-[10px] font-mono text-zinc-600">
                                    <FolderDot size={12} className="text-orange-500" /> Entire Vault Searched
                                </div>
                                <button className="flex items-center gap-1 px-2 py-1 rounded hover:bg-zinc-100 border border-transparent text-[10px] font-mono text-zinc-400 hover:text-zinc-600 transition-colors">
                                    <AtSign size={10} /> Mention File
                                </button>
                            </div>

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
                        <div className="text-center mt-3">
                            <span className="text-[10px] text-zinc-400 font-mono tracking-wide">EVIDENCE_OS v1.2.0 — LOCAL REASONING ENGINE</span>
                        </div>
                    </div>
                </div>
            </main>

            {/* RIGHT SIDEBAR: Source Inspector */}
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
                                    {/* File Meta */}
                                    <div className="flex items-start gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
                                            <FileIcon type={activeCitation.text.includes('wav') ? 'audio' : 'pdf'} size={20} className="text-zinc-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-zinc-900 truncate max-w-[240px]">{activeCitation.text}</h3>
                                            <p className="text-xs text-zinc-500 font-mono mt-0.5">{activeCitation.ref}</p>
                                        </div>
                                    </div>

                                    {/* Similarity Score Metric */}
                                    <div className="flex items-center gap-4 py-3 px-4 rounded-xl bg-zinc-50 border border-zinc-200">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Vector Match</span>
                                            <span className="text-sm font-bold text-zinc-800">98.4%</span>
                                        </div>
                                        <div className="w-px h-8 bg-zinc-200" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Source Type</span>
                                            <span className="text-sm font-bold text-zinc-800 capitalize">{activeCitation.text.split('.').pop()}</span>
                                        </div>
                                    </div>

                                    {/* Extracted Context */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Quote size={14} className="text-zinc-400" />
                                            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-800">Extracted Chunk</span>
                                        </div>
                                        <div className="relative">
                                            {/* Highlight effect behind text */}
                                            <div className="absolute inset-0 bg-orange-50 border-l-2 border-orange-400 rounded-r-md -ml-2 pl-2 pointer-events-none" />
                                            <p className="relative text-sm text-zinc-700 leading-relaxed font-serif p-3 bg-white border border-zinc-200 shadow-sm rounded-md">
                                                {activeCitation.chunk}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="pt-4 border-t border-zinc-200 flex flex-col gap-2">
                                        <button className="w-full py-2 text-xs font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors">
                                            Open Full Document
                                        </button>
                                        <button className="w-full py-2 text-xs font-medium bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors">
                                            Find Similar Chunks
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                    <Database size={32} className="text-zinc-400 mb-4" />
                                    <p className="text-sm text-zinc-600 font-medium">No Source Selected</p>
                                    <p className="text-xs text-zinc-400 mt-1 max-w-[200px]">Click a citation badge in the chat to inspect its exact source context.</p>
                                </div>
                            )}
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            <style dangerouslySetInnerHTML={{
                __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(161, 161, 170, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(161, 161, 170, 0.8); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
        </div>
    );
}