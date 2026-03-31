"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";
import {
  SearchIcon,
  GlobeIcon,
  BarChart3Icon,
  LinkIcon,
  GaugeIcon,
  SparklesIcon,
  ArrowRightIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XIcon,
  ExternalLinkIcon,
  FolderIcon,
  KeyboardIcon,
} from "lucide-react";

const QUICK_ACTIONS = [
  { label: "SEO Analyze",   Icon: GlobeIcon,      href: "/seo" },
  { label: "Analytics",     Icon: BarChart3Icon,   href: "/ga" },
  { label: "Keywords",      Icon: SearchIcon,      href: "/keyword-tracker" },
  { label: "Backlinks",     Icon: LinkIcon,        href: "/backlinks" },
  { label: "Speed Test",    Icon: GaugeIcon,       href: "/speed-monitor" },
];

export default function Dashboard() {
  const router = useRouter();
  const { activeTeam } = useTeam();
  const { activeProject, refreshProjects } = useProject();
  const [user, setUser] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  // Projects
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [projectError, setProjectError] = useState("");

  // Focus search on "/"
  useEffect(() => {
    function onKey(e) {
      if (
        e.key === "/" &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser(data.user);

      let query = supabase
        .from("seo_analyses")
        .select("id, url, score, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

      if (activeTeam) {
        query = query.eq("team_id", activeTeam.id);
      } else {
        query = query.eq("user_id", data.user.id).is("team_id", null);
      }

      query.then(({ data: analyses }) => {
        if (analyses) setRecentAnalyses(analyses);
      });
    });
  }, [activeTeam, activeProject]);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    setProjectsLoading(true);

    let query = supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (activeTeam) {
      query = query.eq("team_id", activeTeam.id);
    } else {
      query = query.eq("user_id", user.id).is("team_id", null);
    }

    const { data } = await query;
    if (data) setProjects(data);
    setProjectsLoading(false);
  }, [user, activeTeam]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function handleAddProject(e) {
    e.preventDefault();
    if (!newName.trim() || !newDomain.trim() || !user) return;
    setAdding(true);
    setProjectError("");

    let domain = newDomain.trim();
    if (!domain.startsWith("http")) domain = "https://" + domain;

    const { error: insertErr } = await supabase.from("projects").insert({
      user_id: user.id,
      team_id: activeTeam?.id || null,
      name: newName.trim(),
      domain,
      description: newDesc.trim(),
    });

    if (insertErr) {
      setProjectError(
        insertErr.message.includes("duplicate") || insertErr.message.includes("unique")
          ? "A project with this domain already exists."
          : insertErr.message
      );
    } else {
      setNewName(""); setNewDomain(""); setNewDesc("");
      setShowAdd(false);
      loadProjects();
      refreshProjects();
    }
    setAdding(false);
  }

  async function handleUpdateProject(id) {
    if (!editName.trim() || !editDomain.trim()) return;
    setProjectError("");

    let domain = editDomain.trim();
    if (!domain.startsWith("http")) domain = "https://" + domain;

    const { error: updateErr } = await supabase
      .from("projects")
      .update({ name: editName.trim(), domain, description: editDesc.trim(), updated_at: new Date().toISOString() })
      .eq("id", id);

    if (updateErr) {
      setProjectError(updateErr.message);
    } else {
      setEditingId(null);
      loadProjects();
      refreshProjects();
    }
  }

  async function handleDeleteProject(id) {
    if (!confirm("Delete this project?")) return;
    const { error: delErr } = await supabase.from("projects").delete().eq("id", id);
    if (delErr) setProjectError(delErr.message);
    else { loadProjects(); refreshProjects(); }
  }

  function startEdit(project) {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDomain(project.domain);
    setEditDesc(project.description || "");
  }

  function getScoreColor(score) {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/seo?url=${encodeURIComponent(search.trim())}`);
  }

  const userName = user?.email
    ?.split("@")[0]
    ?.replace(/[._-]+/g, " ")
    ?.replace(/\b\w/g, (c) => c.toUpperCase()) || "there";

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">

      {/* Hero */}
      <div className="flex flex-col items-center justify-center py-10 gap-7">
        {/* Greeting */}
        <div className="flex items-center gap-3">
          <SparklesIcon size={30} className="text-orange-400" />
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            Hello, {userName}
          </h1>
        </div>

        {/* Search box */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl">
          <div className="rounded-2xl border border-border/60 bg-card px-5 pt-5 pb-4 shadow-md">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter a URL to analyze, or search tools…"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="h-8 w-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <PlusIcon size={15} />
              </button>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground border border-border/50 rounded px-1.5 py-0.5 font-mono">
                  <KeyboardIcon size={10} /> /
                </span>
                {search.trim() && (
                  <button
                    type="submit"
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Analyze
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Quick actions */}
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_ACTIONS.map(({ label, Icon, href }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-card text-sm text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted transition-colors"
            >
              <Icon size={13} />
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* Projects */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <FolderIcon size={16} className="text-muted-foreground" />
            Projects
          </h3>
          {!showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-md hover:bg-primary/90 flex items-center gap-1"
            >
              <PlusIcon size={12} /> New Project
            </button>
          )}
        </div>

        {projectError && (
          <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400 mb-3">{projectError}</div>
        )}

        {showAdd && (
          <form onSubmit={handleAddProject} className="rounded-lg border border-border bg-muted/20 p-4 space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text" placeholder="Project name" value={newName}
                onChange={(e) => setNewName(e.target.value)} required autoFocus
                className="rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <input
                type="text" placeholder="Domain (e.g. example.com)" value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)} required
                className="rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <input
              type="text" placeholder="Description (optional)" value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={adding} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {adding ? "Creating..." : "Create"}
              </button>
              <button type="button" onClick={() => setShowAdd(false)} className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent">
                Cancel
              </button>
            </div>
          </form>
        )}

        {projectsLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">Loading...</div>
        ) : projects.length === 0 && !showAdd ? (
          <div className="flex flex-col items-center py-8 text-muted-foreground gap-2">
            <FolderIcon size={28} />
            <p className="text-sm">No projects yet. Create one to organize your SEO work.</p>
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div key={project.id} className="rounded-lg border border-border/50 p-4 flex flex-col">
                {editingId === project.id ? (
                  <div className="space-y-2">
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    <input type="text" value={editDomain} onChange={(e) => setEditDomain(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    <input type="text" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateProject(project.id)} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"><CheckIcon className="h-4 w-4" /></button>
                      <button onClick={() => setEditingId(null)} className="rounded-md border border-border px-3 py-1.5 text-sm"><XIcon className="h-4 w-4" /></button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <GlobeIcon className="h-4 w-4" />
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(project)} className="rounded p-1 hover:bg-accent text-muted-foreground"><PencilIcon className="h-3 w-3" /></button>
                        <button onClick={() => handleDeleteProject(project.id)} className="rounded p-1 hover:bg-red-500/10 text-muted-foreground hover:text-red-500"><TrashIcon className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <h4 className="text-sm font-semibold mb-0.5">{project.name}</h4>
                    <a href={project.domain} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mb-1">
                      {project.domain.replace(/^https?:\/\//, "")}
                      <ExternalLinkIcon className="h-3 w-3" />
                    </a>
                    {project.description && <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>}
                    <p className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/50">
                      Created by {project.user_id === user?.id ? "you" : project.user_id.slice(0, 8) + "..."} · {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Analyses */}
      {recentAnalyses.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Recent Analyses</h3>
            <Link href="/seo" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              View all <ArrowRightIcon size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentAnalyses.map((item) => (
              <Link
                key={item.id}
                href="/seo"
                className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5 hover:bg-muted/30 transition-colors"
              >
                <span className="text-sm truncate flex-1 mr-4">{item.url}</span>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-sm font-semibold font-mono ${getScoreColor(item.score)}`}>{item.score}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
