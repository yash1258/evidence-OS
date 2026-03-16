"use client";
import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ChevronDown, CheckCircle2 } from 'lucide-react';

interface ReasoningStep {
    step: string;
    details: string;
    time: string;
}

interface AgentReasoningBlockProps {
    reasoning: ReasoningStep[];
}

const ACCENT_ORANGE = "text-orange-500";

export const AgentReasoningBlock = memo(({ reasoning }: AgentReasoningBlockProps) => {
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

AgentReasoningBlock.displayName = "AgentReasoningBlock";
