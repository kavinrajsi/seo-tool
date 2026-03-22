"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  UsersIcon, SearchIcon, PlusIcon, XIcon, PencilIcon, TrashIcon,
  StarIcon, MailIcon, PhoneIcon, SendIcon, CheckIcon,
  LayoutGridIcon, ListIcon, ExternalLinkIcon, FilterIcon,
  InstagramIcon, FacebookIcon, YoutubeIcon, DownloadIcon,
  HeartIcon, MessageSquareIcon,
} from "lucide-react";

const CATEGORIES = ["Fashion", "Tech", "Fitness", "Food", "Lifestyle", "Beauty", "Gaming", "Travel", "Education", "Finance", "Health", "Music", "Art", "Sports"];
const TIERS = { nano: { label: "Nano", color: "bg-zinc-500/20 text-zinc-400" }, micro: { label: "Micro", color: "bg-blue-500/20 text-blue-400" }, macro: { label: "Macro", color: "bg-purple-500/20 text-purple-400" }, mega: { label: "Mega", color: "bg-amber-500/20 text-amber-400" } };
const STATUSES = { prospect: "bg-zinc-500/20 text-zinc-400", contacted: "bg-blue-500/20 text-blue-400", negotiating: "bg-amber-500/20 text-amber-400", contracted: "bg-purple-500/20 text-purple-400", active: "bg-emerald-500/20 text-emerald-400", completed: "bg-cyan-500/20 text-cyan-400" };

function fmtNum(n) { if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; if (n >= 1e3) return (n / 1e3).toFixed(1) + "K"; return String(n); }
function engColor(rate) { if (rate >= 5) return "text-emerald-400"; if (rate >= 2) return "text-amber-400"; return "text-red-400"; }
function autoTier(ig, fb, yt) { const total = (ig || 0) + (fb || 0) + (yt || 0); if (total >= 1000000) return "mega"; if (total >= 100000) return "macro"; if (total >= 10000) return "micro"; return "nano"; }

const EMPTY_FORM = { full_name: "", photo_url: "", categories: [], tier: "nano", niche_tags: [], ig_handle: "", ig_followers: "", ig_engagement: "", fb_page: "", fb_followers: "", fb_engagement: "", yt_channel: "", yt_subscribers: "", yt_engagement: "", email: "", phone: "", city: "", state: "", country: "", manager_name: "", manager_email: "", manager_phone: "", agency_name: "", agency_email: "", agency_phone: "", collab_status: "prospect", campaign: "", rate_per_post: "", currency: "INR", notes: "", favorite: false };

