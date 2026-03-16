"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Database,
    LayoutGrid,
    MessageSquare,
    HardDrive,
    Network,
    Settings,
    ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItemProps {
    href: string;
    icon: React.ElementType;
    label: string;
    isActive: boolean;
    badge?: string | number;
}

const NavItem = ({ href, icon: Icon, label, isActive, badge }: NavItemProps) => (
    <Link 
        href={href} 
        className={cn(
            "w-full flex items-center justify-between px-3 py-2 rounded-lg font-medium text-sm transition-colors group relative overflow-hidden",
            isActive 
                ? "bg-zinc-900 text-white border border-zinc-800 shadow-sm" 
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
        )}
    >
        {isActive && (
            <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-orange-500 rounded-r-full" />
        )}
        <div className="flex items-center gap-3 min-w-0">
            <Icon size={16} className={cn("shrink-0", isActive ? "text-orange-500" : "group-hover:text-zinc-300")} />
            <span className="truncate">{label}</span>
        </div>
        {badge !== undefined && (
            <span className={cn(
                "px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 transition-colors",
                isActive ? "bg-zinc-800 text-zinc-300" : "bg-zinc-800 border border-zinc-700 group-hover:bg-zinc-700 group-hover:text-white"
            )}>
                {badge}
            </span>
        )}
    </Link>
);

interface NavSidebarProps {
    className?: string;
    nodeCount?: number | string;
}

export const NavSidebar = ({ className, nodeCount }: NavSidebarProps) => {
    const pathname = usePathname();

    return (
        <aside className={cn(
            "w-[260px] shrink-0 bg-zinc-950 border-r border-zinc-800 flex flex-col justify-between text-zinc-300 relative z-20 shadow-[10px_0_30px_-15px_rgba(0,0,0,0.5)]",
            className
        )}>
            <div className="h-14 border-b border-zinc-800/60 flex items-center justify-between px-5">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 shadow-inner">
                        <Database size={12} className="text-zinc-100" />
                    </div>
                    <span className="font-semibold text-[13px] text-zinc-100 tracking-tight truncate">EvidenceOS</span>
                </Link>
            </div>

            <div className="flex-1 py-6 px-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                <span className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 mb-2">Workspace</span>
                
                <NavItem 
                    href="/dashboard" 
                    icon={LayoutGrid} 
                    label="Home" 
                    isActive={pathname === '/dashboard'} 
                />
                <NavItem 
                    href="/chat" 
                    icon={MessageSquare} 
                    label="Chats" 
                    isActive={pathname === '/chat'} 
                />
                <NavItem 
                    href="/dashboard" // This should probably be /vault or filtered dashboard
                    icon={HardDrive} 
                    label="Knowledge Vault" 
                    isActive={false} 
                    badge={nodeCount ?? '—'}
                />

                <span className="px-3 text-[10px] font-mono font-semibold uppercase tracking-wider text-zinc-500 mt-6 mb-2">System Tools</span>
                
                <NavItem 
                    href="#" 
                    icon={Network} 
                    label="Graph Explorer" 
                    isActive={false} 
                />
                <NavItem 
                    href="#" 
                    icon={Settings} 
                    label="Settings & Models" 
                    isActive={false} 
                />
            </div>

            {/* Minimal Trust Signal */}
            <div className="p-4 border-t border-zinc-800/60 bg-zinc-950 flex flex-col gap-3 shrink-0">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800 shadow-inner">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                        <ShieldCheck size={14} className="text-emerald-500" />
                    </div>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold text-zinc-200 truncate uppercase tracking-wider">Air-Gapped</span>
                        <span className="text-[10px] font-mono text-zinc-500 truncate">No external API calls</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};
