import { Type } from "@google/genai";

export const AGENT_TOOLS = [
  {
    name: "search_knowledge_base",
    description:
      "Semantic search across all uploaded content in the knowledge base. Returns ranked chunks with relevance scores. Use this to find information related to a user's question.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: "The search query to find relevant content",
        },
        contentType: {
          type: Type.STRING,
          description:
            "Optional filter by content type: meeting, report, study-notes, business, personal, technical, legal, medical, creative, general",
        },
        maxResults: {
          type: Type.NUMBER,
          description: "Maximum number of results to return (default 5)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_document_content",
    description:
      "Retrieve the full content or a specific chunk of a document by its ID. Use this after searching to get more detail.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentId: {
          type: Type.STRING,
          description: "The document ID to retrieve",
        },
        chunkId: {
          type: Type.STRING,
          description: "Optional: specific chunk ID to retrieve",
        },
      },
      required: ["documentId"],
    },
  },
  {
    name: "analyze_content",
    description:
      "Perform deep analysis on content - extract themes, sentiment, key points, or generate questions about it.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        content: {
          type: Type.STRING,
          description: "The content to analyze",
        },
        analysisType: {
          type: Type.STRING,
          description: "Type of analysis: themes, sentiment, key_points, or questions",
        },
      },
      required: ["content", "analysisType"],
    },
  },
  {
    name: "compare_documents",
    description:
      "Compare two or more documents to find similarities, differences, or contradictions between them.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Array of document IDs to compare",
        },
        comparisonType: {
          type: Type.STRING,
          description: "Type of comparison: diff, overlap, or contradiction",
        },
      },
      required: ["documentIds", "comparisonType"],
    },
  },
  {
    name: "extract_structured_data",
    description:
      "Extract structured information from a document: action items, entities, dates, numbers, or tables.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentId: {
          type: Type.STRING,
          description: "The document ID to extract data from",
        },
        extractionType: {
          type: Type.STRING,
          description: "What to extract: action_items, entities, dates, numbers, or table",
        },
      },
      required: ["documentId", "extractionType"],
    },
  },
  {
    name: "summarize_document",
    description:
      "Generate a summary of a document at the specified detail level.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        documentId: {
          type: Type.STRING,
          description: "The document ID to summarize",
        },
        level: {
          type: Type.STRING,
          description: "Summary detail level: brief, detailed, or executive",
        },
      },
      required: ["documentId", "level"],
    },
  },
  {
    name: "list_documents",
    description:
      "List all documents in the knowledge base, optionally filtered by content type or status.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        contentType: {
          type: Type.STRING,
          description: "Optional filter by content type",
        },
      },
    },
  },
  {
    name: "traverse_edges",
    description:
      "Navigate the knowledge graph by following edges from a specific node. Use this to find documents that reference, contradict, amend, or support a given document. Returns connected nodes with edge types and confidence scores.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        nodeId: {
          type: Type.STRING,
          description: "The node ID (document ID, chunk ID, or entity ID) to start from",
        },
        edgeType: {
          type: Type.STRING,
          description: "Optional filter by edge type: contains, references, contradicts, amends, supports, co_mentions, semantic_similar, next_chunk, belongs_to",
        },
        minConfidence: {
          type: Type.NUMBER,
          description: "Minimum confidence threshold for edges (default 0.6, range 0.0-1.0)",
        },
      },
      required: ["nodeId"],
    },
  },
  {
    name: "find_connections",
    description:
      "Find how two nodes in the knowledge graph are related. Returns the shortest path between them showing each intermediate node and edge type. Useful for understanding how two documents, entities, or concepts are linked.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourceId: {
          type: Type.STRING,
          description: "The starting node ID",
        },
        targetId: {
          type: Type.STRING,
          description: "The ending node ID",
        },
        maxDepth: {
          type: Type.NUMBER,
          description: "Maximum hops to search (default 4)",
        },
      },
      required: ["sourceId", "targetId"],
    },
  },
  {
    name: "get_entity_network",
    description:
      "Find all documents and nodes connected to a specific entity (person, organization, date, concept). Returns the entity's neighborhood in the knowledge graph showing which documents mention it.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        entityName: {
          type: Type.STRING,
          description: "The entity name to search for (fuzzy matched)",
        },
      },
      required: ["entityName"],
    },
  },
  {
    name: "find_contradictions",
    description:
      "Surface all conflicting information in the knowledge base. Returns pairs of documents or chunks that contain contradictory claims, with confidence scores and evidence quotes. Use this proactively when the user asks about risks or inconsistencies.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        scope: {
          type: Type.STRING,
          description: "Optional: 'all' for everything, or a document ID to find contradictions for a specific document. Defaults to 'all'.",
        },
      },
    },
  },
  {
    name: "summarize_project",
    description:
      "Generate a bird's-eye overview of the current vault/project. Use this when the user asks what the whole project is about, wants a high-level map of files, themes, entities, or overall evidence patterns.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        focus: {
          type: Type.STRING,
          description: "Optional focus area for the overview, such as risks, roadmap, people, product, research, or contradictions.",
        },
      },
    },
  },
];