export default function Influencers() {
  const [user, setUser] = useState(null);
  const [influencers, setInfluencers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("card");
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [catFilter, setCatFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState("add");
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [selectedCats, setSelectedCats] = useState([]);
  const [tagInput, setTagInput] = useState("");

  useEffect(() => { supabase.auth.getUser().then(({ data }) => { if (data.user) setUser(data.user); }); }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("influencers").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (data) setInfluencers(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  function openAdd() {
    setDrawerMode("add"); setEditId(null); setForm(EMPTY_FORM); setSelectedCats([]); setDrawerOpen(true); setError("");
  }

  function openEdit(inf) {
    setDrawerMode("edit"); setEditId(inf.id);
    setForm({ ...EMPTY_FORM, ...inf, ig_followers: inf.ig_followers || "", ig_engagement: inf.ig_engagement || "", fb_followers: inf.fb_followers || "", fb_engagement: inf.fb_engagement || "", yt_subscribers: inf.yt_subscribers || "", yt_engagement: inf.yt_engagement || "", rate_per_post: inf.rate_per_post || "" });
    setSelectedCats(inf.categories || []);
    setDrawerOpen(true); setError("");
  }

  async function handleSave() {
    if (!form.full_name.trim() || !user) return;
    setSaving(true); setError("");

    const ig = Number(form.ig_followers) || 0;
    const fb = Number(form.fb_followers) || 0;
    const yt = Number(form.yt_subscribers) || 0;

    const payload = {
      full_name: form.full_name.trim(), photo_url: form.photo_url.trim(),
      categories: selectedCats, tier: autoTier(ig, fb, yt), niche_tags: form.niche_tags || [],
      ig_handle: form.ig_handle.trim(), ig_followers: ig, ig_engagement: Number(form.ig_engagement) || 0,
      fb_page: form.fb_page.trim(), fb_followers: fb, fb_engagement: Number(form.fb_engagement) || 0,
      yt_channel: form.yt_channel.trim(), yt_subscribers: yt, yt_engagement: Number(form.yt_engagement) || 0,
      email: form.email.trim(), phone: form.phone.trim(),
      city: form.city.trim(), state: form.state.trim(), country: form.country.trim(),
      manager_name: form.manager_name.trim(), manager_email: form.manager_email.trim(), manager_phone: form.manager_phone.trim(),
      agency_name: form.agency_name.trim(), agency_email: form.agency_email.trim(), agency_phone: form.agency_phone.trim(),
      collab_status: form.collab_status, campaign: form.campaign.trim(),
      rate_per_post: Number(form.rate_per_post) || 0, currency: form.currency,
      notes: form.notes.trim(), favorite: form.favorite,
      updated_at: new Date().toISOString(),
    };

    if (drawerMode === "add") {
      const { error: e } = await supabase.from("influencers").insert({ ...payload, user_id: user.id });
      if (e) setError(e.message);
    } else {
      const { error: e } = await supabase.from("influencers").update(payload).eq("id", editId);
      if (e) setError(e.message);
    }
    setSaving(false);
    if (!error) { setDrawerOpen(false); load(); }
  }

  async function handleDelete(id) { if (!confirm("Delete this influencer?")) return; await supabase.from("influencers").delete().eq("id", id); load(); }
  async function toggleFav(inf) { await supabase.from("influencers").update({ favorite: !inf.favorite }).eq("id", inf.id); load(); }
  async function toggleOutreach(inf, field) {
    const now = new Date().toISOString();
    const update = { [field]: !inf[field], [`${field}_date`]: !inf[field] ? now : null, last_contacted_at: now, updated_at: now };
    await supabase.from("influencers").update(update).eq("id", inf.id); load();
  }

  function exportCSV() {
    const headers = ["Name", "Tier", "Categories", "IG Handle", "IG Followers", "IG Engagement", "FB Page", "FB Followers", "YT Channel", "YT Subscribers", "Email", "Phone", "Status", "Campaign", "Rate", "Notes"];
    const rows = influencers.map((i) => [i.full_name, i.tier, (i.categories || []).join("; "), i.ig_handle, i.ig_followers, i.ig_engagement, i.fb_page, i.fb_followers, i.yt_channel, i.yt_subscribers, i.email, i.phone, i.collab_status, i.campaign, i.rate_per_post, i.notes]);
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `influencers-${new Date().toISOString().split("T")[0]}.csv`; a.click();
  }

  const filtered = influencers.filter((i) => {
    if (search) { const s = search.toLowerCase(); if (!i.full_name.toLowerCase().includes(s) && !i.ig_handle?.toLowerCase().includes(s) && !i.email?.toLowerCase().includes(s) && !i.campaign?.toLowerCase().includes(s) && !i.city?.toLowerCase().includes(s)) return false; }
    if (tierFilter !== "all" && i.tier !== tierFilter) return false;
    if (statusFilter !== "all" && i.collab_status !== statusFilter) return false;
    if (catFilter !== "all" && !(i.categories || []).includes(catFilter)) return false;
    if (locationFilter !== "all" && i.city !== locationFilter) return false;
    return true;
  });

  const favCount = influencers.filter((i) => i.favorite).length;
  const totalReach = influencers.reduce((s, i) => s + (i.total_reach || 0), 0);

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UsersIcon size={24} className="text-pink-400" />
            Influencer CRM
          </h1>
          <p className="text-muted-foreground mt-1">{influencers.length} influencers · {fmtNum(totalReach)} total reach</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="rounded-md border border-border p-2 hover:bg-muted/50" title="Export CSV"><DownloadIcon size={14} /></button>
          <button onClick={openAdd} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2"><PlusIcon size={16} /> Add Influencer</button>
        </div>
      </div>


      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by name, handle, email, or campaign..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        <select value={tierFilter} onChange={(e) => setTierFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-xs outline-none">
          <option value="all">All Tiers</option>
          {Object.entries(TIERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-xs outline-none">
          <option value="all">All Status</option>
          {Object.keys(STATUSES).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-xs outline-none">
          <option value="all">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-xs outline-none">
          <option value="all">All Locations</option>
          {[...new Set(influencers.map((i) => i.city).filter(Boolean))].sort().map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setView("card")} className={`p-2 transition-colors ${view === "card" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}><LayoutGridIcon size={16} /></button>
          <button onClick={() => setView("list")} className={`p-2 transition-colors ${view === "list" ? "bg-primary/20 text-primary" : "text-muted-foreground"}`}><ListIcon size={16} /></button>
        </div>
      </div>

      {/* Card View */}
      {view === "card" && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground gap-2"><UsersIcon size={28} /><p className="text-sm">No influencers found.</p></div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((inf) => (
              <div key={inf.id} className="rounded-xl border border-border bg-card p-5 flex flex-col">
                <div className="flex items-start gap-3 mb-3">
                  {inf.photo_url ? (
                    <img src={inf.photo_url} alt={inf.full_name} className="w-12 h-12 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold shrink-0">{inf.full_name.charAt(0)}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">{inf.full_name}</p>
                      <button onClick={() => toggleFav(inf)} className={`shrink-0 ${inf.favorite ? "text-pink-400" : "text-muted-foreground hover:text-pink-400"}`}><HeartIcon size={14} fill={inf.favorite ? "currentColor" : "none"} /></button>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TIERS[inf.tier]?.color || TIERS.nano.color}`}>{TIERS[inf.tier]?.label || "Nano"}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUSES[inf.collab_status] || STATUSES.prospect}`}>{inf.collab_status}</span>
                      {(inf.categories || []).slice(0, 2).map((c) => <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground">{c}</span>)}
                    </div>
                    {(inf.city || inf.country) && (
                      <p className="text-[10px] text-muted-foreground mt-1 truncate">{[inf.city, inf.state, inf.country].filter(Boolean).join(", ")}</p>
                    )}
                  </div>
                </div>

                {/* Platform stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {inf.ig_followers > 0 && (
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <InstagramIcon size={12} className="mx-auto text-pink-400 mb-1" />
                      <p className="text-xs font-semibold">{fmtNum(inf.ig_followers)}</p>
                      <p className={`text-[10px] ${engColor(inf.ig_engagement)}`}>{inf.ig_engagement}%</p>
                    </div>
                  )}
                  {inf.fb_followers > 0 && (
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <FacebookIcon size={12} className="mx-auto text-blue-400 mb-1" />
                      <p className="text-xs font-semibold">{fmtNum(inf.fb_followers)}</p>
                      <p className={`text-[10px] ${engColor(inf.fb_engagement)}`}>{inf.fb_engagement}%</p>
                    </div>
                  )}
                  {inf.yt_subscribers > 0 && (
                    <div className="rounded-lg bg-muted/30 p-2 text-center">
                      <YoutubeIcon size={12} className="mx-auto text-red-400 mb-1" />
                      <p className="text-xs font-semibold">{fmtNum(inf.yt_subscribers)}</p>
                      <p className={`text-[10px] ${engColor(inf.yt_engagement)}`}>{inf.yt_engagement}%</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 mt-auto pt-3 border-t border-border/50">
                  <button onClick={() => openEdit(inf)} className="p-1.5 text-muted-foreground hover:text-foreground rounded hover:bg-accent" title="Edit"><PencilIcon size={12} /></button>
                  <button onClick={() => toggleOutreach(inf, "message_sent")} className={`p-1.5 rounded hover:bg-accent ${inf.message_sent ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"}`} title="Message"><MessageSquareIcon size={12} /></button>
                  <button onClick={() => toggleOutreach(inf, "email_sent")} className={`p-1.5 rounded hover:bg-accent ${inf.email_sent ? "text-emerald-400" : "text-muted-foreground hover:text-foreground"}`} title="Email"><MailIcon size={12} /></button>
                  {inf.email && <a href={`mailto:${inf.email}`} className="p-1.5 text-muted-foreground hover:text-primary rounded hover:bg-accent ml-auto" title="Send email"><SendIcon size={12} /></a>}
                  <button onClick={() => handleDelete(inf.id)} className="p-1.5 text-muted-foreground hover:text-red-500 rounded hover:bg-red-500/10" title="Delete"><TrashIcon size={12} /></button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* List View */}
      {view === "list" && (
        <div className="rounded-xl border border-border bg-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">Name</th>
                <th className="text-left px-3 py-2.5 font-medium">Tier</th>
                <th className="text-right px-3 py-2.5 font-medium">IG</th>
                <th className="text-right px-3 py-2.5 font-medium">FB</th>
                <th className="text-right px-3 py-2.5 font-medium">YT</th>
                <th className="text-right px-3 py-2.5 font-medium">Reach</th>
                <th className="text-left px-3 py-2.5 font-medium">Status</th>
                <th className="text-center px-3 py-2.5 font-medium">Outreach</th>
                <th className="text-right px-3 py-2.5 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inf) => (
                <tr key={inf.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleFav(inf)} className={`shrink-0 ${inf.favorite ? "text-pink-400" : "text-muted-foreground/30 hover:text-pink-400"}`}><HeartIcon size={12} fill={inf.favorite ? "currentColor" : "none"} /></button>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{inf.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{inf.ig_handle || inf.email || ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TIERS[inf.tier]?.color}`}>{TIERS[inf.tier]?.label}</span></td>
                  <td className="px-3 py-3 text-right text-xs">{inf.ig_followers > 0 ? fmtNum(inf.ig_followers) : "—"}</td>
                  <td className="px-3 py-3 text-right text-xs">{inf.fb_followers > 0 ? fmtNum(inf.fb_followers) : "—"}</td>
                  <td className="px-3 py-3 text-right text-xs">{inf.yt_subscribers > 0 ? fmtNum(inf.yt_subscribers) : "—"}</td>
                  <td className="px-3 py-3 text-right text-xs font-medium">{fmtNum(inf.total_reach || 0)}</td>
                  <td className="px-3 py-3"><span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${STATUSES[inf.collab_status]}`}>{inf.collab_status}</span></td>
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${inf.message_sent ? "bg-emerald-400" : "bg-zinc-600"}`} title={inf.message_sent ? "Messaged" : "Not messaged"} />
                      <span className={`w-2 h-2 rounded-full ${inf.email_sent ? "bg-emerald-400" : "bg-zinc-600"}`} title={inf.email_sent ? "Emailed" : "Not emailed"} />
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => openEdit(inf)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><PencilIcon size={12} /></button>
                      <button onClick={() => handleDelete(inf.id)} className="p-1 text-muted-foreground hover:text-red-500 rounded hover:bg-red-500/10"><TrashIcon size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div className="text-center py-8 text-sm text-muted-foreground">No influencers found.</div>}
        </div>
      )}

      {/* Add/Edit Drawer */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <h2 className="text-lg font-semibold">{drawerMode === "add" ? "Add Influencer" : "Edit Influencer"}</h2>
              <button onClick={() => setDrawerOpen(false)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-md px-3 py-2">{error}</div>}

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Identity</h3>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full Name *" autoFocus className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <input type="text" value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="Photo URL" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              <div>
                <p className="text-xs text-muted-foreground mb-1">Categories</p>
                <div className="flex flex-wrap gap-1">
                  {CATEGORIES.map((c) => (
                    <button key={c} onClick={() => setSelectedCats((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])} className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${selectedCats.includes(c) ? "bg-primary/20 text-primary border-primary/30" : "text-muted-foreground border-border hover:border-primary/30"}`}>{c}</button>
                  ))}
                </div>
              </div>

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Instagram</h3>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={form.ig_handle} onChange={(e) => setForm({ ...form, ig_handle: e.target.value })} placeholder="@handle" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="number" value={form.ig_followers} onChange={(e) => setForm({ ...form, ig_followers: e.target.value })} placeholder="Followers" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="number" value={form.ig_engagement} onChange={(e) => setForm({ ...form, ig_engagement: e.target.value })} placeholder="Eng. %" step="0.1" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Facebook</h3>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={form.fb_page} onChange={(e) => setForm({ ...form, fb_page: e.target.value })} placeholder="Page / Link" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="number" value={form.fb_followers} onChange={(e) => setForm({ ...form, fb_followers: e.target.value })} placeholder="Followers" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="number" value={form.fb_engagement} onChange={(e) => setForm({ ...form, fb_engagement: e.target.value })} placeholder="Eng. %" step="0.1" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">YouTube</h3>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={form.yt_channel} onChange={(e) => setForm({ ...form, yt_channel: e.target.value })} placeholder="Channel / Link" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="number" value={form.yt_subscribers} onChange={(e) => setForm({ ...form, yt_subscribers: e.target.value })} placeholder="Subscribers" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="number" value={form.yt_engagement} onChange={(e) => setForm({ ...form, yt_engagement: e.target.value })} placeholder="Eng. %" step="0.1" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Influencer Contact</h3>
              <div className="grid grid-cols-2 gap-2">
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Location</h3>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="State" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Country" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Manager</h3>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={form.manager_name} onChange={(e) => setForm({ ...form, manager_name: e.target.value })} placeholder="Name" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="email" value={form.manager_email} onChange={(e) => setForm({ ...form, manager_email: e.target.value })} placeholder="Email" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="tel" value={form.manager_phone} onChange={(e) => setForm({ ...form, manager_phone: e.target.value })} placeholder="Phone" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Agency</h3>
              <div className="grid grid-cols-3 gap-2">
                <input type="text" value={form.agency_name} onChange={(e) => setForm({ ...form, agency_name: e.target.value })} placeholder="Agency Name" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="email" value={form.agency_email} onChange={(e) => setForm({ ...form, agency_email: e.target.value })} placeholder="Email" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="tel" value={form.agency_phone} onChange={(e) => setForm({ ...form, agency_phone: e.target.value })} placeholder="Phone" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              </div>

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Pipeline</h3>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.collab_status} onChange={(e) => setForm({ ...form, collab_status: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  {Object.keys(STATUSES).map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="text" value={form.campaign} onChange={(e) => setForm({ ...form, campaign: e.target.value })} placeholder="Campaign name" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="number" value={form.rate_per_post} onChange={(e) => setForm({ ...form, rate_per_post: e.target.value })} placeholder="Rate per post" className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="rounded-md border border-border bg-background px-3 py-2 text-sm">
                  <option value="INR">INR</option><option value="USD">USD</option><option value="EUR">EUR</option>
                </select>
              </div>

              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-2">Notes</h3>
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Internal notes..." rows={3} className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40" />

              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.favorite} onChange={(e) => setForm({ ...form, favorite: e.target.checked })} className="rounded border-border" />
                <span className="text-sm">Add to shortlist</span>
              </label>
            </div>
            <div className="p-5 border-t border-border flex gap-2">
              <button onClick={handleSave} disabled={!form.full_name.trim() || saving} className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? "Saving..." : drawerMode === "add" ? "Add Influencer" : "Save Changes"}
              </button>
              <button onClick={() => setDrawerOpen(false)} className="rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent">Cancel</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
