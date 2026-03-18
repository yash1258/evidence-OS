import { getAgentRuntimeConfig, type AgentRoleConfig } from "./config";
import { runAgentLoop } from "./agentLoop";
import { saveInvestigationNode } from "./investigationTracking";
import { OpenRouterProvider, withFallback, type LLMMessage } from "./providers";
import {
  findContradictions,
  searchKnowledgeBase,
  summarizeProject,
} from "./toolImplementations";
import type { AgentResult, AgentSource, ThinkingStep } from "./types";

const LOCAL_STREAM_CHUNK_SIZE = 18;
const PARALLEL_QUERY_PATTERN = /\b(whole project|whole vault|this vault|bird'?s-eye|overview|deep|deeply|investigate|cross-document|cross document|contradiction|contradictions|risk|risks|compare|synthesize|overall)\b/i;

interface GatheredEvidence {
  overview: Record<string, unknown>;
  search: Record<string, unknown>;
  contradictions: Record<string, unknown>;
}

interface WorkerOutput {
  workerId: string;
  workerLabel: string;
  model: string;
  summary: string;
  data: Record<string, unknown>;
  rawText: string;
  error?: string;
}

function streamLocally(text: string, onToken?: (token: string) => void): void {
  if (!onToken) return;
  for (let index = 0; index < text.length; index += LOCAL_STREAM_CHUNK_SIZE) {
    onToken(text.slice(index, index + LOCAL_STREAM_CHUNK_SIZE));
  }
}

function emitToolStep(
  step: Omit<ThinkingStep, "timestamp">,
  thinkingSteps: ThinkingStep[],
  onStep?: (step: ThinkingStep) => void
): void {
  const enrichedStep: ThinkingStep = {
    ...step,
    timestamp: Date.now(),
  };
  thinkingSteps.push(enrichedStep);
  onStep?.(enrichedStep);
}

function emitRouteDecision(
  path: "single" | "parallel",
  reason: string,
  runtimeDetails: Record<string, unknown>,
  thinkingSteps: ThinkingStep[],
  onStep?: (step: ThinkingStep) => void
): void {
  emitToolStep({
    type: "tool_call",
    toolName: "agent_route",
    toolArgs: {
      path,
      reason,
    },
  }, thinkingSteps, onStep);

  emitToolStep({
    type: "tool_result",
    toolName: "agent_route",
    result: {
      path,
      ...runtimeDetails,
    },
  }, thinkingSteps, onStep);
}

function shouldUseParallelAgentPath(userMessage: string): boolean {
  return PARALLEL_QUERY_PATTERN.test(userMessage);
}

function normalizeFocus(userMessage: string): string {
  if (/\b(contradiction|contradictions|risk|risks|tension|conflict)\b/i.test(userMessage)) {
    return "contradictions";
  }
  if (/\b(people|person|entity|entities|actor|actors)\b/i.test(userMessage)) {
    return "people";
  }
  if (/\b(research|study|learn|topic|overview)\b/i.test(userMessage)) {
    return "research";
  }
  return "general";
}

function safeJsonParse(text: string): Record<string, unknown> | null {
  const cleaned = text.trim()
    .replace(/^```json?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as Record<string, unknown>;
  } catch {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1)) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function buildEvidencePacket(userMessage: string, evidence: GatheredEvidence): string {
  const searchResults = Array.isArray(evidence.search.results)
    ? (evidence.search.results as Array<Record<string, unknown>>).slice(0, 6)
    : [];
  const contradictions = Array.isArray(evidence.contradictions.contradictions)
    ? (evidence.contradictions.contradictions as Array<Record<string, unknown>>).slice(0, 6)
    : [];
  const representativeDocuments = Array.isArray(evidence.overview.representativeDocuments)
    ? (evidence.overview.representativeDocuments as Array<Record<string, unknown>>).slice(0, 6)
    : [];

  return JSON.stringify({
    userQuestion: userMessage,
    projectOverview: {
      scopeLabel: evidence.overview.scopeLabel,
      overview: evidence.overview.overview,
      totalDocuments: evidence.overview.totalDocuments,
      totalChunks: evidence.overview.totalChunks,
      keyThemes: evidence.overview.keyThemes,
      riskSignals: evidence.overview.riskSignals,
      followUpQuestions: evidence.overview.followUpQuestions,
      topEntities: evidence.overview.topEntities,
      relationshipCounts: evidence.overview.relationshipCounts,
      representativeDocuments,
    },
    searchResults,
    contradictions,
  }, null, 2);
}

async function gatherEvidence(
  userMessage: string,
  vaultId: string | undefined,
  thinkingSteps: ThinkingStep[],
  onStep?: (step: ThinkingStep) => void
): Promise<GatheredEvidence> {
  const focus = normalizeFocus(userMessage);

  emitToolStep({
    type: "tool_call",
    toolName: "gather_project_overview",
    toolArgs: { focus, vaultId: vaultId || null },
  }, thinkingSteps, onStep);
  emitToolStep({
    type: "tool_call",
    toolName: "gather_search_context",
    toolArgs: { query: userMessage, maxResults: 6, vaultId: vaultId || null },
  }, thinkingSteps, onStep);
  emitToolStep({
    type: "tool_call",
    toolName: "gather_contradictions",
    toolArgs: { scope: "all", vaultId: vaultId || null },
  }, thinkingSteps, onStep);

  const [overview, search, contradictions] = await Promise.all([
    summarizeProject({ focus, vaultId }),
    searchKnowledgeBase({ query: userMessage, maxResults: 6, vaultId }),
    findContradictions({ scope: "all", vaultId }),
  ]);

  emitToolStep({
    type: "tool_result",
    toolName: "gather_project_overview",
    result: overview,
  }, thinkingSteps, onStep);
  emitToolStep({
    type: "tool_result",
    toolName: "gather_search_context",
    result: search,
  }, thinkingSteps, onStep);
  emitToolStep({
    type: "tool_result",
    toolName: "gather_contradictions",
    result: contradictions,
  }, thinkingSteps, onStep);

  return { overview, search, contradictions };
}

function collectSources(evidence: GatheredEvidence): AgentSource[] {
  const sources = new Map<string, AgentSource>();

  const searchResults = Array.isArray(evidence.search.results)
    ? evidence.search.results as Array<Record<string, unknown>>
    : [];
  for (const result of searchResults) {
    const filename = typeof result.filename === "string" ? result.filename : undefined;
    if (!filename) continue;
    const key = typeof result.chunkId === "string" ? result.chunkId : filename;
    sources.set(key, {
      chunkId: typeof result.chunkId === "string" ? result.chunkId : undefined,
      documentId: typeof result.documentId === "string" ? result.documentId : undefined,
      chunkIndex: typeof result.chunkIndex === "number" ? result.chunkIndex : undefined,
      filename,
      locationLabel: typeof result.locationLabel === "string" ? result.locationLabel : undefined,
      contentType: typeof result.contentType === "string" ? result.contentType : undefined,
      mimeType: typeof result.mimeType === "string" ? result.mimeType : undefined,
      sourceMimeType: typeof result.sourceMimeType === "string" ? result.sourceMimeType : undefined,
      pageStart: typeof result.pageStart === "number" ? result.pageStart : undefined,
      pageEnd: typeof result.pageEnd === "number" ? result.pageEnd : undefined,
      startSeconds: typeof result.startSeconds === "number" ? result.startSeconds : undefined,
      endSeconds: typeof result.endSeconds === "number" ? result.endSeconds : undefined,
      preview: typeof result.preview === "string" ? result.preview : undefined,
    });
  }

  const representativeDocuments = Array.isArray(evidence.overview.representativeDocuments)
    ? evidence.overview.representativeDocuments as Array<Record<string, unknown>>
    : [];
  for (const document of representativeDocuments) {
    const filename = typeof document.filename === "string" ? document.filename : undefined;
    if (!filename) continue;
    const key = typeof document.id === "string" ? document.id : filename;
    if (sources.has(key)) continue;
    sources.set(key, {
      documentId: typeof document.id === "string" ? document.id : undefined,
      filename,
      contentType: typeof document.contentType === "string" ? document.contentType : undefined,
      mimeType: typeof document.mimeType === "string" ? document.mimeType : undefined,
      preview: typeof document.summary === "string" ? document.summary : undefined,
    });
  }

  return Array.from(sources.values());
}

function getWorkerSystemPrompt(worker: AgentRoleConfig): string {
  const commonRules = `You are a specialized EvidenceOS analysis worker.
- Work only from the provided evidence packet.
- Do not invent facts.
- Return strict JSON only.
- Keep outputs concise and operational.`;

  switch (worker.id) {
    case "context_mapper":
      return `${commonRules}
Your job is to extract the main themes, actors, evidence clusters, and overall shape of the project.`;
    case "risk_auditor":
      return `${commonRules}
Your job is to surface contradictions, weak points, unresolved questions, support signals, and confidence issues.`;
    case "next_step_planner":
      return `${commonRules}
Your job is to propose the best next investigation questions and the most important source priorities.`;
    default:
      return commonRules;
  }
}

function getWorkerResponseShape(worker: AgentRoleConfig): string {
  switch (worker.id) {
    case "context_mapper":
      return `{
  "summary": "short paragraph",
  "themes": ["..."],
  "actors": ["..."],
  "sourcePriorities": ["filename.ext"]
}`;
    case "risk_auditor":
      return `{
  "summary": "short paragraph",
  "risks": ["..."],
  "contradictions": ["..."],
  "supportSignals": ["..."],
  "gaps": ["..."]
}`;
    case "next_step_planner":
      return `{
  "summary": "short paragraph",
  "nextQuestions": ["..."],
  "recommendedSources": ["filename.ext"],
  "investigationAngle": "..."
}`;
    default:
      return `{
  "summary": "short paragraph"
}`;
  }
}

async function runWorker(
  worker: AgentRoleConfig,
  workerTimeoutMs: number,
  userMessage: string,
  evidence: GatheredEvidence,
  thinkingSteps: ThinkingStep[],
  onStep?: (step: ThinkingStep) => void
): Promise<WorkerOutput> {
  emitToolStep({
    type: "tool_call",
    toolName: `worker_${worker.id}`,
    toolArgs: { model: worker.model, provider: worker.provider },
  }, thinkingSteps, onStep);

  try {
    const provider = new OpenRouterProvider(worker.model);
    const response = await Promise.race([
      provider.generateContent(
        [
          {
            role: "user",
            content: `Original user question: ${userMessage}

Evidence packet:
${buildEvidencePacket(userMessage, evidence)}

Return JSON in this exact general shape:
${getWorkerResponseShape(worker)}`,
          },
        ],
        getWorkerSystemPrompt(worker)
      ),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timed out after ${workerTimeoutMs}ms`)), workerTimeoutMs);
      }),
    ]);

    const rawText = response.text?.trim() || "";
    const data = safeJsonParse(rawText) || { summary: rawText };
    const output: WorkerOutput = {
      workerId: worker.id,
      workerLabel: worker.label,
      model: worker.model,
      summary: typeof data.summary === "string" ? data.summary : rawText || `${worker.label} completed analysis.`,
      data,
      rawText,
    };

    emitToolStep({
      type: "tool_result",
      toolName: `worker_${worker.id}`,
      result: output,
    }, thinkingSteps, onStep);
    return output;
  } catch (error) {
    const output: WorkerOutput = {
      workerId: worker.id,
      workerLabel: worker.label,
      model: worker.model,
      summary: `${worker.label} failed`,
      data: {},
      rawText: "",
      error: error instanceof Error ? error.message : "Unknown worker error",
    };
    emitToolStep({
      type: "tool_result",
      toolName: `worker_${worker.id}`,
      result: output,
    }, thinkingSteps, onStep);
    return output;
  }
}

