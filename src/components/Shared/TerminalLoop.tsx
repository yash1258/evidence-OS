"use client";
import React, { useState, useEffect, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Terminal } from 'lucide-react';

export const TerminalLoop = memo(() => {
    const [step, setStep] = useState(0);
    const steps = [
        { text: "Query received: 'Risk analysis Q3 vs Audio notes'", type: "input", color: "text-zinc-900" },
        { text: "Retrieving from Local Vault (ChromaDB)...", type: "system", color: "text-zinc-600" },
        { text: "Found 3 PDFs, 1 Audio Transcript.", type: "system", color: "text-zinc-600" },
        { text: "Extracting risk entities...", type: "process", color: "text-orange-500" },
        { text: "Cross-referencing claims...", type: "process", color: "text-orange-500" },
        { text: "Synthesizing evidence-backed response.", type: "success", color: "text-emerald-600" }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setStep((prev) => (prev + 1) % steps.length);
        }, 2500);
        return () => clearInterval(timer);
    }, [steps.length]);

    return (
        <div className="w-full h-full flex flex-col justify-center font-mono text-xs text-zinc-500 p-4 relative">
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-white/80 to-transparent z-10 pointer-events-none" />

            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100/50 relative z-20">
                <div className="flex items-center gap-1.5 mr-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <Terminal size={12} className="text-zinc-400 ml-2" />
                <span className="tracking-wider">agent_trace.log</span>
            </div>
            <div className="flex-1 relative overflow-hidden">
                <AnimatePresence mode="popLayout">
                    {steps.map((s, i) => (
                        i <= step && (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10, filter: "blur(4px)" }}
                                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                transition={{ duration: 0.4, ease: "easeOut" }}
                                className="mb-3 flex items-start gap-3"
                            >
                                <span className={`mt-0.5 ${s.type === 'input' ? 'text-zinc-900' : s.color}`}>
                                    {s.type === 'input' ? '❯' : s.type === 'success' ? '✓' : s.type === 'process' ? '⟳' : '•'}
                                </span>
                                <span className={`${s.type === 'input' ? 'text-zinc-800 font-medium' : s.color} leading-relaxed font-medium tracking-tight opacity-90`}>
                                    {s.text}
                                </span>
                            </motion.div>
                        )
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
});

TerminalLoop.displayName = "TerminalLoop";
