"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { apiFetch } from "@/lib/api";
import { useTeam } from "@/lib/team-context";
import {
  GaugeIcon,
  SearchIcon,
  MonitorIcon,
  SmartphoneIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  ZapIcon,
} from "lucide-react";

/* ── Score ring ─────────────────────────────────────────────────────── */

function ScoreRing({ score, label, size = 88 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 90 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={5} className="text-border" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeDasharray={circ}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span
          className="absolute inset-0 flex items-center justify-center text-lg font-bold"
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

/* ── Metric badge ───────────────────────────────────────────────────── */

function MetricBadge({ metric }) {
  const colorClass =
    metric.score >= 0.9
      ? "text-emerald-400"
      : metric.score >= 0.5
      ? "text-amber-400"
      : "text-red-400";

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground mb-1">{metric.label}</p>
      <p className={`text-xl font-semibold ${colorClass}`}>{metric.value}</p>
    </div>
  );
}

/* ── Expandable audit item ──────────────────────────────────────────── */

function AuditItem({ audit, type }) {
  const [open, setOpen] = useState(false);
  const Icon =
    type === "opportunity"
      ? AlertTriangleIcon
      : type === "passed"
      ? CheckCircleIcon
      : InfoIcon;
  const iconColor =
    type === "passed"
      ? "text-emerald-400"
      : audit.score != null && audit.score < 0.5
      ? "text-red-400"
      : "text-amber-400";

  return (
    <div className="border-b border-border/50 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 py-3 px-1 text-left text-sm hover:bg-accent/30 transition-colors"
      >
        <Icon className={`h-4 w-4 shrink-0 ${iconColor}`} />
        <span className="flex-1">{audit.title}</span>
        {audit.savings && (
          <span className="text-xs text-muted-foreground shrink-0">
            Save {audit.savings}
          </span>
        )}
        {audit.displayValue && !audit.savings && (
          <span className="text-xs text-muted-foreground shrink-0">
            {audit.displayValue}
          </span>
        )}
        {audit.description && (
          open ? (
            <ChevronUpIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          ) : (
            <ChevronDownIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )
        )}
      </button>
      {open && audit.description && (
        <p className="px-8 pb-3 text-xs text-muted-foreground leading-relaxed">
          {audit.description.replace(/\[.*?\]\(.*?\)/g, (m) => {
            const text = m.match(/\[(.*?)\]/)?.[1] || m;
            return text;
          })}
        </p>
      )}
    </div>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */

export default function SpeedMonitor() {
  const { activeTeam } = useTeam();
  const [url, setUrl] = useState("");
  const [strategy, setStrategy] = useState("mobile");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const [showPassed, setShowPassed] = useState(false);

  async function handleAnalyze(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const res = await apiFetch("/api/pagespeed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), strategy }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Analysis failed");
      } else {
        setReport(data);

        // Save to Supabase
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase.from("speed_reports").insert({
            user_id: user.id,
            team_id: activeTeam?.id || null,
            url: url.trim(),
            data: data,
          });
        }
      }
    } catch {
      setError("Failed to connect to PageSpeed API");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Site Speed & Performance</h1>
        <p className="text-muted-foreground mt-1">
          Powered by Google PageSpeed Insights — Core Web Vitals, Lighthouse scores, and optimization tips.
        </p>
      </div>

      {/* Input form */}
      <form onSubmit={handleAnalyze} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-sm text-muted-foreground mb-1 block">URL to analyze</label>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border bg-card p-0.5">
            <button
              type="button"
              onClick={() => setStrategy("mobile")}
              className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                strategy === "mobile"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <SmartphoneIcon className="h-3.5 w-3.5" />
              Mobile
            </button>
            <button
              type="button"
              onClick={() => setStrategy("desktop")}
              className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                strategy === "desktop"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <MonitorIcon className="h-3.5 w-3.5" />
              Desktop
            </button>
          </div>
          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <ZapIcon className="h-4 w-4 animate-pulse" />
                Analyzing...
              </>
            ) : (
              <>
                <SearchIcon className="h-4 w-4" />
                Analyze
              </>
            )}
          </button>
        </div>
      </form>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16">
          <GaugeIcon className="h-10 w-10 text-muted-foreground/50 animate-spin" />
          <p className="mt-4 text-sm text-muted-foreground">
            Running Lighthouse audit — this typically takes 15-30 seconds...
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-900/50 bg-red-900/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {report && !loading && (
        <>
          {/* Scores overview */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-sm font-medium">Lighthouse Scores</h2>
              <span className="text-xs text-muted-foreground">
                {strategy === "mobile" ? "Mobile" : "Desktop"} — {report.url}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-10">
              {[
                { key: "performance", label: "Performance" },
                { key: "accessibility", label: "Accessibility" },
                { key: "bestPractices", label: "Best Practices" },
                { key: "seo", label: "SEO" },
              ].map(({ key, label }) => (
                <ScoreRing key={key} score={report.scores[key]} label={label} />
              ))}
            </div>
          </div>

          {/* Core Web Vitals */}
          <div>
            <h2 className="text-sm font-medium mb-3">Core Web Vitals & Metrics</h2>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
              {Object.values(report.metrics).map((m) => (
                <MetricBadge key={m.label} metric={m} />
              ))}
            </div>
          </div>

          {/* Opportunities */}
          {report.opportunities.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
                <AlertTriangleIcon className="h-4 w-4 text-amber-400" />
                Opportunities ({report.opportunities.length})
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                These suggestions can help your page load faster.
              </p>
              {report.opportunities.map((audit) => (
                <AuditItem key={audit.id} audit={audit} type="opportunity" />
              ))}
            </div>
          )}

          {/* Diagnostics */}
          {report.diagnostics.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-sm font-medium mb-3 flex items-center gap-2">
                <InfoIcon className="h-4 w-4 text-blue-400" />
                Diagnostics ({report.diagnostics.length})
              </h2>
              <p className="text-xs text-muted-foreground mb-3">
                More information about the performance of your application.
              </p>
              {report.diagnostics.map((audit) => (
                <AuditItem key={audit.id} audit={audit} type="diagnostic" />
              ))}
            </div>
          )}

          {/* Passed audits */}
          {report.passed.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <button
                onClick={() => setShowPassed(!showPassed)}
                className="flex w-full items-center justify-between text-sm font-medium"
              >
                <span className="flex items-center gap-2">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-400" />
                  Passed Audits ({report.passed.length})
                </span>
                {showPassed ? (
                  <ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
              {showPassed && (
                <div className="mt-3">
                  {report.passed.map((audit) => (
                    <AuditItem key={audit.id} audit={audit} type="passed" />
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!report && !loading && !error && (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border p-12">
          <div className="text-center">
            <GaugeIcon className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              Enter a URL and choose mobile or desktop to run a full PageSpeed analysis.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
