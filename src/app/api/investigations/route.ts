import { NextRequest, NextResponse } from "next/server";
import { getMessages, listChatSessions } from "@/lib/storage/database";

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get("sessionId");

    if (sessionId) {
      const messages = getMessages(sessionId);
      return NextResponse.json({ sessionId, messages });
    }

    const sessions = listChatSessions().map((session) => {
      const messages = getMessages(session.id);
      const lastAssistant = [...messages].reverse().find((message) => message.role === "assistant");
      const lastUser = [...messages].reverse().find((message) => message.role === "user");

      return {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: messages.length,
        lastUserMessage: lastUser?.content || null,
        lastAssistantAnswer: lastAssistant?.content || null,
        lastSources: Array.isArray(lastAssistant?.sources) ? lastAssistant.sources.length : 0,
      };
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch investigations" },
      { status: 500 }
    );
  }
}
