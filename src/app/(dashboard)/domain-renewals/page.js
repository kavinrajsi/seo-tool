"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  GlobeIcon, PlusIcon, PencilIcon, Trash2Icon, XIcon,
  SearchIcon, DownloadIcon, AlertTriangleIcon, BellIcon,
  CheckCircleIcon, LoaderIcon, RefreshCwIcon,
} from "lucide-react";

const CURRENCIES = ["INR", "USD"];

function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
}

function autoStatus(dateStr, current) {
  if (current === "renewed") return "renewed";
  const days = daysUntil(dateStr);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "upcoming";
}

function formatCurrency(amount, currency = "INR") {
  if (!amount) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
}

const STATUS_COLORS = {
  upcoming:      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  expiring_soon: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  expired:       "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
  renewed:       "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
};

const STATUS_LABELS = { upcoming: "Upcoming", expiring_soon: "Expiring Soon", expired: "Expired", renewed: "Renewed" };

export default function DomainRenewals() {
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [whoisLoading, setWhoisLoading] = useState(false);
  const [whoisError, setWhoisError] = useState("");
  const [form, setForm] = useState({
    domain_name: "", registrar: "", expiry_date: "",
    cost: "", currency: "INR", notes: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) { setUser(data.user); loadDomains(data.user.id); }
    });
  }, []);

  async function loadDomains(uid) {
    setLoading(true);
    const { data } = await supabase
      .from("domain_renewals")
      .select("*")
      .eq("user_id", uid || user?.id)
      .order("expiry_date");
    if (data) {
      setDomains(data.map(d => ({ ...d, status: autoStatus(d.expiry_date, d.status) })));
    }
    setLoading(false);
  }

  function openAdd() {
    setEditingId(null);
    setForm({ domain_name: "", registrar: "", expiry_date: "", cost: "", currency: "INR", notes: "" });
    setShowForm(true);
  }

  function openEdit(d) {
    setEditingId(d.id);
    setForm({
      domain_name: d.domain_name, registrar: d.registrar || "", expiry_date: d.expiry_date,
      cost: d.cost || "", currency: d.currency || "INR", notes: d.notes || "",
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.domain_name.trim() || !form.expiry_date) return;
    setSaving(true);
    const payload = {
      domain_name: form.domain_name.trim().toLowerCase(),
      registrar: form.registrar.trim() || null,
      expiry_date: form.expiry_date,
      cost: form.cost ? Number(form.cost) : null,
      currency: form.currency,
      notes: form.notes.trim() || null,
      status: "upcoming",
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      await supabase.from("domain_renewals").update(payload).eq("id", editingId);
    } else {
      await supabase.from("domain_renewals").insert({ ...payload, user_id: user.id });
    }
    setSaving(false);
    setShowForm(false);
    loadDomains();
  }

  async function handleDelete(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    await supabase.from("domain_renewals").delete().eq("id", id);
    loadDomains();
  }

  async function toggleRenewed(d) {
    const newStatus = d.status === "renewed" ? "upcoming" : "renewed";
    await supabase.from("domain_renewals").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", d.id);
    loadDomains();
  }

  async function whoisLookup() {
    if (!form.domain_name.trim()) return;
    setWhoisLoading(true);
    setWhoisError("");
    try {
      const res = await fetch(`/api/whois?domain=${encodeURIComponent(form.domain_name.trim())}`);
      const data = await res.json();
      if (data.expiry_date) {
        setForm(f => ({
          ...f,
          expiry_date: data.expiry_date,
          registrar: data.registrar || f.registrar,
        }));
      } else {
        setWhoisError(data.error || "Could not fetch expiry date for this domain.");
      }
    } catch {
      setWhoisError("WHOIS lookup timed out. Enter the expiry date manually.");
    }
    setWhoisLoading(false);
  }

  function exportCSV() {
    const rows = filtered.map(d =>
      [d.domain_name, d.registrar, d.expiry_date, d.cost, d.currency, d.status].join(",")
    );
    const csv = "Domain,Registrar,Expiry Date,Cost,Currency,Status\n" + rows.join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `domain-renewals-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

  const filtered = domains.filter(d => {
    if (search && !d.domain_name.toLowerCase().includes(search.toLowerCase()) && !(d.registrar || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    return true;
  });

  const counts = { upcoming: 0, expiring_soon: 0, expired: 0, renewed: 0 };
  domains.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++; });

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <GlobeIcon size={24} className="text-blue-700 dark:text-blue-400" />
            Domain Renewals
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">{domains.length} domain{domains.length !== 1 ? "s" : ""} tracked</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs border border-border px-3 py-2 rounded-md hover:bg-muted/30 transition-colors">
            <DownloadIcon size={14} /> Export
          </button>
          <button onClick={openAdd} className="flex items-center gap-2 text-xs bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors">
            <PlusIcon size={14} /> Add Domain
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Upcoming",      key: "upcoming",      icon: <GlobeIcon size={16} />,           color: "text-blue-700 dark:text-blue-400" },
          { label: "Expiring Soon", key: "expiring_soon", icon: <BellIcon size={16} />,            color: "text-amber-700 dark:text-amber-400" },
          { label: "Expired",       key: "expired",       icon: <AlertTriangleIcon size={16} />,   color: "text-red-700 dark:text-red-400" },
          { label: "Renewed",       key: "renewed",       icon: <CheckCircleIcon size={16} />,     color: "text-emerald-700 dark:text-emerald-400" },
        ].map(c => (
          <button key={c.key} onClick={() => setStatusFilter(statusFilter === c.key ? "all" : c.key)}
            className={`rounded-xl border p-4 text-center transition-colors ${statusFilter === c.key ? STATUS_COLORS[c.key] + " border" : "border-border bg-card"}`}>
            <p className={`text-2xl font-bold ${statusFilter === c.key ? "" : c.color}`}>{counts[c.key]}</p>
            <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">{c.icon} {c.label}</p>
          </button>
        ))}
      </div>

      {/* Alerts */}
      {counts.expired > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <AlertTriangleIcon size={16} />
          {counts.expired} domain{counts.expired !== 1 ? "s" : ""} expired — renew immediately to avoid losing them.
        </div>
      )}
      {counts.expiring_soon > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <BellIcon size={16} />
          {counts.expiring_soon} domain{counts.expiring_soon !== 1 ? "s" : ""} expiring within 30 days.
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by domain or registrar..."
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60" />
        </div>
      </div>

      {/* Domain list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
          <GlobeIcon size={28} />
          <p className="text-sm">{domains.length === 0 ? "No domains tracked yet. Add your first domain." : "No domains match your filters."}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Domain</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Registrar</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Expiry</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Cost</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d, i) => {
                  const days = daysUntil(d.expiry_date);
                  const dayLabel = days === 0 ? "Today" : days > 0 ? `${days}d left` : `${Math.abs(days)}d overdue`;
                  const dayColor = days < 0 ? "text-red-700 dark:text-red-400" : days <= 30 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground";
                  return (
                    <tr key={d.id} className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${i % 2 === 0 ? "" : "bg-muted/10"}`}>
                      <td className="px-4 py-3">
                        <span className="font-semibold">{d.domain_name}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{d.registrar || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs">{d.expiry_date}</span>
                        <span className={`ml-2 text-[11px] font-medium ${dayColor}`}>{dayLabel}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{formatCurrency(d.cost, d.currency)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${STATUS_COLORS[d.status]}`}>
                          {STATUS_LABELS[d.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => toggleRenewed(d)} title={d.status === "renewed" ? "Mark as active" : "Mark as renewed"}
                            className={`p-1.5 rounded transition-colors ${d.status === "renewed" ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}>
                            <CheckCircleIcon size={14} />
                          </button>
                          <button onClick={() => openEdit(d)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors"><PencilIcon size={14} /></button>
                          <button onClick={() => handleDelete(d.id, d.domain_name)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Drawer */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">{editingId ? "Edit Domain" : "Add Domain"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Domain name + WHOIS */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Domain Name *</label>
                <div className="flex gap-2">
                  <input value={form.domain_name} onChange={e => { setForm(f => ({ ...f, domain_name: e.target.value })); setWhoisError(""); }}
                    placeholder="example.com"
                    className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
                  <button onClick={whoisLookup} disabled={whoisLoading || !form.domain_name.trim()}
                    title="Fetch expiry date via WHOIS"
                    className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-muted/30 disabled:opacity-50 transition-colors">
                    {whoisLoading ? <LoaderIcon size={14} className="animate-spin" /> : <RefreshCwIcon size={14} />}
                    WHOIS
                  </button>
                </div>
                {whoisError && <p className="text-[11px] text-red-700 dark:text-red-400 mt-1.5">{whoisError}</p>}
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Registrar</label>
                <input value={form.registrar} onChange={e => setForm(f => ({ ...f, registrar: e.target.value }))}
                  placeholder="GoDaddy, Namecheap, Cloudflare..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Expiry Date *</label>
                <input type="date" value={form.expiry_date} onChange={e => setForm(f => ({ ...f, expiry_date: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cost</label>
                  <input type="number" value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Currency</label>
                  <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  placeholder="Any notes about this domain..."
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60 resize-none" />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0 flex justify-end gap-3">
              <button onClick={() => setShowForm(false)} className="rounded-lg border border-border px-5 py-2 text-sm font-medium hover:bg-muted/30 transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.domain_name.trim() || !form.expiry_date}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {saving ? "Saving..." : editingId ? "Update" : "Add Domain"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
