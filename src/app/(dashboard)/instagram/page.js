"use client";

import { useState } from "react";
import {
  InstagramIcon,
  PlusIcon,
  ImageIcon,
  VideoIcon,
  LayoutGridIcon,
  ClockIcon,
  FileEditIcon,
  CheckCircleIcon,
  InboxIcon,
  XIcon,
} from "lucide-react";

const POST_TYPES = ["Image", "Carousel", "Reel", "Story"];
const STATUSES = ["Backlog", "Draft", "Scheduled", "Published"];

const STATUS_COLORS = {
  Backlog: "bg-zinc-700 text-zinc-300",
  Draft: "bg-amber-900/60 text-amber-300",
  Scheduled: "bg-blue-900/60 text-blue-300",
  Published: "bg-emerald-900/60 text-emerald-300",
};

const STATUS_ICONS = {
  Backlog: InboxIcon,
  Draft: FileEditIcon,
  Scheduled: ClockIcon,
  Published: CheckCircleIcon,
};

const INITIAL_POSTS = [
  { id: 1, caption: "New product launch teaser — behind the scenes", type: "Reel", status: "Scheduled", date: "2026-03-20" },
  { id: 2, caption: "5 tips for better engagement on IG in 2026", type: "Carousel", status: "Draft", date: "" },
  { id: 3, caption: "Customer spotlight: @janedoe's transformation story", type: "Image", status: "Published", date: "2026-03-15" },
  { id: 4, caption: "Weekend vibes — lifestyle flat lay", type: "Image", status: "Backlog", date: "" },
  { id: 5, caption: "Tutorial: How to use our new feature", type: "Reel", status: "Scheduled", date: "2026-03-22" },
  { id: 6, caption: "Team Q&A — ask us anything", type: "Story", status: "Draft", date: "" },
  { id: 7, caption: "Monthly recap — March highlights", type: "Carousel", status: "Backlog", date: "" },
  { id: 8, caption: "Flash sale announcement — 24hr only", type: "Image", status: "Published", date: "2026-03-10" },
];

function PostTypeIcon({ type }) {
  switch (type) {
    case "Reel": return <VideoIcon className="h-3.5 w-3.5" />;
    case "Carousel": return <LayoutGridIcon className="h-3.5 w-3.5" />;
    case "Story": return <ClockIcon className="h-3.5 w-3.5" />;
    default: return <ImageIcon className="h-3.5 w-3.5" />;
  }
}

export default function InstagramManager() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");
  const [form, setForm] = useState({ caption: "", type: "Image", status: "Backlog", date: "" });

  function handleAdd() {
    if (!form.caption.trim()) return;
    setPosts((prev) => [
      ...prev,
      { ...form, id: Date.now() },
    ]);
    setForm({ caption: "", type: "Image", status: "Backlog", date: "" });
    setShowForm(false);
  }

  const filtered = filter === "All" ? posts : posts.filter((p) => p.status === filter);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = posts.filter((p) => p.status === s).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Instagram Manager</h1>
          <p className="text-muted-foreground mt-1">
            Manage scheduled posts, drafts, published content, and your backlog.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          New Post Idea
        </button>
      </div>

      {/* Status summary cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {STATUSES.map((status) => {
          const Icon = STATUS_ICONS[status];
          return (
            <button
              key={status}
              onClick={() => setFilter(filter === status ? "All" : status)}
              className={`rounded-lg border p-4 text-left transition-colors ${
                filter === status
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:bg-accent/50"
              }`}
            >
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wider">{status}</span>
              </div>
              <p className="text-2xl font-semibold">{counts[status]}</p>
            </button>
          );
        })}
      </div>

      {/* New post form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium">Add New Post Idea</h3>
            <button onClick={() => setShowForm(false)} className="text-muted-foreground hover:text-foreground">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm text-muted-foreground mb-1 block">Caption</label>
              <textarea
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="Write your post caption or idea..."
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Post Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {POST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Scheduled Date</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Add Post
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2">
        {["All", ...STATUSES].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              filter === s
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Post cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((post) => (
          <div key={post.id} className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm leading-relaxed flex-1">{post.caption}</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-auto">
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                {post.status}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                <PostTypeIcon type={post.type} />
                {post.type}
              </span>
              {post.date && (
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-12">
          <div className="text-center">
            <InstagramIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No posts in this category yet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
