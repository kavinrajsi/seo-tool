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
} from "lucide-react";

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


  // AI
  const [anthropicKey, setAnthropicKey] = useState("");
  const [anthropicKeySaved, setAnthropicKeySaved] = useState(false);
  const [anthropicKeySaving, setAnthropicKeySaving] = useState(false);
  const [anthropicKeyOwner, setAnthropicKeyOwner] = useState(null); // email of who added the key
  const [isKeyOwner, setIsKeyOwner] = useState(false); // can current user manage the key

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

      // Load any available Anthropic key (shared across all users)
      const { data: aiKeyRow } = await supabase
        .from("ai_api_keys")
        .select("api_key, user_id, added_by_email")
        .eq("provider", "anthropic")
        .limit(1)
        .maybeSingle();
      if (aiKeyRow) {
        setAnthropicKey(aiKeyRow.api_key);
        setAnthropicKeySaved(true);
        setAnthropicKeyOwner(aiKeyRow.added_by_email);
        setIsKeyOwner(aiKeyRow.user_id === u.id);
      }

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

  async function handleSaveAnthropicKey() {
    if (!anthropicKey.trim() || !user) return;
    setAnthropicKeySaving(true);
    setError("");
    const { data: existing } = await supabase
      .from("ai_api_keys")
      .select("id, user_id")
      .eq("provider", "anthropic")
      .limit(1)
      .maybeSingle();
    let saveErr;
    if (existing && existing.user_id === user.id) {
      // Update own key
      const { error: e } = await supabase.from("ai_api_keys").update({ api_key: anthropicKey.trim() }).eq("id", existing.id);
      saveErr = e;
    } else if (!existing) {
      // Insert new key
      const { error: e } = await supabase.from("ai_api_keys").insert({ user_id: user.id, provider: "anthropic", api_key: anthropicKey.trim(), added_by_email: user.email });
      saveErr = e;
    } else {
      setError("A key already exists. Only the person who added it can update it.");
      setAnthropicKeySaving(false);
      return;
    }
    if (saveErr) setError(saveErr.message);
    else {
      setAnthropicKeySaved(true);
      setAnthropicKeyOwner(user.email);
      setIsKeyOwner(true);
      setMsg("Anthropic API key saved");
    }
    setAnthropicKeySaving(false);
  }

  async function handleRemoveAnthropicKey() {
    if (!user) return;
    // Only the person who added can remove
    await supabase.from("ai_api_keys").delete().eq("user_id", user.id).eq("provider", "anthropic");
    setAnthropicKey("");
    setAnthropicKeySaved(false);
    setAnthropicKeyOwner(null);
    setIsKeyOwner(false);
    setMsg("Anthropic API key removed");
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

      {/* AI - Anthropic */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-muted-foreground" />
          AI Assistant
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Add an Anthropic API key to enable AI for all users. Only the person who added can update or remove it.
        </p>
        <div className="flex items-center justify-between rounded-md border border-border/50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <SparklesIcon className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">Anthropic</p>
              <p className="text-xs text-muted-foreground">Claude — shared across all users</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {anthropicKeySaved ? (
              <>
                <span className="text-xs text-muted-foreground font-mono">••••••••••••</span>
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                </span>
                {anthropicKeyOwner && (
                  <span className="text-[10px] text-muted-foreground">by {anthropicKeyOwner}</span>
                )}
                {isKeyOwner && (
                  <button onClick={handleRemoveAnthropicKey} className="text-xs text-muted-foreground hover:text-red-400 transition-colors">
                    Remove
                  </button>
                )}
              </>
            ) : (
              <>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveAnthropicKey()}
                  placeholder="sk-ant-..."
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm w-[200px] focus:outline-none focus:ring-2 focus:ring-primary/60"
                />
                <button
                  onClick={handleSaveAnthropicKey}
                  disabled={!anthropicKey.trim() || anthropicKeySaving}
                  className="text-xs bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground px-3 py-1.5 rounded-md transition-colors"
                >
                  {anthropicKeySaving ? "Saving..." : "Save"}
                </button>
              </>
            )}
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

    </div>
  );
}
