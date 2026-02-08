"use client";

import { useState } from "react";
import styles from "./page.module.css";

const CATEGORY_LABELS = {
  seo: "SEO",
  analytics: "Analytics",
  ecommerce: "eCommerce",
  content: "Content",
  integrations: "Integrations",
  productivity: "Productivity",
};

const FEATURES = [
  // SEO
  {
    title: "Keyword Rank Tracker",
    description:
      "Track your target keywords' positions on Google over time. See daily/weekly ranking changes, SERP features, and competitor movements for each keyword.",
    category: "seo",
    status: "planned",
    impact: "high",
  },
  {
    title: "Competitor Analysis",
    description:
      "Compare your site's SEO performance against competitors. Analyze their top keywords, backlink profiles, content gaps, and domain authority side-by-side.",
    category: "seo",
    status: "planned",
    impact: "high",
  },
  {
    title: "Backlink Monitor",
    description:
      "Discover and monitor your backlink profile. Track new and lost backlinks, referring domains, anchor text distribution, and toxic link alerts.",
    category: "seo",
    status: "planned",
    impact: "high",
  },
  {
    title: "Scheduled SEO Audits",
    description:
      "Set up automated recurring scans (daily, weekly, monthly) for your sites. Get email alerts when SEO scores drop or critical issues are detected.",
    category: "seo",
    status: "planned",
    impact: "medium",
  },
  {
    title: "SEO Score History & Trends",
    description:
      "Track how your SEO score changes over time with historical charts. Visualize improvements after fixes and identify regression patterns.",
    category: "seo",
    status: "in-progress",
    impact: "medium",
  },
  {
    title: "Core Web Vitals Monitor",
    description:
      "Continuously monitor LCP, FID, CLS, and INP metrics. Get alerts when vitals degrade and track performance improvements over time.",
    category: "seo",
    status: "in-progress",
    impact: "medium",
  },
  {
    title: "White-Label PDF Reports",
    description:
      "Generate professional, branded PDF reports with your own logo, colors, and company name. Perfect for agencies sharing reports with clients.",
    category: "seo",
    status: "planned",
    impact: "medium",
  },
  {
    title: "Broken Link Checker",
    description:
      "Crawl your entire site to find broken internal and external links (404s, 500s). Fix them before they hurt your SEO and user experience.",
    category: "seo",
    status: "planned",
    impact: "medium",
  },

  // Analytics & Reporting
  {
    title: "Google Search Console Integration",
    description:
      "Connect your Search Console to see real search queries, impressions, clicks, and CTR data directly inside the dashboard alongside your SEO analysis.",
    category: "analytics",
    status: "in-progress",
    impact: "high",
  },
  {
    title: "Google Analytics Integration",
    description:
      "Pull in Google Analytics traffic data — sessions, bounce rate, conversions — and correlate with SEO changes to measure real impact.",
    category: "analytics",
    status: "in-progress",
    impact: "high",
  },
  {
    title: "Custom Dashboard Widgets",
    description:
      "Build personalized dashboards with drag-and-drop widgets. Pin the metrics that matter most — SEO scores, traffic, rankings, sales — all in one view.",
    category: "analytics",
    status: "planned",
    impact: "medium",
  },
  {
    title: "Automated Email Reports",
    description:
      "Schedule weekly or monthly email summaries with key metrics, score changes, and action items. Keep your team and clients informed automatically.",
    category: "analytics",
    status: "planned",
    impact: "medium",
  },

  // eCommerce
  {
    title: "Product SEO Optimizer",
    description:
      "Analyze and optimize SEO for individual product pages — titles, descriptions, images, schema markup, and keyword targeting tailored for eCommerce.",
    category: "ecommerce",
    status: "planned",
    impact: "high",
  },
  {
    title: "Revenue & Sales Dashboard",
    description:
      "Visualize revenue trends, average order value, conversion rates, and top-selling products. Correlate marketing efforts with actual sales data.",
    category: "ecommerce",
    status: "planned",
    impact: "high",
  },
  {
    title: "Inventory Alerts",
    description:
      "Get notified when product stock runs low. Set custom thresholds per product and receive alerts via email or in-app notifications.",
    category: "ecommerce",
    status: "in-progress",
    impact: "medium",
  },
  {
    title: "Abandoned Cart Recovery",
    description:
      "Track abandoned carts and set up automated follow-up workflows. Send recovery emails with discount codes to recapture lost sales.",
    category: "ecommerce",
    status: "planned",
    impact: "medium",
  },
  {
    title: "Review & Rating Monitor",
    description:
      "Aggregate and monitor product reviews across platforms. Get alerts for negative reviews, track sentiment trends, and respond faster.",
    category: "ecommerce",
    status: "in-progress",
    impact: "low",
  },

  // Content
  {
    title: "AI Content Writer",
    description:
      "Generate SEO-optimized blog posts, product descriptions, and meta tags using AI. Get content suggestions based on top-ranking competitors.",
    category: "content",
    status: "planned",
    impact: "high",
  },
  {
    title: "Content Brief Generator",
    description:
      "Auto-generate detailed content briefs with target keywords, headings, word count, competitor analysis, and questions to answer for writers.",
    category: "content",
    status: "planned",
    impact: "medium",
  },
  {
    title: "Social Media Post Scheduler",
    description:
      "Schedule and publish posts to Instagram, Twitter/X, Facebook, and LinkedIn from one place. Includes best-time suggestions and preview.",
    category: "content",
    status: "planned",
    impact: "medium",
  },
  {
    title: "Content Calendar Collaboration",
    description:
      "Share your content calendar with team members. Assign tasks, set deadlines, leave comments, and track content production status together.",
    category: "content",
    status: "planned",
    impact: "medium",
  },
  {
    title: "Blog SEO Checker",
    description:
      "Paste or connect your blog post and get real-time SEO suggestions — keyword density, readability score, internal linking opportunities, and heading structure.",
    category: "content",
    status: "planned",
    impact: "medium",
  },

  // Integrations
  {
    title: "Slack Notifications",
    description:
      "Get instant Slack alerts for SEO score drops, completed scans, new backlinks, low inventory, and other important events in your channels.",
    category: "integrations",
    status: "planned",
    impact: "medium",
  },
  {
    title: "Zapier Integration",
    description:
      "Connect Rank Scan to 5,000+ apps via Zapier. Automate workflows — e.g., save scan results to Google Sheets, trigger alerts in your tools.",
    category: "integrations",
    status: "planned",
    impact: "medium",
  },
  {
    title: "Webhook Notifications",
    description:
      "Send real-time event data to your own endpoints. Trigger custom workflows when scans complete, scores change, or thresholds are crossed.",
    category: "integrations",
    status: "planned",
    impact: "medium",
  },

  // Productivity
  {
    title: "REST API Access",
    description:
      "Full API access to run scans, fetch reports, and manage data programmatically. Build custom integrations or automate your SEO workflows.",
    category: "productivity",
    status: "planned",
    impact: "high",
  },
  {
    title: "Browser Extension",
    description:
      "Analyze any page's SEO directly from your browser. One-click scan, instant score overlay, and quick link to full report in the dashboard.",
    category: "productivity",
    status: "planned",
    impact: "medium",
  },
  {
    title: "Role-Based Permissions",
    description:
      "Set granular permissions for team members — viewer, editor, admin. Control who can run scans, delete reports, manage billing, and invite members.",
    category: "productivity",
    status: "in-progress",
    impact: "medium",
  },
  {
    title: "Activity Log & Audit Trail",
    description:
      "See a timeline of all actions — scans run, reports deleted, settings changed, members invited. Know who did what and when for accountability.",
    category: "productivity",
    status: "planned",
    impact: "low",
  },
  {
    title: "Multi-Workspace Support",
    description:
      "Manage multiple brands or clients in separate workspaces. Each workspace has its own sites, reports, team members, and billing.",
    category: "productivity",
    status: "planned",
    impact: "low",
  },
];

