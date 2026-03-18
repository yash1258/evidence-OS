import { NextResponse } from "next/server";
import { getChunksByDocument, getDocument, getNode } from "@/lib/storage/database";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const document = getDocument(id);

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const chunks = getChunksByDocument(id);
    const node = getNode(id);
    const filePath = path.join(UPLOADS_DIR, document.filename);
    let fullContent: string | null = null;

    if ((document.mimeType.startsWith("text/") || document.mimeType === "text/plain") && fs.existsSync(filePath)) {
      fullContent = fs.readFileSync(filePath, "utf-8");
    }

    return NextResponse.json({
      document,
      nodeProperties: node?.properties || {},
      fullContent,
      chunks,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch document" },
      { status: 500 }
    );
  }
}
