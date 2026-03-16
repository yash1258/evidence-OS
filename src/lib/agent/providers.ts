import { GoogleGenAI } from "@google/genai";

// ---- Provider Interface ----

export interface LLMMessage {
  role: "user" | "model" | "assistant" | "function";
  content?: string;
  parts?: any[];
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

export interface LLMResponse {
  text?: string;
  functionCalls?: Array<{ name: string; args: Record<string, unknown> }>;
  raw: unknown;
}

export interface ToolDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMProvider {
  generateContent(
    messages: LLMMessage[],
    systemPrompt: string,
    tools?: ToolDeclaration[],
    onToken?: (token: string) => void
  ): Promise<LLMResponse>;
}

// ---- Gemini Provider ----

export class GeminiProvider implements LLMProvider {
  private ai: GoogleGenAI;
  private model: string;

  constructor(model: string = "gemini-2.0-flash") {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    this.ai = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generateContent(
    messages: LLMMessage[],
    systemPrompt: string,
    tools?: ToolDeclaration[],
    onToken?: (token: string) => void
  ): Promise<LLMResponse> {
    const contents = messages.map((msg) => {
      if (msg.functionResponse) {
        return {
          role: "user" as const,
          parts: [{ functionResponse: msg.functionResponse }],
        };
      }
      if (msg.parts) {
        return {
          role: (msg.role === "assistant" ? "model" : msg.role) as "user" | "model",
          parts: msg.parts,
        };
      }
      return {
        role: (msg.role === "assistant" ? "model" : msg.role) as "user" | "model",
        parts: [{ text: msg.content || "" }],
      };
    });

    const model = this.ai.getGenerativeModel({
        model: this.model,
        systemInstruction: systemPrompt,
    });

    const generationConfig = {
        temperature: 0.1,
    };

    const toolConfig = (tools && tools.length > 0) ? {
        tools: [
            {
                functionDeclarations: tools.map((t) => ({
                    name: t.name,
                    description: t.description,
                    parameters: t.parameters,
                })),
            },
        ],
    } : {};

    if (onToken) {
        const result = await model.generateContentStream({
            contents: contents as any,
            generationConfig,
            ...toolConfig
        });

        let fullText = "";
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
                fullText += chunkText;
                onToken(chunkText);
            }
        }

        const response = await result.response;
        return {
            text: fullText || undefined,
            functionCalls: response.functionCalls()
                ?.filter((fc) => fc.name)
                .map((fc) => ({
                    name: fc.name!,
                    args: (fc.args || {}) as Record<string, unknown>,
                })),
            raw: response,
        };
    } else {
        const result = await model.generateContent({
            contents: contents as any,
            generationConfig,
            ...toolConfig
        });

        const response = result.response;
        return {
            text: response.text() || undefined,
            functionCalls: response.functionCalls()
                ?.filter((fc) => fc.name)
                .map((fc) => ({
                    name: fc.name!,
                    args: (fc.args || {}) as Record<string, unknown>,
                })),
            raw: response,
        };
    }
  }
}

// ---- OpenRouter Provider (OpenAI-compatible) ----

export class OpenRouterProvider implements LLMProvider {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://openrouter.ai/api/v1/chat/completions";

  constructor(model: string = "google/gemini-2.0-flash-001") {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");
    this.apiKey = apiKey;
    this.model = model;
  }

  async generateContent(
    messages: LLMMessage[],
    systemPrompt: string,
    tools?: ToolDeclaration[],
    onToken?: (token: string) => void
  ): Promise<LLMResponse> {
    const openaiMessages: Array<Record<string, unknown>> = [
      { role: "system", content: systemPrompt },
    ];

    for (const msg of messages) {
      if (msg.functionResponse) {
        openaiMessages.push({
          role: "tool",
          tool_call_id: msg.functionResponse.name,
          content: JSON.stringify(msg.functionResponse.response),
        });
      } else if (msg.functionCall) {
        openaiMessages.push({
          role: "assistant",
          tool_calls: [
            {
              id: msg.functionCall.name,
              type: "function",
              function: {
                name: msg.functionCall.name,
                arguments: JSON.stringify(msg.functionCall.args),
              },
            },
          ],
        });
      } else {
        openaiMessages.push({
          role: msg.role === "model" ? "assistant" : msg.role,
          content: msg.content || "",
        });
      }
    }

    const body: Record<string, unknown> = {
      model: this.model,
      messages: openaiMessages,
      stream: !!onToken,
    };

    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      }));
    }

    const res = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://evidence-os.local",
        "X-Title": "EvidenceOS",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter error ${res.status}: ${errText}`);
    }

    if (onToken) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let functionCalls: any[] = [];

        if (reader) {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        const payload = line.slice(6).trim();
                        if (payload === "[DONE]") break;
                        try {
                            const parsed = JSON.parse(payload);
                            const delta = parsed.choices[0].delta;
                            if (delta.content) {
                                fullText += delta.content;
                                onToken(delta.content);
                            }
                            if (delta.tool_calls) {
                                functionCalls = delta.tool_calls; 
                            }
                        } catch { /* ignore */ }
                    }
                }
            }
        }
        return { text: fullText, raw: {}, functionCalls };
    }

    const data = await res.json();
    const choice = data.choices?.[0];

    if (!choice) throw new Error("No response from OpenRouter");

    const functionCalls = choice.message?.tool_calls?.map(
      (tc: { function: { name: string; arguments: string } }) => ({
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments || "{}"),
      })
    );

    return {
      text: choice.message?.content || undefined,
      functionCalls: functionCalls?.length ? functionCalls : undefined,
      raw: data,
    };
  }
}

// ---- Provider Factory with Fallback ----

let primaryProvider: LLMProvider | null = null;
let fallbackProvider: LLMProvider | null = null;

export function getProvider(): LLMProvider {
  if (!primaryProvider) {
    primaryProvider = new GeminiProvider();
  }
  return primaryProvider;
}

export function getFallbackProvider(): LLMProvider | null {
  if (!fallbackProvider && process.env.OPENROUTER_API_KEY) {
    fallbackProvider = new OpenRouterProvider();
  }
  return fallbackProvider;
}

/**
 * Execute with automatic fallback to OpenRouter if Gemini fails
 */
export async function withFallback(
  fn: (provider: LLMProvider) => Promise<LLMResponse>
): Promise<LLMResponse> {
  try {
    return await fn(getProvider());
  } catch (error) {
    const fallback = getFallbackProvider();
    if (fallback) {
      console.warn("Gemini failed, falling back to OpenRouter:", error);
      return await fn(fallback);
    }
    throw error;
  }
}
