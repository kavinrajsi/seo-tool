"use client";

import {
  InstagramIcon,
  CalendarIcon,
  SwordsIcon,
  NewspaperIcon,
  FileTextIcon,
  ZapIcon,
  BotIcon,
  SparklesIcon,
  MapIcon,
  DatabaseIcon,
  CheckCircleIcon,
  CircleDotIcon,
} from "lucide-react";

const ROADMAP_ITEMS = [
  {
    title: "Instagram Manager",
    description: "Save connected accounts and post history to database for analytics tracking.",
    icon: InstagramIcon,
    status: "planned",
  },
  {
    title: "Content Calendar",
    description: "Persist scheduled posts, drafts, and publishing history.",
    icon: CalendarIcon,
    status: "planned",
  },
  {
    title: "Competitor Tracker",
    description: "Store competitor domains and track ranking changes over time.",
    icon: SwordsIcon,
    status: "planned",
  },
  {
    title: "News Consolidator",
    description: "Save curated news feeds and bookmarked articles.",
    icon: NewspaperIcon,
    status: "planned",
  },
  {
    title: "LLMs.txt Generator",
    description: "Store generated llms.txt files and version history per project.",
    icon: BotIcon,
    status: "planned",
  },
  {
    title: "IndexNow",
    description: "Log submitted URLs and track indexing status history.",
    icon: ZapIcon,
    status: "planned",
  },
  {
    title: "Sitemap Generator",
    description: "Persist generated sitemaps and crawl-based sitemap reports.",
    icon: FileTextIcon,
    status: "planned",
  },
  {
    title: "AI Assistant",
    description: "Save chat conversations and SEO recommendations history.",
    icon: SparklesIcon,
    status: "planned",
  },
  {
    title: "AI Content Generator",
    description: "Store generated content with templates and revision history.",
    icon: SparklesIcon,
    status: "planned",
  },
];

function StatusBadge({ status }) {
  if (status === "done") {
    return (
      <span className="flex items-center gap-1 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">
        <CheckCircleIcon size={12} /> Done
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-xs font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full">
      <CircleDotIcon size={12} /> Planned
    </span>
  );
}

export default function Roadmap() {
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <MapIcon size={24} className="text-primary" />
          Roadmap
        </h1>
        <p className="text-muted-foreground mt-1">
          Upcoming features and data persistence improvements.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold">{ROADMAP_ITEMS.length}</p>
          <p className="text-xs text-muted-foreground mt-1">Total Items</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{ROADMAP_ITEMS.filter((i) => i.status === "planned").length}</p>
          <p className="text-xs text-muted-foreground mt-1">Planned</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{ROADMAP_ITEMS.filter((i) => i.status === "done").length}</p>
          <p className="text-xs text-muted-foreground mt-1">Completed</p>
        </div>
      </div>

      {/* Data Persistence */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <DatabaseIcon size={16} className="text-primary" />
          <h2 className="text-sm font-medium">Data Persistence — Modules Not Yet Storing to DB</h2>
        </div>
        <div className="space-y-3">
          {ROADMAP_ITEMS.map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-lg border border-border/50 p-4">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <item.icon size={16} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="text-sm font-medium">{item.title}</h3>
                  <StatusBadge status={item.status} />
                </div>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
