"use client";
import React from 'react';
import { motion } from 'framer-motion';

interface TextRevealProps {
    text: string;
    delayOffset?: number;
    className?: string;
}

export const TextReveal: React.FC<TextRevealProps> = ({ 
    text, 
    delayOffset = 0, 
    className = "" 
}) => {
    const words = text.split(" ");
    return (
        <span className={`inline-flex flex-wrap ${className}`}>
            {words.map((word, i) => (
                <motion.span
                    key={i}
                    initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    transition={{
                        delay: delayOffset + i * 0.08,
                        duration: 0.8,
                        ease: [0.16, 1, 0.3, 1],
                    }}
                    className="mr-[0-[0.3em]] mr-3 md:mr-4 last:mr-0"
                >
                    {word}
                </motion.span>
            ))}
        </span>
    );
};
