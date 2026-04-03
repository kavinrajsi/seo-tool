"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  FolderIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  GlobeIcon,
  CheckIcon,
  XIcon,
  ExternalLinkIcon,
} from "lucide-react";

export default function Projects() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDomain, setNewDomain] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [adding, setAdding] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDomain, setEditDomain] = useState("");
  const [editDesc, setEditDesc] = useState("");

  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser(data.user);
    });
  }, []);

  const loadProjects = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("projects")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    const { data } = await query;
    if (data) setProjects(data);
    setLoading(false);
  }, [user]);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newName.trim() || !newDomain.trim() || !user) return;
    setAdding(true);
    setError("");

    let domain = newDomain.trim();
    if (!domain.startsWith("http")) domain = "https://" + domain;

    const { error: insertErr } = await supabase.from("projects").insert({
      user_id: user.id,
      team_id: null,
      name: newName.trim(),
      domain,
      description: newDesc.trim(),
    });

    if (insertErr) {
      setError(insertErr.message);
    } else {
      setNewName("");
      setNewDomain("");
      setNewDesc("");
      setShowAdd(false);
      loadProjects();
    }
    setAdding(false);
  }

  async function handleUpdate(id) {
    if (!editName.trim() || !editDomain.trim()) return;
    setError("");

    let domain = editDomain.trim();
    if (!domain.startsWith("http")) domain = "https://" + domain;

    const { error: updateErr } = await supabase
      .from("projects")
      .update({
        name: editName.trim(),
        domain,
        description: editDesc.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateErr) {
      setError(updateErr.message);
    } else {
      setEditingId(null);
      loadProjects();
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this project?")) return;
    const { error: delErr } = await supabase.from("projects").delete().eq("id", id);
    if (delErr) setError(delErr.message);
    else loadProjects();
  }

  function startEdit(project) {
    setEditingId(project.id);
    setEditName(project.name);
    setEditDomain(project.domain);
    setEditDesc(project.description || "");
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-muted-foreground mt-1">
            Organize your websites and domains into projects.
          </p>
        </div>
        {!showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            New Project
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>
      )}

      {/* Add form */}
      {showAdd && (
        <form onSubmit={handleAdd} className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-medium">Create Project</h3>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Project name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              required
              className="rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
              autoFocus
            />
            <input
              type="text"
              placeholder="Domain (e.g. example.com)"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
              required
              className="rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
          </div>
          <input
            type="text"
            placeholder="Description (optional)"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={adding}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {adding ? "Creating..." : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-accent"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Project list */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">Loading...</div>
      ) : projects.length === 0 && !showAdd ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
          <FolderIcon className="h-12 w-12" />
          <p className="text-lg font-medium text-foreground">No projects yet</p>
          <p className="text-sm">Create a project to organize your SEO work by website.</p>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="rounded-lg border border-border bg-card p-5 flex flex-col">
              {editingId === project.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={editDomain}
                    onChange={(e) => setEditDomain(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                  />
                  <input
                    type="text"
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Description"
                    className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/60"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => handleUpdate(project.id)} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">
                      <CheckIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="rounded-md border border-border px-3 py-1.5 text-sm">
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <GlobeIcon className="h-5 w-5" />
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(project)} className="rounded p-1.5 hover:bg-accent text-muted-foreground">
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(project.id)} className="rounded p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500">
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-semibold mb-1">{project.name}</h3>
                  <a
                    href={project.domain}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 mb-2"
                  >
                    {project.domain.replace(/^https?:\/\//, "")}
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                  )}

                  <div className="mt-auto pt-3 border-t border-border/50 text-xs text-muted-foreground">
                    Created {new Date(project.created_at).toLocaleDateString()}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
