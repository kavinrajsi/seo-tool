"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import {
  SettingsIcon,
  LinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExternalLinkIcon,
  SearchIcon,
  GlobeIcon,
  SaveIcon,
  CloudIcon,
  KeyIcon,
  SparklesIcon,
  ShoppingCartIcon,
  EyeIcon,
  EyeOffIcon,
  HardDriveIcon,
  DatabaseIcon,
  FolderIcon,
  RefreshCwIcon,
  CpuIcon,
  CopyIcon,
  CheckIcon,
  ScanLineIcon,
  ReceiptIcon,
  PlusIcon,
  Trash2Icon,
  RotateCcwIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { PROVIDERS, DEFAULT_MODELS, CURRENCIES } from "@/lib/doc-scanner";

const DEFAULTS = {
  default_date_range: 30,
  results_per_page: 20,
};

function Toggle({ checked, onChange, label }) {
  return (
    <label className="flex items-center justify-between cursor-pointer">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </label>
  );
}

function SelectRow({ label, value, onChange, options, description }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <span className="text-sm">{label}</span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm min-w-[140px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function InputRow({ label, value, onChange, placeholder, type = "text", description }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <span className="text-sm">{label}</span>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(type === "number" ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/60"
      />
    </div>
  );
}

function MCPSection() {
  const [copied, setCopied] = useState(false);
  const endpoint = typeof window !== "undefined"
    ? `${window.location.origin}/api/mcp`
    : "/api/mcp";

  function copy(text) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const tools = [
    { name: "get_employees",       desc: "List employees (filter: status, department)" },
    { name: "search_employees",    desc: "Search by name, email, designation" },
    { name: "get_leads",           desc: "List contact submissions (filter: status)" },
    { name: "create_lead",         desc: "Create a new lead / contact entry" },
    { name: "update_lead_status",  desc: "Move a lead to a new status + add notes" },
    { name: "get_candidates",      desc: "List candidates (filter: status)" },
    { name: "get_announcements",   desc: "List HR announcements" },
    { name: "create_announcement", desc: "Post a new HR announcement" },
    { name: "get_devices",         desc: "List devices (filter: type, assigned_to)" },
    { name: "get_leave_requests",  desc: "List leave requests (filter: status)" },
    { name: "get_seo_analyses",    desc: "Recent SEO analyses with scores" },
    { name: "get_dashboard_summary", desc: "Platform-wide counts summary" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <CpuIcon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">MCP Server</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 font-medium">Active</span>
      </div>

      <p className="text-xs text-muted-foreground mb-4">
        Connect Claude (or any MCP client) directly to this platform's data using the Model Context Protocol.
        Set <code className="bg-muted px-1 rounded text-[11px]">MCP_API_KEY</code> in your environment variables, then use the endpoint below.
      </p>

      {/* Endpoint */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Endpoint URL</p>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <code className="text-xs flex-1 truncate">{endpoint}</code>
          <button onClick={() => copy(endpoint)} className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            {copied ? <CheckIcon size={13} className="text-emerald-400" /> : <CopyIcon size={13} />}
          </button>
        </div>
      </div>

      {/* Claude Desktop config snippet */}
      <div className="mb-4">
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Claude Desktop Config</p>
        <div className="relative rounded-lg border border-border bg-muted/30 px-3 py-2.5 font-mono text-[11px] leading-relaxed">
          <button onClick={() => copy(`{\n  "mcpServers": {\n    "madarth": {\n      "type": "http",\n      "url": "${endpoint}",\n      "headers": {\n        "Authorization": "Bearer YOUR_MCP_API_KEY"\n      }\n    }\n  }\n}`)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <CopyIcon size={11} />
          </button>
          <pre className="whitespace-pre-wrap text-muted-foreground overflow-x-auto">{`{
  "mcpServers": {
    "madarth": {
      "type": "http",
      "url": "${endpoint}",
      "headers": {
        "Authorization": "Bearer YOUR_MCP_API_KEY"
      }
    }
  }
}`}</pre>
        </div>
      </div>

      {/* Tools table */}
      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Available Tools ({tools.length})</p>
        <div className="rounded-lg border border-border/50 overflow-hidden">
          {tools.map((t, i) => (
            <div key={t.name} className={`flex items-start gap-3 px-3 py-2 text-xs ${i < tools.length - 1 ? "border-b border-border/30" : ""}`}>
              <code className="text-primary shrink-0 w-44">{t.name}</code>
              <span className="text-muted-foreground">{t.desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [googleConnected, setGoogleConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState(DEFAULTS);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Shopify
  const [shopifyConnected, setShopifyConnected] = useState(false);
  const [shopifyShop, setShopifyShop] = useState("");
  const [shopifyShopInput, setShopifyShopInput] = useState("");
  const [shopifySyncingProducts, setShopifySyncingProducts] = useState(false);
  const [shopifySyncingOrders, setShopifySyncingOrders] = useState(false);
  const [shopifyProductCount, setShopifyProductCount] = useState(0);
  const [shopifyOrderCount, setShopifyOrderCount] = useState(0);

  // Cloudflare
  const [cfToken, setCfToken] = useState("");
  const [cfSaved, setCfSaved] = useState(false);
  const [cfSaving, setCfSaving] = useState(false);


  // AI — multi-provider keys
  const [aiKeys, setAiKeys] = useState({
    anthropic: { key: "", saved: false, saving: false, owner: null, isOwner: false },
    openai: { key: "", saved: false, saving: false, owner: null, isOwner: false },
    google: { key: "", saved: false, saving: false, owner: null, isOwner: false },
    mistral: { key: "", saved: false, saving: false, owner: null, isOwner: false },
  });

  // Legacy aliases for Anthropic (backward compat with existing init code)
  const anthropicKeySaved = aiKeys.anthropic.saved;
  const anthropicKeyOwner = aiKeys.anthropic.owner;
  const isKeyOwner = aiKeys.anthropic.isOwner;

  // Doc Scanner settings
  const [dsProvider, setDsProvider] = useState("anthropic");
  const [dsModel, setDsModel] = useState("");
  const [dsCurrency, setDsCurrency] = useState("INR");
  const [dsAutoCategorize, setDsAutoCategorize] = useState(true);
  const [dsPrompts, setDsPrompts] = useState([]);
  const [dsCustomFields, setDsCustomFields] = useState([]);
  const [dsCategories, setDsCategories] = useState([]);
  const [dsExpandedPrompt, setDsExpandedPrompt] = useState(null);
  const [dsNewFieldName, setDsNewFieldName] = useState("");
  const [dsNewFieldPrompt, setDsNewFieldPrompt] = useState("");
  const [dsNewFieldType, setDsNewFieldType] = useState("text");
  const [dsNewCatName, setDsNewCatName] = useState("");
  const [dsNewCatColor, setDsNewCatColor] = useState("#6b7280");
  const [dsSaving, setDsSaving] = useState(false);

  // Basecamp
  const [bcConnected, setBcConnected] = useState(false);
  const [bcAccountId, setBcAccountId] = useState("");
  const [bcProjects, setBcProjects] = useState([]);
  const [bcProjectsLoading, setBcProjectsLoading] = useState(false);
  const [bcRegistering, setBcRegistering] = useState(false);
  const [bcCleaning, setBcCleaning] = useState(false);
  const [bcSyncingPeople, setBcSyncingPeople] = useState(false);
  const [bcPeopleCount, setBcPeopleCount] = useState(0);
  const [bcWebhookResult, setBcWebhookResult] = useState(null);

  // Storage
  const [storageData, setStorageData] = useState(null);
  const [storageLoading, setStorageLoading] = useState(false);


  useEffect(() => {
    async function init() {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) return;
      setUser(u);

      // Check Google connection
      const { data: tokenRow } = await supabase
        .from("google_tokens")
        .select("id")
        .eq("user_id", u.id)
        .single();
      setGoogleConnected(!!tokenRow);

      // Load preferences
      const { data: prefRow } = await supabase
        .from("user_preferences")
        .select("*")
        .eq("user_id", u.id)
        .maybeSingle();

      if (prefRow) {
        setPrefs({ ...DEFAULTS, ...prefRow });
      }

      // Load all AI API keys (shared across all users)
      const { data: aiKeyRows } = await supabase
        .from("ai_api_keys")
        .select("provider, api_key, user_id, added_by_email");
      if (aiKeyRows) {
        const updated = { ...aiKeys };
        for (const row of aiKeyRows) {
          if (updated[row.provider]) {
            updated[row.provider] = {
              key: row.api_key,
              saved: true,
              saving: false,
              owner: row.added_by_email,
              isOwner: row.user_id === u.id,
            };
          }
        }
        setAiKeys(updated);
      }

      // Load doc scanner settings
      const { data: dsRow } = await supabase
        .from("doc_scanner_settings")
        .select("*")
        .eq("user_id", u.id)
        .maybeSingle();
      if (dsRow) {
        setDsProvider(dsRow.preferred_provider || "openai");
        setDsModel(dsRow.preferred_model || "");
        setDsCurrency(dsRow.default_currency || "INR");
        setDsAutoCategorize(dsRow.auto_categorize !== false);
      }

      // Load doc scanner prompts, custom fields, categories
      apiFetch("/api/doc-scanner/prompts").then((r) => r.json()).then((j) => setDsPrompts(j.prompts || []));
      apiFetch("/api/doc-scanner/custom-fields").then((r) => r.json()).then((j) => setDsCustomFields(j.fields || []));
      apiFetch("/api/doc-scanner/categories").then((r) => r.json()).then((j) => setDsCategories(j.categories || []));

      // Load Basecamp config
      const { data: bcConfig } = await supabase
        .from("basecamp_config")
        .select("account_id")
        .eq("user_id", u.id)
        .maybeSingle();
      if (bcConfig) {
        setBcConnected(true);
        setBcAccountId(bcConfig.account_id);
        try {
          const pRes = await fetch("/api/basecamp/people?count=1");
          const pData = await pRes.json();
          if (pData.count) setBcPeopleCount(pData.count);
        } catch {}
      }


      // Check Shopify connection
      const { data: shopifyRow } = await supabase
        .from("shopify_config")
        .select("shop_domain")
        .eq("user_id", u.id)
        .limit(1);
      if (shopifyRow?.length > 0) {
        setShopifyConnected(true);
        setShopifyShop(shopifyRow[0].shop_domain);
        const { count: pc } = await supabase.from("shopify_products").select("id", { count: "exact", head: true }).eq("user_id", u.id);
        if (pc) setShopifyProductCount(pc);
        const { count: oc } = await supabase.from("shopify_orders").select("id", { count: "exact", head: true }).eq("user_id", u.id);
        if (oc) setShopifyOrderCount(oc);
      }

      // Check Cloudflare connection
      const { data: cfRow } = await supabase
        .from("cloudflare_tokens")
        .select("api_token")
        .eq("user_id", u.id)
        .limit(1);
      if (cfRow?.length > 0) {
        setCfSaved(true);
        setCfToken(cfRow[0].api_token);
      }

      setLoading(false);
    }
    init();
  }, []);

  function updatePref(key, value) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError("");
    setMsg("");

    const { id, user_id, updated_at, ...data } = prefs;
    data.updated_at = new Date().toISOString();

    // Upsert preferences
    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .single();

    let saveError;
    if (existing) {
      const { error: e } = await supabase
        .from("user_preferences")
        .update(data)
        .eq("user_id", user.id);
      saveError = e;
    } else {
      const { error: e } = await supabase
        .from("user_preferences")
        .insert({ ...data, user_id: user.id });
      saveError = e;
    }

    if (saveError) {
      setError(saveError.message);
    } else {
      setMsg("Preferences saved");
      setTimeout(() => setMsg(""), 3000);
    }
    setSaving(false);
  }

  async function handleDisconnectGoogle() {
    if (!user) return;
    setError("");
    const { error: delError } = await supabase
      .from("google_tokens")
      .delete()
      .eq("user_id", user.id);

    if (delError) setError(delError.message);
    else { setGoogleConnected(false); setMsg("Google account disconnected"); }
  }

  async function handleSaveCfToken() {
    if (!cfToken.trim() || !user) return;
    setCfSaving(true);
    setError("");
    const { error: e } = await supabase.from("cloudflare_tokens").upsert(
      { user_id: user.id, api_token: cfToken.trim() },
      { onConflict: "user_id" }
    );
    if (e) setError(e.message);
    else { setCfSaved(true); setMsg("Cloudflare token saved"); }
    setCfSaving(false);
  }

  async function handleDisconnectShopify() {
    if (!user) return;
    setError("");
    await supabase.from("shopify_products").delete().eq("user_id", user.id);
    await supabase.from("shopify_orders").delete().eq("user_id", user.id);
    await supabase.from("shopify_config").delete().eq("user_id", user.id);
    setShopifyConnected(false);
    setShopifyShop("");
    setShopifyProductCount(0);
    setShopifyOrderCount(0);
    setMsg("Shopify disconnected");
  }

  async function handleSyncShopify(type) {
    if (type === "products") setShopifySyncingProducts(true);
    else setShopifySyncingOrders(true);
    setError("");
    try {
      const res = await apiFetch("/api/shopify/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (type === "products") setShopifyProductCount(data.synced);
      else setShopifyOrderCount(data.synced);
      setMsg(`Synced ${data.synced} ${type}`);
    } catch (err) {
      setError(err.message);
    }
    if (type === "products") setShopifySyncingProducts(false);
    else setShopifySyncingOrders(false);
  }

  async function handleDisconnectCf() {
    if (!user) return;
    setError("");
    const { error: e } = await supabase.from("cloudflare_tokens").delete().eq("user_id", user.id);
    if (e) setError(e.message);
    else { setCfSaved(false); setCfToken(""); setMsg("Cloudflare disconnected"); }
  }


  async function loadStorageUsage() {
    setStorageLoading(true);
    try {
      const res = await apiFetch("/api/storage-usage");
      const data = await res.json();
      if (res.ok) setStorageData(data);
    } catch {}
    setStorageLoading(false);
  }

  // Generic AI key save/remove for any provider
  async function handleSaveAiKey(provider) {
    const state = aiKeys[provider];
    if (!state?.key.trim() || !user) return;
    setAiKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], saving: true } }));
    setError("");

    const { data: existing } = await supabase
      .from("ai_api_keys")
      .select("id, user_id")
      .eq("provider", provider)
      .limit(1)
      .maybeSingle();

    let saveErr;
    if (existing && existing.user_id === user.id) {
      const { error: e } = await supabase.from("ai_api_keys").update({ api_key: state.key.trim() }).eq("id", existing.id);
      saveErr = e;
    } else if (!existing) {
      const { error: e } = await supabase.from("ai_api_keys").insert({ user_id: user.id, provider, api_key: state.key.trim(), added_by_email: user.email });
      saveErr = e;
    } else {
      setError(`A ${PROVIDERS[provider]?.label || provider} key already exists. Only the person who added it can update it.`);
      setAiKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], saving: false } }));
      return;
    }

    if (saveErr) setError(saveErr.message);
    else {
      setAiKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], saved: true, saving: false, owner: user.email, isOwner: true } }));
      setMsg(`${PROVIDERS[provider]?.label || provider} API key saved`);
    }
    setAiKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], saving: false } }));
  }

  async function handleRemoveAiKey(provider) {
    if (!user) return;
    await supabase.from("ai_api_keys").delete().eq("user_id", user.id).eq("provider", provider);
    setAiKeys((prev) => ({ ...prev, [provider]: { key: "", saved: false, saving: false, owner: null, isOwner: false } }));
    setMsg(`${PROVIDERS[provider]?.label || provider} API key removed`);
  }

  // Doc Scanner settings save
  async function handleSaveDsSettings() {
    if (!user) return;
    setDsSaving(true);
    const { error: e } = await supabase.from("doc_scanner_settings").upsert({
      user_id: user.id,
      preferred_provider: dsProvider,
      preferred_model: dsModel || DEFAULT_MODELS[dsProvider],
      auto_categorize: dsAutoCategorize,
      default_currency: dsCurrency,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (e) setError(e.message);
    else setMsg("Document scanner settings saved");
    setDsSaving(false);
  }

  async function handleSavePrompt(prompt) {
    const res = await apiFetch("/api/doc-scanner/prompts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: prompt.id, prompt_text: prompt.prompt_text }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDsPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setMsg("Prompt saved");
    }
  }

  async function handleResetPrompt(promptKey) {
    const res = await apiFetch("/api/doc-scanner/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt_key: promptKey }),
    });
    if (res.ok) {
      const updated = await res.json();
      setDsPrompts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setMsg("Prompt reset to default");
    }
  }

  async function handleAddCustomField() {
    if (!dsNewFieldName.trim() || !dsNewFieldPrompt.trim()) return;
    const res = await apiFetch("/api/doc-scanner/custom-fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ field_name: dsNewFieldName, field_type: dsNewFieldType, extraction_prompt: dsNewFieldPrompt }),
    });
    if (res.ok) {
      const field = await res.json();
      setDsCustomFields((prev) => [...prev, field]);
      setDsNewFieldName("");
      setDsNewFieldPrompt("");
      setDsNewFieldType("text");
    }
  }

  async function handleDeleteCustomField(id) {
    await apiFetch("/api/doc-scanner/custom-fields", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDsCustomFields((prev) => prev.filter((f) => f.id !== id));
  }

  async function handleAddCategory() {
    if (!dsNewCatName.trim()) return;
    const res = await apiFetch("/api/doc-scanner/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: dsNewCatName, color: dsNewCatColor }),
    });
    if (res.ok) {
      const cat = await res.json();
      setDsCategories((prev) => [...prev, cat]);
      setDsNewCatName("");
      setDsNewCatColor("#6b7280");
    }
  }

  async function handleDeleteCategory(id) {
    await apiFetch("/api/doc-scanner/categories", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDsCategories((prev) => prev.filter((c) => c.id !== id));
  }

  async function handleLoadBcProjects() {
    setBcProjectsLoading(true);
    try {
      const res = await apiFetch("/api/basecamp/projects");
      const data = await res.json();
      if (res.ok && data.projects) setBcProjects(data.projects);
    } catch {}
    setBcProjectsLoading(false);
  }

  async function handleDisconnectBasecamp() {
    if (!user) return;
    setError("");
    await supabase.from("basecamp_config").delete().eq("user_id", user.id);
    setBcConnected(false);
    setBcAccountId("");
    setBcWebhookResult(null);
    setMsg("Basecamp disconnected");
  }

  async function handleRegisterWebhooks() {
    setBcRegistering(true);
    setError("");
    setBcWebhookResult(null);
    try {
      const res = await apiFetch("/api/basecamp/register-webhooks", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBcWebhookResult(data);
      setMsg(`Webhooks registered for ${data.registered}/${data.total} projects`);
      handleLoadBcProjects();
    } catch (err) {
      setError(err.message);
    }
    setBcRegistering(false);
  }

  async function handleCleanupWebhooks() {
    setBcCleaning(true);
    setError("");
    try {
      const res = await apiFetch("/api/basecamp/cleanup-webhooks", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`Removed ${data.cleaned} duplicate webhooks`);
      handleLoadBcProjects();
    } catch (err) {
      setError(err.message);
    }
    setBcCleaning(false);
  }

  async function handleSyncPeople() {
    setBcSyncingPeople(true);
    setError("");
    try {
      const res = await apiFetch("/api/basecamp/people?sync=1");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBcPeopleCount(data.people?.length || 0);
      setMsg(`Synced ${data.synced} people from Basecamp`);
    } catch (err) {
      setError(err.message);
    }
    setBcSyncingPeople(false);
  }



  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure integrations and app preferences.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
        >
          <SaveIcon className="h-4 w-4" />
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}
      {msg && (
        <div className="rounded-md border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">{msg}</div>
      )}

      {/* Connected Accounts */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-muted-foreground" />
          Connected Accounts
        </h3>
        <div className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium">Google</p>
              <p className="text-xs text-muted-foreground">Analytics & Search Console</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {googleConnected ? (
              <>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Connected
                </span>
                <button onClick={handleDisconnectGoogle} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">
                  Disconnect
                </button>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <XCircleIcon className="h-3.5 w-3.5" /> Not connected
                </span>
                <button onClick={() => router.push("/ga")} className="text-xs text-primary hover:underline flex items-center gap-1">
                  Connect <ExternalLinkIcon className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Google Permissions */}
        {googleConnected && (
          <div className="rounded-md border border-border/50 px-4 py-3 mt-1 ml-12 space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Permissions used:</p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-2">
                <CheckCircleIcon className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Google Analytics (Read-only)</p>
                  <p className="text-[10px] text-muted-foreground">analytics.readonly — View GA4 traffic, page views, sessions, and user data</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircleIcon className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Search Console (Read-only)</p>
                  <p className="text-[10px] text-muted-foreground">webmasters.readonly — View search queries, impressions, clicks, and rankings</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircleIcon className="h-3 w-3 text-green-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium">Business Profile (Manage)</p>
                  <p className="text-[10px] text-muted-foreground">business.manage — Read Google Reviews and business information</p>
                </div>
              </div>
            </div>
            <a
              href="https://myaccount.google.com/permissions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
            >
              Manage in Google Account <ExternalLinkIcon className="h-2.5 w-2.5" />
            </a>
          </div>
        )}

        {/* Cloudflare */}
        <div className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3 mt-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <CloudIcon className="h-4.5 w-4.5 text-orange-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Cloudflare</p>
              <p className="text-xs text-muted-foreground">Analytics & Performance</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {cfSaved ? (
              <>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Connected
                </span>
                <button onClick={handleDisconnectCf} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">
                  Disconnect
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={cfToken}
                  onChange={(e) => setCfToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveCfToken()}
                  placeholder="Cloudflare API Token"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
                <button
                  onClick={handleSaveCfToken}
                  disabled={!cfToken.trim() || cfSaving}
                  className="text-xs bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  {cfSaving ? "Saving..." : "Connect"}
                </button>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Shopify */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          Shopify
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Connect your Shopify store to sync products and orders.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {shopifyConnected ? (
              <>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Connected
                </span>
                <span className="text-xs text-muted-foreground">{shopifyShop}</span>
                <button onClick={handleDisconnectShopify} className="text-xs text-muted-foreground hover:text-red-400 transition-colors ml-auto">
                  Disconnect
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={shopifyShopInput}
                  onChange={(e) => setShopifyShopInput(e.target.value)}
                  placeholder="your-store.myshopify.com"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-[250px] focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
                <a
                  href={shopifyShopInput ? `/api/shopify/auth?shop=${shopifyShopInput}` : "#"}
                  onClick={(e) => { if (!shopifyShopInput.trim()) e.preventDefault(); }}
                  className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded-md transition-colors flex items-center gap-1"
                >
                  Connect <ExternalLinkIcon className="h-3 w-3" />
                </a>
              </div>
            )}
          </div>
          {shopifyConnected && (
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium">Products</p>
                  <p className="text-[10px] text-muted-foreground">{shopifyProductCount} synced</p>
                </div>
                <button
                  onClick={() => handleSyncShopify("products")}
                  disabled={shopifySyncingProducts}
                  className="text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  {shopifySyncingProducts ? "Syncing..." : "Sync Products"}
                </button>
              </div>
              <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5">
                <div>
                  <p className="text-xs font-medium">Orders</p>
                  <p className="text-[10px] text-muted-foreground">{shopifyOrderCount} synced</p>
                </div>
                <button
                  onClick={() => handleSyncShopify("orders")}
                  disabled={shopifySyncingOrders}
                  className="text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  {shopifySyncingOrders ? "Syncing..." : "Sync Orders"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI API Keys — Multi-provider */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-muted-foreground" />
          AI API Keys
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add API keys for AI providers. Keys are shared across all users. Only the person who added a key can update or remove it.
        </p>
        <div className="space-y-2">
          {[
            { provider: "anthropic", label: "Anthropic", desc: "Claude models", placeholder: "sk-ant-..." },
            { provider: "openai", label: "OpenAI", desc: "GPT-4o, GPT-4o mini", placeholder: "sk-..." },
            { provider: "google", label: "Google AI", desc: "Gemini models", placeholder: "AI..." },
            { provider: "mistral", label: "Mistral", desc: "Pixtral, Mistral Large", placeholder: "..." },
          ].map(({ provider, label, desc, placeholder }) => {
            const k = aiKeys[provider];
            return (
              <div key={provider} className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <SparklesIcon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {k.saved ? (
                    <>
                      <span className="text-xs text-muted-foreground font-mono">••••••••••••</span>
                      <CheckCircleIcon className="h-3.5 w-3.5 text-green-400" />
                      {k.owner && <span className="text-[10px] text-muted-foreground">by {k.owner}</span>}
                      {k.isOwner && (
                        <button onClick={() => handleRemoveAiKey(provider)} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">Remove</button>
                      )}
                    </>
                  ) : (
                    <>
                      <input
                        type="password"
                        value={k.key}
                        onChange={(e) => setAiKeys((prev) => ({ ...prev, [provider]: { ...prev[provider], key: e.target.value } }))}
                        onKeyDown={(e) => e.key === "Enter" && handleSaveAiKey(provider)}
                        placeholder={placeholder}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/60"
                      />
                      <button
                        onClick={() => handleSaveAiKey(provider)}
                        disabled={!k.key.trim() || k.saving}
                        className="text-xs bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-3 py-1.5 rounded-md transition-colors"
                      >
                        {k.saving ? "Saving..." : "Save"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Document Scanner Settings */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <ScanLineIcon className="h-4 w-4 text-muted-foreground" />
          Document Scanner
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Configure AI extraction settings, editable prompts, custom fields, and categories.
        </p>

        {/* Provider & Model */}
        <div className="space-y-4 mb-6">
          <SelectRow
            label="LLM Provider"
            description="Which AI provider to use for document extraction"
            value={dsProvider}
            onChange={(v) => { setDsProvider(v); setDsModel(DEFAULT_MODELS[v] || ""); }}
            options={Object.entries(PROVIDERS).map(([k, v]) => ({ value: k, label: v.label }))}
          />
          <SelectRow
            label="Model"
            description="Specific model for extraction"
            value={dsModel || DEFAULT_MODELS[dsProvider]}
            onChange={setDsModel}
            options={(PROVIDERS[dsProvider]?.models || []).map((m) => ({ value: m, label: m }))}
          />
          <SelectRow
            label="Default Currency"
            value={dsCurrency}
            onChange={setDsCurrency}
            options={CURRENCIES.map((c) => ({ value: c, label: c }))}
          />
          <Toggle label="Auto-categorize documents" checked={dsAutoCategorize} onChange={setDsAutoCategorize} />
          <button
            onClick={handleSaveDsSettings}
            disabled={dsSaving}
            className="text-xs bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-4 py-1.5 rounded-md transition-colors"
          >
            {dsSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {/* Editable Prompts */}
        <div className="border-t border-border pt-4 mb-6">
          <h4 className="text-xs font-medium mb-3 uppercase tracking-wider text-muted-foreground">Editable Prompts</h4>
          <p className="text-[10px] text-muted-foreground mb-3">Customize the AI prompts used for extraction, categorization, and custom fields.</p>
          <div className="space-y-2">
            {dsPrompts.map((prompt) => (
              <div key={prompt.id} className="rounded-md border border-border/50">
                <button
                  onClick={() => setDsExpandedPrompt(dsExpandedPrompt === prompt.id ? null : prompt.id)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-muted/20 transition-colors"
                >
                  <div>
                    <p className="text-xs font-medium">{prompt.prompt_name}</p>
                    <p className="text-[10px] text-muted-foreground">{prompt.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!prompt.is_default && <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Modified</span>}
                    {dsExpandedPrompt === prompt.id ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                  </div>
                </button>
                {dsExpandedPrompt === prompt.id && (
                  <div className="px-3 pb-3 space-y-2 border-t border-border/30">
                    <textarea
                      value={prompt.prompt_text}
                      onChange={(e) => setDsPrompts((prev) => prev.map((p) => (p.id === prompt.id ? { ...p, prompt_text: e.target.value } : p)))}
                      rows={6}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs font-mono mt-2 focus:outline-none focus:ring-2 focus:ring-primary/60 resize-y"
                    />
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleSavePrompt(prompt)} className="text-xs bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-1 rounded-md transition-colors">Save</button>
                      <button onClick={() => handleResetPrompt(prompt.prompt_key)} className="text-xs border border-border text-muted-foreground hover:text-foreground px-3 py-1 rounded-md transition-colors flex items-center gap-1">
                        <RotateCcwIcon size={10} /> Reset to Default
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Custom Fields */}
        <div className="border-t border-border pt-4 mb-6">
          <h4 className="text-xs font-medium mb-3 uppercase tracking-wider text-muted-foreground">Custom Fields</h4>
          <p className="text-[10px] text-muted-foreground mb-3">Add custom columns that are extracted automatically using your own AI prompts.</p>
          {dsCustomFields.length > 0 && (
            <div className="space-y-2 mb-3">
              {dsCustomFields.map((f) => (
                <div key={f.id} className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">{f.field_name} <span className="text-[10px] text-muted-foreground">({f.field_type})</span></p>
                    <p className="text-[10px] text-muted-foreground truncate max-w-[300px]">{f.extraction_prompt}</p>
                  </div>
                  <button onClick={() => handleDeleteCustomField(f.id)} className="text-muted-foreground hover:text-red-400 transition-colors shrink-0">
                    <Trash2Icon size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="rounded-md border border-dashed border-border/50 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={dsNewFieldName}
                onChange={(e) => setDsNewFieldName(e.target.value)}
                placeholder="Field name (e.g. Payment Method)"
                className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
              />
              <select
                value={dsNewFieldType}
                onChange={(e) => setDsNewFieldType(e.target.value)}
                className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
              >
                <option value="text">Text</option>
                <option value="number">Number</option>
                <option value="date">Date</option>
                <option value="boolean">Boolean</option>
              </select>
            </div>
            <input
              type="text"
              value={dsNewFieldPrompt}
              onChange={(e) => setDsNewFieldPrompt(e.target.value)}
              placeholder="Extraction prompt (e.g. Extract the payment method used...)"
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
            />
            <button
              onClick={handleAddCustomField}
              disabled={!dsNewFieldName.trim() || !dsNewFieldPrompt.trim()}
              className="text-xs bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-3 py-1 rounded-md transition-colors flex items-center gap-1"
            >
              <PlusIcon size={12} /> Add Field
            </button>
          </div>
        </div>

        {/* Categories */}
        <div className="border-t border-border pt-4">
          <h4 className="text-xs font-medium mb-3 uppercase tracking-wider text-muted-foreground">Categories</h4>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {dsCategories.map((c) => (
              <span key={c.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-1 rounded-full border border-border">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                {c.name}
                {c.user_id && (
                  <button onClick={() => handleDeleteCategory(c.id)} className="text-muted-foreground hover:text-red-400 ml-0.5"><XIcon size={10} /></button>
                )}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={dsNewCatColor}
              onChange={(e) => setDsNewCatColor(e.target.value)}
              className="h-7 w-7 rounded border border-border cursor-pointer"
            />
            <input
              type="text"
              value={dsNewCatName}
              onChange={(e) => setDsNewCatName(e.target.value)}
              placeholder="New category name"
              className="flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/60"
            />
            <button
              onClick={handleAddCategory}
              disabled={!dsNewCatName.trim()}
              className="text-xs bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-3 py-1 rounded-md transition-colors flex items-center gap-1"
            >
              <PlusIcon size={12} /> Add
            </button>
          </div>
        </div>
      </div>

      {/* Basecamp */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Basecamp
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Connect your Basecamp account via OAuth, then register webhooks to receive real-time updates.
        </p>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            {bcConnected ? (
              <>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Connected
                </span>
                <span className="text-xs text-muted-foreground">Account {bcAccountId}</span>
                <button
                  onClick={handleRegisterWebhooks}
                  disabled={bcRegistering}
                  className="text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
                >
                  {bcRegistering ? "Registering..." : "Register Webhooks"}
                </button>
                <button
                  onClick={handleCleanupWebhooks}
                  disabled={bcCleaning}
                  className="text-xs border border-border text-muted-foreground hover:text-foreground disabled:opacity-50 px-3 py-1.5 rounded-md transition-colors"
                >
                  {bcCleaning ? "Cleaning..." : "Cleanup Duplicates"}
                </button>
                <button onClick={handleDisconnectBasecamp} className="text-xs text-muted-foreground hover:text-red-400 transition-colors ml-auto">
                  Disconnect
                </button>
              </>
            ) : (
              <a
                href="/api/basecamp/auth"
                className="text-xs bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-1"
              >
                Connect Basecamp <ExternalLinkIcon className="h-3 w-3" />
              </a>
            )}
          </div>
          {bcWebhookResult && (
            <div className="rounded-md border border-border/50 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              {bcWebhookResult.registered > 0 && (
                <span className="text-green-400">{bcWebhookResult.registered} new registered. </span>
              )}
              {bcWebhookResult.skipped > 0 && (
                <span>{bcWebhookResult.skipped} already had webhooks. </span>
              )}
              {bcWebhookResult.errors?.length > 0 && (
                <span className="text-red-400">{bcWebhookResult.errors.length} failed.</span>
              )}
              {bcWebhookResult.registered === 0 && bcWebhookResult.skipped === bcWebhookResult.total && (
                <span>All {bcWebhookResult.total} projects already have webhooks.</span>
              )}
            </div>
          )}
          {bcConnected && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium">Projects & Webhooks</p>
                <button
                  onClick={handleLoadBcProjects}
                  disabled={bcProjectsLoading}
                  className="text-[10px] text-primary hover:underline"
                >
                  {bcProjectsLoading ? "Loading..." : bcProjects.length > 0 ? "Refresh" : "Load Projects"}
                </button>
              </div>
              {bcProjects.length > 0 && (
                <div className="rounded-md border border-border/50 overflow-hidden">
                  {bcProjects.map((p, i) => {
                    const hasWebhook = p.webhooks?.length > 0;
                    return (
                      <div key={p.id} className={`${i < bcProjects.length - 1 ? "border-b border-border/30" : ""}`}>
                        <div className="flex items-center justify-between px-3 py-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${hasWebhook ? "bg-green-400" : "bg-zinc-400"}`} />
                            <span className="truncate">{p.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${p.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-500/10 text-zinc-400"}`}>
                              {p.status}
                            </span>
                          </div>
                          <div className="shrink-0 ml-2">
                            {hasWebhook ? (
                              <span className="text-[10px] text-green-400">{p.webhooks.length} webhook{p.webhooks.length > 1 ? "s" : ""}</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">No webhook</span>
                            )}
                          </div>
                        </div>
                        {hasWebhook && (
                          <div className="px-3 pb-2 pl-6 space-y-1">
                            {p.webhooks.map((w) => (
                              <div key={w.id} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                <span className={`w-1 h-1 rounded-full shrink-0 ${w.active ? "bg-green-400" : "bg-red-400"}`} />
                                <code className="truncate">{w.payload_url}</code>
                                <span className="shrink-0">{w.active ? "active" : "inactive"}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
          {bcConnected && (
            <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2.5">
              <div>
                <p className="text-xs font-medium">People</p>
                <p className="text-[10px] text-muted-foreground">{bcPeopleCount} synced</p>
              </div>
              <button
                onClick={handleSyncPeople}
                disabled={bcSyncingPeople}
                className="text-xs bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-3 py-1.5 rounded-md transition-colors"
              >
                {bcSyncingPeople ? "Syncing..." : "Sync People"}
              </button>
            </div>
          )}
        </div>
      </div>


      {/* Storage Usage */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <HardDriveIcon className="h-4 w-4 text-muted-foreground" />
            Storage & Database
          </h3>
          <button
            onClick={loadStorageUsage}
            disabled={storageLoading}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded-md px-3 py-1.5 hover:bg-muted/30 transition-colors disabled:opacity-50"
          >
            <RefreshCwIcon size={12} className={storageLoading ? "animate-spin" : ""} />
            {storageLoading ? "Loading..." : storageData ? "Refresh" : "Load Usage"}
          </button>
        </div>

        {!storageData && !storageLoading && (
          <p className="text-xs text-muted-foreground">Click "Load Usage" to view your storage and database usage.</p>
        )}

        {storageData?.supabase && (
          <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-xl font-bold text-emerald-400">{storageData.supabase.totalRows?.toLocaleString() || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Total Rows</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-xl font-bold text-blue-400">{storageData.supabase.tableCounts?.length || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Active Tables</p>
              </div>
              <div className="rounded-lg border border-border/50 p-3 text-center">
                <p className="text-xl font-bold text-amber-400">{storageData.supabase.totalFiles || 0}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Storage Files</p>
              </div>
            </div>

            {/* Table breakdown */}
            {storageData.supabase.tableCounts?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1"><DatabaseIcon size={12} className="text-muted-foreground" /> Database Tables</p>
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  {storageData.supabase.tableCounts.map((t, i) => (
                    <div key={t.table} className={`flex items-center justify-between px-3 py-2 text-xs ${i < storageData.supabase.tableCounts.length - 1 ? "border-b border-border/30" : ""}`}>
                      <span className="font-mono text-muted-foreground">{t.table}</span>
                      <span className="font-medium">{t.count.toLocaleString()} rows</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Storage buckets */}
            {storageData.supabase.buckets?.length > 0 && (
              <div>
                <p className="text-xs font-medium mb-2 flex items-center gap-1"><FolderIcon size={12} className="text-muted-foreground" /> Storage Buckets</p>
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  {storageData.supabase.buckets.map((b, i) => (
                    <div key={b.name} className={`flex items-center justify-between px-3 py-2 text-xs ${i < storageData.supabase.buckets.length - 1 ? "border-b border-border/30" : ""}`}>
                      <div className="flex items-center gap-2">
                        <FolderIcon size={12} className="text-muted-foreground" />
                        <span>{b.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${b.public ? "bg-green-500/10 text-green-400" : "bg-zinc-500/10 text-zinc-400"}`}>{b.public ? "Public" : "Private"}</span>
                      </div>
                      <span className="font-medium">{b.fileCount} files</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {storageData?.vercel && (
          <div className="mt-4">
            <p className="text-xs font-medium mb-2 flex items-center gap-1"><GlobeIcon size={12} className="text-muted-foreground" /> Vercel Project</p>
            <div className="rounded-lg border border-border/50 p-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Project:</span> <span className="font-medium">{storageData.vercel.name}</span></div>
                <div><span className="text-muted-foreground">Framework:</span> <span className="font-medium">{storageData.vercel.framework}</span></div>
                <div><span className="text-muted-foreground">Node:</span> <span className="font-medium">{storageData.vercel.nodeVersion}</span></div>
                {storageData.vercel.updatedAt && <div><span className="text-muted-foreground">Updated:</span> <span className="font-medium">{new Date(storageData.vercel.updatedAt).toLocaleDateString()}</span></div>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── MCP Server ── */}
      <MCPSection />

    </div>
  );
}
