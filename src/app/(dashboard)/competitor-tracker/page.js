"use client";

import { useState, Fragment } from "react";
import {
  SwordsIcon,
  PlusIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  MinusIcon,
  ArrowUpDownIcon,
  XIcon,
} from "lucide-react";

const INITIAL_COMPETITORS = [];

const PLATFORM_BADGE = {
  Instagram: "bg-pink-900/60 text-pink-300",
  YouTube: "bg-red-900/60 text-red-300",
  TikTok: "bg-cyan-900/60 text-cyan-300",
  Twitter: "bg-sky-900/60 text-sky-300",
};

function GrowthIndicator({ value }) {
  if (value > 2) return <TrendingUpIcon className="h-4 w-4 text-emerald-400" />;
  if (value < 0) return <TrendingDownIcon className="h-4 w-4 text-red-400" />;
  return <MinusIcon className="h-4 w-4 text-muted-foreground" />;
}

export default function CompetitorTracker() {
  const [competitors, setCompetitors] = useState(INITIAL_COMPETITORS);
  const [sortKey, setSortKey] = useState("followers");
  const [sortAsc, setSortAsc] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newHandle, setNewHandle] = useState("");

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  }

  const sorted = [...competitors].sort((a, b) => {
    const diff = a[sortKey] - b[sortKey];
    return sortAsc ? diff : -diff;
  });

  function handleAdd() {
    if (!newHandle.trim()) return;
    setCompetitors((prev) => [
      ...prev,
      {
        id: Date.now(),
        handle: newHandle.startsWith("@") ? newHandle : `@${newHandle}`,
        platforms: ["Instagram"],
        followers: 0,
        posts30d: 0,
        engagement: 0,
        growth: 0,
        recentPosts: [],
      },
    ]);
    setNewHandle("");
    setShowAdd(false);
  }

  const SortHeader = ({ label, field }) => (
    <th
      className="pb-3 pr-4 font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors select-none"
      onClick={() => toggleSort(field)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === field && (
          <ArrowUpDownIcon className="h-3 w-3" />
        )}
      </span>
    </th>
  );

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Competitor Tracker</h1>
          <p className="text-muted-foreground mt-1">
            Track competitors' posts, engagement, frequency, and growth across platforms.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Competitor
        </button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
          <input
            value={newHandle}
            onChange={(e) => setNewHandle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="@handle or channel name"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            autoFocus
          />
          <button
            onClick={handleAdd}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add
          </button>
          <button onClick={() => setShowAdd(false)} className="text-muted-foreground hover:text-foreground">
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Competitor table */}
      <div className="rounded-lg border border-border bg-card p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-3 pr-4 font-medium text-muted-foreground">Handle</th>
              <th className="pb-3 pr-4 font-medium text-muted-foreground">Platforms</th>
              <SortHeader label="Followers" field="followers" />
              <SortHeader label="Posts (30d)" field="posts30d" />
              <SortHeader label="Engagement" field="engagement" />
              <SortHeader label="Growth" field="growth" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <Fragment key={c.id}>
                <tr
                  className="border-b border-border/50 last:border-0 cursor-pointer hover:bg-accent/30 transition-colors"
                  onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                >
                  <td className="py-3 pr-4 font-medium">{c.handle}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-1 flex-wrap">
                      {c.platforms.map((p) => (
                        <span key={p} className={`rounded-full px-2 py-0.5 text-xs ${PLATFORM_BADGE[p]}`}>
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">
                    {c.followers.toLocaleString()}
                  </td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{c.posts30d}</td>
                  <td className="py-3 pr-4 font-mono text-muted-foreground">{c.engagement}%</td>
                  <td className="py-3">
                    <span className="inline-flex items-center gap-1">
                      <GrowthIndicator value={c.growth} />
                      <span className={`font-mono text-sm ${
                        c.growth > 2 ? "text-emerald-400" : c.growth < 0 ? "text-red-400" : "text-muted-foreground"
                      }`}>
                        {c.growth > 0 ? "+" : ""}{c.growth}%
                      </span>
                    </span>
                  </td>
                </tr>
                {expanded === c.id && c.recentPosts.length > 0 && (
                  <tr>
                    <td colSpan={6} className="pb-3 pt-0 px-4">
                      <div className="rounded-md bg-secondary/50 p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Recent Posts</p>
                        <div className="flex flex-col gap-1.5">
                          {c.recentPosts.map((post, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span>{post.title}</span>
                              <span className="flex items-center gap-3 text-muted-foreground">
                                <span>{post.engagement}% eng.</span>
                                <span>{new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {competitors.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-12">
          <div className="text-center">
            <SwordsIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Add a competitor to start tracking.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
