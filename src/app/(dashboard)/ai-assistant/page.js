"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import {
  BotIcon,
  SendIcon,
  LoaderIcon,
  UserIcon,
  SparklesIcon,
} from "lucide-react";

const SUGGESTIONS = [
  "How to improve on-page SEO for my website?",
  "Create a social media content calendar for a month",
  "Best hashtag strategy for Instagram growth",
  "How to optimize my site for Core Web Vitals?",
  "Write a LinkedIn post about digital marketing trends",
  "Technical SEO checklist for a new website",
  "How to build quality backlinks in 2025?",
  "Instagram Reels vs Posts — which drives more engagement?",
];

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalUsage, setTotalUsage] = useState({ input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0 });
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
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Chat failed");
      }

      setMessages([...newMessages, { role: "assistant", content: data.content }]);
      if (data.usage) {
        setTotalUsage((prev) => ({
          input_tokens: prev.input_tokens + data.usage.input_tokens,
          output_tokens: prev.output_tokens + data.usage.output_tokens,
          total_tokens: prev.total_tokens + data.usage.total_tokens,
          cost_usd: prev.cost_usd + data.usage.cost_usd,
        }));
      }
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
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BotIcon size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by Claude</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <SparklesIcon size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold mb-1">SEO & SMO Assistant</h2>
              <p className="text-sm text-muted-foreground">Ask me anything about SEO, social media optimization, or digital marketing.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-3xl mx-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                {msg.role === "assistant" && (
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center mt-0.5">
                    <BotIcon size={14} className="text-primary" />
                  </div>
                )}
                <div className={`rounded-xl px-4 py-3 max-w-[80%] ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border"
                }`}>
                  {msg.role === "assistant" ? (
                    <div className="text-sm prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted/30 prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-hr:border-border prose-strong:text-foreground prose-a:text-primary">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="shrink-0 h-8 w-8 rounded-lg bg-muted flex items-center justify-center mt-0.5">
                    <UserIcon size={14} className="text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BotIcon size={14} className="text-primary" />
                </div>
                <div className="rounded-xl px-4 py-3 bg-card border border-border">
                  <LoaderIcon size={16} className="animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="max-w-3xl mx-auto mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-border px-6 py-4">
        {totalUsage.total_tokens > 0 && (
          <div className="max-w-3xl mx-auto flex items-center justify-center gap-4 mb-2 text-[10px] text-muted-foreground">
            <span>{totalUsage.input_tokens.toLocaleString()} in</span>
            <span>{totalUsage.output_tokens.toLocaleString()} out</span>
            <span>{totalUsage.total_tokens.toLocaleString()} total</span>
            <span>${totalUsage.cost_usd.toFixed(4)}</span>
          </div>
        )}
        <div className="max-w-3xl mx-auto flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={1}
            className="flex-1 rounded-xl border border-border bg-card px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="rounded-xl bg-primary px-4 py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <SendIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
