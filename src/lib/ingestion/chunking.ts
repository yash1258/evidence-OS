import { PDFParse } from "pdf-parse";

export interface ContentChunk {
  index: number;
  content: string | Buffer;
  mimeType: string;
  preview: string;
  metadata?: Record<string, unknown>;
}

const MAX_TEXT_TOKENS = 1000;

/**
 * Chunk text content into paragraph-aware segments.
 */
export function chunkText(text: string, maxTokens: number = MAX_TEXT_TOKENS): ContentChunk[] {
  const paragraphs = text.split(/\n\s*\n/).filter((paragraph) => paragraph.trim().length > 0);
  const chunks: ContentChunk[] = [];
  let currentChunk = "";
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const estimatedTokens = (currentChunk + "\n\n" + paragraph).length / 4;

    if (estimatedTokens > maxTokens && currentChunk.length > 0) {
      chunks.push({
        index: chunkIndex++,
        content: currentChunk.trim(),
        mimeType: "text/plain",
        preview: currentChunk.trim().substring(0, 200),
      });
      currentChunk = paragraph;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      index: chunkIndex,
      content: currentChunk.trim(),
      mimeType: "text/plain",
      preview: currentChunk.trim().substring(0, 200),
    });
  }

  if (chunks.length === 0 && text.trim().length > 0) {
    chunks.push({
      index: 0,
      content: text.trim(),
      mimeType: "text/plain",
      preview: text.trim().substring(0, 200),
    });
  }

  return chunks;
}

function buildPdfChunksFromPages(
  pages: Array<{ num: number; text: string }>,
  filename: string,
  maxTokens: number = MAX_TEXT_TOKENS
): ContentChunk[] {
  const chunks: ContentChunk[] = [];
  let currentText = "";
  let currentStartPage: number | null = null;
  let currentEndPage: number | null = null;
  let chunkIndex = 0;

  const flushChunk = () => {
    const trimmed = currentText.trim();
    if (!trimmed || currentStartPage === null || currentEndPage === null) {
      return;
    }

    chunks.push({
      index: chunkIndex++,
      content: trimmed,
      mimeType: "text/plain",
      preview: `Pages ${currentStartPage}-${currentEndPage}: ${trimmed.substring(0, 180)}`,
      metadata: {
        sourceMimeType: "application/pdf",
        pageStart: currentStartPage,
        pageEnd: currentEndPage,
        pageCount: currentEndPage - currentStartPage + 1,
        filename,
      },
    });

    currentText = "";
    currentStartPage = null;
    currentEndPage = null;
  };

  for (const page of pages) {
    const pageText = page.text.trim();
    if (!pageText) continue;

    const pageBlock = `Page ${page.num}\n${pageText}`;
    const estimatedTokens = (currentText + "\n\n" + pageBlock).length / 4;

    if (estimatedTokens > maxTokens && currentText.trim().length > 0) {
      flushChunk();
    }

    if (currentStartPage === null) {
      currentStartPage = page.num;
    }
    currentEndPage = page.num;
    currentText += (currentText ? "\n\n" : "") + pageBlock;
  }

  flushChunk();
  return chunks;
}

/**
 * Chunk a PDF buffer into page-aware text chunks.
 * Falls back to a single binary PDF chunk if text extraction fails.
 */
export async function chunkPdf(buffer: Buffer, filename: string): Promise<ContentChunk[]> {
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText({
      lineEnforce: true,
      pageJoiner: "",
    });

    const pageChunks = buildPdfChunksFromPages(result.pages, filename);
    if (pageChunks.length > 0) {
      return pageChunks;
    }
  } catch {
    // Fall back to binary PDF embedding when page text extraction fails.
  } finally {
    await parser.destroy().catch(() => undefined);
  }

  return [
    {
      index: 0,
      content: buffer,
      mimeType: "application/pdf",
      preview: `PDF document: ${filename}`,
      metadata: {
        sourceMimeType: "application/pdf",
        filename,
      },
    },
  ];
}

/**
 * Chunk an image - each image is a single chunk.
 */
export function chunkImage(buffer: Buffer, mimeType: string, filename: string): ContentChunk[] {
  return [
    {
      index: 0,
      content: buffer,
      mimeType,
      preview: `Image: ${filename}`,
    },
  ];
}

/**
 * Chunk audio content - each audio file is a single chunk for now.
 */
export function chunkAudio(buffer: Buffer, mimeType: string, filename: string): ContentChunk[] {
  return [
    {
      index: 0,
      content: buffer,
      mimeType,
      preview: `Audio: ${filename}`,
    },
  ];
}

/**
 * Auto-chunk based on MIME type.
 */
export async function chunkContent(
  content: string | Buffer,
  mimeType: string,
  filename: string
): Promise<ContentChunk[]> {
  if (mimeType === "text/plain" || mimeType === "text/markdown") {
    const text = typeof content === "string" ? content : content.toString("utf-8");
    return chunkText(text);
  }

  if (mimeType === "application/pdf") {
    const buffer = typeof content === "string" ? Buffer.from(content, "base64") : content;
    return chunkPdf(buffer, filename);
  }

  if (mimeType.startsWith("image/")) {
    const buffer = typeof content === "string" ? Buffer.from(content, "base64") : content;
    return chunkImage(buffer, mimeType, filename);
  }

  if (mimeType.startsWith("audio/")) {
    const buffer = typeof content === "string" ? Buffer.from(content, "base64") : content;
    return chunkAudio(buffer, mimeType, filename);
  }

  const text = typeof content === "string" ? content : content.toString("utf-8");
  return chunkText(text);
}
