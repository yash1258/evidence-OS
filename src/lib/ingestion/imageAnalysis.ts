import { GoogleGenAI, Type } from "@google/genai";

const IMAGE_ANALYSIS_MODEL = "gemini-3-flash-preview";

interface ImageAnalysisResponse {
  description?: string;
  visible_text?: string;
  notable_entities?: string[];
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

export interface ImageAnalysis {
  description: string;
  visibleText: string;
  notableEntities: string[];
}

export async function analyzeImage(buffer: Buffer, mimeType: string): Promise<ImageAnalysis | null> {
  const ai = getClient();

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_ANALYSIS_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this image for knowledge ingestion.

Return a JSON object with:
- "description": one concise sentence describing what the image contains
- "visible_text": any visible text you can confidently read
- "notable_entities": entities, labels, brands, people, products, places, or concepts clearly present

Rules:
- Keep description concise and factual
- If there is no visible text, return an empty string for visible_text
- Return valid JSON only
- Do not include markdown fencing`,
            },
            {
              inlineData: {
                mimeType,
                data: buffer.toString("base64"),
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            visible_text: { type: Type.STRING },
            notable_entities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}") as ImageAnalysisResponse;
    return {
      description: String(parsed.description || "").trim(),
      visibleText: String(parsed.visible_text || "").trim(),
      notableEntities: Array.isArray(parsed.notable_entities)
        ? parsed.notable_entities.map((entry) => String(entry).trim()).filter(Boolean)
        : [],
    };
  } catch {
    return null;
  }
}
