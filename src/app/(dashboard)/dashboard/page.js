"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  SearchIcon,
  GlobeIcon,
  BarChart3Icon,
  LinkIcon,
  GaugeIcon,
  SparklesIcon,
  ArrowRightIcon,
  ExternalLinkIcon,
  KeyboardIcon,
} from "lucide-react";

const QUICK_ACTIONS = [
  { label: "SEO Analyze",   Icon: GlobeIcon,      href: "/seo" },
  { label: "Analytics",     Icon: BarChart3Icon,   href: "/ga" },
  { label: "Keywords",      Icon: SearchIcon,      href: "/keyword-tracker" },
  { label: "Backlinks",     Icon: LinkIcon,        href: "/backlinks" },
  { label: "Speed Test",    Icon: GaugeIcon,       href: "/speed-monitor" },
];

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);

  // Focus search on "/"
  useEffect(() => {
    function onKey(e) {
      if (
        e.key === "/" &&
        document.activeElement.tagName !== "INPUT" &&
        document.activeElement.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser(data.user);

      let query = supabase
        .from("seo_analyses")
        .select("id, url, score, created_at")
        .order("created_at", { ascending: false })
        .limit(5);
        query = query.eq("user_id", data.user.id).is("team_id", null);

      query.then(({ data: analyses }) => {
        if (analyses) setRecentAnalyses(analyses);
      });
    });
  }, []);

  function getScoreColor(score) {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!search.trim()) return;
    router.push(`/seo?url=${encodeURIComponent(search.trim())}`);
  }

  const userName = user?.email
    ?.split("@")[0]
    ?.replace(/[._-]+/g, " ")
    ?.replace(/\b\w/g, (c) => c.toUpperCase()) || "there";

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">

      {/* Hero */}
      <div className="flex flex-col items-center justify-center py-10 gap-7">
        {/* Greeting */}
        <div className="flex items-center gap-3">
          <SparklesIcon size={30} className="text-orange-400" />
          <h1 className="text-4xl font-light tracking-tight text-foreground">
            Hello, {userName}
          </h1>
        </div>

        {/* Search box */}
        <form onSubmit={handleSearchSubmit} className="w-full max-w-2xl">
          <div className="rounded-2xl border border-border/60 bg-card px-5 pt-5 pb-4 shadow-md">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Enter a URL to analyze, or search tools…"
              className="w-full bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                className="h-8 w-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <PlusIcon size={15} />
              </button>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[11px] text-muted-foreground border border-border/50 rounded px-1.5 py-0.5 font-mono">
                  <KeyboardIcon size={10} /> /
                </span>
                {search.trim() && (
                  <button
                    type="submit"
                    className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Analyze
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>

        {/* Quick actions */}
        <div className="flex flex-wrap justify-center gap-2">
          {QUICK_ACTIONS.map(({ label, Icon, href }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border/60 bg-card text-sm text-muted-foreground hover:text-foreground hover:border-border hover:bg-muted transition-colors"
            >
              <Icon size={13} />
              {label}
            </Link>
          ))}
        </div>
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
                  <span className={`text-sm font-semibold font-mono ${getScoreColor(item.score)}`}>{item.score}</span>
                  <span className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
