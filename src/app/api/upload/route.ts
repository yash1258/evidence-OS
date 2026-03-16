import { NextRequest, NextResponse } from "next/server";
import { ingestFile } from "@/lib/ingestion/ingest";

const ALLOWED_TYPES = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "audio/mpeg",
  "audio/wav",
  "audio/mp3",
  "audio/webm",
]);

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const vaultId = formData.get("vaultId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `Unsupported file type: ${file.type}. Allowed: ${Array.from(ALLOWED_TYPES).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run ingestion pipeline
    const result = await ingestFile(
      buffer,
      file.name,
      file.type,
      vaultId || undefined
    );

    if (result.status === "error") {
      return NextResponse.json(
        { error: result.error || "Ingestion failed" },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
