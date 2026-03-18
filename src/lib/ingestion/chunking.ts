import { PDFParse } from "pdf-parse";
import { GoogleGenAI } from "@google/genai";
import { PDFDocument } from "pdf-lib";
import { transcribeAudioFile } from "./audioTranscription";
import { analyzeImage } from "./imageAnalysis";

export interface ContentChunk {
  index: number;
  content: string | Buffer;
  mimeType: string;
  preview: string;
  metadata?: Record<string, unknown>;
}

export interface TimedTranscriptSegment {
  text: string;
  startSeconds: number;
  endSeconds: number;
}

const MAX_TEXT_TOKENS = 1000;
const AUDIO_TRANSCRIPT_MAX_CHARS = 2200;

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

function buildDirectPdfChunk(
  buffer: Buffer,
  filename: string,
  pages: Array<{ num: number; text: string }>,
  pageStart: number,
  pageEnd: number,
  documentPageCount: number,
  windowIndex: number,
  windowCount: number
): ContentChunk {
  const extractedText = pages
    .map((page) => page.text.trim())
    .filter(Boolean)
    .join("\n\n");

  const windowNumber = windowIndex + 1;
  const pageLabel = pageEnd !== pageStart ? `Pages ${pageStart}-${pageEnd}` : `Page ${pageStart}`;
  const windowLabel = windowCount > 1
    ? `Part ${windowNumber} of ${windowCount} (${pageLabel} of ${documentPageCount})`
    : `${pageLabel} of ${documentPageCount}`;
  const previewSource = extractedText || `${windowLabel} from PDF document: ${filename}`;

  return {
    index: 0,
    content: buffer,
    mimeType: "application/pdf",
    preview: previewSource.substring(0, 220),
    metadata: {
      sourceMimeType: "application/pdf",
      filename,
      pageCount: pageEnd - pageStart + 1,
      pageStart,
      pageEnd,
      documentPageCount,
      windowIndex,
      windowNumber,
      windowCount,
      windowLabel,
      isPartOfLargerDocument: windowCount > 1,
      embeddingStrategy: "pdf_direct",
      fallbackText: extractedText,
    },
  };
}

