import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-2-preview";
const EMBEDDING_DIMENSIONS = 768;

let genai: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!genai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    genai = new GoogleGenAI({ apiKey });
  }
  return genai;
}

export type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY" | "SEMANTIC_SIMILARITY";

export interface EmbeddingResult {
  values: number[];
}

/**
 * Embed text content
 */
export async function embedText(
  text: string,
  taskType: TaskType = "RETRIEVAL_DOCUMENT"
): Promise<EmbeddingResult> {
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const embedding = response.embeddings?.[0];
  if (!embedding?.values) throw new Error("No embedding returned");
  return { values: embedding.values };
}

/**
 * Embed image content (PNG, JPEG)
 */
export async function embedImage(
  imageBase64: string,
  mimeType: string = "image/png",
  taskType: TaskType = "RETRIEVAL_DOCUMENT"
): Promise<EmbeddingResult> {
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
    ],
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const embedding = response.embeddings?.[0];
  if (!embedding?.values) throw new Error("No embedding returned for image");
  return { values: embedding.values };
}

/**
 * Embed audio content (MP3, WAV)
 */
export async function embedAudio(
  audioBase64: string,
  mimeType: string = "audio/mpeg",
  taskType: TaskType = "RETRIEVAL_DOCUMENT"
): Promise<EmbeddingResult> {
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [
      {
        inlineData: {
          mimeType,
          data: audioBase64,
        },
      },
    ],
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const embedding = response.embeddings?.[0];
  if (!embedding?.values) throw new Error("No embedding returned for audio");
  return { values: embedding.values };
}

/**
 * Embed PDF content
 */
export async function embedPdf(
  pdfBase64: string,
  taskType: TaskType = "RETRIEVAL_DOCUMENT"
): Promise<EmbeddingResult> {
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pdfBase64,
        },
      },
    ],
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  const embedding = response.embeddings?.[0];
  if (!embedding?.values) throw new Error("No embedding returned for PDF");
  return { values: embedding.values };
}

/**
 * Embed any content based on MIME type
 */
export async function embedContent(
  content: string | Buffer,
  mimeType: string,
  taskType: TaskType = "RETRIEVAL_DOCUMENT"
): Promise<EmbeddingResult> {
  if (mimeType.startsWith("text/") || mimeType === "text/plain" || mimeType === "text/markdown") {
    const text = typeof content === "string" ? content : content.toString("utf-8");
    return embedText(text, taskType);
  }

  const base64 = typeof content === "string" ? content : content.toString("base64");

  if (mimeType.startsWith("image/")) {
    return embedImage(base64, mimeType, taskType);
  }

  if (mimeType.startsWith("audio/")) {
    return embedAudio(base64, mimeType, taskType);
  }

  if (mimeType === "application/pdf") {
    return embedPdf(base64, taskType);
  }

  // Fallback: treat as text
  const text = typeof content === "string" ? content : content.toString("utf-8");
  return embedText(text, taskType);
}
