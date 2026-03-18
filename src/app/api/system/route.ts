import { NextResponse } from "next/server";
import { getGraphStats, listVaults } from "@/lib/storage/database";
import { getChromaHealth } from "@/lib/storage/vectorStore";
import { getParallelAgentSummary } from "@/lib/agent/multiAgent";

export async function GET() {
  try {
    const chromaUrl = process.env.CHROMA_URL || "http://localhost:8000";
    const url = new URL(chromaUrl);
    const chromaHealth = await getChromaHealth();

    return NextResponse.json({
      models: {
        primary: "gemini-3-flash-preview",
        fallback: process.env.OPENROUTER_API_KEY ? "openrouter/hunter-alpha" : null,
        embedding: "gemini-embedding-2-preview",
      },
      agentRuntime: getParallelAgentSummary(),
      services: {
        geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
        openRouterConfigured: Boolean(process.env.OPENROUTER_API_KEY),
        chroma: {
          host: `${url.protocol}//${url.hostname}`,
          port: url.port || (url.protocol === "https:" ? "443" : "80"),
          connected: chromaHealth.connected,
          error: chromaHealth.error || null,
        },
        storage: {
          database: "data/evidence.db",
          uploads: "uploads/",
        },
      },
      stats: getGraphStats(),
      vaultCount: listVaults().length,
      commands: {
        fixtureValidation: "npm run validate:fixtures",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch system state" },
      { status: 500 }
    );
  }
}