async function synthesizeAnswer(
  userMessage: string,
  chatHistory: LLMMessage[],
  evidence: GatheredEvidence,
  workers: WorkerOutput[],
  sources: AgentSource[],
  thinkingSteps: ThinkingStep[],
  onStep?: (step: ThinkingStep) => void,
  onToken?: (token: string) => void
): Promise<string> {
  emitToolStep({
    type: "tool_call",
    toolName: "gemini_synthesizer",
    toolArgs: { sourceCount: sources.length, workerCount: workers.length },
  }, thinkingSteps, onStep);

  const response = await withFallback((provider) =>
    provider.generateContent(
      [
        ...chatHistory,
        {
          role: "user",
          content: `Original user question: ${userMessage}

Grounded evidence:
${buildEvidencePacket(userMessage, evidence)}

Worker outputs:
${JSON.stringify(workers, null, 2)}

Available source filenames:
${sources.map((source) => `- ${source.filename}${source.locationLabel ? ` (${source.locationLabel})` : ""}`).join("\n") || "- none"}

Write the final answer now. Keep it concise, cross-document, and grounded. End with a Sources line using filenames from the list above.`,
        },
      ],
      `You are the final EvidenceOS orchestrator.
- Synthesize the evidence packet and worker outputs into one answer.
- Prefer grounded conclusions over speculative ones.
- Explicitly mention contradictions or support signals when present.
- Cite sources by filename at the end.
- Do not call tools.`,
    )
  );

  const answer = response.text?.trim() || "I gathered the project context, but I couldn't synthesize a final answer.";
  emitToolStep({
    type: "tool_result",
    toolName: "gemini_synthesizer",
    result: {
      answerPreview: answer.substring(0, 400),
      sourceCount: sources.length,
      workerCount: workers.length,
    },
  }, thinkingSteps, onStep);
  streamLocally(answer, onToken);
  return answer;
}