const STATUS_CONFIG = {
  planned: { label: "Planned", color: "#6b7280" },
  "in-progress": { label: "In Progress", color: "#f59e0b" },
  "coming-soon": { label: "Coming Soon", color: "#16a34a" },
};

const IMPACT_CONFIG = {
  high: { label: "High Impact", color: "#dc2626" },
  medium: { label: "Medium Impact", color: "#f59e0b" },
  low: { label: "Nice to Have", color: "#6b7280" },
};

const CATEGORIES = [
  { key: "all", label: "All" },
  { key: "seo", label: "SEO" },
  { key: "analytics", label: "Analytics" },
  { key: "ecommerce", label: "eCommerce" },
  { key: "content", label: "Content" },
  { key: "integrations", label: "Integrations" },
  { key: "productivity", label: "Productivity" },
];

export default function UpcomingFeaturesPage() {
  const [activeStatFilter, setActiveStatFilter] = useState(null);
  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");

  const handleStatFilter = (filter) => {
    if (filter === null) {
      setActiveStatFilter(null);
      setActiveCategory("all");
    } else {
      setActiveStatFilter((prev) => (prev === filter ? null : filter));
    }
  };

  const handleCategoryFilter = (key) => {
    setActiveCategory(key);
    if (key === "all") {
      setActiveStatFilter(null);
    }
  };

  const filtered = FEATURES.filter((f) => {
    if (activeStatFilter === "high-impact" && f.impact !== "high") return false;
    if (activeStatFilter === "in-progress" && f.status !== "in-progress")
      return false;
    if (activeCategory !== "all" && f.category !== activeCategory) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const grouped = {
    high: filtered.filter((f) => f.impact === "high"),
    medium: filtered.filter((f) => f.impact === "medium"),
    low: filtered.filter((f) => f.impact === "low"),
  };

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.heading}>Upcoming Features</h1>
        <p className={styles.subtitle}>
          Here&apos;s what&apos;s on our roadmap. Features are prioritized by
          impact and user demand.
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div
          className={`${styles.statCard} ${activeStatFilter === null ? styles.statCardActive : ""}`}
          onClick={() => handleStatFilter(null)}
        >
          <div className={styles.statValue}>{FEATURES.length}</div>
          <div className={styles.statLabel}>Total Features</div>
        </div>
        <div
          className={`${styles.statCard} ${activeStatFilter === "high-impact" ? styles.statCardActive : ""}`}
          onClick={() => handleStatFilter("high-impact")}
        >
          <div className={styles.statValue}>
            {FEATURES.filter((f) => f.impact === "high").length}
          </div>
          <div className={styles.statLabel}>High Impact</div>
        </div>
        <div
          className={`${styles.statCard} ${activeStatFilter === "categories" ? styles.statCardActive : ""}`}
          onClick={() => handleStatFilter("categories")}
        >
          <div className={styles.statValue}>
            {new Set(FEATURES.map((f) => f.category)).size}
          </div>
          <div className={styles.statLabel}>Categories</div>
        </div>
        <div
          className={`${styles.statCard} ${activeStatFilter === "in-progress" ? styles.statCardActive : ""}`}
          onClick={() => handleStatFilter("in-progress")}
        >
          <div className={styles.statValue}>
            {FEATURES.filter((f) => f.status === "in-progress").length || "0"}
          </div>
          <div className={styles.statLabel}>In Progress</div>
        </div>
      </div>

      <div className={styles.controls}>
        <div className={styles.categories}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              type="button"
              className={`${styles.categoryBtn} ${activeCategory === cat.key ? styles.categoryBtnActive : ""}`}
              onClick={() => handleCategoryFilter(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search features..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {filtered.length === 0 && (
        <div className={styles.empty}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p>No features match your search.</p>
        </div>
      )}

      {["high", "medium", "low"].map(
        (impact) =>
          grouped[impact].length > 0 && (
            <div key={impact} className={styles.impactGroup}>
              <div className={styles.impactHeader}>
                <span
                  className={styles.impactDot}
                  style={{ background: IMPACT_CONFIG[impact].color }}
                />
                <h2 className={styles.impactTitle}>
                  {IMPACT_CONFIG[impact].label}
                </h2>
                <span className={styles.impactCount}>
                  {grouped[impact].length}
                </span>
              </div>
              <div className={styles.featureList}>
                {grouped[impact].map((feature) => {
                  const status = STATUS_CONFIG[feature.status];
                  return (
                    <div key={feature.title} className={styles.featureCard}>
                      <div className={styles.featureTop}>
                        <h3 className={styles.featureTitle}>{feature.title}</h3>
                        <div className={styles.featureBadges}>
                          <span
                            className={styles.statusBadge}
                            style={{
                              color: status.color,
                              background: status.color + "14",
                              borderColor: status.color + "30",
                            }}
                          >
                            {status.label}
                          </span>
                          <span className={styles.categoryBadge}>
                            {CATEGORY_LABELS[feature.category]}
                          </span>
                        </div>
                      </div>
                      <p className={styles.featureDesc}>
                        {feature.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )
      )}
    </>
  );
}
