import { GoogleGenAI, Type, createPartFromUri } from "@google/genai";

const TRANSCRIPTION_MODEL = "gemini-3-flash-preview";
const TRANSCRIPTION_POLL_INTERVAL_MS = 1500;
const TRANSCRIPTION_MAX_POLLS = 40;
const TRANSCRIPT_SEGMENT_TARGET_SECONDS = 45;

interface TranscriptSegment {
  start_seconds: number;
  end_seconds: number;
  text: string;
}

interface TranscriptResponse {
  title?: string;
  summary?: string;
  language?: string;
  segments?: TranscriptSegment[];
}

interface ActiveUploadedFile {
  name: string;
  uri: string;
  mimeType: string;
}

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  return new GoogleGenAI({ apiKey });
}

function cleanSegments(segments: TranscriptSegment[] | undefined): TranscriptSegment[] {
  if (!segments || segments.length === 0) {
    return [];
  }

  return segments
    .map((segment) => ({
      start_seconds: Math.max(0, Number(segment.start_seconds || 0)),
      end_seconds: Math.max(0, Number(segment.end_seconds || 0)),
      text: String(segment.text || "").trim(),
    }))
    .filter((segment) => segment.text.length > 0)
    .map((segment, index, arr) => {
      const nextStart = arr[index + 1]?.start_seconds;
      const endSeconds = segment.end_seconds > segment.start_seconds
        ? segment.end_seconds
        : nextStart && nextStart > segment.start_seconds
        ? nextStart
        : segment.start_seconds + TRANSCRIPT_SEGMENT_TARGET_SECONDS;

      return {
        ...segment,
        end_seconds: endSeconds,
      };
    });
}

async function uploadAudioAndWait(filePath: string, mimeType: string): Promise<{ ai: GoogleGenAI; file: ActiveUploadedFile }> {
  const ai = getClient();
  const uploaded = await ai.files.upload({
    file: filePath,
    config: { mimeType },
  });

  if (!uploaded.name || !uploaded.uri || !uploaded.mimeType) {
    throw new Error("Audio upload did not return required file metadata");
  }

  for (let poll = 0; poll < TRANSCRIPTION_MAX_POLLS; poll++) {
    const file = await ai.files.get({ name: uploaded.name });
    if (file.state === "ACTIVE" && file.uri && file.mimeType) {
      const name = file.name;
      const uri = file.uri;
      const resolvedMimeType = file.mimeType;
      if (!name) {
        throw new Error("Processed audio file is missing a name");
      }

      return {
        ai,
        file: {
          name,
          uri,
          mimeType: resolvedMimeType,
        },
      };
    }
    if (file.state === "FAILED") {
      throw new Error(file.error?.message || "Audio processing failed");
    }
    await new Promise((resolve) => setTimeout(resolve, TRANSCRIPTION_POLL_INTERVAL_MS));
  }

  throw new Error("Audio processing timed out before the file became ACTIVE");
}

export async function transcribeAudioFile(filePath: string, mimeType: string): Promise<TranscriptResponse> {
  const { ai, file } = await uploadAudioAndWait(filePath, mimeType);

  try {
    const response = await ai.models.generateContent({
      model: TRANSCRIPTION_MODEL,
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Transcribe this audio into a clean JSON structure.

Return a JSON object with:
- "title": short title for the recording if it is inferable
- "summary": a 1-2 sentence summary
- "language": primary language if inferable
- "segments": array of transcript segments

For each segment return:
- "start_seconds": approximate segment start in seconds
- "end_seconds": approximate segment end in seconds
- "text": transcript text

Rules:
- Keep segments around 30 to 60 seconds when possible
- Preserve speaker changes if obvious
- Do not include markdown
- Return valid JSON only
- If timestamps are uncertain, estimate them conservatively from the sequence of speech`,
            },
            createPartFromUri(file.uri, file.mimeType),
          ],
        },
      ],
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            language: { type: Type.STRING },
            segments: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  start_seconds: { type: Type.NUMBER },
                  end_seconds: { type: Type.NUMBER },
                  text: { type: Type.STRING },
                },
                required: ["start_seconds", "end_seconds", "text"],
              },
            },
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}") as TranscriptResponse;
    return {
      title: parsed.title,
      summary: parsed.summary,
      language: parsed.language,
      segments: cleanSegments(parsed.segments),
    };
  } finally {
    if (file.name) {
      await ai.files.delete({ name: file.name }).catch(() => undefined);
    }
  }
}