export async function runInvestigationAgent(
  userMessage: string,
  chatHistory: LLMMessage[] = [],
  vaultId?: string,
  onStep?: (step: ThinkingStep) => void,
  onToken?: (token: string) => void
): Promise<AgentResult> {
  const runtime = getAgentRuntimeConfig();
  const routingSteps: ThinkingStep[] = [];

  if (!runtime.parallelEnabled || !shouldUseParallelAgentPath(userMessage)) {
    emitRouteDecision(
      "single",
      !runtime.parallelEnabled
        ? "Parallel worker runtime is disabled because OpenRouter is not configured."
        : "Prompt did not match the current project-scope parallel routing heuristics.",
      {
        orchestrator: runtime.orchestrator.model,
      },
      routingSteps,
      onStep
    );

    const result = await runAgentLoop(userMessage, chatHistory, vaultId, onStep, onToken);
    return {
      answer: result.answer,
      thinkingSteps: [...routingSteps, ...result.thinkingSteps],
      sources: result.sources,
    };
  }

  const thinkingSteps: ThinkingStep[] = [];

  try {
    emitRouteDecision(
      "parallel",
      "Prompt matched the current project-scope parallel routing heuristics.",
      {
        orchestrator: runtime.orchestrator.model,
        synthesizer: runtime.synthesizer.model,
        workerTimeoutMs: runtime.workerTimeoutMs,
        workers: runtime.workers
          .filter((worker) => worker.enabled)
          .map((worker) => ({ id: worker.id, model: worker.model })),
      },
      thinkingSteps,
      onStep
    );

    const evidence = await gatherEvidence(userMessage, vaultId, thinkingSteps, onStep);
    const workerOutputs = await Promise.all(
      runtime.workers
        .filter((worker) => worker.enabled)
        .map((worker) => runWorker(worker, runtime.workerTimeoutMs, userMessage, evidence, thinkingSteps, onStep))
    );

    const successfulWorkerOutputs = workerOutputs.filter((worker) => !worker.error);
    if (successfulWorkerOutputs.length === 0) {
      emitToolStep({
        type: "tool_result",
        toolName: "worker_health_check",
        result: {
          status: "fallback_to_single_agent",
          reason: "All parallel OpenRouter workers failed or timed out.",
        },
      }, thinkingSteps, onStep);

      const fallbackResult = await runAgentLoop(userMessage, chatHistory, vaultId, onStep, onToken);
      return {
        answer: fallbackResult.answer,
        thinkingSteps: [...thinkingSteps, ...fallbackResult.thinkingSteps],
        sources: fallbackResult.sources,
      };
    }

    const sources = collectSources(evidence);
    const answer = await synthesizeAnswer(
      userMessage,
      chatHistory,
      evidence,
      successfulWorkerOutputs,
      sources,
      thinkingSteps,
      onStep,
      onToken
    );

    saveInvestigationNode(userMessage, answer, sources, thinkingSteps);
    return {
      answer,
      thinkingSteps,
      sources,
    };
  } catch (error) {
    emitToolStep({
      type: "tool_result",
      toolName: "agent_fallback",
      result: {
        reason: error instanceof Error ? error.message : "Unknown error",
        fallback: "single_agent_loop",
      },
    }, thinkingSteps, onStep);

    const fallbackResult = await runAgentLoop(userMessage, chatHistory, vaultId, onStep, onToken);
    return {
      answer: fallbackResult.answer,
      thinkingSteps: [...thinkingSteps, ...fallbackResult.thinkingSteps],
      sources: fallbackResult.sources,
    };
  }
}

export function getParallelAgentSummary(): {
  mode: "single" | "parallel";
  parallelEnabled: boolean;
  workerTimeoutMs: number;
  orchestrator: { provider: string; model: string };
  synthesizer: { provider: string; model: string };
  workers: Array<{ id: string; label: string; provider: string; model: string; enabled: boolean }>;
} {
  const runtime = getAgentRuntimeConfig();
  return {
    mode: runtime.mode,
    parallelEnabled: runtime.parallelEnabled,
    workerTimeoutMs: runtime.workerTimeoutMs,
    orchestrator: {
      provider: runtime.orchestrator.provider,
      model: runtime.orchestrator.model,
    },
    synthesizer: {
      provider: runtime.synthesizer.provider,
      model: runtime.synthesizer.model,
    },
    workers: runtime.workers.map((worker) => ({
      id: worker.id,
      label: worker.label,
      provider: worker.provider,
      model: worker.model,
      enabled: worker.enabled,
    })),
  };
}
