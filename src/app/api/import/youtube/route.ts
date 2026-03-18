import { NextRequest, NextResponse } from "next/server";
import { importYouTubeTranscript } from "@/lib/ingestion/youtubeImport";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body?.url === "string" ? body.url.trim() : "";
    const vaultId = typeof body?.vaultId === "string" && body.vaultId.trim() ? body.vaultId.trim() : undefined;

    if (!url) {
      return NextResponse.json({ error: "YouTube URL is required." }, { status: 400 });
    }

    const result = await importYouTubeTranscript(url, vaultId);
    if (result.status === "error") {
      return NextResponse.json({ error: result.error || "YouTube import failed." }, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "YouTube import failed." },
      { status: 500 }
    );
  }
}