async function splitPdfIntoWindows(
  buffer: Buffer,
  pageCount: number,
  windowSize: number
): Promise<Array<{ buffer: Buffer; pageStart: number; pageEnd: number; windowIndex: number; windowCount: number }>> {
  const sourceDoc = await PDFDocument.load(buffer);
  const windows: Array<{ buffer: Buffer; pageStart: number; pageEnd: number; windowIndex: number; windowCount: number }> = [];
  const windowCount = Math.ceil(pageCount / windowSize);

  for (let start = 0; start < pageCount; start += windowSize) {
    const end = Math.min(start + windowSize, pageCount);
    const windowDoc = await PDFDocument.create();
    const pageIndices = Array.from({ length: end - start }, (_, index) => start + index);
    const copiedPages = await windowDoc.copyPages(sourceDoc, pageIndices);
    copiedPages.forEach((page) => windowDoc.addPage(page));
    const windowBytes = await windowDoc.save();

    windows.push({
      buffer: Buffer.from(windowBytes),
      pageStart: start + 1,
      pageEnd: end,
      windowIndex: windows.length,
      windowCount,
    });
  }

  return windows;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

async function extractPdfTextWithGemini(buffer: Buffer): Promise<string | null> {
  const ai = getGeminiClient();
  if (!ai) return null;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Extract the readable text from this PDF for knowledge ingestion.

Rules:
- Preserve headings and paragraph breaks where possible
- Return plain text only
- Do not summarize
- Do not add commentary`,
            },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0,
      },
    });

    const text = response.text?.trim();
    return text && text.length > 0 ? text : null;
  } catch {
    return null;
  }
}

/**
 * Chunk a PDF buffer into page-aware text chunks.
 * Uses direct PDF embedding only for PDFs up to 6 pages, then falls back to text-based chunking.
 */
export async function chunkPdf(buffer: Buffer, filename: string): Promise<ContentChunk[]> {
  const parser = new PDFParse({ data: buffer });
  let parsedPages: Array<{ num: number; text: string }> = [];

  try {
    const result = await parser.getText({
      lineEnforce: true,
      pageJoiner: "",
    });
    parsedPages = result.pages;
  } catch {
    // Fall through to PDF window splitting or Gemini extraction.
  } finally {
    await parser.destroy().catch(() => undefined);
  }

  const pageCount = parsedPages.length || await (async () => {
    try {
      const doc = await PDFDocument.load(buffer);
      return doc.getPageCount();
    } catch {
      return 0;
    }
  })();

  if (pageCount > 0) {
    if (pageCount <= 6) {
      const previewPages = parsedPages.length > 0 ? parsedPages : [{ num: 1, text: `PDF document: ${filename}` }];
      return [buildDirectPdfChunk(buffer, filename, previewPages, 1, pageCount, pageCount, 0, 1)];
    }

    const windows = await splitPdfIntoWindows(buffer, pageCount, 6);
    const windowChunks = windows.map((window) => {
      const windowPages = parsedPages.filter(
        (page) => page.num >= window.pageStart && page.num <= window.pageEnd
      );

      return buildDirectPdfChunk(
        window.buffer,
        filename,
        windowPages.length > 0 ? windowPages : [{ num: window.pageStart, text: `PDF pages ${window.pageStart}-${window.pageEnd}` }],
        window.pageStart,
        window.pageEnd,
        pageCount,
        window.windowIndex,
        window.windowCount
      );
    });

    if (windowChunks.length > 0) {
      return windowChunks;
    }
  }

  const geminiText = await extractPdfTextWithGemini(buffer);
  if (geminiText) {
    return chunkText(geminiText).map((chunk) => ({
      ...chunk,
      metadata: {
        sourceMimeType: "application/pdf",
        filename,
        extractionMethod: "gemini_fallback",
      },
    }));
  }

  throw new Error(`Unable to extract readable text from PDF "${filename}".`);
}

/**
 * Chunk an image - each image is a single chunk.
 */
export async function chunkImage(buffer: Buffer, mimeType: string, filename: string): Promise<ContentChunk[]> {
  const analysis = await analyzeImage(buffer, mimeType);
  const previewParts = [
    analysis?.description,
    analysis?.visibleText,
  ].filter(Boolean);
  const preview = previewParts.length > 0
    ? previewParts.join(" | ").substring(0, 220)
    : `Image: ${filename}`;

  return [
    {
      index: 0,
      content: buffer,
      mimeType,
      preview,
      metadata: {
        sourceMimeType: mimeType,
        sourceType: "image",
        filename,
        imageDescription: analysis?.description || "",
        visibleText: analysis?.visibleText || "",
        notableEntities: analysis?.notableEntities || [],
      },
    },
  ];
}

function formatSeconds(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function chunkTimedTranscriptSegments(
  segments: TimedTranscriptSegment[],
  options: {
    mimeType: string;
    filename: string;
    sourceType: string;
    maxChars?: number;
    metadata?: Record<string, unknown>;
  }
): ContentChunk[] {
  const chunks: ContentChunk[] = [];
  const maxChars = options.maxChars ?? AUDIO_TRANSCRIPT_MAX_CHARS;
  let currentText = "";
  let currentStart: number | null = null;
  let currentEnd: number | null = null;
  let chunkIndex = 0;

  const flushChunk = () => {
    const trimmed = currentText.trim();
    if (!trimmed || currentStart === null || currentEnd === null) {
      return;
    }

    chunks.push({
      index: chunkIndex++,
      content: trimmed,
      mimeType: "text/plain",
      preview: `${formatSeconds(currentStart)}-${formatSeconds(currentEnd)} ${trimmed.substring(0, 180)}`.trim(),
      metadata: {
        sourceMimeType: options.mimeType,
        sourceType: options.sourceType,
        filename: options.filename,
        startSeconds: currentStart,
        endSeconds: currentEnd,
        ...(options.metadata || {}),
      },
    });

    currentText = "";
    currentStart = null;
    currentEnd = null;
  };

  for (const segment of segments) {
    const text = segment.text.trim();
    if (!text) continue;

    const nextText = currentText ? `${currentText}\n${text}` : text;
    if (nextText.length > maxChars && currentText) {
      flushChunk();
    }

    if (currentStart === null) {
      currentStart = segment.startSeconds;
    }
    currentEnd = segment.endSeconds;
    currentText = currentText ? `${currentText}\n${text}` : text;
  }

  flushChunk();
  return chunks;
}

export async function chunkAudio(
  buffer: Buffer,
  mimeType: string,
  filename: string,
  sourcePath?: string
): Promise<ContentChunk[]> {
  if (sourcePath) {
    try {
      const transcription = await transcribeAudioFile(sourcePath, mimeType);
      const segments = transcription.segments || [];

      if (segments.length > 0) {
        const transcriptChunks = chunkTimedTranscriptSegments(
          segments.map((segment) => ({
            text: segment.text,
            startSeconds: segment.start_seconds,
            endSeconds: segment.end_seconds,
          })),
          {
            mimeType,
            filename,
            sourceType: "audio_transcript",
            metadata: {
              language: transcription.language || null,
            },
          }
        );

        if (transcriptChunks.length > 0) {
          return transcriptChunks;
        }
      }
    } catch {
      // Fall back to raw audio chunk if transcription fails.
    }
  }

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
  filename: string,
  sourcePath?: string
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
    return chunkAudio(buffer, mimeType, filename, sourcePath);
  }

  const text = typeof content === "string" ? content : content.toString("utf-8");
  return chunkText(text);
}
