import { NextRequest, NextResponse } from "next/server";
import { runInvestigationAgent } from "@/lib/agent/multiAgent";
import { type LLMMessage } from "@/lib/agent/providers";
import { type ThinkingStep } from "@/lib/agent/types";
import { v4 as uuidv4 } from "uuid";
import {
  createChatSession,
  insertMessage,
  getMessages,
} from "@/lib/storage/database";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, sessionId, vaultId } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Create or get session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = uuidv4();
      createChatSession(currentSessionId, message.substring(0, 50));
    }

    // Save user message
    insertMessage({
      id: uuidv4(),
      sessionId: currentSessionId,
      role: "user",
      content: message,
      thinkingSteps: [],
      sources: [],
    });

    // Build chat history from previous messages
    const previousMessages = getMessages(currentSessionId);
    const chatHistory: LLMMessage[] = previousMessages
      .slice(0, -1) // Exclude the message we just inserted
      .map((msg) => ({
        role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
        content: msg.content,
      }));

    // Stream response using ReadableStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const steps: ThinkingStep[] = [];

        try {
          const result = await runInvestigationAgent(
            message,
            chatHistory,
            vaultId || undefined,
            (step) => {
              steps.push(step);
              // Stream thinking steps as SSE
              const data = JSON.stringify({
                type: "thinking_step",
                step,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            },
            (token) => {
              // Stream text tokens as SSE
              const data = JSON.stringify({
                type: "text",
                token,
              });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          );

          // Save assistant message
          insertMessage({
            id: uuidv4(),
            sessionId: currentSessionId,
            role: "assistant",
            content: result.answer,
            thinkingSteps: result.thinkingSteps,
            sources: result.sources,
          });

          // Stream final answer
          const finalData = JSON.stringify({
            type: "answer",
            answer: result.answer,
            sources: result.sources,
            thinkingSteps: result.thinkingSteps,
            sessionId: currentSessionId,
          });
          controller.enqueue(encoder.encode(`data: ${finalData}\n\n`));
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } catch (error) {
          const errData = JSON.stringify({
            type: "error",
            error: error instanceof Error ? error.message : "Agent error",
          });
          controller.enqueue(encoder.encode(`data: ${errData}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Chat failed" },
      { status: 500 }
    );
  }
}
