import { SYSTEM_PROMPT } from "./systemPrompt";
import { AGENT_TOOLS } from "./tools";
import { executeTool } from "./toolImplementations";
import { withFallback, type LLMMessage, type LLMResponse } from "./providers";
import { saveInvestigationNode } from "./investigationTracking";
import type { AgentResult, AgentSource, ThinkingStep } from "./types";

const MAX_ITERATIONS = 10;
const LOCAL_STREAM_CHUNK_SIZE = 18;
const MAX_IDENTICAL_TOOL_CALLS = 2;

function getRawResponseParts(raw: unknown): Array<Record<string, unknown>> | undefined {
  if (!raw || typeof raw !== "object" || !("candidates" in raw)) {
    return undefined;
  }

  const candidates = (raw as { candidates?: Array<{ content?: { parts?: Array<Record<string, unknown>> } }> }).candidates;
  return candidates?.[0]?.content?.parts;
}

function streamLocally(text: string, onToken?: (token: string) => void): void {
  if (!onToken) return;
  for (let index = 0; index < text.length; index += LOCAL_STREAM_CHUNK_SIZE) {
    onToken(text.slice(index, index + LOCAL_STREAM_CHUNK_SIZE));
  }
}

async function synthesizeFinalAnswer(
  userMessage: string,
  messages: LLMMessage[],
  thinkingSteps: ThinkingStep[],
  onToken?: (token: string) => void
): Promise<string | null> {
  try {
    const synthesisPrompt = `${SYSTEM_PROMPT}

You already have tool results in the conversation.
- Answer the user's original request now using only the evidence already gathered.
- Do not call any tools.
- If the gathered evidence is partial, say so plainly and still provide the best grounded answer.
- Include source citations at the end using filenames when available.
`;

    const response = await withFallback((provider) =>
      provider.generateContent(
        [
          ...messages,
          {
            role: "user",
            content: `Using only the gathered tool results, answer this original request directly without calling tools: ${userMessage}`,
          },
        ],
        synthesisPrompt
      )
    );

    if (!response.text) {
      return null;
    }

    const synthesizedAnswer = response.text.trim();
    if (!synthesizedAnswer) {
      return null;
    }

    const finalStep: ThinkingStep = {
      type: "thinking",
      thought: "Synthesized final answer from collected tool results to close the investigation.",
      timestamp: Date.now(),
    };
    thinkingSteps.push(finalStep);
    streamLocally(synthesizedAnswer, onToken);
    return synthesizedAnswer;
  } catch {
    return null;
  }
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
  onStep?: (step: ThinkingStep) => void,
  onToken?: (token: string) => void
): Promise<AgentResult> {
  const thinkingSteps: ThinkingStep[] = [];
  const sourcesMap = new Map<string, AgentSource>();
  const toolCallCounts = new Map<string, number>();

  const messages: LLMMessage[] = [
    ...chatHistory,
    { role: "user", content: userMessage },
  ];

  let iterations = 0;

  while (iterations < MAX_ITERATIONS) {
    iterations++;

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

    if (response.functionCalls && response.functionCalls.length > 0) {
      let shouldForceSynthesis = false;

      const rawParts = getRawResponseParts(response.raw);
      if (rawParts) {
        messages.push({
          role: "model",
          parts: rawParts,
        });
      } else {
        messages.push({
          role: "model",
          parts: response.functionCalls.map((fc) => ({
            functionCall: { name: fc.name, args: fc.args },
          })),
        });
      }

      for (const fc of response.functionCalls) {
        const normalizedSignature = JSON.stringify({
          name: fc.name,
          args: fc.args,
          vaultId: vaultId || null,
        });
        const nextCallCount = (toolCallCounts.get(normalizedSignature) || 0) + 1;
        toolCallCounts.set(normalizedSignature, nextCallCount);

        if (nextCallCount > MAX_IDENTICAL_TOOL_CALLS) {
          shouldForceSynthesis = true;
          continue;
        }

        const callStep: ThinkingStep = {
          type: "tool_call",
          toolName: fc.name,
          toolArgs: fc.args,
          timestamp: Date.now(),
        };
        thinkingSteps.push(callStep);
        onStep?.(callStep);

        const toolArgs = { ...fc.args, vaultId };
        const toolResult = await executeTool(fc.name, toolArgs);

        if (fc.name === "search_knowledge_base" && toolResult.results) {
          const results = toolResult.results as Array<{
            chunkId?: string;
            chunkIndex?: number;
            documentId?: string;
            filename?: string;
            locationLabel?: string;
            contentType?: string;
            mimeType?: string;
            sourceMimeType?: string;
            pageStart?: number;
            pageEnd?: number;
            startSeconds?: number;
            endSeconds?: number;
            preview?: string;
          }>;

          results.forEach((result) => {
            if (!result.filename) return;
            const key = result.chunkId || result.documentId || result.filename;
            sourcesMap.set(key, {
              chunkId: result.chunkId,
              chunkIndex: result.chunkIndex,
              documentId: result.documentId,
              filename: result.filename,
              locationLabel: result.locationLabel,
              contentType: result.contentType,
              mimeType: result.mimeType,
              sourceMimeType: result.sourceMimeType,
              pageStart: typeof result.pageStart === "number" ? result.pageStart : undefined,
              pageEnd: typeof result.pageEnd === "number" ? result.pageEnd : undefined,
              startSeconds: typeof result.startSeconds === "number" ? result.startSeconds : undefined,
              endSeconds: typeof result.endSeconds === "number" ? result.endSeconds : undefined,
              preview: result.preview,
            });
          });
        }

        if (fc.name === "get_document_content" && toolResult.filename) {
          const toolMetadata = (
            toolResult.metadata &&
            typeof toolResult.metadata === "object" &&
            !Array.isArray(toolResult.metadata)
          ) ? toolResult.metadata as Record<string, unknown> : undefined;
          const requestedChunkId = typeof fc.args.chunkId === "string" ? fc.args.chunkId : undefined;
          const source: AgentSource = {
            chunkId: requestedChunkId,
            documentId: typeof toolResult.documentId === "string" ? toolResult.documentId : undefined,
            filename: toolResult.filename as string,
            locationLabel: typeof toolResult.locationLabel === "string" ? toolResult.locationLabel : undefined,
            contentType: typeof toolResult.contentType === "string" ? toolResult.contentType : undefined,
            content: typeof toolResult.content === "string" ? toolResult.content : undefined,
            preview: typeof toolResult.preview === "string" ? toolResult.preview : undefined,
            mimeType: typeof toolResult.mimeType === "string" ? toolResult.mimeType : undefined,
            sourceMimeType: typeof toolMetadata?.sourceMimeType === "string" ? toolMetadata.sourceMimeType : undefined,
            pageStart: typeof toolMetadata?.pageStart === "number" ? toolMetadata.pageStart : undefined,
            pageEnd: typeof toolMetadata?.pageEnd === "number" ? toolMetadata.pageEnd : undefined,
            startSeconds: typeof toolMetadata?.startSeconds === "number" ? toolMetadata.startSeconds : undefined,
            endSeconds: typeof toolMetadata?.endSeconds === "number" ? toolMetadata.endSeconds : undefined,
          };
          sourcesMap.set(source.chunkId || source.documentId || source.filename, source);
        }

        const resultStep: ThinkingStep = {
          type: "tool_result",
          toolName: fc.name,
          result: toolResult,
          timestamp: Date.now(),
        };
        thinkingSteps.push(resultStep);
        onStep?.(resultStep);

        messages.push({
          role: "function",
          functionResponse: {
            name: fc.name,
            response: { result: toolResult },
          },
        });
      }

      if (shouldForceSynthesis && thinkingSteps.length > 0) {
        const synthesizedAnswer = await synthesizeFinalAnswer(userMessage, messages, thinkingSteps, onToken);
        if (synthesizedAnswer) {
          const sources = Array.from(sourcesMap.values());
          saveInvestigationNode(userMessage, synthesizedAnswer, sources, thinkingSteps);
          return {
            answer: synthesizedAnswer,
            thinkingSteps,
            sources,
          };
        }
      }

      continue;
    }

    if (response.text) {
      streamLocally(response.text, onToken);

      const sourcePattern = /\[([^\]]+\.[a-z]+)\]/gi;
      let match: RegExpExecArray | null;
      while ((match = sourcePattern.exec(response.text)) !== null) {
        const matchedFilename = match[1];
        if (!Array.from(sourcesMap.values()).some((source) => source.filename === matchedFilename)) {
          sourcesMap.set(matchedFilename, { filename: matchedFilename });
        }
      }

      const sources = Array.from(sourcesMap.values());
      saveInvestigationNode(userMessage, response.text, sources, thinkingSteps);

      return {
        answer: response.text,
        thinkingSteps,
        sources,
      };
    }

    break;
  }

  const synthesizedAnswer = thinkingSteps.length > 0
    ? await synthesizeFinalAnswer(userMessage, messages, thinkingSteps, onToken)
    : null;
  if (synthesizedAnswer) {
    const sources = Array.from(sourcesMap.values());
    saveInvestigationNode(userMessage, synthesizedAnswer, sources, thinkingSteps);
    return {
      answer: synthesizedAnswer,
      thinkingSteps,
      sources,
    };
  }

  return {
    answer:
      "I reached the maximum number of reasoning steps. Here's what I found so far based on my research into your knowledge base.",
    thinkingSteps,
    sources: Array.from(sourcesMap.values()),
  };
}
