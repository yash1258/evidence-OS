export interface AgentSource {
  documentId?: string;
  chunkId?: string;
  chunkIndex?: number;
  filename: string;
  locationLabel?: string;
  contentType?: string;
  mimeType?: string;
  sourceMimeType?: string;
  pageStart?: number;
  pageEnd?: number;
  startSeconds?: number;
  endSeconds?: number;
  preview?: string;
  content?: string;
}

export interface ThinkingStep {
  type: "tool_call" | "tool_result" | "thinking";
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  result?: unknown;
  thought?: string;
  timestamp: number;
}

export interface AgentResult {
  answer: string;
  thinkingSteps: ThinkingStep[];
  sources: AgentSource[];
}
