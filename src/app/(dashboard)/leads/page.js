"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  InboxIcon, SearchIcon, PlusIcon, XIcon, DownloadIcon,
  MailIcon, PhoneIcon, BuildingIcon, MessageSquareIcon,
  ListIcon, KanbanIcon, ChevronUpIcon, ChevronDownIcon,
  ArrowUpDownIcon, LoaderIcon, CalendarIcon, GlobeIcon,
  StickyNoteIcon, CheckCircle2Icon, CircleIcon,
} from "lucide-react";

const STATUSES = [
  { name: "New",        color: "#3b82f6", desc: "Fresh inquiries awaiting review" },
  { name: "Contacted",  color: "#8b5cf6", desc: "We have reached out to them" },
  { name: "Follow-up",  color: "#f59e0b", desc: "Needs additional follow-up" },
  { name: "Win",        color: "#10b981", desc: "Converted successfully" },
  { name: "Closed",     color: "#6b7280", desc: "Conversation closed" },
  { name: "Rejected",   color: "#ef4444", desc: "Not a fit at this time" },
];

const STATUS_MAP = Object.fromEntries(STATUSES.map(s => [s.name, s.color]));

function Badge({ status }) {
  const color = STATUS_MAP[status] || "#888";
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
      style={{ background: `${color}20`, color, borderColor: `${color}40` }}>
      {status}
    </span>
  );
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ContactsPage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState("kanban");
  const [sortCol, setSortCol] = useState("created_at");
  const [sortDir, setSortDir] = useState("desc");

  // Detail drawer
  const [selected, setSelected] = useState(null);
  const [editNotes, setEditNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  // New submission drawer
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", company: "", subject: "", message: "", source: "manual", status: "New" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("contact_submissions").select("*").order("created_at", { ascending: false });
    if (data) setSubmissions(data);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    let r = submissions.filter(s => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (s.name || "").toLowerCase().includes(q) ||
          (s.email || "").toLowerCase().includes(q) ||
          (s.company || "").toLowerCase().includes(q) ||
          (s.subject || "").toLowerCase().includes(q);
      }
      return true;
    });
    if (view === "list") {
      r = [...r].sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        const va = a[sortCol] || "";
        const vb = b[sortCol] || "";
        return dir * va.localeCompare(vb);
      });
    }
    return r;
  }, [submissions, search, statusFilter, sortCol, sortDir, view]);

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <ArrowUpDownIcon size={11} className="text-muted-foreground/40 shrink-0" />;
    return sortDir === "asc"
      ? <ChevronUpIcon size={11} className="text-primary shrink-0" />
      : <ChevronDownIcon size={11} className="text-primary shrink-0" />;
  }

  async function updateStatus(id, status) {
    await supabase.from("contact_submissions").update({ status }).eq("id", id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
    if (selected?.id === id) setSelected(s => ({ ...s, status }));
  }

  async function saveNotes(id) {
    setSavingNotes(true);
    await supabase.from("contact_submissions").update({ notes: editNotes }).eq("id", id);
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, notes: editNotes } : s));
    setSelected(s => ({ ...s, notes: editNotes }));
    setSavingNotes(false);
  }

  async function handleCreate() {
    if (!form.name) return;
    setSaving(true);
    const { data } = await supabase.from("contact_submissions").insert(form).select().single();
    if (data) setSubmissions(prev => [data, ...prev]);
    setSaving(false);
    setShowNew(false);
    setForm({ name: "", email: "", phone: "", company: "", subject: "", message: "", source: "manual", status: "New" });
  }

  async function handleDelete(id) {
    await supabase.from("contact_submissions").delete().eq("id", id);
    setSubmissions(prev => prev.filter(s => s.id !== id));
    setSelected(null);
  }

  function exportCSV() {
    const cols = ["name", "email", "phone", "company", "subject", "message", "source", "status", "notes", "created_at"];
    const rows = filtered.map(s => cols.map(c => `"${(s[c] || "").toString().replace(/"/g, '""')}"`).join(","));
    const csv = [cols.join(","), ...rows].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `contact-submissions-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  }

  function openDetail(s) { setSelected(s); setEditNotes(s.notes || ""); }

  const counts = useMemo(() => {
    const m = {};
    STATUSES.forEach(s => { m[s.name] = 0; });
    submissions.forEach(s => { if (m[s.status] !== undefined) m[s.status]++; });
    return m;
  }, [submissions]);

  return (
    <div className="flex flex-1 flex-col gap-5 py-4">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <InboxIcon size={18} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Contact Form Submissions</h1>
            <p className="text-xs text-muted-foreground">{submissions.length} total · {filtered.length} shown</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors">
            <DownloadIcon size={14} /> Export CSV
          </button>
          <button onClick={() => setShowNew(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            <PlusIcon size={14} /> New Submission
          </button>
        </div>
      </div>

      {/* Status pills summary */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setStatusFilter("all")}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${statusFilter === "all" ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}>
          All ({submissions.length})
        </button>
        {STATUSES.map(s => (
          <button key={s.name} onClick={() => setStatusFilter(statusFilter === s.name ? "all" : s.name)}
            className="text-xs px-3 py-1 rounded-full border transition-all"
            style={statusFilter === s.name
              ? { background: s.color, color: "#fff", borderColor: s.color }
              : { borderColor: `${s.color}40`, color: s.color, background: `${s.color}10` }}>
            {s.name} ({counts[s.name]})
          </button>
        ))}
      </div>

      {/* Search + View toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by name, email, company, subject…" value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2 text-sm outline-none focus:border-primary/60 placeholder:text-muted-foreground" />
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[{ v: "kanban", Icon: KanbanIcon }, { v: "list", Icon: ListIcon }].map(({ v, Icon }) => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-2 transition-colors ${view === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon size={15} />
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          <LoaderIcon size={20} className="animate-spin" />
        </div>
      )}

      {/* ── KANBAN ── */}
      {!loading && view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto flex-1 pb-2 w-[calc(100vw-var(--sidebar-width,260px)-3rem)]">
          {STATUSES.map(({ name, color, desc }) => {
            const cards = filtered.filter(s => (s.status || "New") === name);
            return (
              <div key={name} className="shrink-0 w-[280px] flex flex-col">
                <div className="h-1 rounded-full mb-2" style={{ backgroundColor: color }} />
                <div className="flex items-center justify-between px-1 py-1.5 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold">{name}</span>
                    <span className="text-[11px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{cards.length}</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground px-1 mb-2 leading-snug">{desc}</p>
                <div className="flex-1 space-y-2 overflow-y-auto pr-0.5">
                  {cards.length === 0 && (
                    <div className="rounded-xl border border-dashed border-border p-4 text-center text-[11px] text-muted-foreground/50">Empty</div>
                  )}
                  {cards.map(s => (
                    <div key={s.id} onClick={() => openDetail(s)}
                      className="rounded-xl border border-border bg-card p-3.5 cursor-pointer hover:border-foreground/20 hover:shadow-sm transition-all">
                      <p className="text-sm font-semibold truncate">{s.name}</p>
                      {s.company && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{s.company}</p>}
                      {s.subject && <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-snug">{s.subject}</p>}
                      <div className="flex items-center justify-between mt-2.5 gap-2">
                        {s.email && (
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground min-w-0">
                            <MailIcon size={10} className="shrink-0" />
                            <span className="truncate">{s.email}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-muted-foreground/60 shrink-0">{formatDate(s.created_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── LIST ── */}
      {!loading && view === "list" && (
        <div className="rounded-xl border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/30">
              <tr>
                {[
                  { col: "name",       label: "Name" },
                  { col: "email",      label: "Email" },
                  { col: "company",    label: "Company" },
                  { col: "subject",    label: "Subject" },
                  { col: "source",     label: "Source" },
                  { col: "status",     label: "Status" },
                  { col: "created_at", label: "Date" },
                ].map(({ col, label }) => (
                  <th key={col} className="px-4 py-3 text-left">
                    <button onClick={() => handleSort(col)}
                      className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      {label} <SortIcon col={col} />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">No submissions found</td></tr>
              )}
              {filtered.map((s, i) => (
                <tr key={s.id} onClick={() => openDetail(s)}
                  className={`border-b border-border/50 cursor-pointer hover:bg-muted/30 transition-colors ${i % 2 === 0 ? "bg-card" : "bg-background"}`}>
                  <td className="px-4 py-3 font-medium whitespace-nowrap">{s.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs max-w-[160px] truncate">{s.email || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{s.company || "—"}</td>
                  <td className="px-4 py-3 text-xs max-w-[200px] truncate text-muted-foreground">{s.subject || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground capitalize">{s.source || "—"}</td>
                  <td className="px-4 py-3"><Badge status={s.status || "New"} /></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Detail Drawer ── */}
      {selected && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setSelected(null)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <div>
                <h2 className="font-semibold">{selected.name}</h2>
                {selected.company && <p className="text-xs text-muted-foreground">{selected.company}</p>}
              </div>
              <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <XIcon size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
              {/* Contact info */}
              <div className="flex flex-col gap-2">
                {selected.email && (
                  <a href={`mailto:${selected.email}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <MailIcon size={14} className="shrink-0" /> {selected.email}
                  </a>
                )}
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                    <PhoneIcon size={14} className="shrink-0" /> {selected.phone}
                  </a>
                )}
                {selected.source && (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <GlobeIcon size={14} className="shrink-0" /> {selected.source}
                  </span>
                )}
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CalendarIcon size={14} className="shrink-0" /> {formatDate(selected.created_at)}
                </span>
              </div>

              {/* Subject + Message */}
              {selected.subject && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Subject</p>
                  <p className="text-sm">{selected.subject}</p>
                </div>
              )}
              {selected.message && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Message</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{selected.message}</p>
                </div>
              )}

              {/* Status */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(({ name, color }) => (
                    <button key={name} onClick={() => updateStatus(selected.id, name)}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1.5"
                      style={selected.status === name
                        ? { background: color, color: "#fff", borderColor: color }
                        : { borderColor: `${color}40`, color, background: `${color}10` }}>
                      {selected.status === name && <CheckCircle2Icon size={11} />}
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <StickyNoteIcon size={12} /> Notes
                </p>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4}
                  placeholder="Add internal notes…"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none placeholder:text-muted-foreground" />
                <button onClick={() => saveNotes(selected.id)} disabled={savingNotes}
                  className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/70 text-sm transition-colors disabled:opacity-50">
                  {savingNotes ? <LoaderIcon size={12} className="animate-spin" /> : <StickyNoteIcon size={12} />}
                  Save Notes
                </button>
              </div>
            </div>

            {/* Delete */}
            <div className="px-5 py-4 border-t border-border shrink-0">
              <button onClick={() => handleDelete(selected.id)}
                className="w-full py-2 rounded-lg border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-colors">
                Delete Submission
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── New Submission Drawer ── */}
      {showNew && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowNew(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-semibold">New Submission</h2>
              <button onClick={() => setShowNew(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <XIcon size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              {[
                { key: "name",    label: "Name",    required: true,  type: "text",  placeholder: "Full name" },
                { key: "email",   label: "Email",   required: false, type: "email", placeholder: "email@example.com" },
                { key: "phone",   label: "Phone",   required: false, type: "text",  placeholder: "+91 98765 43210" },
                { key: "company", label: "Company", required: false, type: "text",  placeholder: "Company name" },
                { key: "subject", label: "Subject", required: false, type: "text",  placeholder: "Inquiry subject" },
                { key: "source",  label: "Source",  required: false, type: "text",  placeholder: "website / referral / manual…" },
              ].map(({ key, label, required, type, placeholder }) => (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    {label} {required && <span className="text-red-400">*</span>}
                  </label>
                  <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary placeholder:text-muted-foreground" />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Message</label>
                <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  placeholder="Message from the contact…" rows={4} resize="none"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none placeholder:text-muted-foreground" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="flex flex-wrap gap-2">
                  {STATUSES.map(({ name, color }) => (
                    <button key={name} type="button" onClick={() => setForm(f => ({ ...f, status: name }))}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-all"
                      style={form.status === name
                        ? { background: color, color: "#fff", borderColor: color }
                        : { borderColor: `${color}40`, color, background: `${color}10` }}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border shrink-0">
              <button onClick={handleCreate} disabled={saving || !form.name}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:pointer-events-none">
                {saving ? <LoaderIcon size={14} className="animate-spin" /> : <PlusIcon size={14} />}
                {saving ? "Creating…" : "Create Submission"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
