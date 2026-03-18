"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
    Database,
    LayoutGrid,
    MessageSquare,
    HardDrive,
    Network,
    Settings,
    ShieldCheck,
    PanelLeftClose,
    PanelLeftOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    badge?: string | number;
    compact?: boolean;
}

const NavItem = ({ href, icon: Icon, label, isActive, badge, compact = false }: NavItemProps) => (
    <Link
        href={href}
        className={cn(
            "w-full rounded-xl font-medium text-sm transition-all duration-200 group relative overflow-hidden border",
            compact
                ? "h-11 flex items-center justify-center"
                : "flex items-center justify-between px-3 py-2",
            isActive
                ? "app-dark-card text-stone-50 border-amber-200/10 shadow-[0_16px_32px_-24px_rgba(0,0,0,0.85)]"
                : "border-transparent text-stone-400 hover:text-stone-100 hover:bg-white/[0.04] hover:border-amber-200/10"
        )}
        aria-label={compact ? label : undefined}
        title={compact ? label : undefined}
    >
        {isActive && (
            <div className={cn(
                "absolute bg-orange-500",
                compact ? "top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full" : "left-0 top-0 bottom-0 w-0.5 rounded-r-full"
            )} />
        )}
        <div className={cn("flex items-center min-w-0", compact ? "justify-center" : "gap-3")}>
            <Icon size={16} className={cn("shrink-0 transition-colors", isActive ? "text-amber-400" : "text-stone-500 group-hover:text-stone-200")} />
            {!compact && <span className="truncate">{label}</span>}
        </div>
        {!compact && badge !== undefined && (
            <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 transition-colors",
                isActive ? "bg-amber-500/10 text-amber-200 border border-amber-200/10" : "bg-white/[0.04] border border-amber-200/10 text-stone-400 group-hover:text-stone-200"
            )}>
                {badge}
            </span>
        )}
    </Link>
);

interface NavSidebarProps {
    className?: string;
    nodeCount?: number | string;
    isOpen?: boolean;
    onToggle?: () => void;
}

export const NavSidebar = ({ className, nodeCount, isOpen = true, onToggle }: NavSidebarProps) => {
    const pathname = usePathname();
    const compact = !isOpen;

    return (
        <motion.aside
            animate={{ width: isOpen ? 260 : 76 }}
            transition={{ type: "spring", stiffness: 240, damping: 28 }}
            className={cn(
                "app-dark-sidebar shrink-0 border-r flex flex-col justify-between text-stone-300 relative z-20 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.5)] overflow-hidden",
                className
            )}
        >
            <div className={cn("h-14 border-b app-dark-line flex items-center", compact ? "px-2 justify-center" : "px-4 justify-between")}>
                <Link href="/" className={cn("flex items-center min-w-0", compact ? "justify-center" : "gap-2.5")}>
                    <div className="w-7 h-7 rounded-xl app-dark-card flex items-center justify-center shrink-0 shadow-inner">
                        <Database size={12} className="text-amber-200" />
                    </div>
                    {!compact && (
                        <motion.span
                            initial={false}
                            animate={{ opacity: isOpen ? 1 : 0, x: isOpen ? 0 : -8 }}
                            transition={{ duration: 0.18 }}
                            className="font-semibold text-[13px] text-stone-100 tracking-tight truncate whitespace-nowrap"
                        >
                            EvidenceOS
                        </motion.span>
                    )}
                </Link>

                {!compact && (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="w-8 h-8 rounded-xl border app-dark-line bg-white/[0.04] hover:bg-white/[0.08] text-stone-500 hover:text-stone-100 transition-colors flex items-center justify-center shrink-0"
                        aria-label="Hide sidebar"
                    >
                        <PanelLeftClose size={14} />
                    </button>
                )}
            </div>

            <div className={cn("flex-1 py-6 flex flex-col gap-1 overflow-y-auto custom-scrollbar", compact ? "px-2" : "px-3")}>
                {compact ? (
                    <button
                        type="button"
                        onClick={onToggle}
                        className="w-full h-11 rounded-xl border app-dark-line bg-white/[0.04] hover:bg-white/[0.08] text-stone-500 hover:text-stone-100 transition-colors flex items-center justify-center mb-3"
                        aria-label="Show sidebar"
                        title="Show sidebar"
                    >
                        <PanelLeftOpen size={16} />
                    </button>
                ) : (
                    <motion.span
                        initial={false}
                        animate={{ opacity: isOpen ? 1 : 0 }}
                        transition={{ duration: 0.16 }}
                        className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-500 mb-2 whitespace-nowrap"
                    >
                        Workspace
                    </motion.span>
                )}

                <NavItem
                    href="/dashboard"
                    icon={LayoutGrid}
                    label="Home"
                    isActive={pathname === '/dashboard'}
                    compact={compact}
                />
                <NavItem
                    href="/chat"
                    icon={MessageSquare}
                    label="Chats"
                    isActive={pathname === '/chat'}
                    compact={compact}
                />
                <NavItem
                    href="/vaults"
                    icon={HardDrive}
                    label="Knowledge Vault"
                    isActive={pathname === '/vaults'}
                    badge={nodeCount ?? '—'}
                    compact={compact}
                />

                {!compact && (
                    <motion.span
                        initial={false}
                        animate={{ opacity: isOpen ? 1 : 0 }}
                        transition={{ duration: 0.16 }}
                        className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-stone-500 mt-6 mb-2 whitespace-nowrap"
                    >
                        System Tools
                    </motion.span>
                )}

                <NavItem
                    href="/graph"
                    icon={Network}
                    label="Graph Explorer"
                    isActive={pathname === '/graph'}
                    compact={compact}
                />
                <NavItem
                    href="/settings"
                    icon={Settings}
                    label="Settings & Models"
                    isActive={pathname === '/settings'}
                    compact={compact}
                />
            </div>

            <div className={cn("p-4 border-t app-dark-line shrink-0", compact ? "px-2" : "")}>
                <div className={cn(
                    "rounded-2xl app-dark-card shadow-inner",
                    compact ? "flex items-center justify-center p-3" : "flex items-center gap-3 p-3"
                )}>
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-400/20 flex items-center justify-center shrink-0">
                        <ShieldCheck size={14} className="text-emerald-300" />
                    </div>
                    {!compact && (
                        <motion.div
                            initial={false}
                            animate={{ opacity: isOpen ? 1 : 0 }}
                            transition={{ duration: 0.16 }}
                            className="flex flex-col min-w-0"
                        >
                            <span className="text-[11px] font-bold text-stone-100 truncate uppercase tracking-wider whitespace-nowrap">Air-Gapped</span>
                            <span className="text-[10px] font-mono text-stone-500 truncate whitespace-nowrap">No external API calls</span>
                        </motion.div>
                    )}
                </div>
            </div>
        </motion.aside>
    );
};
