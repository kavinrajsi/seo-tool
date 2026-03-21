"use client";

import { useState, useEffect } from "react";
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
  ShieldCheckIcon,
  BotIcon,
  QrCodeIcon,
  SparklesIcon,
  CloudIcon,
  StarIcon,
  ArrowRightIcon,
} from "lucide-react";

const QUICK_TOOLS = [
  { title: "SEO Analyzer", description: "On-page SEO audit & scoring", url: "/seo", icon: SearchIcon, color: "text-blue-400" },
  { title: "Site Crawler", description: "Crawl for technical issues", url: "/seo-statistics", icon: GlobeIcon, color: "text-emerald-400" },
  { title: "Speed & Performance", description: "Core Web Vitals & Lighthouse", url: "/speed-monitor", icon: GaugeIcon, color: "text-amber-400" },
  { title: "Backlinks", description: "Analyze your backlink profile", url: "/backlinks", icon: LinkIcon, color: "text-purple-400" },
  { title: "Validators", description: "HTML, sitemap & robots.txt", url: "/validators", icon: ShieldCheckIcon, color: "text-cyan-400" },
  { title: "Analytics", description: "Google Analytics & Search Console", url: "/ga", icon: BarChart3Icon, color: "text-green-400" },
  { title: "SEO Assistant", description: "AI-powered SEO insights", url: "/ai-assistant", icon: SparklesIcon, color: "text-pink-400" },
  { title: "QR Codes", description: "Generate & track QR codes", url: "/qr-generator", icon: QrCodeIcon, color: "text-orange-400" },
  { title: "Cloudflare", description: "Traffic & performance analytics", url: "/cloudflare-analytics", icon: CloudIcon, color: "text-orange-400" },
  { title: "Google Reviews", description: "Monitor & manage reviews", url: "/reviews", icon: StarIcon, color: "text-yellow-400" },
];

export default function Dashboard() {
  const router = useRouter();
  const { activeTeam } = useTeam();
  const { activeProject } = useProject();
  const [user, setUser] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);

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

  function getScoreColor(score) {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  }

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      {/* Welcome */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {activeProject ? activeProject.name : "Dashboard"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {activeProject
            ? activeProject.domain.replace(/^https?:\/\//, "")
            : user
            ? `Welcome back, ${user.email}`
            : "Your SEO command center"}
        </p>
      </div>

      {/* Quick Tools Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {QUICK_TOOLS.map((tool) => (
          <Link
            key={tool.url}
            href={tool.url}
            className="group rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
          >
            <tool.icon size={20} className={`${tool.color} mb-3`} />
            <p className="text-sm font-medium mb-0.5">{tool.title}</p>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
          </Link>
        ))}
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
                  <span className={`text-sm font-semibold font-mono ${getScoreColor(item.score)}`}>
                    {item.score}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
