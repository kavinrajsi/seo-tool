"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { MegaphoneIcon, PlusIcon, XIcon, LoaderIcon, Trash2Icon } from "lucide-react";

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [saving, setSaving] = useState(false);
  const [aDate, setADate] = useState("");
  const [aTitle, setATitle] = useState("");
  const [aDesc, setADesc] = useState("");

  useEffect(() => { load(); checkAccess(); }, []);

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
    const { data } = await supabase.from("hr_announcements").select("*").order("date", { ascending: false });
    if (data) setAnnouncements(data);
    setLoading(false);
  }

  async function handlePost() {
    if (!aDate || !aTitle) return;
    setSaving(true);
    await supabase.from("hr_announcements").insert({ title: aTitle, description: aDesc || null, date: aDate });
    setSaving(false);
    setShowDrawer(false);
    setADate(""); setATitle(""); setADesc("");
    load();
  }

  async function handleDelete(id) {
    await supabase.from("hr_announcements").delete().eq("id", id);
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  }

  // Group by month
  const grouped = [];
  const seen = {};
  for (const ann of announcements) {
    const d = new Date(ann.date + "T00:00:00");
    const label = d.toLocaleString("default", { month: "long", year: "numeric" });
    if (!seen[label]) { seen[label] = true; grouped.push({ label, items: [] }); }
    grouped[grouped.length - 1].items.push(ann);
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <MegaphoneIcon size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Announcements</h1>
            <p className="text-xs text-muted-foreground">
              {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {canManage && (
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
          >
            <PlusIcon size={14} />
            Post Announcement
          </button>
        )}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
          <LoaderIcon size={20} className="animate-spin" />
        </div>
      ) : announcements.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
          <MegaphoneIcon size={36} className="opacity-20" />
          <p className="text-sm">No announcements yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map(({ label, items }) => (
            <div key={label} className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
              <div className="flex flex-col gap-2">
                {items.map(ann => (
                  <div key={ann.id} className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3">
                    <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <MegaphoneIcon size={14} className="text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 font-medium">
                          {formatDate(ann.date)}
                        </span>
                      </div>
                      <p className="text-sm font-semibold">{ann.title}</p>
                      {ann.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{ann.description}</p>
                      )}
                    </div>
                    {canManage && (
                      <button
                        onClick={() => handleDelete(ann.id)}
                        className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2Icon size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Drawer */}
      {showDrawer && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDrawer(false)} />
          <div className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-semibold">Post Announcement</h2>
              <button onClick={() => setShowDrawer(false)} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                <XIcon size={16} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Date <span className="text-red-400">*</span></label>
                <input
                  type="date"
                  value={aDate}
                  onChange={e => setADate(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Title <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={aTitle}
                  onChange={e => setATitle(e.target.value)}
                  placeholder="Announcement title"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">Description <span className="text-muted-foreground/50">(optional)</span></label>
                <textarea
                  value={aDesc}
                  onChange={e => setADesc(e.target.value)}
                  placeholder="Additional details..."
                  rows={5}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-border">
              <button
                onClick={handlePost}
                disabled={saving || !aDate || !aTitle}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none"
              >
                {saving ? <LoaderIcon size={14} className="animate-spin" /> : <PlusIcon size={14} />}
                {saving ? "Posting..." : "Post Announcement"}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
