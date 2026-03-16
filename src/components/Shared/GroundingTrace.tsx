"use client";
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { FileText, ShieldCheck } from 'lucide-react';

export const GroundingTrace = memo(() => {
    return (
        <div className="w-full h-full flex flex-col justify-center p-6 gap-4">
            <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                className="w-full h-12 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center px-4 gap-3 relative overflow-hidden"
            >
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <div className="h-2 bg-zinc-200 rounded-full w-24" />
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 1.5, delay: 0.5, ease: "circOut" }}
                    className="absolute left-0 top-1/2 h-[1px] bg-red-500/50 w-full origin-left"
                />
            </motion.div>
            <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1 }}
                className="w-full rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 relative"
            >
                <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck size={16} className="text-emerald-600" />
                    <span className="text-xs font-semibold text-emerald-800">Grounded Response</span>
                </div>
                <div className="space-y-2">
                    <div className="h-2 bg-emerald-200/50 rounded-full w-full" />
                    <div className="h-2 bg-emerald-200/50 rounded-full w-3/4" />
                </div>
                <div className="absolute -bottom-3 -right-2 bg-white border border-zinc-200 shadow-sm text-[10px] font-mono px-2 py-1 rounded-md text-zinc-500 flex items-center gap-1">
                    <FileText size={10} /> source_doc.pdf [Pg 4]
                </div>
            </motion.div>
        </div>
    );
});

GroundingTrace.displayName = "GroundingTrace";
