export interface ContentChunk {
  index: number;
  content: string | Buffer;
  mimeType: string;
  preview: string; // short text preview for display
}

const MAX_TEXT_TOKENS = 1000;
/**
 * Chunk text content into paragraph-aware segments
 */
export function chunkText(text: string, maxTokens: number = MAX_TEXT_TOKENS): ContentChunk[] {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
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

  // If no chunks were created (single paragraph), use the whole text
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

/**
 * Chunk a PDF buffer. Since Gemini Embedding 2 supports max 6 pages per embedding,
 * we just pass the whole PDF as one chunk if it's small enough.
 * For larger PDFs, we'd need a PDF page splitter (future enhancement).
 */
export function chunkPdf(buffer: Buffer, filename: string): ContentChunk[] {
  // For now, treat the whole PDF as a single chunk
  // Gemini Embedding 2 handles up to 6 pages natively
  return [
    {
      index: 0,
      content: buffer,
      mimeType: "application/pdf",
      preview: `PDF document: ${filename}`,
    },
  ];
}

/**
 * Chunk an image - each image is a single chunk
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
 * Chunk audio content - each audio file is a single chunk
 * (Gemini supports up to 80s, longer audio would need splitting)
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
 * Auto-chunk based on MIME type
 */
export function chunkContent(
  content: string | Buffer,
  mimeType: string,
  filename: string
): ContentChunk[] {
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

  // Fallback: treat as text
  const text = typeof content === "string" ? content : content.toString("utf-8");
  return chunkText(text);
}
