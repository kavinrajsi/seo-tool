"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  TrendingUpIcon,
  UsersIcon,
  EyeIcon,
} from "lucide-react";

/* ── Mock social-media metrics (replace with Metricool API) ────────── */
function generateMockData(days) {
  const data = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    data.push({
      date: d.toISOString().slice(0, 10),
      impressions: Math.floor(800 + Math.random() * 1200),
      engagement: +(1.5 + Math.random() * 4).toFixed(2),
      followers: Math.floor(50 + Math.random() * 80),
    });
  }
  return data;
}

const TOP_POSTS = [
  { id: 1, title: "Product launch announcement", platform: "Instagram", impressions: 12400, engagement: 5.2 },
  { id: 2, title: "Behind-the-scenes reel", platform: "Instagram", impressions: 9800, engagement: 6.1 },
  { id: 3, title: "SEO tips carousel", platform: "Instagram", impressions: 8200, engagement: 4.8 },
  { id: 4, title: "Customer testimonial", platform: "YouTube", impressions: 7100, engagement: 3.9 },
  { id: 5, title: "Industry trends breakdown", platform: "Instagram", impressions: 6500, engagement: 4.2 },
];

const DATE_RANGES = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

/* ── Simple SVG bar chart ──────────────────────────────────────────── */
function BarChart({ data, dataKey, color, height = 120 }) {
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  const barWidth = Math.max(4, Math.min(16, Math.floor(500 / data.length) - 2));
  const w = data.length * (barWidth + 2);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      {data.map((d, i) => {
        const h = (d[dataKey] / max) * (height - 4);
        return (
          <rect
            key={d.date}
            x={i * (barWidth + 2)}
            y={height - h}
            width={barWidth}
            height={h}
            rx={2}
            fill={color}
            opacity={0.85}
          />
        );
      })}
    </svg>
  );
}

/* ── Simple SVG line chart ─────────────────────────────────────────── */
function LineChart({ data, dataKey, color, height = 120 }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d[dataKey]), 1);
  const w = 500;
  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = height - (d[dataKey] / max) * (height - 8);
      return `${x},${y}`;
    })
    .join(" ");
  const areaPoints = `0,${height} ${points} ${w},${height}`;
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <polygon points={areaPoints} fill={color} opacity={0.1} />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}

export default function Analytics() {
  const router = useRouter();
  const [range, setRange] = useState(30);
  const [data, setData] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: authData }) => {
      if (!authData.user) router.push("/signin");
    });
  }, [router]);

  useEffect(() => {
    setData(generateMockData(range));
  }, [range]);

  const totalImpressions = data.reduce((s, d) => s + d.impressions, 0);
  const avgEngagement = data.length ? +(data.reduce((s, d) => s + d.engagement, 0) / data.length).toFixed(2) : 0;
  const totalFollowers = data.reduce((s, d) => s + d.followers, 0);

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Content performance metrics from your social media accounts.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
          {DATE_RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setRange(r.days)}
              className={`rounded-sm px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r.days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <EyeIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Total Impressions</span>
          </div>
          <p className="text-3xl font-semibold">{totalImpressions.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Last {range} days</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <TrendingUpIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Avg. Engagement Rate</span>
          </div>
          <p className="text-3xl font-semibold">{avgEngagement}%</p>
          <p className="text-xs text-muted-foreground mt-1">Across all platforms</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <UsersIcon className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wider">Follower Growth</span>
          </div>
          <p className="text-3xl font-semibold">+{totalFollowers.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Net new followers</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Impressions</h3>
          <BarChart data={data} dataKey="impressions" color="#3b82f6" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{data[0]?.date}</span>
            <span>{data[data.length - 1]?.date}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Engagement Rate (%)</h3>
          <LineChart data={data} dataKey="engagement" color="#22c55e" />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{data[0]?.date}</span>
            <span>{data[data.length - 1]?.date}</span>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <h3 className="text-sm font-medium mb-4">Follower Growth</h3>
          <LineChart data={data} dataKey="followers" color="#a855f7" height={100} />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>{data[0]?.date}</span>
            <span>{data[data.length - 1]?.date}</span>
          </div>
        </div>
      </div>

      {/* Top performing posts */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4">Top Performing Posts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Post</th>
                <th className="pb-3 pr-4 font-medium text-muted-foreground">Platform</th>
                <th className="pb-3 pr-4 font-medium text-muted-foreground text-right">Impressions</th>
                <th className="pb-3 font-medium text-muted-foreground text-right">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {TOP_POSTS.map((post) => (
                <tr key={post.id} className="border-b border-border/50 last:border-0">
                  <td className="py-3 pr-4">{post.title}</td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs">
                      {post.platform}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right font-mono text-muted-foreground">
                    {post.impressions.toLocaleString()}
                  </td>
                  <td className="py-3 text-right font-mono text-muted-foreground">{post.engagement}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
