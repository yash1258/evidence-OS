"use client";
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Cpu, Terminal } from 'lucide-react';

export const DynamicThinkingState: React.FC = () => {
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
