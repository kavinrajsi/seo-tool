"use client";

import { useState, useCallback } from "react";
import { FileDownIcon } from "lucide-react";

function escapeHtml(str) {
  return (str || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function scoreColor(s) {
  if (s >= 70) return "#4caf50";
  if (s >= 40) return "#ff9800";
  return "#f44336";
}

function buildFullReportHTML({ seoResult, pageSpeedData, crawlData, sections }) {
  const date = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const url = seoResult?.url || "Unknown";

  let pages = "";
  let tocItems = "";
  let pageNum = 3;

  // ── SEO Analysis Section ─────────────────────────────────
  if (sections.seo && seoResult) {
    tocItems += `<div class="toc-row"><span>SEO Analysis</span><span>${pageNum}</span></div>`;
    const score = seoResult.score || 0;
    const checks = seoResult.checks || [];
    const pass = checks.filter((c) => c.status === "pass").length;
    const fail = checks.filter((c) => c.status === "fail").length;
    const warn = checks.filter((c) => c.status === "warning").length;

    let checksHtml = checks.map((c) => {
      const sym = c.status === "pass" ? "✓" : c.status === "warning" ? "⚠" : "✗";
      const col = c.status === "pass" ? "#4caf50" : c.status === "warning" ? "#ff9800" : "#f44336";
      return `<div style="padding:8px 0;border-bottom:1px solid #f0f0f0;display:flex;gap:8px;page-break-inside:avoid;">
        <span style="color:${col};font-weight:700;width:20px;text-align:center;">${sym}</span>
        <span style="font-size:13px;">${escapeHtml(c.name)}</span>
      </div>`;
    }).join("");

    pages += `<div class="page">
      <div class="ph">SEO Analysis — ${escapeHtml(url)} — ${date}</div>
      <h2>SEO Analysis</h2>
      <div style="display:flex;gap:24px;margin:16px 0;">
        <div style="background:#f5f5f5;border-radius:8px;padding:20px 28px;text-align:center;">
          <div style="font-size:12px;color:#888;text-transform:uppercase;">Score</div>
          <div style="font-size:36px;font-weight:700;color:${scoreColor(score)};">${score}</div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;flex:1;">
          <div style="background:#fafafa;border:1px solid #eee;border-radius:6px;padding:12px;">
            <div style="font-size:18px;font-weight:600;color:#4caf50;">${pass}</div><div style="font-size:12px;color:#888;">Passed</div>
          </div>
          <div style="background:#fafafa;border:1px solid #eee;border-radius:6px;padding:12px;">
            <div style="font-size:18px;font-weight:600;color:#f44336;">${fail}</div><div style="font-size:12px;color:#888;">Failed</div>
          </div>
          <div style="background:#fafafa;border:1px solid #eee;border-radius:6px;padding:12px;">
            <div style="font-size:18px;font-weight:600;color:#ff9800;">${warn}</div><div style="font-size:12px;color:#888;">Warnings</div>
          </div>
          <div style="background:#fafafa;border:1px solid #eee;border-radius:6px;padding:12px;">
            <div style="font-size:18px;font-weight:600;">${checks.length}</div><div style="font-size:12px;color:#888;">Total Checks</div>
          </div>
        </div>
      </div>
      ${checksHtml}
    </div>`;
    pageNum++;
  }

  // ── PageSpeed Section ────────────────────────────────────
  if (sections.pagespeed && pageSpeedData) {
    tocItems += `<div class="toc-row"><span>PageSpeed Insights</span><span>${pageNum}</span></div>`;
    const metrics = pageSpeedData.metrics || {};
    const psScore = pageSpeedData.score ?? "—";

    pages += `<div class="page">
      <div class="ph">PageSpeed Insights — ${escapeHtml(url)} — ${date}</div>
      <h2>PageSpeed Insights</h2>
      <div style="display:flex;gap:24px;margin:16px 0;">
        <div style="background:#f5f5f5;border-radius:8px;padding:20px 28px;text-align:center;">
          <div style="font-size:12px;color:#888;text-transform:uppercase;">Performance</div>
          <div style="font-size:36px;font-weight:700;color:${scoreColor(psScore)};">${psScore}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:16px;">
        ${Object.entries(metrics).map(([k, v]) => `
          <div style="border:1px solid #e8e8e8;border-radius:6px;padding:12px;">
            <div style="font-size:11px;color:#888;text-transform:uppercase;">${escapeHtml(k)}</div>
            <div style="font-size:16px;font-weight:600;margin-top:4px;">${v}</div>
          </div>
        `).join("")}
      </div>
    </div>`;
    pageNum++;
  }

  // ── Crawl Data Section ───────────────────────────────────
  if (sections.crawl && crawlData) {
    tocItems += `<div class="toc-row"><span>Site Crawl Report</span><span>${pageNum}</span></div>`;

    pages += `<div class="page">
      <div class="ph">Site Crawl Report — ${escapeHtml(url)} — ${date}</div>
      <h2>Site Crawl Report</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:16px 0;">
        <div style="border:1px solid #e8e8e8;border-radius:6px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${crawlData.total_pages || 0}</div>
          <div style="font-size:12px;color:#888;">Pages Crawled</div>
        </div>
        <div style="border:1px solid #e8e8e8;border-radius:6px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;">${crawlData.sitemap_total || 0}</div>
          <div style="font-size:12px;color:#888;">Sitemap URLs</div>
        </div>
        <div style="border:1px solid #e8e8e8;border-radius:6px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#f44336;">${(crawlData.status_codes?.client_error || 0) + (crawlData.status_codes?.server_error || 0)}</div>
          <div style="font-size:12px;color:#888;">Error Pages</div>
        </div>
      </div>
      <h3 style="font-size:14px;font-weight:600;margin:20px 0 8px;">HTTP Status Codes</h3>
      <div style="font-size:13px;line-height:2;">
        2xx OK: ${crawlData.status_codes?.ok || 0} ·
        3xx Redirect: ${crawlData.status_codes?.redirect || 0} ·
        4xx Error: ${crawlData.status_codes?.client_error || 0} ·
        5xx Error: ${crawlData.status_codes?.server_error || 0}
      </div>
    </div>`;
    pageNum++;
  }

  return `<div id="full-report" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#222;background:#fff;width:210mm;margin:0 auto;">
    <div style="height:270mm;display:flex;align-items:center;justify-content:center;text-align:center;">
      <div>
        <div style="display:inline-block;background:#1a73e8;color:#fff;font-size:18px;font-weight:700;padding:8px 24px;border-radius:6px;margin-bottom:24px;letter-spacing:2px;">FULL SEO REPORT</div>
        <h1 style="font-size:36px;font-weight:700;color:#111;margin:0 0 12px;">${escapeHtml(url)}</h1>
        <p style="font-size:14px;color:#888;">Generated on ${date}</p>
      </div>
    </div>
    <div class="page">
      <div class="ph">${escapeHtml(url)} — ${date}</div>
      <h2>Table of Contents</h2>
      <div style="margin-top:16px;">${tocItems}</div>
    </div>
    ${pages}
  </div>
  <style>
    #full-report * { box-sizing:border-box; }
    .page { padding:20mm 15mm; page-break-before:always; }
    .ph { font-size:10px;color:#999;border-bottom:1px solid #e0e0e0;padding-bottom:6px;margin-bottom:20px; }
    h2 { font-size:22px;font-weight:700;color:#111;margin:0 0 16px; }
    .toc-row { display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px dotted #ccc;font-size:15px;color:#333; }
  </style>`;
}

export function FullReportPdfButton({ seoResult, pageSpeedData, crawlData }) {
  const [exporting, setExporting] = useState(false);
  const [sections, setSections] = useState({ seo: true, pagespeed: true, crawl: true });
  const [showOptions, setShowOptions] = useState(false);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.innerHTML = buildFullReportHTML({ seoResult, pageSpeedData, crawlData, sections });
      document.body.appendChild(container);

      const el = container.querySelector("#full-report");
      const slug = (seoResult?.url || "site").replace(/^https?:\/\//, "").replace(/[^a-z0-9.]/gi, "-").slice(0, 40);

      await html2pdf()
        .set({
          margin: 0,
          filename: `full-seo-report-${slug}-${Date.now()}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css"] },
        })
        .from(el)
        .save();

      document.body.removeChild(container);
    } catch (err) {
      console.error("Full report PDF export failed:", err);
    } finally {
      setExporting(false);
      setShowOptions(false);
    }
  }, [seoResult, pageSpeedData, crawlData, sections]);

  const hasSections = seoResult || pageSpeedData || crawlData;
  if (!hasSections) return null;

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowOptions(!showOptions)}
        disabled={exporting}
        className="rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-2"
      >
        <FileDownIcon className="h-4 w-4" />
        {exporting ? "Exporting..." : "Full Report"}
      </button>

      {showOptions && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-lg border border-border bg-card p-4 shadow-lg z-10">
          <p className="text-xs font-medium text-muted-foreground mb-3">Include in report:</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sections.seo} onChange={(e) => setSections((s) => ({ ...s, seo: e.target.checked }))} disabled={!seoResult} className="rounded" />
              SEO Analysis {!seoResult && <span className="text-xs text-muted-foreground">(no data)</span>}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sections.pagespeed} onChange={(e) => setSections((s) => ({ ...s, pagespeed: e.target.checked }))} disabled={!pageSpeedData} className="rounded" />
              PageSpeed {!pageSpeedData && <span className="text-xs text-muted-foreground">(no data)</span>}
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={sections.crawl} onChange={(e) => setSections((s) => ({ ...s, crawl: e.target.checked }))} disabled={!crawlData} className="rounded" />
              Crawl Report {!crawlData && <span className="text-xs text-muted-foreground">(no data)</span>}
            </label>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting || (!sections.seo && !sections.pagespeed && !sections.crawl)}
            className="mt-3 w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {exporting ? "Generating..." : "Generate PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
