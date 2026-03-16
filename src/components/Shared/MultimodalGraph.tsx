"use client";
import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Database, FileText, Headphones, Image as ImageIcon } from 'lucide-react';

export const MultimodalGraph = memo(() => {
    const itemVariants = [
        { icon: FileText, delay: 0, angle: 0, color: "text-zinc-600", bg: "bg-white border-zinc-200" },
        { icon: Headphones, delay: 1, angle: 120, color: "text-zinc-600", bg: "bg-white border-zinc-200" },
        { icon: ImageIcon, delay: 2, angle: 240, color: "text-zinc-600", bg: "bg-white border-zinc-200" }
    ];

    return (
        <div className="w-full h-full relative flex items-center justify-center">
            <motion.div
                animate={{ boxShadow: ['0px 0px 0px 0px rgba(249, 115, 22, 0)', '0px 0px 30px 5px rgba(249, 115, 22, 0.1)', '0px 0px 0px 0px rgba(249, 115, 22, 0)'] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="w-16 h-16 rounded-2xl bg-zinc-900 z-10 flex items-center justify-center shadow-xl border border-zinc-800 relative"
            >
                <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top_right,rgba(249,115,22,0.15),transparent_50%)]" />
                <Database size={24} className="text-zinc-100 relative z-10" />
            </motion.div>
            {itemVariants.map((item, i) => (
                <motion.div
                    key={i}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute w-48 h-48 flex items-start justify-center"
                    style={{ originX: 0.5, originY: 0.5, transform: `rotate(${item.angle}deg)` }}
                >
                    <motion.div
                        animate={{ rotate: -360 }}
                        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                        className={`w-10 h-10 rounded-full ${item.bg} border shadow-sm flex items-center justify-center backdrop-blur-sm`}
                    >
                        {item.icon && React.createElement(item.icon, { size: 20, className: item.color })}
                    </motion.div>
                </motion.div>
            ))}
            <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-20">
                <circle cx="50%" cy="50%" r="96" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" className="text-zinc-400" />
                <circle cx="50%" cy="50%" r="64" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 4" className="text-zinc-300" />
            </svg>
        </div>
    );
});

MultimodalGraph.displayName = "MultimodalGraph";
