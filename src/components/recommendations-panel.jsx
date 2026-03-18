"use client";

import { useState } from "react";
import { getRecommendations } from "@/lib/seo-recommendations";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";

const PRIORITY_CONFIG = {
  critical: { label: "Critical", color: "bg-red-500/10 text-red-400 border-red-500/30" },
  important: { label: "Important", color: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
  suggestion: { label: "Suggestion", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
};

export function RecommendationsPanel({ checks }) {
  const recommendations = getRecommendations(checks);
  const [expandedIdx, setExpandedIdx] = useState(null);

  if (recommendations.length === 0) return null;

  const criticalCount = recommendations.filter((r) => r.priority === "critical").length;
  const importantCount = recommendations.filter((r) => r.priority === "important").length;
  const suggestionCount = recommendations.filter((r) => r.priority === "suggestion").length;

  return (
    <div className="rounded-lg border border-border bg-card p-5 mt-4">
      <h3 className="text-sm font-medium mb-3">
        SEO Recommendations ({recommendations.length})
      </h3>

      <div className="flex gap-3 mb-4">
        {criticalCount > 0 && (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-red-500/10 text-red-400 border-red-500/30">
            {criticalCount} Critical
          </span>
        )}
        {importantCount > 0 && (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-orange-500/10 text-orange-400 border-orange-500/30">
            {importantCount} Important
          </span>
        )}
        {suggestionCount > 0 && (
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-blue-500/10 text-blue-400 border-blue-500/30">
            {suggestionCount} Suggestions
          </span>
        )}
      </div>

      <div className="space-y-1">
        {recommendations.map((rec, i) => {
          const config = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.suggestion;
          const isOpen = expandedIdx === i;

          return (
            <div key={i} className="rounded-md border border-border/50">
              <button
                onClick={() => setExpandedIdx(isOpen ? null : i)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-accent/30 transition-colors"
              >
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shrink-0 ${config.color}`}>
                  {config.label}
                </span>
                <span className="text-sm font-medium flex-1">{rec.title}</span>
                {isOpen ? (
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronRightIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-border/30">
                  {rec.message && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Current: {rec.message}
                    </p>
                  )}
                  <div className="rounded-md bg-background border border-border p-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                      How to Fix
                    </p>
                    <pre className="text-sm whitespace-pre-wrap font-mono text-foreground/80 leading-relaxed">
                      {rec.fix}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
