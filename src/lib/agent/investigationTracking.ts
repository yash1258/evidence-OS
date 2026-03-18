import { v4 as uuidv4 } from "uuid";
import { insertNode, insertEdge } from "@/lib/storage/database";
import type { AgentSource, ThinkingStep } from "./types";

/**
 * Save a completed investigation as a graph node.
 * Links the investigation to all documents it referenced via "references" edges.
 * This makes the graph learn from every query.
 */
export function saveInvestigationNode(
  query: string,
  answer: string,
  sources: AgentSource[],
  thinkingSteps: ThinkingStep[]
): void {
  try {
    const investigationId = `inv_${uuidv4()}`;

    insertNode({
      id: investigationId,
      type: "investigation",
      label: query.substring(0, 100),
      properties: {
        query,
        answerPreview: answer.substring(0, 500),
        created_at: new Date().toISOString(),
        sources: sources.map((source) => source.filename),
        toolsUsed: thinkingSteps
          .filter((step) => step.type === "tool_call")
          .map((step) => step.toolName)
          .filter(Boolean),
        stepCount: thinkingSteps.length,
      },
      vault_id: null,
      embedding_id: null,
    });

    const docIds = new Set<string>();
    for (const step of thinkingSteps) {
      if (step.type !== "tool_result" || !step.result || typeof step.result !== "object") {
        continue;
      }

      const result = step.result as Record<string, unknown>;
      if (Array.isArray(result.results)) {
        for (const entry of result.results as Array<{ documentId?: string }>) {
          if (entry.documentId) {
            docIds.add(entry.documentId);
          }
        }
      }

      if (typeof result.documentId === "string") {
        docIds.add(result.documentId);
      }
    }

    for (const docId of docIds) {
      insertEdge({
        id: uuidv4(),
        source_id: investigationId,
        target_id: docId,
        type: "references",
        weight: 1.0,
        confidence: 1.0,
        evidence: "Investigation referenced this document",
        method: "structural",
        metadata: { query: query.substring(0, 200) },
      });
    }
  } catch {
    // Investigation tracking is non-critical — fail silently.
  }
}
