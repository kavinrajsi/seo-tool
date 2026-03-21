"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import {
  SparklesIcon,
  CopyIcon,
  CheckIcon,
  RefreshCwIcon,
  KeyIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  EyeOffIcon,
} from "lucide-react";

const PROVIDERS = [
  { value: "openai", label: "OpenAI", models: "GPT-4o Mini" },
  { value: "anthropic", label: "Anthropic", models: "Claude Sonnet" },
  { value: "google", label: "Google", models: "Gemini 2.0 Flash" },
];

const TEMPLATES = [
  { value: "blog_post", label: "Blog Post", icon: "📝", fields: ["topic", "keywords", "tone"] },
  { value: "meta_tags", label: "Meta Tags", icon: "🏷️", fields: ["url", "title", "description"] },
  { value: "faq", label: "FAQ Section", icon: "❓", fields: ["topic", "count"] },
  { value: "key_points", label: "Key Points", icon: "📌", fields: ["content"] },
  { value: "social_post", label: "Social Post", icon: "📱", fields: ["topic", "platform", "tone"] },
  { value: "email", label: "Email", icon: "✉️", fields: ["topic", "type", "tone"] },
  { value: "product_description", label: "Product Description", icon: "🛍️", fields: ["product", "features", "tone"] },
  { value: "rewrite", label: "Rewrite Content", icon: "🔄", fields: ["content", "tone"] },
];

const FIELD_CONFIG = {
  topic: { label: "Topic / Subject", placeholder: "e.g. Best SEO practices for 2025", type: "text" },
  keywords: { label: "Keywords (optional)", placeholder: "e.g. SEO, ranking, Google", type: "text" },
  tone: { label: "Tone", placeholder: "e.g. professional, casual, persuasive", type: "text" },
  url: { label: "Page URL", placeholder: "e.g. https://example.com/about", type: "text" },
  title: { label: "Current Title (optional)", placeholder: "Existing page title", type: "text" },
  description: { label: "Current Description (optional)", placeholder: "Existing meta description", type: "text" },
  count: { label: "Number of FAQs", placeholder: "5", type: "number" },
  content: { label: "Content", placeholder: "Paste content here...", type: "textarea" },
  platform: { label: "Platform", placeholder: "twitter, linkedin, instagram, facebook", type: "text" },
  type: { label: "Email Type", placeholder: "marketing, newsletter, welcome, follow-up", type: "text" },
  product: { label: "Product Name", placeholder: "e.g. SEO Tool Pro", type: "text" },
  features: { label: "Key Features", placeholder: "e.g. keyword tracking, site audit, competitor analysis", type: "text" },
};

