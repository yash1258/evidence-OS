import { SYSTEM_PROMPT } from "./systemPrompt";
import { AGENT_TOOLS } from "./tools";
import { executeTool } from "./toolImplementations";
import { withFallback, type LLMMessage, type LLMResponse } from "./providers";
import { v4 as uuidv4 } from "uuid";
import { insertNode, insertEdge } from "@/lib/storage/database";

const MAX_ITERATIONS = 10;

/**
 * Save a completed investigation as a graph node.
 * Links the investigation to all documents it referenced via "references" edges.
 * This makes the graph learn from every query.
 */
function saveInvestigationNode(
  query: string,
  answer: string,
  sources: string[],
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
        sources,
        toolsUsed: thinkingSteps
          .filter((s) => s.type === "tool_call")
          .map((s) => s.toolName)
          .filter(Boolean),
        stepCount: thinkingSteps.length,
      },
      vault_id: null,
      embedding_id: null,
    });

    // Link investigation to source documents via document IDs found in tool results
    const docIds = new Set<string>();
    for (const step of thinkingSteps) {
      if (step.type === "tool_result" && step.result) {
        const result = step.result as Record<string, unknown>;
        // Extract documentId from search results
        if (result.results && Array.isArray(result.results)) {
          for (const r of result.results as Array<{ documentId?: string }>) {
            if (r.documentId) docIds.add(r.documentId);
          }
        }
        // Extract from direct document content retrieval
        if (result.documentId) docIds.add(result.documentId as string);
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
        evidence: `Investigation referenced this document`,
        method: "structural",
        metadata: { query: query.substring(0, 200) },
      });
    }
  } catch {
    // Investigation tracking is non-critical — fail silently
  }
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
  sources: string[];
}

/**
 * ReAct Agent Loop
 *
 * Reason -> Act -> Observe -> Repeat until final answer
 *
 * 1. Send user message + tool declarations to LLM
 * 2. If LLM returns function calls -> execute tools, feed results back
 * 3. Repeat until LLM returns a text response (final answer)
 * 4. Extract source citations from the answer
 */
export async function runAgentLoop(
  userMessage: string,
  chatHistory: LLMMessage[] = [],
  vaultId?: string,
  onStep?: (step: ThinkingStep) => void
): Promise<AgentResult> {
  const thinkingSteps: ThinkingStep[] = [];
  const sourcesSet = new Set<string>();

  // Build conversation messages
  const messages: LLMMessage[] = [
    ...chatHistory,
    { role: "user", content: userMessage },
  ];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

    // Call LLM with tools
    let response: LLMResponse;
    try {
      response = await withFallback((provider) =>
        provider.generateContent(messages, SYSTEM_PROMPT, AGENT_TOOLS)
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      return {
        answer: `I encountered an error while processing your request: ${errorMsg}`,
        thinkingSteps,
        sources: [],
      };
    }

    // Check if we have function calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      // Preserve the FULL model response (including thought_signature) in conversation
      // Gemini 3 requires thought_signature to be passed back for function calls to work
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rawParts = (response.raw as any)?.candidates?.[0]?.content?.parts;
      if (rawParts) {
        messages.push({
          role: "model",
          parts: rawParts,
        });
      } else {
        // Fallback: construct parts manually (will work for OpenRouter/non-Gemini)
        messages.push({
          role: "model",
          parts: response.functionCalls.map((fc) => ({
            functionCall: { name: fc.name, args: fc.args },
          })),
        });
      }

      for (const fc of response.functionCalls) {
        // Record the tool call step
        const callStep: ThinkingStep = {
          type: "tool_call",
          toolName: fc.name,
          toolArgs: fc.args,
          timestamp: Date.now(),
        };
        thinkingSteps.push(callStep);
        onStep?.(callStep);

        // Execute the tool, injecting vaultId into kwargs implicitly
        const toolArgs = { ...fc.args, vaultId };
        const toolResult = await executeTool(fc.name, toolArgs);

        // Track sources from search results
        if (fc.name === "search_knowledge_base" && toolResult.results) {
          const results = toolResult.results as Array<{ filename?: string }>;
          results.forEach((r) => {
            if (r.filename) sourcesSet.add(r.filename);
          });
        }
        if (fc.name === "get_document_content" && toolResult.filename) {
          sourcesSet.add(toolResult.filename as string);
        }

        // Record the tool result step
        const resultStep: ThinkingStep = {
          type: "tool_result",
          toolName: fc.name,
          result: toolResult,
          timestamp: Date.now(),
        };
        thinkingSteps.push(resultStep);
        onStep?.(resultStep);

        // Add function response to messages
        messages.push({
          role: "function",
          functionResponse: {
            name: fc.name,
            response: { result: toolResult },
          },
        });
      }

      // Continue the loop - let the model process tool results
      continue;
    }

    // No function calls - this is the final text response
    if (response.text) {
      // Extract any source citations from the response text
      const sourcePattern = /\[([^\]]+\.[a-z]+)\]/gi;
      let match;
      while ((match = sourcePattern.exec(response.text)) !== null) {
        sourcesSet.add(match[1]);
      }

      // Save investigation as a graph node
      saveInvestigationNode(userMessage, response.text, Array.from(sourcesSet), thinkingSteps);

      return {
        answer: response.text,
        thinkingSteps,
        sources: Array.from(sourcesSet),
      };
    }

    // Safety: if neither function calls nor text, break
    break;
  }

  // If we hit max iterations
  return {
    answer:
      "I reached the maximum number of reasoning steps. Here's what I found so far based on my research into your knowledge base.",
    thinkingSteps,
    sources: Array.from(sourcesSet),
  };
}
