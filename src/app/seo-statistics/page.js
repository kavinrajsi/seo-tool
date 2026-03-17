"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./statistics.module.scss";

function BarChart({ rows, maxVal }) {
  const max = maxVal || Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className={styles.barRows}>
      {rows.map((row) => (
        <div key={row.label} className={styles.barRow}>
          <span className={styles.barLabel}>{row.label}</span>
          <div className={styles.barTrack}>
            <div
              className={`${styles.barFill} ${styles[row.color] || styles.barBlue}`}
              style={{ width: `${(row.value / max) * 100}%` }}
            />
          </div>
          <span className={styles.barCount}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function pct(value, total) {
  if (!total) return "0%";
  return Math.round((value / total) * 100) + "%";
}

function StatTile({ title, mainStats, subStats }) {
  return (
    <div className={styles.tile}>
      <h3 className={styles.tileTitle}>{title}</h3>
      <div className={styles.tileMainRow}>
        {mainStats.map((m, i) => (
          <div key={i} className={styles.tileMainBlock}>
            <div className={styles.tileMainValue}>{m.value}</div>
            <div className={styles.tileMainLabel}>{m.label}</div>
          </div>
        ))}
      </div>
      {subStats && subStats.length > 0 && (
        <>
          <div className={styles.tileSpacer} />
          <div className={styles.tileSubStats}>
            {subStats.map((s, i) => (
              <div key={i} className={styles.tileSubStat}>
                <span className={styles.tileSubLabel}>{s.label}:</span>
                <span className={styles.tileSubValue}>{s.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TileView({ data }) {
  const total = data.total_pages || 1;
  const pagesWithAnalysis = data.total_pages - (data.status_codes.timeout || 0);

  // HTTP Status Code
  const errorPct = pct(data.status_codes.client_error + data.status_codes.server_error, total);

  // Crawl Depth: pages with more than 3 clicks
  const depthEntries = Object.entries(data.crawl_depth);
  const deepPages = depthEntries
    .filter(([d]) => Number(d) > 3)
    .reduce((sum, [, count]) => sum + count, 0);

  // Incoming Internal Links: pages with only 1 incoming link
  const oneLink = data.incoming_links.one_to_three || 0;
  const orphan = data.incoming_links.zero || 0;
  const singleLinkPct = pct(oneLink + orphan, total);

  // Markup: pages with no markup
  const noMarkupCount = pagesWithAnalysis - Math.max(
    data.markup.schemaOrg_microdata,
    data.markup.schemaOrg_jsonld,
    data.markup.openGraph,
    data.markup.twitterCards,
    data.markup.microformats
  );
  const noMarkupPct = pct(Math.max(0, noMarkupCount), total);

  // Hreflang
  const hreflangOk = data.hreflang.valid || 0;

  return (
    <div className={styles.tileSection}>
      <div className={styles.tileGrid}>
        <StatTile
          title="HTTP Status Code"
          mainStats={[{ value: errorPct, label: "pages with 4xx and 5xx status codes" }]}
          subStats={[
            { label: "5xx", value: pct(data.status_codes.server_error, total) },
            { label: "4xx", value: pct(data.status_codes.client_error, total) },
            { label: "3xx", value: pct(data.status_codes.redirect, total) },
            { label: "2xx", value: pct(data.status_codes.ok, total) },
            { label: "1xx", value: "0%" },
            { label: "No code", value: pct(data.status_codes.timeout, total) },
          ]}
        />

        <StatTile
          title="Sitemap vs. Crawled Pages"
          mainStats={[{ value: String(data.sitemap_total), label: "pages in sitemap" }]}
          subStats={[
            { label: "Crawled pages found in sitemap", value: pct(data.sitemap.in_sitemap, total) },
            { label: "Crawled pages not found in sitemap", value: pct(data.sitemap.not_in_sitemap, total) },
          ]}
        />

        <StatTile
          title="Pages Crawl Depth"
          mainStats={[{ value: pct(deepPages, total), label: "pages with more than 3 clicks" }]}
          subStats={depthEntries
            .sort(([a], [b]) => Number(a) - Number(b))
            .filter(([d]) => Number(d) >= 1)
            .map(([depth, count]) => ({
              label: `${depth} click${depth === "1" ? "" : "s"}`,
              value: pct(count, total),
            }))}
        />

        <StatTile
          title="Incoming Internal Links"
          mainStats={[{ value: singleLinkPct, label: "pages have only 1 incoming internal link" }]}
          subStats={[
            { label: "2-5", value: pct(data.incoming_links.one_to_three, total) },
            { label: "6-15", value: pct(data.incoming_links.four_to_ten, total) },
            { label: "16-50", value: pct(data.incoming_links.over_ten, total) },
            { label: "51-150", value: "0%" },
            { label: "151-500", value: "0%" },
            { label: "500+", value: "0%" },
          ]}
        />

        <StatTile
          title="Markup Types"
          mainStats={[{ value: noMarkupPct, label: "pages have no markup" }]}
          subStats={[
            { label: "Schema.org (Microdata)", value: pct(data.markup.schemaOrg_microdata, total) },
            { label: "Schema.org (JSON-LD)", value: pct(data.markup.schemaOrg_jsonld, total) },
            { label: "Open Graph", value: pct(data.markup.openGraph, total) },
            { label: "Twitter Cards", value: pct(data.markup.twitterCards, total) },
            { label: "Microformats", value: pct(data.markup.microformats, total) },
          ]}
        />

        <StatTile
          title="Canonicalization"
          mainStats={[{ value: pct(data.canonical.noCanonical, total), label: 'pages without rel="canonical" tag' }]}
          subStats={[
            { label: "Canonical to another page", value: pct(data.canonical.canonicalToOther, total) },
            { label: "Self-canonical", value: pct(data.canonical.selfCanonical, total) },
          ]}
        />

        <StatTile
          title="Hreflang Usage"
          mainStats={[{ value: pct(hreflangOk, total), label: "pages without issues" }]}
          subStats={[
            { label: "With issues", value: pct(data.hreflang.withIssues, total) },
          ]}
        />

        <StatTile
          title="AMP Links"
          mainStats={[
            { value: pct(data.amp.withoutAmp, total), label: "pages have no AMP link" },
            { value: pct(data.amp.withAmp, total), label: "pages have AMP link" },
          ]}
          subStats={[]}
        />
      </div>
    </div>
  );
}

export default function SeoStatistics() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [view, setView] = useState("tile");

  async function handleCrawl(e) {
    e.preventDefault();
    if (!url.trim()) return;

    setError("");
    setLoading(true);
    setData(null);

    try {
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Crawl failed");
        setLoading(false);
        return;
      }

      setData(json);
    } catch {
      setError("Network error. Please try again.");
    }

    setLoading(false);
  }

  const totalPages = data?.total_pages || 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>SEO Statistics</h1>
        <Link href="/dashboard" className={styles.backLink}>
          Dashboard
        </Link>
      </div>

      <div className={styles.content}>
        <form className={styles.crawlForm} onSubmit={handleCrawl}>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter site URL to crawl (e.g. example.com)"
            required
          />
          <button
            type="submit"
            className={styles.crawlBtn}
            disabled={loading}
          >
            {loading ? "Crawling..." : "Crawl Site"}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        {loading && (
          <div className={styles.loading}>
            <span className={styles.loadingSpin} />
            Crawling pages... this may take a moment
          </div>
        )}

        {data && (
          <>
            {/* Summary */}
            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue}>{data.total_pages}</div>
                <div className={styles.summaryLabel}>Pages Crawled</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue}>{data.sitemap_total}</div>
                <div className={styles.summaryLabel}>Sitemap URLs</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue}>
                  {data.status_codes.client_error + data.status_codes.server_error}
                </div>
                <div className={styles.summaryLabel}>Error Pages</div>
              </div>
              <div className={styles.summaryItem}>
                <div className={styles.summaryValue}>
                  {data.canonical.noCanonical}
                </div>
                <div className={styles.summaryLabel}>No Canonical</div>
              </div>
            </div>

            {/* View Toggle */}
            <div className={styles.viewToggle}>
              <button
                className={`${styles.viewToggleBtn} ${view === "tile" ? styles.viewToggleBtnActive : ""}`}
                onClick={() => setView("tile")}
              >
                <span className={styles.viewToggleIcon}>&#9638;</span> Tile
              </button>
              <button
                className={`${styles.viewToggleBtn} ${view === "graph" ? styles.viewToggleBtnActive : ""}`}
                onClick={() => setView("graph")}
              >
                <span className={styles.viewToggleIcon}>&#9636;</span> Graph
              </button>
            </div>

            {view === "tile" ? (
              <TileView data={data} />
            ) : (
            <div className={styles.grid}>
              {/* HTTP Status Codes */}
              <div className={styles.card}>
                <h3>
                  HTTP Status Codes
                  {data.error_pages.length > 0 && (
                    <span className={`${styles.badge} ${styles.badgeRed}`}>
                      {data.error_pages.length} errors
                    </span>
                  )}
                </h3>
                <BarChart
                  maxVal={totalPages}
                  rows={[
                    { label: "2xx Success", value: data.status_codes.ok, color: "barGreen" },
                    { label: "3xx Redirect", value: data.status_codes.redirect, color: "barYellow" },
                    { label: "4xx Client Error", value: data.status_codes.client_error, color: "barRed" },
                    { label: "5xx Server Error", value: data.status_codes.server_error, color: "barRed" },
                    { label: "Timeout / Failed", value: data.status_codes.timeout, color: "barGray" },
                  ]}
                />
                {data.error_pages.length > 0 && (
                  <div className={styles.urlList} style={{ marginTop: 12 }}>
                    {data.error_pages.map((p) => (
                      <div key={p.url} className={styles.urlItem}>
                        <span className={styles.urlText}>{p.url}</span>
                        <span className={`${styles.urlStatus} ${styles.statusRed}`}>
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sitemap vs Crawled */}
              <div className={styles.card}>
                <h3>Sitemap vs. Crawled Pages</h3>
                <BarChart
                  rows={[
                    { label: "In sitemap", value: data.sitemap.in_sitemap, color: "barGreen" },
                    { label: "Not in sitemap", value: data.sitemap.not_in_sitemap, color: "barYellow" },
                    { label: "Sitemap only", value: data.sitemap.sitemap_not_crawled, color: "barGray" },
                  ]}
                />
              </div>

              {/* Crawl Depth */}
              <div className={styles.card}>
                <h3>Pages Crawl Depth</h3>
                <BarChart
                  maxVal={totalPages}
                  rows={Object.entries(data.crawl_depth)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([depth, count]) => ({
                      label: depth === "0" ? "Homepage" : `${depth} click${depth === "1" ? "" : "s"}`,
                      value: count,
                      color:
                        Number(depth) <= 1
                          ? "barGreen"
                          : Number(depth) <= 3
                            ? "barBlue"
                            : "barYellow",
                    }))}
                />
              </div>

              {/* Incoming Internal Links */}
              <div className={styles.card}>
                <h3>
                  Incoming Internal Links
                  {data.incoming_links.zero > 0 && (
                    <span className={`${styles.badge} ${styles.badgeRed}`}>
                      {data.incoming_links.zero} orphan
                    </span>
                  )}
                </h3>
                <BarChart
                  maxVal={totalPages}
                  rows={[
                    { label: "0 links (orphan)", value: data.incoming_links.zero, color: "barRed" },
                    { label: "1-3 links", value: data.incoming_links.one_to_three, color: "barYellow" },
                    { label: "4-10 links", value: data.incoming_links.four_to_ten, color: "barGreen" },
                    { label: "10+ links", value: data.incoming_links.over_ten, color: "barGreen" },
                  ]}
                />
                {data.low_link_pages.length > 0 && (
                  <div className={styles.urlList} style={{ marginTop: 12 }}>
                    {data.low_link_pages.slice(0, 5).map((p) => (
                      <div key={p.url} className={styles.urlItem}>
                        <span className={styles.urlText}>{p.url}</span>
                        <span
                          className={`${styles.urlStatus} ${p.count === 0 ? styles.statusRed : styles.statusYellow}`}
                        >
                          {p.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Markup Types */}
              <div className={styles.card}>
                <h3>Markup Types</h3>
                <BarChart
                  maxVal={totalPages}
                  rows={[
                    { label: "Schema.org (Microdata)", value: data.markup.schemaOrg_microdata, color: "barPurple" },
                    { label: "Schema.org (JSON-LD)", value: data.markup.schemaOrg_jsonld, color: "barPurple" },
                    { label: "Open Graph", value: data.markup.openGraph, color: "barBlue" },
                    { label: "Twitter Cards", value: data.markup.twitterCards, color: "barCyan" },
                    { label: "Microformats", value: data.markup.microformats, color: "barGray" },
                  ]}
                />
              </div>

              {/* Canonicalization */}
              <div className={styles.card}>
                <h3>
                  Canonicalization
                  {data.canonical.noCanonical > 0 && (
                    <span className={`${styles.badge} ${styles.badgeYellow}`}>
                      {data.canonical.noCanonical} missing
                    </span>
                  )}
                </h3>
                <BarChart
                  maxVal={totalPages}
                  rows={[
                    { label: "Self-canonical", value: data.canonical.selfCanonical, color: "barGreen" },
                    { label: "Canonical to other", value: data.canonical.canonicalToOther, color: "barBlue" },
                    { label: "No canonical tag", value: data.canonical.noCanonical, color: "barRed" },
                  ]}
                />
                {data.no_canonical_pages.length > 0 && (
                  <div className={styles.urlList} style={{ marginTop: 12 }}>
                    {data.no_canonical_pages.map((u) => (
                      <div key={u} className={styles.urlItem}>
                        <span className={styles.urlText}>{u}</span>
                        <span className={`${styles.urlStatus} ${styles.statusRed}`}>
                          missing
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Hreflang Usage */}
              <div className={styles.card}>
                <h3>Hreflang Usage</h3>
                <BarChart
                  maxVal={totalPages}
                  rows={[
                    { label: "Valid hreflang", value: data.hreflang.valid, color: "barGreen" },
                    { label: "With issues", value: data.hreflang.withIssues, color: "barRed" },
                    { label: "Without hreflang", value: data.hreflang.withoutHreflang, color: "barGray" },
                  ]}
                />
              </div>

              {/* AMP Links */}
              <div className={styles.card}>
                <h3>AMP Links</h3>
                <BarChart
                  maxVal={totalPages}
                  rows={[
                    { label: "Has AMP link", value: data.amp.withAmp, color: "barGreen" },
                    { label: "No AMP link", value: data.amp.withoutAmp, color: "barGray" },
                  ]}
                />
              </div>
            </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
