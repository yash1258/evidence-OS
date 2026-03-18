"use client";
import React, { useState, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bot, CheckCircle2, ChevronDown, Cpu, FileText, Network } from 'lucide-react';

interface ReasoningStep {
    step: string;
    details: string;
    time: string;
    kind?: 'tool_call' | 'tool_result' | 'thinking';
    toolName?: string;
    payload?: unknown;
}

interface AgentReasoningBlockProps {
    reasoning: ReasoningStep[];
    citationCount?: number;
}

interface WorkerStatus {
    id: string;
    label: string;
    model?: string;
    summary?: string;
    error?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return null;
    }

    return value as Record<string, unknown>;
}

function findLastStep(
    reasoning: ReasoningStep[],
    matcher: (step: ReasoningStep) => boolean
): ReasoningStep | undefined {
    for (let index = reasoning.length - 1; index >= 0; index -= 1) {
        if (matcher(reasoning[index])) {
            return reasoning[index];
        }
    }
    return undefined;
}

function humanizeWorkerId(workerId: string): string {
    return workerId
        .replace(/^worker_/, '')
        .split(/[_-]/g)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

function formatModelName(model?: string): string {
    if (!model) {
        return 'Unknown model';
    }

    const explicitLabels: Record<string, string> = {
        'gemini-3-flash-preview': 'Gemini Flash 3',
        'openrouter/healer-alpha': 'Healer Alpha',
        'openrouter/hunter-alpha': 'Hunter Alpha',
    };

    if (explicitLabels[model]) {
        return explicitLabels[model];
    }

    return model
        .replace(/^openrouter\//, '')
        .replace(/^google\//, '')
        .split(/[-_/]/g)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' ');
}

function getRuntimeSummary(reasoning: ReasoningStep[], citationCount: number) {
    const routePayload = asRecord(findLastStep(reasoning, (step) =>
        step.kind === 'tool_result' && step.toolName === 'agent_route'
    )?.payload);
    const overviewPayload = asRecord(findLastStep(reasoning, (step) =>
        step.kind === 'tool_result' && step.toolName === 'gather_project_overview'
    )?.payload);
    const searchPayload = asRecord(findLastStep(reasoning, (step) =>
        step.kind === 'tool_result' && step.toolName === 'gather_search_context'
    )?.payload);
    const contradictionsPayload = asRecord(findLastStep(reasoning, (step) =>
        step.kind === 'tool_result' && step.toolName === 'gather_contradictions'
    )?.payload);
    const workerHealthPayload = asRecord(findLastStep(reasoning, (step) =>
        step.kind === 'tool_result' && step.toolName === 'worker_health_check'
    )?.payload);
    const fallbackPayload = asRecord(findLastStep(reasoning, (step) =>
        step.kind === 'tool_result' && step.toolName === 'agent_fallback'
    )?.payload);

    const path = routePayload?.path === 'parallel' ? 'parallel' : 'single';
    const orchestrator = typeof routePayload?.orchestrator === 'string' ? routePayload.orchestrator : undefined;
    const synthesizer = typeof routePayload?.synthesizer === 'string' ? routePayload.synthesizer : undefined;
    const workerTimeoutMs = typeof routePayload?.workerTimeoutMs === 'number' ? routePayload.workerTimeoutMs : undefined;
    const declaredWorkers = Array.isArray(routePayload?.workers) ? routePayload.workers : [];

    const workerMap = new Map<string, WorkerStatus>();
    for (const worker of declaredWorkers) {
        const record = asRecord(worker);
        if (!record || typeof record.id !== 'string') {
            continue;
        }

        workerMap.set(record.id, {
            id: record.id,
            label: humanizeWorkerId(record.id),
            model: typeof record.model === 'string' ? record.model : undefined,
        });
    }

    for (const step of reasoning) {
        if (step.kind !== 'tool_result' || !step.toolName?.startsWith('worker_')) {
            continue;
        }

        const payload = asRecord(step.payload);
        const workerId = typeof payload?.workerId === 'string'
            ? payload.workerId
            : step.toolName.replace(/^worker_/, '');

        workerMap.set(workerId, {
            id: workerId,
            label: typeof payload?.workerLabel === 'string' ? payload.workerLabel : humanizeWorkerId(workerId),
            model: typeof payload?.model === 'string' ? payload.model : workerMap.get(workerId)?.model,
            summary: typeof payload?.summary === 'string' ? payload.summary : undefined,
            error: typeof payload?.error === 'string' ? payload.error : undefined,
        });
    }

    const workers = Array.from(workerMap.values());
    const activeWorkers = workers.filter((worker) => !worker.error);
    const failedWorkers = workers.filter((worker) => Boolean(worker.error));

    const searchResultsCount = Array.isArray(searchPayload?.results) ? searchPayload.results.length : 0;
    const contradictionCount = Array.isArray(contradictionsPayload?.contradictions)
        ? contradictionsPayload.contradictions.length
        : 0;
    const documentCount = typeof overviewPayload?.totalDocuments === 'number'
        ? overviewPayload.totalDocuments
        : 0;
    const surfacedSourceCount = citationCount > 0 ? citationCount : searchResultsCount;
    const fallbackReason = typeof workerHealthPayload?.reason === 'string'
        ? workerHealthPayload.reason
        : typeof fallbackPayload?.reason === 'string'
        ? fallbackPayload.reason
        : undefined;

    return {
        path,
        orchestrator,
        synthesizer,
        workerTimeoutMs,
        workers,
        activeWorkers,
        failedWorkers,
        surfacedSourceCount,
        contradictionCount,
        documentCount,
        fallbackReason,
    };
}

export const AgentReasoningBlock = memo(({ reasoning, citationCount = 0 }: AgentReasoningBlockProps) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const runtime = getRuntimeSummary(reasoning, citationCount);
    const isParallel = runtime.path === 'parallel';
    const workerHeadline = runtime.activeWorkers.slice(0, 3).map((worker) => worker.label).join(' · ');
    const statusTone = isParallel
        ? 'bg-[#201714] text-orange-50 border border-amber-200/10'
        : 'border border-stone-200/80 bg-white/80 text-stone-700';
    const traceTone = isParallel
        ? 'bg-[#171210] text-stone-300'
        : 'bg-[#1d1715] text-stone-300';

    return (
        <div className="overflow-hidden rounded-[1.45rem] border border-orange-100/80 bg-[linear-gradient(180deg,rgba(255,250,243,0.96),rgba(255,244,229,0.72))] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_18px_34px_-28px_rgba(89,58,26,0.28)]">
            <div className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.18em] ${statusTone}`}>
                                {isParallel ? <Network size={12} /> : <Cpu size={12} />}
                                {isParallel ? 'Parallel Workers' : 'Gemini Only'}
                            </span>
                            {runtime.failedWorkers.length > 0 && (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/80 px-2.5 py-1 text-[10px] font-mono uppercase tracking-[0.16em] text-amber-700">
                                    <AlertTriangle size={11} />
                                    {runtime.failedWorkers.length} worker issue{runtime.failedWorkers.length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>

                        <div className="mt-2 space-y-1">
                            <p className="text-sm font-semibold text-zinc-900">
                                {isParallel
                                    ? 'Gemini orchestrated a parallel evidence pass before composing the answer.'
                                    : 'Gemini handled retrieval and synthesis directly for this response.'}
                            </p>
                            <p className="text-[12px] leading-relaxed text-stone-600">
                                {runtime.fallbackReason
                                    ? `The runtime recovered automatically: ${runtime.fallbackReason}`
                                    : isParallel && workerHeadline
                                    ? `Specialist passes: ${workerHeadline}.`
                                    : 'Trace details stay available below without taking over the message.'}
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="shrink-0 rounded-2xl border border-stone-200/80 bg-white/70 px-3 py-2 text-[11px] font-mono text-stone-600 shadow-sm transition-colors hover:border-orange-300 hover:text-orange-700"
                    >
                        <span className="flex items-center gap-2">
                            Trace {reasoning.length}
                            <motion.span animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronDown size={14} />
                            </motion.span>
                        </span>
                    </button>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                    {runtime.orchestrator && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/72 px-2.5 py-1 text-[11px] text-stone-700 shadow-sm">
                            <Bot size={12} className="text-orange-500" />
                            {formatModelName(runtime.orchestrator)}
                        </span>
                    )}
                    {runtime.activeWorkers.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/72 px-2.5 py-1 text-[11px] text-stone-700 shadow-sm">
                            <Network size={12} className="text-orange-500" />
                            {runtime.activeWorkers.length} worker{runtime.activeWorkers.length > 1 ? 's' : ''}
                        </span>
                    )}
                    {runtime.documentCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/72 px-2.5 py-1 text-[11px] text-stone-700 shadow-sm">
                            <FileText size={12} className="text-orange-500" />
                            {runtime.documentCount} docs
                        </span>
                    )}
                    {runtime.surfacedSourceCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/72 px-2.5 py-1 text-[11px] text-stone-700 shadow-sm">
                            <FileText size={12} className="text-orange-500" />
                            {runtime.surfacedSourceCount} sources
                        </span>
                    )}
                    {runtime.contradictionCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/72 px-2.5 py-1 text-[11px] text-stone-700 shadow-sm">
                            <AlertTriangle size={12} className="text-orange-500" />
                            {runtime.contradictionCount} tensions
                        </span>
                    )}
                </div>

                {runtime.activeWorkers.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                        {runtime.activeWorkers.slice(0, 3).map((worker) => (
                            <span
                                key={worker.id}
                                className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/85 px-2.5 py-1 text-[11px] text-emerald-700 shadow-sm"
                            >
                                <CheckCircle2 size={11} />
                                {worker.label}
                                {worker.model && (
                                    <span className="text-[10px] font-mono text-emerald-600/80">
                                        {formatModelName(worker.model)}
                                    </span>
                                )}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`border-t border-amber-900/10 font-mono text-[11px] p-4 overflow-x-auto ${traceTone}`}
                    >
                        <div className="space-y-2.5">
                            {reasoning.map((step, idx) => (
                                <div key={idx} className="flex items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-3 py-2">
                                    <span className="text-stone-600 shrink-0 mt-0.5">[{step.time || '~'}]</span>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-orange-300 font-medium">{step.step}</span>
                                        <span className="text-stone-400 leading-relaxed break-words">{step.details}</span>
                                    </div>
                                </div>
                            ))}
                            <div className="flex items-center gap-2 text-emerald-400 mt-2 pt-2 border-t border-amber-900/10">
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
