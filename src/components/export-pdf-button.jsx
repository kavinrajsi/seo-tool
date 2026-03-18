"use client";

import { useState, useCallback, useRef } from "react";

const CATEGORY_LABELS = {
  "on-page": "Basic SEO",
  technical: "Advanced SEO",
  content: "Content & Keywords",
  images: "Images & Media",
  security: "Security",
  "structured-data": "Structured Data & Files",
  resources: "Performance",
};

const CATEGORY_ORDER = [
  "on-page",
  "technical",
  "content",
  "images",
  "security",
  "structured-data",
  "resources",
];

function getStatusSymbol(status) {
  if (status === "pass") return "\u2713";
  if (status === "warning") return "\u26A0";
  return "\u2717";
}

function getStatusColor(status) {
  if (status === "pass") return "#4caf50";
  if (status === "warning") return "#ff9800";
  return "#f44336";
}

function getScoreLabel(score) {
  if (score >= 80) return "Excellent!";
  if (score >= 60) return "Very Good!";
  if (score >= 40) return "Needs Improvement";
  return "Critical Issues";
}

function buildReportHTML(result) {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const url = result.url || "Unknown URL";

  const checks = result.checks || [];
  const grouped = {};
  for (const check of checks) {
    const cat = check.category || "other";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(check);
  }

  const categories = CATEGORY_ORDER.filter((cat) => grouped[cat]?.length > 0);

  const totalChecks = checks.length;
  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warning").length;

  // Score color
  const scoreColor =
    result.score >= 70 ? "#4caf50" : result.score >= 40 ? "#ff9800" : "#f44336";

  // Build sections HTML
  let sectionsHTML = "";
  let tocHTML = "";

  tocHTML += `<div class="toc-item"><span>Overview</span><span>3</span></div>`;

  categories.forEach((cat, i) => {
    const label = CATEGORY_LABELS[cat] || cat;
    tocHTML += `<div class="toc-item"><span>${label}</span><span>${i + 4}</span></div>`;

    const catChecks = grouped[cat];
    let checksHTML = "";

    catChecks.forEach((check) => {
      const color = getStatusColor(check.status);
      const symbol = getStatusSymbol(check.status);
      checksHTML += `
        <div class="check-item">
          <div class="check-header">
            <span class="check-icon" style="color:${color}">${symbol}</span>
            <span class="check-name">${check.name}</span>
          </div>
          ${check.message ? `<p class="check-message">${check.message}</p>` : ""}
        </div>
      `;
    });

    const catPass = catChecks.filter((c) => c.status === "pass").length;
    sectionsHTML += `
      <div class="section" style="page-break-before: always;">
        <div class="page-header">Generated for ${url} on ${date}</div>
        <h2 class="section-title">${label}</h2>
        <div class="section-summary">${catPass} of ${catChecks.length} checks passed</div>
        ${checksHTML}
      </div>
    `;
  });

  return `
    <div id="seo-report" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #222; background: #fff; width: 210mm; margin: 0 auto;">

      <!-- Cover Page -->
      <div class="cover-page">
        <div class="cover-content">
          <div class="cover-badge">SEO</div>
          <h1 class="cover-title">SEO Analysis Report</h1>
          <p class="cover-url">${url}</p>
          <p class="cover-date">Generated on ${date}</p>
        </div>
      </div>

      <!-- Table of Contents -->
      <div class="section" style="page-break-before: always;">
        <div class="page-header">Generated for ${url} on ${date}</div>
        <h2 class="section-title">Table of Contents</h2>
        <div class="toc">
          ${tocHTML}
        </div>
      </div>

      <!-- Overview -->
      <div class="section" style="page-break-before: always;">
        <div class="page-header">Generated for ${url} on ${date}</div>
        <h2 class="section-title" style="margin-bottom: 4px;">${url}</h2>

        <div class="overview-grid">
          <div class="score-block">
            <div class="score-label">Overall Site Score</div>
            <div class="score-value" style="color: ${scoreColor};">${result.score} / 100</div>
            <div class="score-sublabel">${getScoreLabel(result.score)}</div>
          </div>
          <div class="counts-block">
            <div class="count-item">
              <div class="count-value">${totalChecks} of ${totalChecks}</div>
              <div class="count-label">All Items</div>
            </div>
            <div class="count-item">
              <div class="count-value" style="color:#f44336;">${failCount} of ${totalChecks}</div>
              <div class="count-label">Critical Issues</div>
            </div>
            <div class="count-item">
              <div class="count-value" style="color:#ff9800;">${warnCount} of ${totalChecks}</div>
              <div class="count-label">Warnings</div>
            </div>
            <div class="count-item">
              <div class="count-value" style="color:#4caf50;">${passCount} of ${totalChecks}</div>
              <div class="count-label">Good Results</div>
            </div>
          </div>
        </div>

        ${result.title ? `
        <div class="search-preview">
          <h3 class="preview-heading">Search Preview</h3>
          <p class="preview-sub">Here is how the site may appear in search results:</p>
          <div class="preview-box">
            <div class="preview-url">${url}</div>
            <div class="preview-title">${result.title}</div>
            ${result.meta_description ? `<div class="preview-desc">${result.meta_description}</div>` : ""}
          </div>
        </div>
        ` : ""}

        ${result.category_scores ? `
        <div class="category-bars">
          ${categories
            .map((cat) => {
              const pct = Math.round(result.category_scores[cat]?.pct || 0);
              const barColor = pct >= 70 ? "#4caf50" : pct >= 40 ? "#ff9800" : "#f44336";
              return `
                <div class="cat-bar-row">
                  <div class="cat-bar-label">${CATEGORY_LABELS[cat] || cat}</div>
                  <div class="cat-bar-track">
                    <div class="cat-bar-fill" style="width:${pct}%; background:${barColor};"></div>
                  </div>
                  <div class="cat-bar-pct">${pct}%</div>
                </div>
              `;
            })
            .join("")}
        </div>
        ` : ""}
      </div>

      <!-- Detail Sections -->
      ${sectionsHTML}

      <!-- Page Details -->
      <div class="section" style="page-break-before: always;">
        <div class="page-header">Generated for ${url} on ${date}</div>
        <h2 class="section-title">Page Details</h2>
        <div class="details-grid">
          <div class="detail-card">
            <div class="detail-label">Title</div>
            <div class="detail-value">${result.title || '<span style="color:#999;">Missing</span>'}</div>
          </div>
          <div class="detail-card">
            <div class="detail-label">Meta Description</div>
            <div class="detail-value">${result.meta_description || '<span style="color:#999;">Missing</span>'}</div>
          </div>
          <div class="detail-card">
            <div class="detail-label">Canonical URL</div>
            <div class="detail-value">${result.canonical || '<span style="color:#999;">Not set</span>'}</div>
          </div>
          <div class="detail-card">
            <div class="detail-label">OG Title</div>
            <div class="detail-value">${result.og_title || '<span style="color:#999;">Missing</span>'}</div>
          </div>
          <div class="detail-card">
            <div class="detail-label">OG Description</div>
            <div class="detail-value">${result.og_description || '<span style="color:#999;">Missing</span>'}</div>
          </div>
          <div class="detail-card">
            <div class="detail-label">Language</div>
            <div class="detail-value">${result.lang || '<span style="color:#999;">Not set</span>'}</div>
          </div>
        </div>

        <h3 style="font-size:16px; font-weight:600; margin:24px 0 12px 0; color:#333;">Content Stats</h3>
        <div class="stats-row">
          <div class="stat-item">
            <div class="stat-value">${result.word_count ?? "—"}</div>
            <div class="stat-label">Words</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${result.h1s?.length ?? 0}</div>
            <div class="stat-label">H1 Tags</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${result.images_with_alt ?? 0}/${result.total_images ?? 0}</div>
            <div class="stat-label">Img Alt</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${result.internal_links ?? 0}</div>
            <div class="stat-label">Internal Links</div>
          </div>
          <div class="stat-item">
            <div class="stat-value">${result.external_links ?? 0}</div>
            <div class="stat-label">External Links</div>
          </div>
          ${result.html_size_kb !== undefined ? `
          <div class="stat-item">
            <div class="stat-value">${Math.round(result.html_size_kb)}</div>
            <div class="stat-label">HTML KB</div>
          </div>` : ""}
          ${result.dom_node_count !== undefined ? `
          <div class="stat-item">
            <div class="stat-value">${result.dom_node_count.toLocaleString()}</div>
            <div class="stat-label">DOM Nodes</div>
          </div>` : ""}
        </div>

        ${result.keyword_cloud?.length ? `
        <h3 style="font-size:16px; font-weight:600; margin:24px 0 12px 0; color:#333;">Top Keywords</h3>
        <div class="keyword-list">
          ${result.keyword_cloud.map((kw) => `<span class="keyword-tag">${kw.word} <small>(${kw.count})</small></span>`).join(" ")}
        </div>
        ` : ""}
      </div>
    </div>

    <style>
      #seo-report * { box-sizing: border-box; }

      .cover-page {
        height: 270mm;
        display: flex;
        align-items: center;
        justify-content: center;
        text-align: center;
      }
      .cover-badge {
        display: inline-block;
        background: #1a73e8;
        color: #fff;
        font-size: 18px;
        font-weight: 700;
        padding: 8px 24px;
        border-radius: 6px;
        margin-bottom: 24px;
        letter-spacing: 2px;
      }
      .cover-title {
        font-size: 36px;
        font-weight: 700;
        color: #111;
        margin: 0 0 12px 0;
      }
      .cover-url {
        font-size: 18px;
        color: #555;
        margin: 0 0 8px 0;
      }
      .cover-date {
        font-size: 14px;
        color: #888;
        margin: 0;
      }

      .page-header {
        font-size: 10px;
        color: #999;
        border-bottom: 1px solid #e0e0e0;
        padding-bottom: 6px;
        margin-bottom: 20px;
      }

      .section {
        padding: 20mm 15mm;
      }
      .section-title {
        font-size: 22px;
        font-weight: 700;
        color: #111;
        margin: 0 0 16px 0;
      }
      .section-summary {
        font-size: 13px;
        color: #666;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
      }

      .toc { margin-top: 16px; }
      .toc-item {
        display: flex;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px dotted #ccc;
        font-size: 15px;
        color: #333;
      }

      .overview-grid {
        display: flex;
        gap: 24px;
        margin: 20px 0;
        align-items: flex-start;
      }
      .score-block {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 20px 28px;
        text-align: center;
        min-width: 180px;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .score-label {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .score-value {
        font-size: 32px;
        font-weight: 700;
      }
      .score-sublabel {
        font-size: 14px;
        color: #888;
        margin-top: 4px;
      }

      .counts-block {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        flex: 1;
      }
      .count-item {
        background: #fafafa;
        border: 1px solid #eee;
        border-radius: 6px;
        padding: 12px 16px;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .count-value {
        font-size: 18px;
        font-weight: 600;
      }
      .count-label {
        font-size: 12px;
        color: #888;
        margin-top: 2px;
      }

      .search-preview { margin-top: 24px; }
      .preview-heading {
        font-size: 16px;
        font-weight: 600;
        margin: 0 0 4px 0;
        color: #333;
      }
      .preview-sub {
        font-size: 13px;
        color: #888;
        margin: 0 0 12px 0;
      }
      .preview-box {
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        padding: 16px;
        page-break-inside: avoid;
        break-inside: avoid;
        background: #fafafa;
      }
      .preview-url {
        font-size: 12px;
        color: #888;
        margin-bottom: 4px;
      }
      .preview-title {
        font-size: 18px;
        color: #1a0dab;
        margin-bottom: 4px;
      }
      .preview-desc {
        font-size: 13px;
        color: #555;
        line-height: 1.5;
      }

      .category-bars { margin-top: 24px; }
      .cat-bar-row {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }
      .cat-bar-label {
        width: 180px;
        font-size: 13px;
        color: #444;
        flex-shrink: 0;
      }
      .cat-bar-track {
        flex: 1;
        height: 10px;
        background: #e8e8e8;
        border-radius: 5px;
        overflow: hidden;
      }
      .cat-bar-fill {
        height: 100%;
        border-radius: 5px;
        transition: width 0.3s;
      }
      .cat-bar-pct {
        width: 40px;
        text-align: right;
        font-size: 13px;
        font-weight: 600;
        color: #444;
      }

      .check-item {
        padding: 14px 0;
        border-bottom: 1px solid #f0f0f0;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .check-header {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .check-icon {
        font-size: 16px;
        font-weight: 700;
        width: 24px;
        text-align: center;
        flex-shrink: 0;
      }
      .check-name {
        font-size: 14px;
        font-weight: 600;
        color: #222;
      }
      .check-message {
        margin: 6px 0 0 34px;
        font-size: 13px;
        color: #666;
        line-height: 1.6;
      }

      .details-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .detail-card {
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        padding: 14px 16px;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .detail-label {
        font-size: 11px;
        font-weight: 600;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      }
      .detail-value {
        font-size: 14px;
        color: #222;
        word-break: break-word;
        line-height: 1.5;
      }

      .stats-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .stat-item {
        background: #f5f5f5;
        border-radius: 8px;
        padding: 12px 18px;
        text-align: center;
        min-width: 80px;
        flex: 1;
        page-break-inside: avoid;
        break-inside: avoid;
      }
      .stat-value {
        font-size: 20px;
        font-weight: 700;
        color: #222;
      }
      .stat-label {
        font-size: 11px;
        color: #888;
        margin-top: 2px;
      }

      .keyword-list {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .keyword-tag {
        display: inline-block;
        background: #f0f0f0;
        border-radius: 4px;
        padding: 4px 10px;
        font-size: 13px;
        color: #444;
      }
      .keyword-tag small {
        color: #999;
        font-size: 11px;
      }
    </style>
  `;
}

export function ExportPdfButton({ result, filename = "seo-report" }) {
  const [exporting, setExporting] = useState(false);
  const containerRef = useRef(null);

  const handleExport = useCallback(async () => {
    if (!result || exporting) return;

    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;

      // Create a temporary container with the report HTML
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.innerHTML = buildReportHTML(result);
      document.body.appendChild(container);

      const reportEl = container.querySelector("#seo-report");

      await html2pdf()
        .set({
          margin: 0,
          filename: `${filename}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css"] },
        })
        .from(reportEl)
        .save();

      document.body.removeChild(container);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  }, [result, filename, exporting]);

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        borderRadius: 8,
        border: "1px solid rgba(255,255,255,0.15)",
        background: "rgba(255,255,255,0.06)",
        color: "#e0e0e0",
        fontSize: 14,
        cursor: exporting ? "wait" : "pointer",
        opacity: exporting ? 0.6 : 1,
        transition: "background 0.15s, opacity 0.15s",
      }}
      onMouseEnter={(e) => {
        if (!exporting) e.currentTarget.style.background = "rgba(255,255,255,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.06)";
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {exporting ? "Exporting..." : "Export PDF"}
    </button>
  );
}
