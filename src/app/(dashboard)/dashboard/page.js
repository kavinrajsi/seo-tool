"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useTeam } from "@/lib/team-context";
import styles from "./dashboard.module.scss";

export default function Dashboard() {
  const router = useRouter();
  const { activeTeam } = useTeam();
  const [user, setUser] = useState(null);
  const [recentAnalyses, setRecentAnalyses] = useState([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/signin");
        return;
      }
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
  }, [router, activeTeam]);

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
    <div className={styles.page}>
      <div className={styles.content}>
        {user && (
          <p className={styles.welcome}>
            Welcome back, {user.email}
          </p>
        )}

        <div className={styles.tools}>
          <Link href="/seo" className={styles.toolCard}>
            <div className={styles.toolIcon}>&#x1F50D;</div>
            <div>
              <h2>SEO Analyzer</h2>
              <p>Analyze any URL for on-page SEO issues, llms.txt validation, and more.</p>
            </div>
          </Link>
          <Link href="/seo-statistics" className={styles.toolCard}>
            <div className={styles.toolIcon}>&#x1F4CA;</div>
            <div>
              <h2>SEO Statistics</h2>
              <p>Crawl a site for status codes, sitemap coverage, crawl depth, markup, and more.</p>
            </div>
          </Link>
          <Link href="/ga" className={styles.toolCard}>
            <div className={styles.toolIcon}>&#x1F4C8;</div>
            <div>
              <h2>Google Analytics</h2>
              <p>View Google Analytics and Search Console data, stored in your dashboard.</p>
            </div>
          </Link>
        </div>

        {recentAnalyses.length > 0 && (
          <div className={styles.recent}>
            <h3>Recent Analyses</h3>
            <div className={styles.recentList}>
              {recentAnalyses.map((item) => (
                <Link
                  key={item.id}
                  href="/seo"
                  className={styles.recentItem}
                >
                  <span className={styles.recentUrl}>{item.url}</span>
                  <div className={styles.recentMeta}>
                    <span
                      className={styles.recentScore}
                      style={{ color: getScoreColor(item.score) }}
                    >
                      {item.score}
                    </span>
                    <span className={styles.recentDate}>
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
