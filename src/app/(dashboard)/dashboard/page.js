"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import { useProject } from "@/lib/project-context";

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
    if (score >= 70) return "#66bb6a";
    if (score >= 40) return "#ffa726";
    return "#ef5350";
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  return (
    <div className="min-h-screen p-8 font-[family-name:var(--font-ibm-sans)] bg-[var(--background)] text-[#ededed] max-[600px]:px-4 max-[600px]:py-5">
      <div className="max-w-[960px] mx-auto">
        {user && (
          <p className="text-sm text-[#999] mb-7">
            Welcome back, {user.email}
          </p>
        )}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 mb-10">
          <Link href="/seo" className="flex items-start gap-4 p-6 rounded-xl border border-[#2a2a2a] bg-[#141414] no-underline text-inherit transition-[border-color] duration-150 hover:border-[#ededed]">
            <div className="text-[28px] shrink-0 w-12 h-12 flex items-center justify-center bg-[#1a1a1a] rounded-[10px]">&#x1F50D;</div>
            <div>
              <h2 className="text-base font-semibold mb-1">SEO Analyzer</h2>
              <p className="text-[13px] text-[#999] leading-normal">Analyze any URL for on-page SEO issues, llms.txt validation, and more.</p>
            </div>
          </Link>
          <Link href="/seo-statistics" className="flex items-start gap-4 p-6 rounded-xl border border-[#2a2a2a] bg-[#141414] no-underline text-inherit transition-[border-color] duration-150 hover:border-[#ededed]">
            <div className="text-[28px] shrink-0 w-12 h-12 flex items-center justify-center bg-[#1a1a1a] rounded-[10px]">&#x1F4CA;</div>
            <div>
              <h2 className="text-base font-semibold mb-1">SEO Statistics</h2>
              <p className="text-[13px] text-[#999] leading-normal">Crawl a site for status codes, sitemap coverage, crawl depth, markup, and more.</p>
            </div>
          </Link>
          <Link href="/ga" className="flex items-start gap-4 p-6 rounded-xl border border-[#2a2a2a] bg-[#141414] no-underline text-inherit transition-[border-color] duration-150 hover:border-[#ededed]">
            <div className="text-[28px] shrink-0 w-12 h-12 flex items-center justify-center bg-[#1a1a1a] rounded-[10px]">&#x1F4C8;</div>
            <div>
              <h2 className="text-base font-semibold mb-1">Google Analytics</h2>
              <p className="text-[13px] text-[#999] leading-normal">View Google Analytics and Search Console data, stored in your dashboard.</p>
            </div>
          </Link>
        </div>

        {recentAnalyses.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-[#999] uppercase tracking-[0.5px] mb-3">Recent Analyses</h3>
            <div className="flex flex-col gap-2">
              {recentAnalyses.map((item) => (
                <Link
                  key={item.id}
                  href="/seo"
                  className="flex justify-between items-center px-4 py-3 rounded-lg bg-[#141414] border border-[#1a1a1a] no-underline text-inherit transition-[border-color] duration-150 hover:border-[#2a2a2a]"
                >
                  <span className="text-sm text-[#ededed] break-all">{item.url}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className="text-sm font-semibold font-[family-name:var(--font-ibm-mono)]"
                      style={{ color: getScoreColor(item.score) }}
                    >
                      {item.score}
                    </span>
                    <span className="text-xs text-[#666]">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
