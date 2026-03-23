"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  UsersIcon, SearchIcon, MailIcon, PhoneIcon, MapPinIcon,
  FileTextIcon, XIcon, GlobeIcon, StickyNoteIcon,
  LayoutGridIcon, ListIcon, TableIcon, KanbanIcon,
  ChevronDownIcon,
} from "lucide-react";

const SUPABASE_STORAGE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public`;

function resumeUrl(fileUrl) {
  if (!fileUrl) return "";
  if (fileUrl.startsWith("http")) return fileUrl;
  // Strip leading ./ or /
  const clean = fileUrl.replace(/^\.?\//, "");
  // Old format: ./uploads/name.pdf → resumes/resumes/name.pdf (nested folder in bucket)
  if (clean.startsWith("uploads/")) return `${SUPABASE_STORAGE}/resumes/resumes/${clean.replace("uploads/", "")}`;
  // New format: resumes/name.pdf → bucket/resumes + path/resumes/name.pdf
  if (clean.startsWith("resumes/")) return `${SUPABASE_STORAGE}/resumes/${clean}`;
  return `${SUPABASE_STORAGE}/resumes/resumes/${clean}`;
}

const STATUSES = ["New", "Reviewing", "Shortlisted", "Interview", "Offered", "Hired", "Rejected"];

const STATUS_COLORS = {
  New: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Reviewing: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  Shortlisted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Interview: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  Offered: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Hired: "bg-green-500/10 text-green-400 border-green-500/20",
  Rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_DOT = {
  New: "bg-blue-400",
  Reviewing: "bg-amber-400",
  Shortlisted: "bg-purple-400",
  Interview: "bg-cyan-400",
  Offered: "bg-emerald-400",
  Hired: "bg-green-400",
  Rejected: "bg-red-400",
};

export default function Candidates() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [view, setView] = useState("kanban");
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [newNote, setNewNote] = useState("");
  const [collapsedSections, setCollapsedSections] = useState({});

  function toggleSection(status) {
    setCollapsedSections((prev) => ({ ...prev, [status]: !prev[status] }));
  }

  useEffect(() => { loadCandidates(); }, []);

  async function loadCandidates() {
    setLoading(true);
    const { data } = await supabase
      .from("candidates")
      .select("*")
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });
    if (data) setCandidates(data);
    setLoading(false);
  }

  async function updateStatus(id, status) {
    await supabase.from("candidates").update({ status }).eq("id", id);
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
    if (selectedCandidate?.id === id) setSelectedCandidate((prev) => ({ ...prev, status }));
  }

  function parseNotes(notes) {
    if (!notes) return [];
    if (Array.isArray(notes)) return notes;
    if (typeof notes !== "string" || !notes.trim()) return [];
    try {
      const parsed = JSON.parse(notes);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    try {
      // Handle unquoted keys: {id:1,text:hello} → {"id":1,"text":"hello"}
      const fixed = notes
        .replace(/([{,])\s*(\w+)\s*:/g, '$1"$2":')
        .replace(/:([^",\[\]{}]+?)([,}\]])/g, (_, val, end) => {
          const trimmed = val.trim();
          if (trimmed === "true" || trimmed === "false" || trimmed === "null" || /^-?\d+(\.\d+)?$/.test(trimmed)) return `:${trimmed}${end}`;
          return `:"${trimmed}"${end}`;
        });
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
    // Fallback: show as single plain text note
    return [{ id: 1, text: notes, timestamp: null }];
  }

  async function addNote(id) {
    if (!newNote.trim()) return;
    const existing = parseNotes(selectedCandidate.notes);
    const updated = [...existing, { id: Date.now(), text: newNote.trim(), timestamp: new Date().toISOString() }];
    const notesStr = JSON.stringify(updated);
    await supabase.from("candidates").update({ notes: notesStr }).eq("id", id);
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, notes: notesStr } : c)));
    setSelectedCandidate((prev) => ({ ...prev, notes: notesStr }));
    setNewNote("");
  }

  function openCandidate(c) {
    setSelectedCandidate(c);
    setNewNote("");
  }

  const roles = [...new Set(candidates.map((c) => c.job_role).filter(Boolean))];

  const filtered = candidates.filter((c) => {
    if (search) {
      const s = search.toLowerCase();
      if (
        !`${c.first_name} ${c.last_name}`.toLowerCase().includes(s) &&
        !c.email?.toLowerCase().includes(s) &&
        !c.position?.toLowerCase().includes(s) &&
        !c.job_role?.toLowerCase().includes(s)
      ) return false;
    }
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (roleFilter !== "all" && c.job_role !== roleFilter) return false;
    return true;
  });

  const statusCounts = {};
  for (const s of STATUSES) statusCounts[s] = candidates.filter((c) => c.status === s).length;

  if (loading) {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4 h-[calc(100vh-4rem)] overflow-hidden max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <UsersIcon size={24} className="text-emerald-400" />
            Candidates
          </h1>
          <p className="text-muted-foreground mt-1">{candidates.length} candidates</p>
        </div>
        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {[
            { value: "kanban", icon: KanbanIcon, label: "Kanban" },
            { value: "table", icon: TableIcon, label: "Table" },
            { value: "list", icon: ListIcon, label: "List" },
          ].map((v) => (
            <button
              key={v.value}
              onClick={() => setView(v.value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors ${view === v.value ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              <v.icon size={14} />
              <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search & Role filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Search by name, email, position, or role..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40" />
        </div>
        {roles.length > 0 && (
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="rounded-md border border-border bg-card px-3 py-2 text-sm outline-none">
            <option value="all">All Roles</option>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        )}
      </div>

      {/* ═══ KANBAN VIEW ═══ */}
      {view === "kanban" && (
        <div className="flex gap-4 overflow-x-auto flex-1 min-h-0 pb-2 w-[calc(100vw-var(--sidebar-width)-3rem)]">
          {STATUSES.map((status) => {
            const columnCandidates = filtered.filter((c) => (c.status || "New") === status);
            return (
              <div key={status} className="shrink-0 w-[300px] flex flex-col min-h-0">
                {/* Column header */}
                <div className="flex items-center justify-between px-1 py-2 mb-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{status}</span>
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{columnCandidates.length}</span>
                  </div>
                </div>
                {/* Cards - vertical scroll within column */}
                <div className="flex-1 space-y-3 overflow-y-auto min-h-0 pr-1">
                  {columnCandidates.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => openCandidate(c)}
                      className="rounded-xl border border-border bg-card p-4 cursor-pointer hover:border-foreground/20 hover:shadow-sm transition-all"
                    >
                      <p className="text-sm font-semibold">{c.first_name} {c.last_name}</p>
                      {c.position && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.position}</p>}

                      <div className="flex items-center justify-between mt-3">
                        {c.email && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <MailIcon size={10} />
                            <span className="truncate max-w-[140px]">{c.email}</span>
                          </div>
                        )}
                        {c.job_role && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground">{c.job_role}</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          {c.location && (
                            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                              <MapPinIcon size={10} /> {c.location}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {c.file_url && (
                            <a href={resumeUrl(c.file_url)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                              <FileTextIcon size={10} /> Resume
                            </a>
                          )}
                          <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {columnCandidates.length === 0 && (
                    <div className="flex items-center justify-center h-24 text-xs text-muted-foreground rounded-xl border border-dashed border-border/50">
                      No candidates
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══ TABLE VIEW ═══ */}
      {view === "table" && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <UsersIcon size={28} />
            <p className="text-sm">{candidates.length === 0 ? "No candidates yet." : "No matching candidates."}</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[1fr_120px_120px_100px_80px] gap-2 px-4 py-2.5 border-b border-border text-xs text-muted-foreground font-medium">
              <span>Candidate</span>
              <span>Position</span>
              <span>Role</span>
              <span>Status</span>
              <span className="text-right">Applied</span>
            </div>
            {filtered.map((c, i) => (
              <div key={c.id} onClick={() => openCandidate(c)} className={`grid grid-cols-[1fr_120px_120px_100px_80px] gap-2 px-4 py-3 items-center cursor-pointer hover:bg-muted/20 transition-colors ${i < filtered.length - 1 ? "border-b border-border/50" : ""}`}>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.email}</p>
                </div>
                <span className="text-xs text-muted-foreground truncate">{c.position || "—"}</span>
                <span className="text-xs text-muted-foreground truncate">{c.job_role || "—"}</span>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border w-fit ${STATUS_COLORS[c.status] || STATUS_COLORS.New}`}>{c.status || "New"}</span>
                <span className="text-[10px] text-muted-foreground text-right">{new Date(c.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )
      )}

      {/* ═══ LIST VIEW (grouped by status) ═══ */}
      {view === "list" && (
        filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <UsersIcon size={28} />
            <p className="text-sm">{candidates.length === 0 ? "No candidates yet." : "No matching candidates."}</p>
          </div>
        ) : (
          <div className="space-y-6 flex-1 overflow-y-auto min-h-0">
            {STATUSES.map((status) => {
              const group = filtered.filter((c) => (c.status || "New") === status);
              if (group.length === 0 && statusFilter !== "all") return null;
              return (
                <div key={status} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Group header - clickable accordion */}
                  <button
                    onClick={() => toggleSection(status)}
                    className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/20 border-b border-border hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${STATUS_DOT[status]}`} />
                      <span className="text-sm font-semibold">{status}</span>
                      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{group.length}</span>
                    </div>
                    <ChevronDownIcon size={16} className={`text-muted-foreground transition-transform duration-200 ${collapsedSections[status] ? "-rotate-90" : ""}`} />
                  </button>

                  {!collapsedSections[status] && (
                    group.length === 0 ? (
                      <div className="px-4 py-6 text-center text-xs text-muted-foreground">No candidates</div>
                    ) : (
                      <>
                        {/* Column headers */}
                        <div className="grid grid-cols-[1fr_140px_120px_180px_90px_60px] gap-2 px-4 py-2 border-b border-border/50 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                          <span>Name</span>
                          <span>Position</span>
                          <span>Role</span>
                          <span>Email</span>
                          <span>Applied</span>
                          <span className="text-right">Resume</span>
                        </div>

                        {/* Rows */}
                        {group.map((c, i) => (
                          <div
                            key={c.id}
                            onClick={() => openCandidate(c)}
                            className={`grid grid-cols-[1fr_140px_120px_180px_90px_60px] gap-2 px-4 py-2.5 items-center cursor-pointer hover:bg-muted/10 transition-colors ${i < group.length - 1 ? "border-b border-border/30" : ""}`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{c.first_name} {c.last_name}</p>
                              {c.location && <p className="text-[10px] text-muted-foreground truncate">{c.location}</p>}
                            </div>
                            <span className="text-xs text-muted-foreground truncate">{c.position || "—"}</span>
                            <span className="text-xs text-muted-foreground truncate">{c.job_role || "—"}</span>
                            <span className="text-xs text-muted-foreground truncate">{c.email || "—"}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                            <div className="text-right">
                              {c.file_url ? (
                                <a href={resumeUrl(c.file_url)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] text-primary hover:underline">
                                  <FileTextIcon size={12} className="inline" />
                                </a>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">—</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Detail drawer */}
      {selectedCandidate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedCandidate(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-card border-l border-border z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="text-lg font-semibold">{selectedCandidate.first_name} {selectedCandidate.last_name}</h2>
                <p className="text-xs text-muted-foreground">{selectedCandidate.position} · {selectedCandidate.job_role}</p>
              </div>
              <button onClick={() => setSelectedCandidate(null)} className="p-1 text-muted-foreground hover:text-foreground rounded hover:bg-accent"><XIcon size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Status selector */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">Status</p>
                <div className="flex flex-wrap gap-1.5">
                  {STATUSES.map((s) => (
                    <button key={s} onClick={() => updateStatus(selectedCandidate.id, s)} className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-colors ${selectedCandidate.status === s ? STATUS_COLORS[s] : "border-border text-muted-foreground hover:text-foreground"}`}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Contact info */}
              <div className="grid grid-cols-2 gap-3">
                {selectedCandidate.email && (
                  <a href={`mailto:${selectedCandidate.email}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><MailIcon size={10} /> Email</p>
                    <p className="text-sm font-medium truncate">{selectedCandidate.email}</p>
                  </a>
                )}
                {selectedCandidate.mobile_number && (
                  <a href={`tel:${selectedCandidate.mobile_number}`} className="rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><PhoneIcon size={10} /> Phone</p>
                    <p className="text-sm font-medium">{selectedCandidate.mobile_number}</p>
                  </a>
                )}
                {selectedCandidate.location && (
                  <div className="rounded-lg border border-border p-3">
                    <p className="text-[10px] text-muted-foreground mb-1 flex items-center gap-1"><MapPinIcon size={10} /> Location</p>
                    <p className="text-sm font-medium">{selectedCandidate.location}</p>
                  </div>
                )}
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Applied</p>
                  <p className="text-sm font-medium">{new Date(selectedCandidate.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Links */}
              <div className="flex gap-2">
                {selectedCandidate.file_url && (
                  <a href={resumeUrl(selectedCandidate.file_url)} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                    <FileTextIcon size={14} /> Resume
                  </a>
                )}
                {selectedCandidate.portfolio && (
                  <a href={selectedCandidate.portfolio} target="_blank" rel="noopener noreferrer" className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors">
                    <GlobeIcon size={14} /> Portfolio
                  </a>
                )}
              </div>

              {/* Source */}
              {selectedCandidate.source_url && (
                <div className="rounded-lg border border-border p-3">
                  <p className="text-[10px] text-muted-foreground mb-1">Source</p>
                  <a href={selectedCandidate.source_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate block">{selectedCandidate.source_url}</a>
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="text-xs font-medium mb-3 flex items-center gap-1"><StickyNoteIcon size={12} /> Notes</p>

                {/* Existing notes */}
                {parseNotes(selectedCandidate.notes).length > 0 && (
                  <div className="space-y-2 mb-3">
                    {parseNotes(selectedCandidate.notes).map((note) => (
                      <div key={note.id} className="border-l-2 border-primary/30 pl-3 py-1">
                        {note.timestamp && (
                          <p className="text-[10px] text-muted-foreground mb-0.5">
                            {new Date(note.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at {new Date(note.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                          </p>
                        )}
                        <p className="text-sm">{note.text}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new note */}
                <div className="flex gap-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addNote(selectedCandidate.id); } }}
                    rows={2}
                    placeholder="Add notes about this candidate..."
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                  />
                  <button onClick={() => addNote(selectedCandidate.id)} disabled={!newNote.trim()} className="self-end rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-30 transition-colors">
                    Add
                  </button>
                </div>
              </div>

              {selectedCandidate.ip_address && (
                <div className="text-[10px] text-muted-foreground">IP: {selectedCandidate.ip_address}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