export default function AIContent() {
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [user, setUser] = useState(null);
  const [provider, setProvider] = useState("openai");
  const [template, setTemplate] = useState("blog_post");
  const [params, setParams] = useState({});
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  // API key management
  const [keys, setKeys] = useState([]);
  const [showKeySetup, setShowKeySetup] = useState(false);
  const [newKeyProvider, setNewKeyProvider] = useState("openai");
  const [newKeyValue, setNewKeyValue] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [visibleKeys, setVisibleKeys] = useState({});

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
    loadKeys();
  }, [activeTeam, activeProject]);

  async function loadKeys() {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) return;

    let query = supabase
      .from("ai_api_keys")
      .select("id, provider, api_key, created_at");

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", u.id).is("team_id", null);
    }

    if (activeProject) {
      query = query.eq("project_id", activeProject.id);
    }

    const { data } = await query;
    if (data) setKeys(data);
  }

  async function handleSaveKey(e) {
    e.preventDefault();
    if (!newKeyValue.trim() || !user) return;
    setSavingKey(true);
    setError("");

    // Upsert
    let existingQuery = supabase
      .from("ai_api_keys")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", newKeyProvider);

    if (activeTeam) {
      existingQuery = existingQuery.eq("team_id", activeTeam.id);
    } else {
      existingQuery = existingQuery.is("team_id", null);
    }

    const { data: existing } = await existingQuery.single();

    let saveErr;
    if (existing) {
      const { error: e } = await supabase
        .from("ai_api_keys")
        .update({ api_key: newKeyValue.trim() })
        .eq("id", existing.id);
      saveErr = e;
    } else {
      const { error: e } = await supabase
        .from("ai_api_keys")
        .insert({ user_id: user.id, team_id: activeTeam?.id || null, project_id: activeProject?.id || null, provider: newKeyProvider, api_key: newKeyValue.trim() });
      saveErr = e;
    }

    if (saveErr) setError(saveErr.message);
    else {
      setNewKeyValue("");
      setShowKeySetup(false);
      loadKeys();
    }
    setSavingKey(false);
  }

  async function handleDeleteKey(id) {
    await supabase.from("ai_api_keys").delete().eq("id", id);
    loadKeys();
  }

  function maskKey(key) {
    if (key.length <= 8) return "••••••••";
    return key.slice(0, 4) + "••••••••" + key.slice(-4);
  }

  async function handleGenerate() {
    if (!template) return;
    setGenerating(true);
    setResult("");
    setError("");

    const templateConfig = TEMPLATES.find((t) => t.value === template);
    const paramValues = templateConfig.fields.map((f) => params[f] || "");

    try {
      const res = await apiFetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, template, params: paramValues }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data.content);
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  function handleCopy() {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const currentTemplate = TEMPLATES.find((t) => t.value === template);
  const hasKey = keys.some((k) => k.provider === provider);

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Content Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate SEO-optimized content with AI. Bring your own API key.
          </p>
        </div>
        <button
          onClick={() => setShowKeySetup(!showKeySetup)}
          className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent flex items-center gap-2"
        >
          <KeyIcon className="h-4 w-4" />
          API Keys ({keys.length})
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* API Key Setup */}
      {showKeySetup && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
            <KeyIcon className="h-4 w-4 text-muted-foreground" />
            Manage API Keys
          </h3>

          {keys.length > 0 && (
            <div className="space-y-2 mb-4">
              {keys.map((k) => (
                <div key={k.id} className="flex items-center justify-between rounded-md border border-border/50 px-4 py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-wider px-2 py-0.5 rounded bg-secondary">
                      {k.provider}
                    </span>
                    <span className="text-xs font-mono text-muted-foreground">
                      {visibleKeys[k.id] ? k.api_key : maskKey(k.api_key)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setVisibleKeys((v) => ({ ...v, [k.id]: !v[k.id] }))}
                      className="rounded p-1.5 hover:bg-accent text-muted-foreground"
                    >
                      {visibleKeys[k.id] ? <EyeOffIcon className="h-3.5 w-3.5" /> : <EyeIcon className="h-3.5 w-3.5" />}
                    </button>
                    <button
                      onClick={() => handleDeleteKey(k.id)}
                      className="rounded p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500"
                    >
                      <TrashIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <form onSubmit={handleSaveKey} className="flex gap-2">
            <select
              value={newKeyProvider}
              onChange={(e) => setNewKeyProvider(e.target.value)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
            <input
              type="password"
              value={newKeyValue}
              onChange={(e) => setNewKeyValue(e.target.value)}
              placeholder="Paste API key..."
              required
              className="flex-1 rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <button
              type="submit"
              disabled={savingKey}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              <PlusIcon className="h-4 w-4" />
              {savingKey ? "Saving..." : "Save"}
            </button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Keys are stored encrypted in your account. They are never shared.
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Template & Settings */}
        <div className="space-y-4">
          {/* Provider selector */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">AI Provider</h3>
            <div className="space-y-2">
              {PROVIDERS.map((p) => {
                const hasThisKey = keys.some((k) => k.provider === p.value);
                return (
                  <button
                    key={p.value}
                    onClick={() => setProvider(p.value)}
                    className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${
                      provider === p.value
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:bg-accent/30"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium">{p.label}</p>
                      <p className="text-xs text-muted-foreground">{p.models}</p>
                    </div>
                    {hasThisKey ? (
                      <span className="text-xs text-green-400">Key added</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">No key</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Template selector */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Content Type</h3>
            <div className="space-y-1">
              {TEMPLATES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => { setTemplate(t.value); setParams({}); setResult(""); }}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors ${
                    template === t.value
                      ? "bg-primary/10 text-primary"
                      : "hover:bg-accent/30 text-foreground"
                  }`}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="text-sm">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Input + Output */}
        <div className="lg:col-span-2 space-y-4">
          {/* Input fields */}
          <div className="rounded-lg border border-border bg-card p-5">
            <h3 className="text-sm font-medium mb-4">
              {currentTemplate?.icon} {currentTemplate?.label}
            </h3>
            <div className="space-y-3">
              {currentTemplate?.fields.map((field) => {
                const config = FIELD_CONFIG[field];
                if (config.type === "textarea") {
                  return (
                    <div key={field}>
                      <label className="text-xs text-muted-foreground mb-1 block">{config.label}</label>
                      <textarea
                        value={params[field] || ""}
                        onChange={(e) => setParams((p) => ({ ...p, [field]: e.target.value }))}
                        placeholder={config.placeholder}
                        rows={5}
                        className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-y"
                      />
                    </div>
                  );
                }
                return (
                  <div key={field}>
                    <label className="text-xs text-muted-foreground mb-1 block">{config.label}</label>
                    <input
                      type={config.type}
                      value={params[field] || ""}
                      onChange={(e) => setParams((p) => ({ ...p, [field]: e.target.value }))}
                      placeholder={config.placeholder}
                      className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                    />
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleGenerate}
              disabled={generating || !hasKey}
              className="mt-4 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <><RefreshCwIcon className="h-4 w-4 animate-spin" /> Generating...</>
              ) : (
                <><SparklesIcon className="h-4 w-4" /> Generate</>
              )}
            </button>
            {!hasKey && (
              <p className="text-xs text-orange-400 mt-2">
                Add a {PROVIDERS.find((p) => p.value === provider)?.label} API key to start generating.
              </p>
            )}
          </div>

          {/* Output */}
          {result && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Generated Content</h3>
                <button
                  onClick={handleCopy}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent flex items-center gap-1.5"
                >
                  {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-400" /> : <CopyIcon className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <div className="rounded-md bg-background border border-border p-4 max-h-[500px] overflow-y-auto">
                <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed text-foreground/90">
                  {result}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
