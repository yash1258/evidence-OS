"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PaperPlaneRight, Sparkle, MagicWand, FileText, MagnifyingGlass, Lightbulb, CaretRight, Textbox, FilePdf } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ThinkingStep {
  type: "tool_call" | "tool_result" | "thinking";
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  result?: unknown;
  timestamp: number;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  thinkingSteps?: ThinkingStep[];
  sources?: string[];
  isStreaming?: boolean;
}

const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: "Semantic Search",
  get_document_content: "Reading Document",
  analyze_content: "Deep Analysis",
  compare_documents: "Document Diff",
  extract_structured_data: "Data Extraction",
  summarize_document: "Summarization",
  list_documents: "Listing Index",
};

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const toggleSteps = (messageId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) next.delete(messageId);
      else next.add(messageId);
      return next;
    });
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      thinkingSteps: [],
      sources: [],
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setInput("");
    setIsLoading(true);
    setExpandedSteps((prev) => new Set(prev).add(assistantId));

    if (inputRef.current) inputRef.current.style.height = "28px";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage.content, sessionId }),
      });

      if (!response.ok) throw new Error("Chat request failed");

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error("No response stream");

      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "thinking_step") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, thinkingSteps: [...(m.thinkingSteps || []), parsed.step] }
                    : m
                )
              );
            } else if (parsed.type === "answer") {
              if (parsed.sessionId) setSessionId(parsed.sessionId);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: parsed.answer,
                        sources: parsed.sources,
                        thinkingSteps: parsed.thinkingSteps,
                        isStreaming: false,
                      }
                    : m
                )
              );
              setExpandedSteps((prev) => {
                const next = new Set(prev);
                next.delete(assistantId);
                return next;
              });
            } else if (parsed.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `Error: ${parsed.error}`, isStreaming: false }
                    : m
                )
              );
            }
          } catch { /* skip */ }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Agent connection failed.", isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toolCallCount = (steps?: ThinkingStep[]) =>
    steps?.filter((s) => s.type === "tool_call").length || 0;

  return (
    <div className="bento-card flex flex-col h-full w-full relative">
      <div className="flex-1 overflow-y-auto w-full relative">
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
              className="absolute inset-0 flex items-center justify-center p-8"
            >
              <EmptyState
                onSuggestion={(text) => {
                  setInput(text);
                  inputRef.current?.focus();
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="max-w-[800px] mx-auto w-full px-6 py-10 flex flex-col gap-10"
            >
              {messages.map((msg, idx) => (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 25, delay: 0.05 }}
                  key={msg.id}
                  layout
                >
                  {msg.role === "user" ? (
                    <UserBubble content={msg.content} />
                  ) : (
                    <AssistantMessage
                      msg={msg}
                      isExpanded={expandedSteps.has(msg.id)}
                      onToggle={() => toggleSteps(msg.id)}
                      toolCallCount={toolCallCount(msg.thinkingSteps)}
                    />
                  )}
                </motion.div>
              ))}
              <div ref={messagesEndRef} className="h-4" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Command Input ── */}
      <div className="w-full shrink-0 pt-4 px-6 relative z-20">
        <div className="max-w-[720px] mx-auto w-full">
          <motion.div
            layout
            className={cn(
              "flex items-end gap-3 px-4 py-3 bg-white rounded-[2rem] premium-shadow transition-all duration-300",
              input.trim() || isLoading ? "border-blue-200/50" : "border-slate-200/50"
            )}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your knowledge base..."
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent resize-none text-[15px] outline-none leading-relaxed text-slate-800 placeholder:text-slate-400 py-1"
              style={{
                maxHeight: "200px",
                minHeight: "28px",
              }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "28px";
                target.style.height = Math.min(target.scrollHeight, 200) + "px";
              }}
            />

            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className={cn(
                "shrink-0 w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 tactile-btn",
                input.trim() && !isLoading
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 text-slate-400"
              )}
            >
              {isLoading ? (
                <div className="w-[18px] h-[18px] rounded-full border-[2px] border-slate-400 border-t-transparent animate-spin" />
              ) : (
                <PaperPlaneRight weight="fill" size={18} className={cn(input.trim() && "translate-x-[1px] translate-y-[-1px]")} />
              )}
            </button>
          </motion.div>
          <div className="text-center mt-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Gemini 3 Flash • Agent Driven
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════ */
/* Sub-components                                     */
/* ══════════════════════════════════════════════════ */

