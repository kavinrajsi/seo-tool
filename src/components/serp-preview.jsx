"use client";

import { useState } from "react";
import { AlertTriangleIcon } from "lucide-react";

function CharLimit({ current, min, max, label }) {
  const len = current?.length || 0;
  const isGood = len >= min && len <= max;
  const isOver = len > max;
  return (
    <span className={`text-xs ${isGood ? "text-green-400" : isOver ? "text-red-400" : "text-orange-400"}`}>
      {len}/{max} chars
    </span>
  );
}

function Warning({ text }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-orange-400 mt-1">
      <AlertTriangleIcon className="h-3 w-3 shrink-0" />
      {text}
    </div>
  );
}

export function SerpPreview({ result }) {
  const [tab, setTab] = useState("google");

  const title = result.title || "";
  const description = result.meta_description || "";
  const url = result.url || "";
  const ogTitle = result.og_title || "";
  const ogDescription = result.og_description || "";
  const ogImage = result.og_image || "";
  const twitterCard = result.twitter_card || "";

  const tabs = [
    { key: "google", label: "Google SERP" },
    { key: "facebook", label: "Facebook OG" },
    { key: "twitter", label: "Twitter Card" },
  ];

  return (
    <div className="rounded-lg border border-border bg-card p-5 mt-4">
      <h3 className="text-sm font-medium mb-4">SERP & Social Previews</h3>

      <div className="flex items-center gap-1 rounded-md border border-border bg-background p-0.5 w-fit mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === t.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Google SERP Preview */}
      {tab === "google" && (
        <div>
          <div className="rounded-lg border border-border bg-white p-4 text-black">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-500">
                {(new URL(url).hostname || "S")[0].toUpperCase()}
              </div>
              <div>
                <div className="text-xs text-gray-600">{new URL(url).hostname}</div>
                <div className="text-xs text-gray-400 truncate max-w-[400px]">{url}</div>
              </div>
            </div>
            <h3 className="text-xl text-[#1a0dab] hover:underline cursor-pointer leading-snug mt-1">
              {title || <span className="text-gray-400 italic">No title tag</span>}
            </h3>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">
              {description || <span className="text-gray-400 italic">No meta description</span>}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Title:</span>
              <CharLimit current={title} min={30} max={60} />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Description:</span>
              <CharLimit current={description} min={120} max={160} />
            </div>
          </div>
          {!title && <Warning text="Missing title tag — critical for SEO" />}
          {!description && <Warning text="Missing meta description — impacts click-through rate" />}
          {title.length > 60 && <Warning text="Title will be truncated in search results" />}
          {description.length > 160 && <Warning text="Description will be truncated in search results" />}
        </div>
      )}

      {/* Facebook OG Preview */}
      {tab === "facebook" && (
        <div>
          <div className="rounded-lg border border-border overflow-hidden max-w-[500px]">
            <div className="h-[260px] bg-gray-800 flex items-center justify-center">
              {ogImage ? (
                <img
                  src={ogImage}
                  alt="OG Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <span className="text-muted-foreground text-sm">No og:image set</span>
              )}
            </div>
            <div className="bg-[#f2f3f5] dark:bg-zinc-800 p-3">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">
                {url ? new URL(url).hostname : "example.com"}
              </div>
              <h4 className="text-sm font-semibold mt-0.5 line-clamp-1">
                {ogTitle || title || <span className="text-muted-foreground italic">No og:title</span>}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {ogDescription || description || <span className="italic">No og:description</span>}
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {!ogTitle && <Warning text="Missing og:title — Facebook will guess from page title" />}
            {!ogDescription && <Warning text="Missing og:description — Facebook will guess from content" />}
            {!ogImage && <Warning text="Missing og:image — posts without images get much less engagement" />}
          </div>
        </div>
      )}

      {/* Twitter Card Preview */}
      {tab === "twitter" && (
        <div>
          <div className="rounded-xl border border-border overflow-hidden max-w-[500px]">
            <div className="h-[250px] bg-gray-800 flex items-center justify-center">
              {ogImage ? (
                <img
                  src={ogImage}
                  alt="Twitter Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => { e.target.style.display = "none"; }}
                />
              ) : (
                <span className="text-muted-foreground text-sm">No image set</span>
              )}
            </div>
            <div className="p-3 border-t border-border">
              <h4 className="text-sm font-semibold line-clamp-1">
                {ogTitle || title || <span className="text-muted-foreground italic">No title</span>}
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {ogDescription || description || <span className="italic">No description</span>}
              </p>
              <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                {url ? new URL(url).hostname : "example.com"}
              </div>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">twitter:card:</span>
            <span className={`text-xs ${twitterCard ? "text-green-400" : "text-orange-400"}`}>
              {twitterCard || "not set"}
            </span>
          </div>
          {!twitterCard && <Warning text='Missing twitter:card — add <meta name="twitter:card" content="summary_large_image" />' />}
        </div>
      )}
    </div>
  );
}
