"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useProject } from "@/lib/project-context";
import {
  BotIcon,
  SendIcon,
  LoaderIcon,
  UserIcon,
  SparklesIcon,
  AlertTriangleIcon,
} from "lucide-react";

const PROVIDERS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "google", label: "Google" },
];

const SUGGESTIONS = [
  "Analyze the SEO health of my website",
  "Show me my Google Analytics traffic for the last 7 days",
  "What are my top Search Console queries?",
  "Check my Google Reviews and summarize the feedback",
  "List my GA properties and Search Console sites",
];

export default function AIAssistant() {
  const { activeProject } = useProject();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [provider, setProvider] = useState("openai");
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function handleSend(text) {
    const content = text || input.trim();
    if (!content || loading) return;

    setInput("");
    setError("");

    const userMessage = { role: "user", content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await apiFetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, provider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Chat failed");
      }

      setMessages([...newMessages, { role: "assistant", content: data.content }]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <BotIcon size={20} className="text-primary" />
          <div>
            <h1 className="text-lg font-semibold">SEO Assistant</h1>
            <p className="text-xs text-muted-foreground">
              {activeProject ? `Project: ${activeProject.name}` : "Ask about your SEO, traffic, and reviews"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm outline-none"
          >
            {PROVIDERS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setError(""); }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-muted/50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
            <div className="rounded-full bg-primary/10 p-4">
              <SparklesIcon size={32} className="text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">SEO Assistant</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                I can analyze your websites, pull Google Analytics & Search Console data,
                check your reviews, and give you actionable SEO recommendations.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="text-left rounded-lg border border-border px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
            {msg.role === "assistant" && (
              <div className="shrink-0 mt-1">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <BotIcon size={14} className="text-primary" />
                </div>
              </div>
            )}
            <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border"
            }`}>
              {msg.role === "assistant" ? (
                <div className="whitespace-pre-wrap">{msg.content || (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <LoaderIcon size={14} className="animate-spin" />
                    Thinking...
                  </span>
                )}</div>
              ) : (
                <div>{msg.content}</div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="shrink-0 mt-1">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                  <UserIcon size={14} />
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex gap-3">
            <div className="shrink-0 mt-1">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                <BotIcon size={14} className="text-primary" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm">
              <span className="flex items-center gap-2 text-muted-foreground">
                <LoaderIcon size={14} className="animate-spin" />
                Thinking...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 flex items-center gap-2 text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2">
          <AlertTriangleIcon size={14} />
          {error}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={activeProject
              ? `Ask about ${activeProject.domain.replace(/^https?:\/\//, "")}...`
              : "Ask about your SEO, traffic, rankings..."
            }
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
            style={{ minHeight: 44, maxHeight: 120 }}
            onInput={(e) => {
              e.target.style.height = "auto";
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
            }}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="shrink-0 rounded-xl bg-primary p-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <SendIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
