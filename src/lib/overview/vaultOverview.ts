import {
  getEdgesByType,
  getNode,
  listDocuments,
  updateNodeProperties,
  type DocumentRecord,
} from "@/lib/storage/database";
import { getProvider } from "@/lib/agent/providers";

interface CountEntry {
  value: string;
  count: number;
}

export interface VaultOverview {
  scopeId: string | null;
  scopeLabel: string;
  generatedAt: string;
  totalDocuments: number;
  totalChunks: number;
  byMediaType: Record<string, number>;
  byContentType: CountEntry[];
  topTags: CountEntry[];
  topEntities: CountEntry[];
  relationshipCounts: Record<string, number>;
  keyThemes: string[];
  riskSignals: string[];
  followUpQuestions: string[];
  representativeDocuments: Array<{
    id: string;
    filename: string;
    contentType: string;
    mimeType: string;
    summary: string;
  }>;
  overview: string;
  focus?: string;
}

function summarizeMimeType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("text/")) return "text";
  return "other";
}

function buildTopCounts(values: string[], limit: number = 8): CountEntry[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    const normalized = value.trim();
    if (!normalized) continue;
    counts.set(normalized, (counts.get(normalized) || 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
    .slice(0, limit);
}

function pickRepresentativeDocuments(documents: DocumentRecord[], limit: number = 6) {
  return documents
    .filter((doc) => doc.summary || doc.originalName)
    .sort((a, b) => b.chunkCount - a.chunkCount || b.uploadedAt.localeCompare(a.uploadedAt))
    .slice(0, limit)
    .map((doc) => ({
      id: doc.id,
      filename: doc.originalName,
      contentType: doc.contentType,
      mimeType: doc.mimeType,
      summary: doc.summary || "No summary available.",
    }));
}

function buildKeyThemes(topTags: CountEntry[], topEntities: CountEntry[]): string[] {
  const themes = [
    ...topTags.slice(0, 4).map((entry) => entry.value),
    ...topEntities.slice(0, 4).map((entry) => entry.value),
  ];

  return Array.from(new Set(themes)).slice(0, 6);
}

function buildRiskSignals(relationshipCounts: Record<string, number>, documents: DocumentRecord[]): string[] {
  const signals: string[] = [];

  if ((relationshipCounts.contradicts || 0) > 0) {
    signals.push(`${relationshipCounts.contradicts} contradiction signal(s) are present across the vault.`);
  }
  if ((relationshipCounts.supports || 0) > 0) {
    signals.push(`${relationshipCounts.supports} support relationship(s) reinforce recurring claims.`);
  }

  const legalDocs = documents.filter((doc) => doc.contentType === "legal").length;
  const meetingDocs = documents.filter((doc) => doc.contentType === "meeting").length;
  const reportDocs = documents.filter((doc) => doc.contentType === "report").length;

  if (legalDocs > 0) {
    signals.push(`This vault contains ${legalDocs} legal-oriented document(s), so clause and evidence consistency matters.`);
  }
  if (meetingDocs > 0 && reportDocs > 0) {
    signals.push("Meeting materials and reports coexist here, which is often where strategy or factual drift appears.");
  }

  return signals.slice(0, 4);
}

function buildFollowUpQuestions(
  scopeLabel: string,
  relationshipCounts: Record<string, number>,
  topEntities: CountEntry[]
): string[] {
  const questions = [`What is the strongest project-wide takeaway from ${scopeLabel}?`];

  if ((relationshipCounts.contradicts || 0) > 0) {
    questions.push("Where do the strongest contradictions appear, and what evidence supports each side?");
  } else {
    questions.push("Which files most strongly support the main themes in this vault?");
  }

  if (topEntities.length > 0) {
    questions.push(`How do the key entities relate to ${topEntities[0].value}?`);
  }

  questions.push("What should be investigated next based on the current project evidence?");
  return questions.slice(0, 4);
}

async function generateNarrativeOverview(
  scopeLabel: string,
  documents: DocumentRecord[],
  topTags: CountEntry[],
  topEntities: CountEntry[],
  relationshipCounts: Record<string, number>,
  focus?: string
): Promise<string> {
  const provider = getProvider();
  const representativeDocs = pickRepresentativeDocuments(documents, 10);

  const prompt = `Create a concise bird's-eye project overview for the knowledge vault below.

Vault: ${scopeLabel}
Focus: ${focus || "general"}
Documents: ${documents.length}

Top tags:
${topTags.map((entry) => `- ${entry.value} (${entry.count})`).join("\n") || "- none"}

Top entities:
${topEntities.map((entry) => `- ${entry.value} (${entry.count})`).join("\n") || "- none"}

Relationship counts:
${Object.entries(relationshipCounts).map(([type, count]) => `- ${type}: ${count}`).join("\n") || "- none"}

Representative files:
${representativeDocs.map((doc) => `- ${doc.filename} [${doc.contentType}] ${doc.summary}`).join("\n") || "- none"}

Return a compact project overview in 2 short paragraphs. Cover:
1. what the project/vault is mostly about
2. the strongest themes, actors, and evidence patterns
3. any notable tensions, contradictions, or support signals if present`;

  const response = await provider.generateContent(
    [{ role: "user", content: prompt }],
    "You synthesize concise, accurate project-wide overviews from metadata. Do not invent facts not present in the provided vault summary.",
    []
  );

  return response.text?.trim() || `${scopeLabel} contains ${documents.length} documents with recurring themes around ${topTags.slice(0, 3).map((entry) => entry.value).join(", ") || "mixed topics"}.`;
}

export async function buildVaultOverview(vaultId?: string, focus?: string): Promise<VaultOverview> {
  const documents = listDocuments({
    status: "ready",
    ...(vaultId ? { vaultId } : {}),
  });

  const scopeNode = vaultId ? getNode(vaultId) : undefined;
  const scopeLabel = scopeNode?.label || (vaultId ? "Selected Vault" : "Knowledge Base");
  const generatedAt = new Date().toISOString();

  if (documents.length === 0) {
    return {
      scopeId: vaultId || null,
      scopeLabel,
      generatedAt,
      totalDocuments: 0,
      totalChunks: 0,
      byMediaType: {},
      byContentType: [],
      topTags: [],
      topEntities: [],
      relationshipCounts: {},
      keyThemes: [],
      riskSignals: [],
      followUpQuestions: [],
      representativeDocuments: [],
      overview: "No ready documents are available in this scope yet.",
      focus,
    };
  }

  const byMediaType = documents.reduce<Record<string, number>>((acc, doc) => {
    const key = summarizeMimeType(doc.mimeType);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const byContentType = buildTopCounts(documents.map((doc) => doc.contentType), 10);
  const topTags = buildTopCounts(documents.flatMap((doc) => doc.tags), 10);
  const topEntities = buildTopCounts(documents.flatMap((doc) => doc.entities), 12);
  const totalChunks = documents.reduce((sum, doc) => sum + doc.chunkCount, 0);

  const relationshipTypes = ["supports", "contradicts", "references", "amends", "semantic_similar", "co_mentions"];
  const relationshipCounts = relationshipTypes.reduce<Record<string, number>>((acc, type) => {
    acc[type] = getEdgesByType(type, 0.0, vaultId).length;
    return acc;
  }, {});
  const keyThemes = buildKeyThemes(topTags, topEntities);
  const riskSignals = buildRiskSignals(relationshipCounts, documents);
  const followUpQuestions = buildFollowUpQuestions(scopeLabel, relationshipCounts, topEntities);

  const overview = await generateNarrativeOverview(
    scopeLabel,
    documents,
    topTags,
    topEntities,
    relationshipCounts,
    focus
  );

  const result: VaultOverview = {
    scopeId: vaultId || null,
    scopeLabel,
    generatedAt,
    totalDocuments: documents.length,
    totalChunks,
    byMediaType,
    byContentType,
    topTags,
    topEntities,
    relationshipCounts,
    keyThemes,
    riskSignals,
    followUpQuestions,
    representativeDocuments: pickRepresentativeDocuments(documents),
    overview,
    focus,
  };

  if (vaultId) {
    updateNodeProperties(vaultId, {
      overview,
      overviewGeneratedAt: generatedAt,
      overviewNeedsRefresh: false,
      overviewStats: {
        totalDocuments: result.totalDocuments,
        totalChunks: result.totalChunks,
        byMediaType: result.byMediaType,
        byContentType: result.byContentType,
        topTags: result.topTags,
        topEntities: result.topEntities,
        relationshipCounts: result.relationshipCounts,
        keyThemes: result.keyThemes,
        riskSignals: result.riskSignals,
        followUpQuestions: result.followUpQuestions,
      },
    });
  }

  return result;
}