function EmptyState({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const suggestions = [
    { text: "Summarize all uploaded documents", icon: <FileText weight="duotone" size={20} className="text-emerald-500" /> },
    { text: "What are the key action items?", icon: <MagicWand weight="duotone" size={20} className="text-blue-500" /> },
    { text: "Compare the two most recent files", icon: <MagnifyingGlass weight="duotone" size={20} className="text-violet-500" /> },
    { text: "Extract all dates and deadlines", icon: <Textbox weight="duotone" size={20} className="text-amber-500" /> },
  ];

  return (
    <div className="w-full max-w-[640px] flex flex-col pb-[10vh]">
        <div className="mb-12">
        <motion.div
          animate={{ scale: [1, 1.05, 1], rotate: [0, 2, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-tr from-slate-100 to-white flex items-center justify-center mb-6 premium-shadow"
        >
          <Sparkle weight="duotone" size={28} className="text-zinc-900" />
        </motion.div>
        <h2 className="text-[44px] font-extrabold tracking-[-0.03em] leading-[1.05] text-zinc-950 mb-4">
          Unleash your<br />
          <span className="text-blue-600 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-500">Knowledge Base.</span>
        </h2>
        <p className="text-[15px] font-medium text-zinc-500 max-w-[44ch] leading-relaxed tracking-tight">
          Upload documents via the sidebar. This cognitive agent will reason, analyze, and synthesize across your entire indexed memory.
        </p>
      </div>

      <motion.div 
        variants={{
          show: { transition: { staggerChildren: 0.1 } }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 gap-3"
      >
        {suggestions.map((s, i) => (
          <motion.button
            key={i}
            variants={{
              hidden: { opacity: 0, y: 10 },
              show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 200, damping: 20 } }
            }}
            onClick={() => onSuggestion(s.text)}
            className="group text-left p-4 rounded-2xl bg-white premium-shadow interactive-surface flex flex-col gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100/50 group-hover:scale-110 transition-transform duration-300 ease-out shadow-sm">
              {s.icon}
            </div>
            <span className="text-[13px] font-bold tracking-tight text-zinc-800 leading-tight">
              {s.text}
            </span>
          </motion.button>
        ))}
      </motion.div>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end pl-12">
      <div className="px-5 py-3.5 text-[15px] leading-relaxed bg-slate-100 text-slate-900 rounded-[1.5rem] rounded-tr-[0.5rem] font-medium border border-slate-200/50">
        {content}
      </div>
    </div>
  );
}

function AssistantMessage({
  msg,
  isExpanded,
  onToggle,
  toolCallCount,
}: {
  msg: Message;
  isExpanded: boolean;
  onToggle: () => void;
  toolCallCount: number;
}) {
  return (
    <div className="flex flex-col gap-3 w-full pr-12">
      {/* ── Thinking / Tools Header ── */}
      {msg.thinkingSteps && msg.thinkingSteps.length > 0 && (
        <div className="ml-1">
          <button
            onClick={onToggle}
            className="flex items-center gap-2 py-1.5 px-3 rounded-full bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm font-semibold text-[11px] uppercase tracking-wide cursor-pointer"
          >
            <CaretRight 
              weight="bold" 
              size={12} 
              className={cn("transition-transform duration-300", isExpanded && "rotate-90")} 
            />
            {msg.isStreaming ? (
              <span className="flex items-center gap-1.5 min-w-[70px]">
                <span className="text-blue-600">Reasoning</span>
                <span className="flex gap-[3px] mt-[1px]">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="block w-[3px] h-[3px] rounded-full bg-blue-500"
                      style={{
                        animation: `pulse-slow 1.5s ease-in-out ${i * 0.2}s infinite`,
                      }}
                    />
                  ))}
                </span>
              </span>
            ) : (
              <span>
                {toolCallCount} Tool {toolCallCount === 1 ? "Call" : "Calls"}
              </span>
            )}
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0, marginTop: 0 }}
                animate={{ opacity: 1, height: "auto", marginTop: 12 }}
                exit={{ opacity: 0, height: 0, marginTop: 0 }}
                className="overflow-hidden"
              >
                <div className="flex gap-4 ml-3 border-l-2 border-slate-100 pl-4 py-2 my-2">
                  <div className="space-y-4 w-full max-w-[600px]">
                    {msg.thinkingSteps.map((step, stepIdx) => (
                      <div key={stepIdx} className="flex flex-col gap-1.5">
                        {step.type === "tool_call" && (
                          <div className="flex items-center gap-2 text-[12px] font-bold text-slate-700">
                            <Lightbulb weight="duotone" size={14} className="text-amber-500" />
                            {TOOL_LABELS[step.toolName || ""] || step.toolName}
                          </div>
                        )}
                        {step.type === "tool_result" && (
                          <div className="text-[11px] font-mono text-slate-500 bg-slate-50 rounded-lg p-2.5 border border-slate-100 line-clamp-3 leading-relaxed break-all">
                            {JSON.stringify(step.result)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ── Main content (Markdown) ── */}
      {msg.content && (
        <div
          className="text-[15px] leading-[1.75] text-slate-800 font-medium"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
        />
      )}

      {/* ── Source citations ── */}
      {msg.sources && msg.sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {msg.sources.map((source) => (
            <span
              key={source}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold shadow-sm"
            >
              <FilePdf weight="duotone" size={12} className="text-slate-500" />
              {source}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Markdown renderer ── */

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*\*(.*?)\*\*/g, "<strong class='font-bold text-zinc-950'>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em class='italic text-zinc-700'>$1</em>")
    .replace(
      /`([^`]+)`/g,
      "<code class='bg-slate-100 text-zinc-800 px-1.5 py-0.5 rounded-md font-mono text-[0.9em] border border-slate-200/50'>$1</code>"
    )
    .replace(/^### (.+)$/gm, "<h3 class='text-[18px] font-extrabold text-zinc-950 mt-6 mb-2 tracking-tight'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class='text-[22px] font-extrabold text-zinc-950 mt-8 mb-3 tracking-tighter'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class='text-[28px] font-extrabold text-zinc-950 mt-8 mb-4 tracking-[-0.03em]'>$1</h1>")
    .replace(/^\- (.+)$/gm, "<div class='flex gap-2.5 my-1.5'><span class='text-blue-500 font-bold mt-0.5'>•</span><span>$1</span></div>")
    .replace(/^\d+\.\s(.+)$/gm, (_, p1, offset, str) => {
      const linesBefore = str.substring(0, offset).split("\n");
      const num = linesBefore.length;
      return `<div class='flex gap-2.5 my-1.5'><span class='text-slate-400 font-mono font-bold shrink-0 min-w-[20px]'>${num}.</span><span>${p1}</span></div>`;
    })
    .replace(/\n/g, "<br>");
}
