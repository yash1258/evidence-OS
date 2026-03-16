import { NextRequest, NextResponse } from "next/server";
import {
  listDocuments,
  deleteDocument as dbDeleteDocument,
  getDocument,
} from "@/lib/storage/database";
import { deleteByDocumentId } from "@/lib/storage/vectorStore";
import fs from "fs";
import path from "path";

const UPLOADS_DIR = path.join(process.cwd(), "uploads");

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const contentType = searchParams.get("contentType") || undefined;

    const docs = listDocuments({ contentType, status: "ready" });

    return NextResponse.json({ documents: docs });
  } catch (error) {
    console.error("List documents error:", error);
    return NextResponse.json(
      { error: "Failed to list documents" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

    const doc = getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Delete from ChromaDB
    try {
      await deleteByDocumentId(id);
    } catch (e) {
      console.warn("Failed to delete vectors:", e);
    }

    // Delete from filesystem
    const filePath = path.join(UPLOADS_DIR, doc.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete from SQLite (cascades to chunks)
    dbDeleteDocument(id);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
