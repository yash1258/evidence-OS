import { spawn } from "child_process";
import path from "path";

export interface YouTubeTranscriptSegment {
  text: string;
  startSeconds: number;
  endSeconds: number;
  durationSeconds?: number;
}

export interface YouTubeTranscriptPayload {
  videoId: string;
  url: string;
  title: string;
  channel?: string;
  thumbnailUrl?: string;
  language?: string;
  languageCode?: string;
  isGenerated?: boolean;
  segments: YouTubeTranscriptSegment[];
}

export interface YouTubeTranscriptProvider {
  fetchTranscript(url: string, languages?: string[]): Promise<YouTubeTranscriptPayload>;
}

function parseProviderOutput(stdout: string): YouTubeTranscriptPayload {
  const parsed = JSON.parse(stdout) as Partial<YouTubeTranscriptPayload>;
  if (!parsed.videoId || !parsed.url || !parsed.title || !Array.isArray(parsed.segments)) {
    throw new Error("YouTube transcript provider returned an invalid payload.");
  }

  return {
    videoId: parsed.videoId,
    url: parsed.url,
    title: parsed.title,
    channel: parsed.channel || "",
    thumbnailUrl: parsed.thumbnailUrl || "",
    language: parsed.language || "",
    languageCode: parsed.languageCode || "",
    isGenerated: Boolean(parsed.isGenerated),
    segments: parsed.segments
      .filter((segment): segment is YouTubeTranscriptSegment => Boolean(segment?.text))
      .map((segment) => ({
        text: segment.text,
        startSeconds: Number(segment.startSeconds || 0),
        endSeconds: Number(segment.endSeconds || 0),
        durationSeconds: Number(segment.durationSeconds || Math.max(0, Number(segment.endSeconds || 0) - Number(segment.startSeconds || 0))),
      })),
  };
}

export class PythonYouTubeTranscriptProvider implements YouTubeTranscriptProvider {
  async fetchTranscript(url: string, languages: string[] = ["en"]): Promise<YouTubeTranscriptPayload> {
    const pythonBinary = process.env.YOUTUBE_TRANSCRIPT_PYTHON || "python";
    const scriptPath = path.join(process.cwd(), "scripts", "fetch_youtube_transcript.py");

    return new Promise<YouTubeTranscriptPayload>((resolve, reject) => {
      const child = spawn(pythonBinary, [scriptPath, url, ...languages], {
        cwd: process.cwd(),
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to launch YouTube transcript provider: ${error.message}`));
      });

      child.on("close", (code) => {
        if (code !== 0) {
          reject(new Error((stderr || "YouTube transcript provider failed.").trim()));
          return;
        }

        try {
          resolve(parseProviderOutput(stdout.trim()));
        } catch (error) {
          reject(error instanceof Error ? error : new Error("Failed to parse YouTube transcript payload."));
        }
      });
    });
  }
}

let provider: YouTubeTranscriptProvider | null = null;

export function getYouTubeTranscriptProvider(): YouTubeTranscriptProvider {
  if (!provider) {
    provider = new PythonYouTubeTranscriptProvider();
  }
  return provider;
}
