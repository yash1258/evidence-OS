export type AgentProviderKind = "gemini" | "openrouter";

export interface AgentRoleConfig {
  id: string;
  label: string;
  provider: AgentProviderKind;
  model: string;
  purpose: string;
  enabled: boolean;
}

export interface AgentRuntimeConfig {
  mode: "single" | "parallel";
  parallelEnabled: boolean;
  workerTimeoutMs: number;
  orchestrator: AgentRoleConfig;
  synthesizer: AgentRoleConfig;
  workers: AgentRoleConfig[];
}

const DEFAULT_OPENROUTER_WORKER_MODEL = "openrouter/healer-alpha";
const DEFAULT_WORKER_TIMEOUT_MS = 12000;

function normalizeOpenRouterApiKey(rawValue: string | undefined): string | null {
  const trimmed = rawValue?.trim();
  if (!trimmed) return null;
  if (
    trimmed === "your_openrouter_api_key_here" ||
    trimmed === "OPENROUTER_API_KEY" ||
    trimmed === "placeholder"
  ) {
    return null;
  }
  return trimmed;
}

export function getOpenRouterApiKey(): string | null {
  return normalizeOpenRouterApiKey(process.env.OPENROUTER_API_KEY);
}

export function hasUsableOpenRouterKey(): boolean {
  const key = getOpenRouterApiKey();
  return Boolean(key && key.startsWith("sk-or-"));
}

function getOpenRouterWorkerModel(roleKey: string): string {
  return (
    process.env[roleKey] ||
    process.env.OPENROUTER_WORKER_MODEL ||
    DEFAULT_OPENROUTER_WORKER_MODEL
  );
}

export function getAgentRuntimeConfig(): AgentRuntimeConfig {
  const openRouterEnabled = hasUsableOpenRouterKey();

  return {
    mode: openRouterEnabled ? "parallel" : "single",
    parallelEnabled: openRouterEnabled,
    workerTimeoutMs: Number(process.env.OPENROUTER_WORKER_TIMEOUT_MS || DEFAULT_WORKER_TIMEOUT_MS),
    orchestrator: {
      id: "gemini_orchestrator",
      label: "Gemini Orchestrator",
      provider: "gemini",
      model: "gemini-3-flash-preview",
      purpose: "Own tool routing, evidence framing, and final grounded answers.",
      enabled: true,
    },
    synthesizer: {
      id: "gemini_synthesizer",
      label: "Gemini Synthesizer",
      provider: "gemini",
      model: "gemini-3-flash-preview",
      purpose: "Turn gathered evidence and worker outputs into a concise cited answer.",
      enabled: true,
    },
    workers: [
      {
        id: "context_mapper",
        label: "Context Mapper",
        provider: "openrouter",
        model: getOpenRouterWorkerModel("OPENROUTER_CONTEXT_MAPPER_MODEL"),
        purpose: "Extract the main themes, actors, and evidence clusters from gathered context.",
        enabled: openRouterEnabled,
      },
      {
        id: "risk_auditor",
        label: "Risk Auditor",
        provider: "openrouter",
        model: getOpenRouterWorkerModel("OPENROUTER_RISK_AUDITOR_MODEL"),
        purpose: "Flag contradictions, tension points, support signals, and confidence gaps.",
        enabled: openRouterEnabled,
      },
      {
        id: "next_step_planner",
        label: "Next-Step Planner",
        provider: "openrouter",
        model: getOpenRouterWorkerModel("OPENROUTER_NEXT_STEP_MODEL"),
        purpose: "Propose follow-up questions, investigation angles, and source priorities.",
        enabled: openRouterEnabled,
      },
    ],
  };
}
