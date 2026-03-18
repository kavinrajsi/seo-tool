"use client";

import { useState } from "react";
import {
  NewspaperIcon,
  ExternalLinkIcon,
  BookmarkIcon,
  FilterIcon,
} from "lucide-react";

const TOPICS = ["All", "Tools", "Research", "Business", "Algorithm Updates", "Social Media"];

const MOCK_ARTICLES = [
  {
    id: 1,
    headline: "Google Rolls Out March 2026 Core Update — What SEOs Need to Know",
    source: "Search Engine Journal",
    date: "2026-03-17",
    topic: "Algorithm Updates",
    summary: "Google has begun rolling out its latest core algorithm update. Early data suggests significant ranking volatility across YMYL niches. Here's what we know so far and how to prepare.",
    url: "#",
  },
  {
    id: 2,
    headline: "New Study: Long-Form Content Still Outperforms for Organic Traffic",
    source: "Ahrefs Blog",
    date: "2026-03-16",
    topic: "Research",
    summary: "A comprehensive study of 10M+ pages shows that content exceeding 2,000 words continues to attract more backlinks and organic traffic, though quality signals matter more than length alone.",
    url: "#",
  },
  {
    id: 3,
    headline: "Instagram Launches Creator Analytics API for Third-Party Tools",
    source: "TechCrunch",
    date: "2026-03-15",
    topic: "Social Media",
    summary: "Meta opens up new analytics endpoints for Instagram creators, enabling third-party dashboards to access reach, engagement, and follower demographic data directly.",
    url: "#",
  },
  {
    id: 4,
    headline: "Screaming Frog v22 Adds AI-Powered Crawl Insights",
    source: "Screaming Frog Blog",
    date: "2026-03-14",
    topic: "Tools",
    summary: "The latest version of Screaming Frog introduces AI-assisted crawl analysis that automatically prioritizes technical issues by estimated traffic impact.",
    url: "#",
  },
  {
    id: 5,
    headline: "Report: Enterprise SEO Budgets Expected to Grow 18% in 2026",
    source: "Search Engine Land",
    date: "2026-03-13",
    topic: "Business",
    summary: "A new industry report from BrightEdge shows enterprise companies are increasing SEO investment, with AI content optimization and technical SEO leading budget allocation.",
    url: "#",
  },
  {
    id: 6,
    headline: "TikTok Search Results Now Indexable by Google",
    source: "The Verge",
    date: "2026-03-12",
    topic: "Social Media",
    summary: "Google has confirmed that TikTok search result pages are now being indexed, blurring the lines between social search and traditional web search.",
    url: "#",
  },
  {
    id: 7,
    headline: "Semrush Acquires ContentKing for Real-Time SEO Monitoring",
    source: "Semrush Blog",
    date: "2026-03-11",
    topic: "Tools",
    summary: "Semrush announces the acquisition of ContentKing, integrating real-time website monitoring directly into its platform for instant change detection.",
    url: "#",
  },
  {
    id: 8,
    headline: "How AI Overviews Are Reshaping Click-Through Rates in 2026",
    source: "Moz Blog",
    date: "2026-03-10",
    topic: "Research",
    summary: "New click-through rate data reveals AI Overviews reduce organic CTR by 15-30% for informational queries, but commercial intent queries remain largely unaffected.",
    url: "#",
  },
];

const TOPIC_COLORS = {
  Tools: "bg-violet-900/60 text-violet-300",
  Research: "bg-blue-900/60 text-blue-300",
  Business: "bg-amber-900/60 text-amber-300",
  "Algorithm Updates": "bg-red-900/60 text-red-300",
  "Social Media": "bg-pink-900/60 text-pink-300",
};

export default function NewsConsolidator() {
  const [topic, setTopic] = useState("All");
  const [saved, setSaved] = useState(new Set());

  const filtered = topic === "All"
    ? MOCK_ARTICLES
    : MOCK_ARTICLES.filter((a) => a.topic === topic);

  function toggleSave(id) {
    setSaved((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">News Consolidator</h1>
          <p className="text-muted-foreground mt-1">
            Latest SEO &amp; digital marketing news from top industry sources.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterIcon className="h-4 w-4 text-muted-foreground mr-1" />
          {TOPICS.map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                topic === t
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Articles feed */}
      <div className="flex flex-col gap-3">
        {filtered.map((article) => (
          <div
            key={article.id}
            className="rounded-lg border border-border bg-card p-5 hover:bg-accent/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TOPIC_COLORS[article.topic]}`}>
                    {article.topic}
                  </span>
                  <span className="text-xs text-muted-foreground">{article.source}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(article.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <h3 className="font-medium leading-snug mb-2">{article.headline}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{article.summary}</p>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => toggleSave(article.id)}
                  className={`rounded-md p-2 transition-colors ${
                    saved.has(article.id)
                      ? "bg-primary/20 text-primary"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                  title={saved.has(article.id) ? "Unsave" : "Save"}
                >
                  <BookmarkIcon className="h-4 w-4" fill={saved.has(article.id) ? "currentColor" : "none"} />
                </button>
                <a
                  href={article.url}
                  className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  title="Read full article"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-12">
          <div className="text-center">
            <NewspaperIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              No articles found for this topic.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
