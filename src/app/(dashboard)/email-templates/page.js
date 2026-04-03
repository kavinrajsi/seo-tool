"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  MailIcon, PlusIcon, PencilIcon, Trash2Icon, XIcon, CheckIcon, ArrowRightIcon,
} from "lucide-react";


export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [fFrom, setFFrom] = useState("");
  const [fTo, setFTo] = useState("");
  const [fSubject, setFSubject] = useState("");
  const [fBody, setFBody] = useState("");
  const [fActive, setFActive] = useState(true);
  const [statuses, setStatuses] = useState([]);
  const [statusColorMap, setStatusColorMap] = useState({});

  useEffect(() => {
    load(); checkAccess();
    supabase.from("candidate_statuses").select("*").order("position").then(({ data }) => {
      if (data) {
        setStatuses(data.map((s) => s.name));
        const map = {};
        data.forEach((s) => { map[s.name] = s.color; });
        setStatusColorMap(map);
      }
    });
  }, []);

  async function checkAccess() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: emp } = await supabase
      .from("employees").select("role, designation").eq("work_email", user.email).maybeSingle();
    if (emp && (emp.role === "admin" || emp.role === "owner" || emp.designation?.toLowerCase().includes("hr"))) {
      setCanManage(true);
    }
  }

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("candidate_email_templates").select("*").order("from_status").order("to_status");
    if (data) setTemplates(data);
    setLoading(false);
  }

  function openAdd() {
    setEditId(null);
    setFFrom(""); setFTo(""); setFSubject(""); setFBody(""); setFActive(true);
    setError("");
    setShowForm(true);
  }

  function openEdit(t) {
    setEditId(t.id);
    setFFrom(t.from_status); setFTo(t.to_status); setFSubject(t.subject); setFBody(t.body); setFActive(t.is_active);
    setError("");
    setShowForm(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!fFrom || !fTo || !fSubject.trim() || !fBody.trim()) return;
    if (fFrom === fTo) { setError("From and To status must be different."); return; }
    setSaving(true);
    setError("");

    const row = { from_status: fFrom, to_status: fTo, subject: fSubject.trim(), body: fBody.trim(), is_active: fActive };

    if (editId) {
      const { error: e } = await supabase.from("candidate_email_templates").update(row).eq("id", editId);
      if (e) setError(e.message);
    } else {
      const { error: e } = await supabase.from("candidate_email_templates").insert(row);
      if (e) {
        setError(e.message.includes("candidate_email_templates_from_status_to_status_key") ? "A template for this transition already exists." : e.message);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function handleDelete(id) {
    if (!confirm("Delete this template?")) return;
    await supabase.from("candidate_email_templates").delete().eq("id", id);
    load();
  }

  async function toggleActive(id, current) {
    await supabase.from("candidate_email_templates").update({ is_active: !current }).eq("id", id);
    load();
  }

  if (loading) return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;

  if (!canManage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 gap-3">
        <MailIcon size={32} className="text-red-400" />
        <p className="text-sm text-muted-foreground">Only admin, owner, and HR can manage email templates.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <MailIcon size={24} className="text-indigo-400" /> Email Templates
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Auto-send emails when candidates move between stages. Use <code className="text-xs bg-muted px-1 py-0.5 rounded">{"{{name}}"}</code> as placeholder.
          </p>
        </div>
        <button onClick={openAdd} className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 rounded-lg transition-colors font-medium">
          <PlusIcon size={13} /> Add Template
        </button>
      </div>

      {/* Templates list */}
      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <MailIcon size={28} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">No email templates yet. Create one to auto-notify candidates on stage changes.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {templates.map((t, i) => (
            <div key={t.id} className={`px-4 py-4 hover:bg-muted/20 transition-colors ${i < templates.length - 1 ? "border-b border-border/50" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium" style={{ color: statusColorMap[t.from_status] || "#888" }}>{t.from_status}</span>
                  <ArrowRightIcon size={12} className="text-muted-foreground" />
                  <span className="text-xs font-medium" style={{ color: statusColorMap[t.to_status] || "#888" }}>{t.to_status}</span>
                  {!t.is_active && <span className="text-[9px] bg-zinc-500/20 text-zinc-400 px-1.5 py-0.5 rounded">Disabled</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => toggleActive(t.id, t.is_active)} className={`p-1.5 rounded transition-colors ${t.is_active ? "text-green-400 hover:bg-green-500/10" : "text-muted-foreground hover:bg-muted/30"}`} title={t.is_active ? "Disable" : "Enable"}>
                    <CheckIcon size={14} />
                  </button>
                  <button onClick={() => openEdit(t)} className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded transition-colors"><PencilIcon size={14} /></button>
                  <button onClick={() => handleDelete(t.id)} className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"><Trash2Icon size={14} /></button>
                </div>
              </div>
              <p className="text-sm font-medium mb-1">{t.subject}</p>
              <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">{t.body}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit drawer */}
      {showForm && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowForm(false)} />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-card border-l border-border z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold">{editId ? "Edit Template" : "New Template"}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"><XIcon size={16} /></button>
            </div>
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
              {error && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">When moving from *</label>
                  <select value={fFrom} onChange={(e) => setFFrom(e.target.value)} required
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60">
                    <option value="">Select status...</option>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-muted-foreground">To *</label>
                  <select value={fTo} onChange={(e) => setFTo(e.target.value)} required
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60">
                    <option value="">Select status...</option>
                    {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email Subject *</label>
                <input type="text" value={fSubject} onChange={(e) => setFSubject(e.target.value)} required
                  placeholder="e.g. Your application update — Madarth"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60" />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Email Body *</label>
                <textarea value={fBody} onChange={(e) => setFBody(e.target.value)} required rows={8}
                  placeholder={"Hi {{name}},\n\nWe are pleased to inform you that...\n\nBest regards,\nMadarth HR Team"}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/60 resize-none font-mono" />
                <p className="text-[10px] text-muted-foreground">Use <code className="bg-muted px-1 rounded">{"{{name}}"}</code> to insert the candidate's name.</p>
              </div>

              <div className="flex items-center gap-2">
                <input type="checkbox" id="active" checked={fActive} onChange={(e) => setFActive(e.target.checked)} className="rounded" />
                <label htmlFor="active" className="text-xs text-muted-foreground">Active — prompt to send email on this transition</label>
              </div>

              <div className="mt-auto pt-4">
                <button type="submit" disabled={saving || !fFrom || !fTo || !fSubject.trim() || !fBody.trim()}
                  className="w-full flex items-center justify-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-2.5 rounded-lg font-medium">
                  {saving ? "Saving..." : editId ? "Save Changes" : "Create Template"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
