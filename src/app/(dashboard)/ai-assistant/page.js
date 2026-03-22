"use client";

import { useState, useRef, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from "react-markdown";
import { MARKETING_SKILLS, SKILL_CATEGORIES } from "@/lib/marketing-skills";
import {
  BotIcon,
  SendIcon,
  LoaderIcon,
  UserIcon,
  SparklesIcon,
  PlusIcon,
  SearchIcon,
  BarChart3Icon,
  GlobeIcon,
  FileTextIcon,
  TrendingUpIcon,
  MessageSquareIcon,
  ClockIcon,
  ZapIcon,
  XIcon,
  CheckIcon,
} from "lucide-react";

export default function AIAssistant() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [totalUsage, setTotalUsage] = useState({ input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0 });
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [activeSkills, setActiveSkills] = useState([]);
  const [skillCategory, setSkillCategory] = useState("All");
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    loadHistory();
  }, []);

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("ai_conversations")
      .select("id, title, created_at, total_tokens, cost_usd")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setHistory(data);
  }

  async function loadConversation(id) {
    const { data } = await supabase
      .from("ai_conversations")
      .select("messages, total_tokens, input_tokens, output_tokens, cost_usd")
      .eq("id", id)
      .single();
    if (data) {
      setMessages(data.messages || []);
      setTotalUsage({
        input_tokens: data.input_tokens || 0,
        output_tokens: data.output_tokens || 0,
        total_tokens: data.total_tokens || 0,
        cost_usd: data.cost_usd || 0,
      });
      setShowHistory(false);
    }
  }

  function toggleSkill(skillId) {
    setActiveSkills((prev) =>
      prev.includes(skillId) ? prev.filter((id) => id !== skillId) : [...prev, skillId]
    );
  }

  function handleNewChat() {
    setMessages([]);
    setTotalUsage({ input_tokens: 0, output_tokens: 0, total_tokens: 0, cost_usd: 0 });
    setError("");
    inputRef.current?.focus();
  }

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
        body: JSON.stringify({ messages: newMessages, skills: activeSkills }),
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
      loadHistory();
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

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-1 h-[calc(100vh-4rem)]">
      {/* History sidebar */}
      {showHistory && (
        <div className="w-64 border-r border-border flex flex-col bg-card/50">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Recent Chats</span>
            <button onClick={() => setShowHistory(false)} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {history.map((h) => (
              <button
                key={h.id}
                onClick={() => loadConversation(h.id)}
                className="w-full text-left rounded-lg px-3 py-2 hover:bg-muted/30 transition-colors group"
              >
                <p className="text-xs truncate">{h.title}</p>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                  <span>{new Date(h.created_at).toLocaleDateString()}</span>
                  {h.cost_usd > 0 && <span>${Number(h.cost_usd).toFixed(4)}</span>}
                </div>
              </button>
            ))}
            {history.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-8">No conversations yet</p>
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-border">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ClockIcon size={16} />
            </button>
            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg hover:bg-muted/30 text-muted-foreground hover:text-foreground transition-colors"
            >
              <PlusIcon size={16} />
            </button>
          </div>
          {totalUsage.total_tokens > 0 && (
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span>{totalUsage.total_tokens.toLocaleString()} tokens</span>
              <span>${totalUsage.cost_usd.toFixed(4)}</span>
            </div>
          )}
        </div>

        {/* Messages / Empty state */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {!hasMessages ? (
            <div className="flex flex-col items-center justify-center h-full px-6">
              <div className="max-w-xl w-full space-y-8">
                {/* Hero */}
                <div className="text-center pt-8">
                  <h1 className="text-3xl font-semibold tracking-tight mb-2">
                    What shall we work on?
                  </h1>
                  <p className="text-muted-foreground text-sm">SEO & Social Media Optimization Assistant</p>
                </div>

                {/* Input (centered, Claude-style) */}
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about SEO, social media, content strategy..."
                    rows={3}
                    className="w-full rounded-2xl border border-border bg-card px-5 py-4 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none shadow-sm"
                  />
                  <div className="absolute right-3 bottom-3 flex items-center gap-1">
                    <button
                      onClick={() => setShowSkills(!showSkills)}
                      className={`rounded-xl p-2 transition-colors ${activeSkills.length > 0 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
                    >
                      <ZapIcon size={16} />
                    </button>
                    <button
                      onClick={() => handleSend()}
                      disabled={!input.trim() || loading}
                      className="rounded-xl bg-foreground p-2 text-background hover:opacity-80 disabled:opacity-30 transition-opacity"
                    >
                      <SendIcon size={16} />
                    </button>
                  </div>
                </div>

                {/* Active skills tags */}
                {activeSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 justify-center -mt-4">
                    {activeSkills.map((id) => {
                      const skill = MARKETING_SKILLS.find((s) => s.id === id);
                      return skill ? (
                        <span key={id} className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {skill.name}
                          <button onClick={() => toggleSkill(id)} className="hover:text-foreground"><XIcon size={10} /></button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                {/* Skills picker */}
                {showSkills && (
                  <div className="rounded-2xl border border-border bg-card shadow-lg p-4 -mt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-medium">Skills</h3>
                      <button onClick={() => setShowSkills(false)} className="text-muted-foreground hover:text-foreground"><XIcon size={14} /></button>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {SKILL_CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setSkillCategory(cat)}
                          className={`text-[10px] px-2.5 py-1 rounded-full transition-colors ${skillCategory === cat ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground border border-border"}`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto">
                      {MARKETING_SKILLS.filter((s) => skillCategory === "All" || s.category === skillCategory).map((skill) => {
                        const isActive = activeSkills.includes(skill.id);
                        return (
                          <button
                            key={skill.id}
                            onClick={() => toggleSkill(skill.id)}
                            className={`flex items-start gap-2 rounded-lg px-3 py-2 text-left transition-colors ${isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted/30 border border-transparent"}`}
                          >
                            <div className={`shrink-0 mt-0.5 w-4 h-4 rounded border flex items-center justify-center ${isActive ? "bg-primary border-primary" : "border-border"}`}>
                              {isActive && <CheckIcon size={10} className="text-primary-foreground" />}
                            </div>
                            <div>
                              <p className="text-xs font-medium">{skill.name}</p>
                              <p className="text-[10px] text-muted-foreground line-clamp-1">{skill.description}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-6 py-6 space-y-6">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                  {msg.role === "assistant" && (
                    <div className="shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center mt-1">
                      <SparklesIcon size={12} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${
                    msg.role === "user"
                      ? "rounded-2xl rounded-tr-sm bg-foreground text-background px-4 py-3"
                      : ""
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="text-sm prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-code:bg-muted/50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:before:content-none prose-code:after:content-none prose-pre:bg-muted/30 prose-pre:border prose-pre:border-border prose-pre:rounded-lg prose-hr:border-border prose-strong:text-foreground prose-a:text-primary">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <div className="text-sm">{msg.content}</div>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="shrink-0 h-7 w-7 rounded-full bg-muted flex items-center justify-center mt-1">
                      <UserIcon size={12} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center">
                    <SparklesIcon size={12} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 py-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="max-w-3xl mx-auto px-6 mt-4">
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* Bottom input (when in conversation) */}
        {hasMessages && (
          <div className="border-t border-border px-6 py-3">
            <div className="max-w-3xl mx-auto relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Follow up..."
                rows={1}
                className="w-full rounded-2xl border border-border bg-card px-5 py-3 pr-14 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  onClick={() => setShowSkills(!showSkills)}
                  className={`rounded-xl p-2 transition-colors ${activeSkills.length > 0 ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
                >
                  <ZapIcon size={14} />
                </button>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || loading}
                  className="rounded-xl bg-foreground p-2 text-background hover:opacity-80 disabled:opacity-30 transition-opacity"
                >
                  <SendIcon size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
