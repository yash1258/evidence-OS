"use client";
import React from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

interface MagneticButtonProps {
    children: React.ReactNode;
    className?: string;
    onClick?: (e: React.MouseEvent) => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({ 
    children, 
    className = "", 
    onClick, 
    disabled = false,
    type = "button"
}) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const springX = useSpring(x, { damping: 15, stiffness: 150 });
    const springY = useSpring(y, { damping: 15, stiffness: 150 });

    const handleMouseMove = (e: React.MouseEvent) => {
        if (disabled) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        x.set((e.clientX - centerX) * 0.2);
        y.set((e.clientY - centerY) * 0.2);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.button
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{ x: springX, y: springY }}
            whileTap={disabled ? {} : { scale: 0.98 }}
            onClick={onClick}
            disabled={disabled}
            type={type}
            className={`relative ${className}`}
        >
            {children}
        </motion.button>
    );
};
