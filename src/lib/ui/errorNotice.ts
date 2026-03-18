export interface NoticePayload {
  title: string;
  message: string;
}

function cleanMessage(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function getNoticeFromError(error: unknown, fallbackTitle: string): NoticePayload {
  const raw = cleanMessage(error instanceof Error ? error.message : String(error || ""));
  const lower = raw.toLowerCase();

  if (lower.includes("chroma is unavailable") || lower.includes("chromaconnectionerror")) {
    return {
      title: "Vector store offline",
      message: "Knowledge retrieval is temporarily unavailable.",
    };
  }

  if (lower.includes("youtube import") || lower.includes("transcript")) {
    return {
      title: "Import failed",
      message: "The source could not be ingested right now.",
    };
  }

  if (lower.includes("upload failed") || lower.includes("ingestion failed")) {
    return {
      title: "Upload failed",
      message: "The file was not added to the vault.",
    };
  }

  if (lower.includes("chat request failed") || lower.includes("no response stream") || lower.includes("agent error")) {
    return {
      title: "Chat unavailable",
      message: "The agent could not answer right now.",
    };
  }

  if (lower.includes("failed to fetch") || lower.includes("network") || lower.includes("timeout")) {
    return {
      title: "Connection issue",
      message: "The app could not reach one of its services.",
    };
  }

  if (lower.includes("vault")) {
    return {
      title: fallbackTitle,
      message: "Vault data could not be updated.",
    };
  }

  return {
    title: fallbackTitle,
    message: "Something went wrong. Please try again.",
  };
}
