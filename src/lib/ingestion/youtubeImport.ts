import { chunkTimedTranscriptSegments } from "./chunking";
import { ingestPreparedTextDocument, type IngestResult } from "./ingest";
import { getYouTubeTranscriptProvider } from "./youtubeProvider";

function formatTimecode(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function buildTranscriptMarkdown(payload: {
  title: string;
  url: string;
  channel?: string;
  language?: string;
  isGenerated?: boolean;
  segments: Array<{ text: string; startSeconds: number; endSeconds: number }>;
}): string {
  const header = [
    `# ${payload.title}`,
    "",
    `- Source: ${payload.url}`,
    payload.channel ? `- Channel: ${payload.channel}` : "",
    payload.language ? `- Language: ${payload.language}` : "",
    typeof payload.isGenerated === "boolean" ? `- Transcript Type: ${payload.isGenerated ? "Auto-generated" : "Manual"}` : "",
    "",
    "## Transcript",
    "",
  ].filter(Boolean);

  const body = payload.segments.map((segment) => (
    `[${formatTimecode(segment.startSeconds)}-${formatTimecode(segment.endSeconds)}] ${segment.text}`
  ));

  return [...header, ...body].join("\n");
}

export async function importYouTubeTranscript(
  url: string,
  vaultId?: string,
  onProgress?: (step: string) => void
): Promise<IngestResult> {
  onProgress?.("Fetching YouTube transcript...");
  const provider = getYouTubeTranscriptProvider();
  const transcript = await provider.fetchTranscript(url, ["en"]);

  const originalName = `YouTube - ${transcript.title}`;
  const transcriptMarkdown = buildTranscriptMarkdown({
    title: transcript.title,
    url: transcript.url,
    channel: transcript.channel,
    language: transcript.language,
    isGenerated: transcript.isGenerated,
    segments: transcript.segments,
  });

  const chunks = chunkTimedTranscriptSegments(
    transcript.segments.map((segment) => ({
      text: segment.text,
      startSeconds: segment.startSeconds,
      endSeconds: segment.endSeconds,
    })),
    {
      mimeType: "video/youtube",
      filename: originalName,
      sourceType: "youtube_transcript",
      metadata: {
        sourceUrl: transcript.url,
        videoId: transcript.videoId,
        channel: transcript.channel || "",
        language: transcript.language || "",
        languageCode: transcript.languageCode || "",
        isGenerated: Boolean(transcript.isGenerated),
        thumbnailUrl: transcript.thumbnailUrl || "",
      },
    }
  );

  return ingestPreparedTextDocument({
    originalName,
    mimeType: "text/markdown",
    content: transcriptMarkdown,
    chunks,
    vaultId,
    onProgress,
    fileExtension: ".md",
    graphNodeProperties: {
      sourceType: "youtube",
      sourceUrl: transcript.url,
      videoId: transcript.videoId,
      channel: transcript.channel || "",
      language: transcript.language || "",
      languageCode: transcript.languageCode || "",
      isGenerated: Boolean(transcript.isGenerated),
      thumbnailUrl: transcript.thumbnailUrl || "",
    },
  });
}
