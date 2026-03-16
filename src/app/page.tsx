"use client";
import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
    Database,
    Search,
    ShieldCheck,
    ArrowRight,
    Cpu,
    CheckCircle2,
    Lock,
    XCircle,
    CloudOff,
    Zap,
    Layers,
    Briefcase,
    Scale,
    ShieldAlert,
    BrainCircuit,
    Code2,
    FileText,
    PlayCircle
} from 'lucide-react';

import { MagneticButton } from '@/components/Shared/MagneticButton';
import { TextReveal } from '@/components/Shared/TextReveal';
import { TerminalLoop } from '@/components/Shared/TerminalLoop';
import { MultimodalGraph } from '@/components/Shared/MultimodalGraph';
import { GroundingTrace } from '@/components/Shared/GroundingTrace';

// --- CONFIGURATION & TOKENS ---
const ACCENT_COLOR = "text-orange-500";
const ACCENT_BG = "bg-zinc-950";
const SPRING_CONFIG = { type: "spring", stiffness: 100, damping: 20 } as const;

// --- MAIN LAYOUT COMPONENTS ---

export default function App() {
    return (
        <div className="min-h-[100dvh] bg-zinc-50 text-zinc-900 font-sans selection:bg-orange-100 selection:text-orange-900 overflow-x-hidden">
            <style dangerouslySetInnerHTML={{
                __html: `
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Outfit', sans-serif; }
      `}} />
            <div className="fixed inset-0 z-50 pointer-events-none opacity-[0.02] mix-blend-overlay bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

            <Navbar />

            <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <HeroSection />
                <ComparisonSection />
                <UseCasesSection />
                <ArchitectureDemoSection />
                <BentoEngineSection />
            </main>

            <Footer />
        </div>
    );
}

const Navbar = () => (
    <nav className="fixed top-0 left-0 right-0 z-40 px-6 py-4 flex items-center justify-between bg-zinc-50/80 backdrop-blur-md border-b border-zinc-200/50">
        <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-lg shadow-zinc-900/20">
                <Database size={16} className="text-zinc-100" />
            </div>
            <span className="font-semibold tracking-tight text-lg">EvidenceOS</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-500">
            <a href="#problem" className="hover:text-zinc-900 transition-colors">The Problem</a>
            <a href="#use-cases" className="hover:text-zinc-900 transition-colors">Use Cases</a>
            <a href="#architecture" className="hover:text-zinc-900 transition-colors">Architecture</a>
        </div>
        <Link href="/dashboard" className="px-5 py-2.5 rounded-full bg-zinc-900 text-zinc-50 text-sm font-medium hover:bg-zinc-800 transition-colors flex items-center gap-2">
            <Lock size={14} /> Deploy Local
        </Link>
    </nav>
);

const HeroSection = () => {
    return (
        <section className="min-h-[90dvh] pt-32 pb-10 flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 relative">
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-[radial-gradient(circle,rgba(24,24,27,0.03)_0%,transparent_60%)] blur-3xl mix-blend-multiply" />
                <div className="absolute top-[30%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.02)_0%,transparent_60%)] blur-3xl mix-blend-multiply" />
            </div>

            <div className="w-full md:w-[55%] z-10 flex flex-col items-start text-left">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-zinc-200 shadow-sm mb-8"
                >
                    <div className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
                    </div>
                    <span className="text-xs font-semibold text-zinc-600 tracking-wide uppercase">Stop arguing with chatbots.</span>
                </motion.div>

                <h1 className="text-5xl md:text-[5.5rem] font-bold tracking-tighter leading-[0.95] text-zinc-950 mb-8 flex flex-col">
                    <TextReveal text="Your Data," delayOffset={0.1} />
                    <TextReveal text="Agentically" delayOffset={0.3} className="text-zinc-400" />
                    <TextReveal text="Synthesized." delayOffset={0.5} />
                </h1>

                <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    className="text-lg text-zinc-600 leading-relaxed max-w-[500px] mb-10"
                >
                    Chat wrappers are toys that forget context and guess answers. EvidenceOS is a deterministic, local-first intelligence engine that reasons, retrieves, and mathematically cites your private files.
                </motion.p>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                    <Link href="/dashboard" className={`px-8 py-4 rounded-xl ${ACCENT_BG} text-white font-medium flex items-center gap-2 hover:bg-zinc-800 transition-colors shadow-lg shadow-zinc-900/20`}>
                        Install EvidenceOS <ArrowRight size={18} />
                    </Link>
                    <button className="px-8 py-4 rounded-xl bg-white/50 backdrop-blur-md border border-zinc-200 text-zinc-700 font-medium hover:bg-white hover:border-zinc-300 transition-all shadow-sm">
                        Watch Architecture Demo
                    </button>
                </motion.div>
            </div>

            <div className="w-full md:w-[45%] relative aspect-square max-w-[600px] flex items-center justify-center perspective-[2000px]">
                <motion.div
                    animate={{ y: [0, -10, 0], rotateX: [10, 15, 10], rotateY: [-10, -5, -10] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute w-[80%] aspect-square rounded-[2.5rem] bg-gradient-to-br from-zinc-50 to-zinc-100/50 border border-zinc-200/60 shadow-xl opacity-80 flex items-center justify-center translate-z-[-100px] overflow-hidden"
                >
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
                    <MultimodalGraph />
                </motion.div>

                <motion.div
                    animate={{ y: [0, 15, 0], rotateX: [5, 10, 5], rotateY: [-5, 0, -5] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute right-0 bottom-10 w-[60%] h-[40%] rounded-[1.5rem] bg-white/80 backdrop-blur-xl border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_20px_40px_-15px_rgba(0,0,0,0.1)] p-5 flex flex-col gap-3 translate-z-[50px]"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Search size={14} className="text-zinc-500" />
                        <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Semantic Match Found</span>
                    </div>
                    <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <motion.div animate={{ width: ["0%", "100%"] }} transition={{ duration: 2, repeat: Infinity }} className="h-full bg-zinc-800" />
                    </div>
                    <div className="w-3/4 h-2 bg-zinc-100 rounded-full overflow-hidden">
                        <motion.div animate={{ width: ["0%", "100%"] }} transition={{ duration: 2.5, repeat: Infinity, delay: 0.2 }} className="h-full bg-zinc-400" />
                    </div>
                </motion.div>

                <motion.div
                    animate={{ y: [0, -20, 0], rotateX: [0, 5, 0], rotateY: [0, 5, 0] }}
                    transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                    className="relative z-10 w-[90%] left-[-10%] top-[-10%] rounded-[2rem] bg-white/70 backdrop-blur-2xl border border-white/80 shadow-[inset_0_1px_0_rgba(255,255,255,1),0_40px_80px_-20px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col translate-z-[150px]"
                >
                    <div className="h-12 bg-white/50 border-b border-white/50 flex items-center px-4 gap-3 backdrop-blur-md">
                        <div className="p-1.5 rounded-md bg-zinc-900 shadow-sm text-white border border-zinc-700">
                            <Cpu size={14} className="text-orange-500" />
                        </div>
                        <span className="text-xs font-semibold text-zinc-800">Agent Reasoning Loop</span>
                    </div>
                    <div className="p-5 h-[220px]">
                        <TerminalLoop />
                    </div>
                </motion.div>
            </div>
        </section>
    );
};

// --- THE PROBLEM STATEMENT (Contrast Section) ---
const ComparisonSection = () => {
    return (
        <section id="problem" className="py-24 relative border-t border-zinc-200/60 mt-12">
            <div className="text-center mb-16 max-w-2xl mx-auto px-4">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-zinc-900 mb-4">
                    Standard LLMs are fundamentally flawed for serious knowledge work.
                </h2>
                <p className="text-zinc-500 text-lg leading-relaxed">
                    Pasting context into a chat window is a broken paradigm. You hit token limits, suffer from amnesia, and invite corporate data leaks.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto px-4">
                {/* The Old Way */}
                <div className="bg-zinc-50 rounded-[2rem] p-8 border border-zinc-200 flex flex-col gap-6 relative overflow-hidden opacity-90">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl rounded-full" />
                    <div className="flex items-center gap-3 text-zinc-400 mb-2">
                        <XCircle size={24} className="text-rose-400" />
                        <h3 className="text-xl font-bold tracking-tight text-zinc-500 line-through decoration-rose-200">Standard Chat Interfaces</h3>
                    </div>
                    <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-white rounded text-rose-500 border border-rose-100 shadow-sm"><Layers size={14} /></div>
                            <div>
                                <strong className="block text-zinc-700">Context Amnesia</strong>
                                <span className="text-sm text-zinc-500">Forgets earlier details when conversations get too long.</span>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-white rounded text-rose-500 border border-rose-100 shadow-sm"><Zap size={14} /></div>
                            <div>
                                <strong className="block text-zinc-700">Hallucination Risk</strong>
                                <span className="text-sm text-zinc-500">Guesses answers when it lacks reliable, embedded retrieval mechanisms.</span>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-white rounded text-rose-500 border border-rose-100 shadow-sm"><CloudOff size={14} /></div>
                            <div>
                                <strong className="block text-zinc-700">Data Exhaustion</strong>
                                <span className="text-sm text-zinc-500">Forces you to upload sensitive company PDFs to external corporate servers.</span>
                            </div>
                        </li>
                    </ul>
                </div>

                {/* The EvidenceOS Way */}
                <div className="bg-zinc-950 rounded-[2rem] p-8 border border-zinc-800 flex flex-col gap-6 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-zinc-800/50 blur-[50px] rounded-full" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-orange-500/5 blur-[50px] rounded-full" />
                    <div className="flex items-center gap-3 text-zinc-100 mb-2 relative z-10">
                        <CheckCircle2 size={24} className="text-orange-500" />
                        <h3 className="text-xl font-bold tracking-tight text-white">EvidenceOS Architecture</h3>
                    </div>
                    <ul className="space-y-4 relative z-10">
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-zinc-900 rounded text-zinc-300 border border-zinc-800"><Database size={14} /></div>
                            <div>
                                <strong className="block text-zinc-100">Permanent Indexed Memory</strong>
                                <span className="text-sm text-zinc-400">Drops files into a local ChromaDB. Ask a question today about an audio file from 6 months ago.</span>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-zinc-900 rounded text-zinc-300 border border-zinc-800"><ShieldCheck size={14} /></div>
                            <div>
                                <strong className="block text-zinc-100">Absolute Grounding</strong>
                                <span className="text-sm text-zinc-400">Zero hallucination tolerance. Every claim is mathematically tied to a source document.</span>
                            </div>
                        </li>
                        <li className="flex items-start gap-3">
                            <div className="mt-1 p-1 bg-zinc-900 rounded text-zinc-300 border border-zinc-800"><Lock size={14} /></div>
                            <div>
                                <strong className="block text-zinc-100">Local-First Privacy</strong>
                                <span className="text-sm text-zinc-400">The LLM doesn't see your raw data until the agent explicitly retrieves the specific required chunks.</span>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </section>
    );
};

// --- USE CASES SECTION ---
const USE_CASES = [
    {
        id: 'finance',
        icon: Briefcase,
        title: 'Finance & M&A',
        hook: 'Analyze the data room without leaking it to the cloud.',
        desc: 'Private Equity firms and Hedge Funds have massive data rooms of highly sensitive PDFs and audio recordings. Cross-reference Q3 earnings calls with 10-K filings entirely on air-gapped or secure local machines.',
        logs: [
            { t: "> INGEST: Competitor_10K.pdf", c: "text-zinc-400" },
            { t: "> INGEST: Q3_Earnings_Call.wav", c: "text-zinc-400" },
            { t: "> QUERY: 'Liquidity risks mentioned in audio vs PDF'", c: "text-white" },
            { t: "⟳ Synthesizing cross-modal evidence...", c: "text-orange-400" },
            { t: "✓ FOUND: Contradiction on audio [04:12] vs PDF [Pg. 14]", c: "text-emerald-400" }
        ]
    },
    {
        id: 'legal',
        icon: Scale,
        title: 'Legal & Compliance',
        hook: "Don't let an AI hallucinate your case law.",
        desc: 'Lawyers and compliance officers cannot afford AI hallucinations. EvidenceOS doesn’t guess—it explicitly links its answers to precise document chunks. It’s not a chatbot; it’s an automated, mathematically grounded paralegal.',
        logs: [
            { t: "> INGEST: Master_Service_Agreement.pdf", c: "text-zinc-400" },
            { t: "> INGEST: Vendor_Email_Thread.eml", c: "text-zinc-400" },
            { t: "> QUERY: 'Did the vendor violate the SLA in Section 4?'", c: "text-white" },
            { t: "⟳ Tracing SLA definitions...", c: "text-orange-400" },
            { t: "✓ YES: Vendor admitted delay in Email_2 [Line 12], violating Sec 4 [Pg. 8].", c: "text-emerald-400" }
        ]
    },
    {
        id: 'ciso',
        icon: ShieldAlert,
        title: 'CISO & Enterprise IT',
        hook: 'The only AI agent your CISO will actually approve.',
        desc: 'Cure your company’s AI data-leak problem. Give employees powerful reasoning capabilities, but because of the local ChromaDB vectorization, IT gets the peace of mind that corporate IP never leaves the internal network.',
        logs: [
            { t: "> SEC_PROTOCOL: Local_Only_Mode = TRUE", c: "text-zinc-500" },
            { t: "> INGEST: Internal_Network_Topology.pdf", c: "text-zinc-400" },
            { t: "> QUERY: 'Identify single points of failure in the topology'", c: "text-white" },
            { t: "⟳ Analyzing network graphs locally...", c: "text-orange-400" },
            { t: "✓ ALERT: Core Switch A lacks redundancy [Diagram_3, Pg. 2].", c: "text-rose-400" }
        ]
    },
    {
        id: 'research',
        icon: BrainCircuit,
        title: 'Research & PKM',
        hook: 'Don’t just store your notes. Employ them.',
        desc: 'Tools like Obsidian are great for storing data, but they are passive. Drop in 500 PDFs, whiteboard photos, and voice memos, and the agent will autonomously find the hidden connections across your entire second brain.',
        logs: [
            { t: "> SYNC: ~/Documents/Obsidian_Vault/*", c: "text-zinc-400" },
            { t: "> INGEST: Whiteboard_Session_Photo.jpg", c: "text-zinc-400" },
            { t: "> QUERY: 'Connect my notes on neurology with the whiteboard sketch.'", c: "text-white" },
            { t: "⟳ Mapping text entities to image vectors...", c: "text-orange-400" },
            { t: "✓ LINK: Synaptic plasticity notes [File_12] match sketch node 'A'.", c: "text-emerald-400" }
        ]
    },
    {
        id: 'dev',
        icon: Code2,
        title: 'Engineering & Data Science',
        hook: 'The absolute end of the context window limit.',
        desc: 'Developers working with massive codebases constantly hit token limits. Once a repo is ingested, it’s permanent memory. The agent searches and retrieves exactly the functions it needs to answer architectural questions.',
        logs: [
            { t: "> CLONE & INGEST: https://github.com/org/core-api", c: "text-zinc-400" },
            { t: "> INDEXING: 1,402 files (Vectorization complete)", c: "text-zinc-500" },
            { t: "> QUERY: 'How is auth middleware handling JWT rotation?'", c: "text-white" },
            { t: "⟳ Navigating AST and resolving imports...", c: "text-orange-400" },
            { t: "✓ FOUND: Rotation logic in /src/middleware/auth.ts [Lines 45-82].", c: "text-emerald-400" }
        ]
    }
];

const UseCasesSection = () => {
    const [activeId, setActiveId] = React.useState(USE_CASES[0].id);
    const activeCase = USE_CASES.find(c => c.id === activeId);

    return (
        <section id="use-cases" className="py-24 relative bg-white border-t border-zinc-200/60">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-16">
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-zinc-900 mb-4 max-w-2xl">
                        Built for domains where standard AI is too risky.
                    </h2>
                    <p className="text-zinc-500 text-lg max-w-[600px] leading-relaxed">
                        EvidenceOS is infrastructure. Discover how different industries operationalize local, deterministic reasoning.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
                    {/* Tabs Menu */}
                    <div className="lg:col-span-4 flex flex-col gap-2 relative">
                        <div className="absolute left-[26px] top-4 bottom-4 w-px bg-zinc-100 -z-10" />

                        {USE_CASES.map((uc) => {
                            const isActive = activeId === uc.id;
                            return (
                                <button
                                    key={uc.id}
                                    onClick={() => setActiveId(uc.id)}
                                    className={`relative flex items-center gap-4 p-4 rounded-2xl text-left transition-all duration-300 ${isActive ? 'text-zinc-900' : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50/50'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTabBackground"
                                            className="absolute inset-0 bg-zinc-100/80 border border-zinc-200/50 rounded-2xl -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-300 ${isActive ? 'bg-white shadow-sm border border-zinc-200/60 text-orange-500' : 'bg-zinc-50 border border-zinc-100 text-zinc-400'
                                        }`}>
                                        <uc.icon size={18} />
                                    </div>
                                    <span className="font-semibold tracking-tight">{uc.title}</span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Content Showcase */}
                    <div className="lg:col-span-8">
                        <motion.div
                            key={activeId}
                            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            transition={{ duration: 0.3 }}
                            className="h-full"
                        >
                            <div className="bg-zinc-50 rounded-[2.5rem] border border-zinc-200/60 p-8 md:p-12 h-full flex flex-col relative overflow-hidden">
                                {/* Decorative background mesh */}
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

                                <div className="relative z-10 flex-1 flex flex-col justify-between gap-8">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-zinc-200 shadow-sm text-xs font-semibold text-zinc-600 mb-6 uppercase tracking-wider">
                                            {activeCase?.icon && React.createElement(activeCase.icon as any, { size: 14, className: "text-orange-500" })} {activeCase?.title} View
                                        </div>
                                        <h3 className="text-3xl md:text-4xl font-bold tracking-tighter text-zinc-900 mb-4">
                                            {activeCase?.hook}
                                        </h3>
                                        <p className="text-lg text-zinc-600 leading-relaxed max-w-[90%]">
                                            {activeCase?.desc}
                                        </p>
                                    </div>

                                    {/* Terminal Proof Visual */}
                                    <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden mt-6">
                                        <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 gap-2">
                                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                                            <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
                                            <span className="text-[10px] font-mono text-zinc-500 ml-2 font-medium tracking-wider uppercase">{activeCase?.id}_agent.log</span>
                                        </div>
                                        <div className="p-5 font-mono text-xs leading-relaxed flex flex-col gap-2">
                                            {activeCase?.logs.map((log: any, i: number) => (
                                                <motion.div
                                                    key={i}
                                                    initial={{ opacity: 0, x: -5 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.15 }}
                                                    className={log.c}
                                                >
                                                    {log.t}
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};


// --- PRODUCT DEMO ---
const ArchitectureDemoSection = () => {
    const [activeStep, setActiveStep] = React.useState(0);

    React.useEffect(() => {
        const interval = setInterval(() => {
            setActiveStep((prev) => (prev + 1) % 4);
        }, 4000);
        return () => clearInterval(interval);
    }, []);

    const steps = [
        { title: "Raw Data Ingestion", icon: Layers, desc: "Drop complex PDFs, audio, and images.", color: "zinc", hex: "#71717A" },
        { title: "Vector Vault", icon: Database, desc: "Data is chunked and stored locally.", color: "zinc", hex: "#52525B" },
        { title: "ReAct Reasoning", icon: Cpu, desc: "Agent formulates a plan to retrieve facts.", color: "orange", hex: "#F97316" },
        { title: "Synthesized Output", icon: CheckCircle2, desc: "Grounded answer with exact citations.", color: "emerald", hex: "#10B981" }
    ];

    return (
        <section id="demo" className="py-24 relative overflow-hidden bg-white border-t border-zinc-200/60">
            <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">
                <div className="text-center mb-16 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 border border-zinc-200 mb-4 text-zinc-600 text-xs font-bold tracking-wider uppercase">
                        <PlayCircle size={14} /> Live System Trace
                    </div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-zinc-900 mb-4">
                        How the operating system thinks.
                    </h2>
                    <p className="text-zinc-500 text-lg leading-relaxed">
                        EvidenceOS isn't just generating text; it is orchestrating a pipeline. Watch the data flow as a user asks a complex question.
                    </p>
                </div>

                <div className="w-full max-w-5xl bg-zinc-50 rounded-[2.5rem] border border-zinc-200/80 p-8 md:p-12 relative shadow-[inset_0_0_40px_rgba(0,0,0,0.02)]">
                    <div className="flex justify-center mb-12 relative z-10">
                        <motion.div
                            key={activeStep}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-zinc-900 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 text-sm font-medium border border-zinc-800"
                        >
                            <Terminal size={16} className="text-zinc-400" />
                            "Cross-reference the Q3 financial risks with yesterday's board meeting audio."
                        </motion.div>
                    </div>

                    <div className="relative flex flex-col md:flex-row justify-between items-center gap-8 md:gap-0">
                        <div className="hidden md:block absolute top-[28px] left-[10%] w-[80%] h-1 z-0">
                            <svg width="100%" height="4" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <line x1="0" y1="2" x2="100%" y2="2" stroke="#E4E4E7" strokeWidth="2" strokeDasharray="6 6" />
                                <motion.line
                                    x1="0" y1="2" x2="100%" y2="2"
                                    stroke={steps[activeStep].hex}
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    initial={{ strokeDasharray: "0 1000", strokeDashoffset: 0 }}
                                    animate={{ strokeDasharray: "100 1000", strokeDashoffset: -100 * activeStep }}
                                    transition={{ duration: 1, ease: "easeInOut" }}
                                    className="transition-colors duration-500"
                                />
                            </svg>
                        </div>
                        <div className="md:hidden absolute left-1/2 top-0 h-full w-1 bg-zinc-200 -translate-x-1/2 z-0 rounded-full" />

                        {steps.map((step, idx) => {
                            const isActive = activeStep === idx;
                            const isPast = activeStep > idx;

                            const activeBg = `bg-${step.color}-600`;
                            const activeBorder = `border-${step.color}-500`;
                            const pastBg = `bg-zinc-800`;
                            const pastBorder = `border-zinc-700`;
                            const textActive = `text-${step.color}-600`;

                            return (
                                <div key={idx} className="relative z-10 flex flex-col items-center group w-full md:w-1/4">
                                    {isActive && (
                                        <motion.div
                                            layoutId="activePulse"
                                            className="absolute top-0 md:top-auto w-16 h-16 rounded-full blur-xl -z-10 mix-blend-multiply"
                                            style={{ backgroundColor: step.hex, opacity: 0.2 }}
                                            transition={{ type: "spring", stiffness: 50 }}
                                        />
                                    )}

                                    <div
                                        className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-md border 
                      ${isActive ? `${activeBg} ${activeBorder} text-white scale-110 shadow-[0_10px_20px_-10px_rgba(0,0,0,0.3)]` :
                                                isPast ? `${pastBg} ${pastBorder} text-white` : 'bg-white border-zinc-200 text-zinc-400'}`}
                                        style={isActive ? { backgroundColor: step.hex, borderColor: step.hex } : {}}
                                    >
                                        <step.icon size={24} />
                                    </div>

                                    <div className="mt-6 text-center">
                                        <h4 className={`font-bold tracking-tight mb-1 transition-colors ${isActive ? textActive : 'text-zinc-900'}`} style={isActive ? { color: step.hex } : {}}>
                                            {step.title}
                                        </h4>
                                        <p className="text-xs text-zinc-500 leading-relaxed px-4 md:px-0">{step.desc}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="mt-16 h-32 bg-white rounded-2xl border border-zinc-200/60 shadow-sm p-4 flex items-center justify-center relative overflow-hidden">
                        <motion.div
                            className="absolute top-0 left-0 w-1.5 h-full transition-colors duration-500"
                            style={{ backgroundColor: steps[activeStep].hex }}
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                        <motion.div
                            key={activeStep}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3 }}
                            className="font-mono text-sm text-zinc-600 flex flex-col items-center text-center gap-2 z-10"
                        >
                            {activeStep === 0 && <span className="text-zinc-500">Ingesting: <span className="text-zinc-700 font-semibold px-2 py-1 bg-zinc-100 rounded">Q3_Report.pdf (3.2MB)</span> & <span className="text-zinc-700 font-semibold px-2 py-1 bg-zinc-100 rounded">Board_Rec.wav (14MB)</span></span>}
                            {activeStep === 1 && <span><span className="text-zinc-700 font-medium">Generating Local Embeddings...</span> chunking 452 multidimensional segments.</span>}
                            {activeStep === 2 && <span><span className="text-orange-600 font-bold">Action: Multi-Hop Search</span> | Query: <span className="bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">"financial risk AND revenue threat"</span></span>}
                            {activeStep === 3 && <span><span className="text-emerald-600 font-bold">✓ Success:</span> "The board raised liquidity concerns <span className="text-xs bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-200">[Audio_04:12]</span> contradicting the optimistic Q3 PDF <span className="text-xs bg-emerald-50 text-emerald-700 px-1 rounded border border-emerald-200">[Pg. 12]</span>."</span>}
                        </motion.div>
                    </div>
                </div>
            </div>
        </section>
    );
};

// --- BENTO 2.0 ENGINE SECTION ---
const BentoEngineSection = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.15 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 30, scale: 0.98 },
        show: { opacity: 1, y: 0, scale: 1, transition: SPRING_CONFIG }
    };

    return (
        <section id="architecture" className="py-24 relative">
            <div className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8 border-t border-zinc-200/60 pt-16">
                <div>
                    <h2 className="text-3xl md:text-5xl font-bold tracking-tighter text-zinc-900 mb-4 max-w-[20ch]">
                        The technology behind the intelligence.
                    </h2>
                    <p className="text-zinc-500 text-lg max-w-[600px] leading-relaxed">
                        We combined the speed of local vector databases with the deterministic reasoning of ReAct agents to build a fail-proof knowledge system.
                    </p>
                </div>
            </div>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, margin: "-100px" }}
                className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-6 bg-zinc-100/50 rounded-[3.5rem] p-4 md:p-8 border border-zinc-200/50 relative"
            >
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px] rounded-[3.5rem] pointer-events-none" />

                {/* Card 1: ReAct Agent */}
                <motion.div variants={itemVariants} className="md:col-span-8 flex flex-col gap-5 z-10">
                    <motion.div
                        whileHover={{ y: -4, scale: 1.005 }}
                        transition={SPRING_CONFIG}
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[inset_0_1px_0_rgba(255,255,255,1),0_20px_40px_-15px_rgba(0,0,0,0.05)] h-[350px] relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 right-0 h-12 border-b border-slate-100 flex items-center px-6 gap-2 bg-slate-50/50">
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                        </div>
                        <div className="pt-12 w-full h-full">
                            <TerminalLoop />
                        </div>
                    </motion.div>
                    <div className="px-3">
                        <h3 className="text-xl font-semibold tracking-tight text-zinc-900 mb-2 flex items-center gap-2">
                            <Cpu size={20} className={ACCENT_COLOR} /> ReAct Agent Engine
                        </h3>
                        <p className="text-base text-zinc-500 leading-relaxed max-w-[85%]">
                            Thinks step-by-step. Autonomously calls internal tools to gather evidence, cross-reference documents, and compile synthesized answers.
                        </p>
                    </div>
                </motion.div>

                {/* Card 2: Local Vault */}
                <motion.div variants={itemVariants} className="md:col-span-4 flex flex-col gap-5 z-10">
                    <motion.div
                        whileHover={{ y: -4, scale: 1.005 }}
                        transition={SPRING_CONFIG}
                        className="bg-zinc-950 rounded-[2.5rem] border border-zinc-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_20px_40px_-15px_rgba(0,0,0,0.3)] h-[350px] relative overflow-hidden flex items-center justify-center"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                            className="w-[250%] h-[250%] absolute opacity-40 mix-blend-screen"
                            style={{
                                background: 'conic-gradient(from 0deg, transparent 0 280deg, rgba(249, 115, 22, 0.4) 360deg)'
                            }}
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,#09090b_70%)]" />
                        <div className="relative z-10 text-center flex flex-col items-center">
                            <motion.div
                                animate={{ y: [0, -5, 0] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-700/50 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(249,115,22,0.1)]"
                            >
                                <Database size={32} className="text-zinc-100" />
                            </motion.div>
                            <div className="font-mono text-zinc-400 text-xs tracking-widest mb-2 uppercase flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" /> Status: Indexed
                            </div>
                            <div className="text-white text-4xl font-bold tracking-tighter mb-1">24.8M</div>
                            <div className="text-zinc-500 text-xs uppercase tracking-wider">Vector Chunks Local</div>
                        </div>
                    </motion.div>
                    <div className="px-3">
                        <h3 className="text-xl font-semibold tracking-tight text-zinc-900 mb-2 flex items-center gap-2">
                            <Lock size={20} className="text-zinc-700" /> The Local Vault
                        </h3>
                        <p className="text-base text-zinc-500 leading-relaxed">
                            Powered by ChromaDB. Drop your entire repository in. We chunk and vectorize it locally. Your raw data never leaves your machine.
                        </p>
                    </div>
                </motion.div>

                {/* Card 3: Multimodal */}
                <motion.div variants={itemVariants} className="md:col-span-5 flex flex-col gap-5 mt-8 md:mt-0 z-10">
                    <motion.div
                        whileHover={{ y: -4, scale: 1.005 }}
                        transition={SPRING_CONFIG}
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[inset_0_1px_0_rgba(255,255,255,1),0_20px_40px_-15px_rgba(0,0,0,0.05)] h-[300px] relative overflow-hidden flex items-center justify-center"
                    >
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white/90 to-transparent z-10" />
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-white/90 to-transparent z-10" />

                        <div className="flex gap-4 p-8 w-full overflow-hidden">
                            <motion.div
                                animate={{ x: ["0%", "-50%"] }}
                                transition={{ duration: 25, ease: "linear", repeat: Infinity }}
                                className="flex gap-5 min-w-[200%] pl-4"
                            >
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="w-48 h-32 rounded-2xl bg-white border border-zinc-200/60 shadow-sm flex flex-col p-4 shrink-0 justify-between">
                                        <div className="flex items-center gap-2">
                                            {i % 3 === 0 ? <FileText size={16} className="text-zinc-400" /> : i % 3 === 1 ? <FileText size={16} className="text-zinc-400" /> : <FileText size={16} className="text-zinc-400" />}
                                            <span className="text-[10px] font-mono text-zinc-500 truncate">
                                                {i % 3 === 0 ? 'legal_brief_v2.pdf' : i % 3 === 1 ? 'q3_meeting.wav' : 'board_whiteboard.png'}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="h-1.5 w-full bg-zinc-100 rounded-full" />
                                            <div className="h-1.5 w-2/3 bg-zinc-100 rounded-full" />
                                            {i % 3 === 1 && <div className="h-1.5 w-1/2 bg-zinc-100 rounded-full" />}
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        </div>
                    </motion.div>
                    <div className="px-3">
                        <h3 className="text-xl font-semibold tracking-tight text-zinc-900 mb-2">Multimodal Ingestion</h3>
                        <p className="text-base text-zinc-500 leading-relaxed">
                            Gemini Embedding 2 maps text, audio, and images into the same semantic space, allowing precise cross-modality retrieval.
                        </p>
                    </div>
                </motion.div>

                {/* Card 4: Zero Hallucination */}
                <motion.div variants={itemVariants} className="md:col-span-7 flex flex-col gap-5 mt-8 md:mt-0 z-10">
                    <motion.div
                        whileHover={{ y: -4, scale: 1.005 }}
                        transition={SPRING_CONFIG}
                        className="bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[inset_0_1px_0_rgba(255,255,255,1),0_20px_40px_-15px_rgba(0,0,0,0.05)] h-[300px] relative overflow-hidden"
                    >
                        <GroundingTrace />
                    </motion.div>
                    <div className="px-3">
                        <h3 className="text-xl font-semibold tracking-tight text-zinc-900 mb-2 flex items-center gap-2">
                            <CheckCircle2 size={20} className={ACCENT_COLOR} /> Absolute Grounding
                        </h3>
                        <p className="text-base text-zinc-500 leading-relaxed max-w-[85%]">
                            Zero hallucination tolerance. Every claim generated by the agent is explicitly backed by a specific chunk of indexed memory with precise source citations.
                        </p>
                    </div>
                </motion.div>
            </motion.div>
        </section>
    );
};

const Footer = () => (
    <footer className="border-t border-zinc-200 bg-white py-16 mt-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                <div>
                    <h3 className="text-2xl font-bold tracking-tight text-zinc-900 mb-4">Ready to operationalize your knowledge?</h3>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <MagneticButton className={`px-6 py-3 rounded-xl ${ACCENT_BG} text-white font-medium flex items-center justify-center gap-2 hover:bg-zinc-800 transition-colors`}>
                            Download v1.2.0 <ArrowRight size={16} />
                        </MagneticButton>
                        <button className="px-6 py-3 rounded-xl bg-zinc-100 text-zinc-700 font-medium hover:bg-zinc-200 transition-colors">
                            Read Whitepaper
                        </button>
                    </div>
                </div>
                <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 font-mono text-xs text-zinc-500">
                    <div>$ npm install -g evidence-os</div>
                    <div>$ evidence init --local</div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-8 border-t border-zinc-100">
                <div className="flex items-center gap-2">
                    <Database size={18} className="text-zinc-900" />
                    <span className="font-semibold tracking-tight text-lg text-zinc-900">EvidenceOS</span>
                </div>
                <div className="text-sm font-mono text-zinc-400">
                    SYSTEM.STATUS = ONLINE // LOCAL_VAULT.SECURE
                </div>
                <div className="flex gap-6 text-sm text-zinc-500">
                    <a href="#" className="hover:text-zinc-900 transition-colors">Documentation</a>
                    <a href="#" className="hover:text-zinc-900 transition-colors">Github</a>
                    <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
                </div>
            </div>
        </div>
    </footer>
);
