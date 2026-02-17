"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import StyledQRCode, { generateQRCodeSVG } from "../StyledQRCode";
import styles from "./page.module.css";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";

const DOWNLOAD_SIZES = [
  { key: 256, label: "256px" },
  { key: 512, label: "512px" },
  { key: 1000, label: "1000px" },
  { key: 2000, label: "2000px" },
];

const FILTERS = [
  { key: "all", label: "All" },
  { key: "tracked", label: "Tracked" },
  { key: "url", label: "URL" },
  { key: "other", label: "Other" },
];

function isUrlContent(content) {
  try {
    const url = new URL(content);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export default function AllQrCodesPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [qrCodes, setQrCodes] = useState([]);
  const [scanCounts, setScanCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [downloadSizes, setDownloadSizes] = useState({});

  const loadQrCodes = useCallback(async () => {
    try {
      const res = await projectFetch(`/api/qr-codes`);
      if (res.ok) {
        const data = await res.json();
        setQrCodes(data.qrCodes);
      }
    } catch {
      // Ignore
    }
    setLoading(false);
  }, [projectFetch]);

  useEffect(() => {
    loadQrCodes(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetching on mount
  }, [loadQrCodes]);

  useEffect(() => {
    async function loadScanCounts() {
      try {
        const res = await projectFetch("/api/qr-codes/analytics");
        if (res.ok) {
          const data = await res.json();
          const counts = {};
          for (const qr of data.qrCodes) {
            counts[qr.id] = qr.total_scans;
          }
          setScanCounts(counts);
        }
      } catch {
        // Ignore
      }
    }
    if (qrCodes.length > 0) loadScanCounts();
  }, [qrCodes.length, projectFetch]);

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/qr-codes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setQrCodes((prev) => prev.filter((qr) => qr.id !== id));
      }
    } catch {
      // Ignore
    }
  }

  function handleDownloadSvg(qr) {
    const size = downloadSizes[qr.id] || 1000;
    const svgContent = generateQRCodeSVG({
      value: qr.content,
      size,
      bgColor: qr.background_color || "#ffffff",
      squaresColor: qr.squares_color || "#000000",
      pixelsColor: qr.pixels_color || "#000000",
      style: qr.style || "classic",
      pattern: qr.pattern || "solid",
    });
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${qr.label || "code"}-${size}px.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleDownloadPng(qr) {
    const size = downloadSizes[qr.id] || 1000;
    const svgContent = generateQRCodeSVG({
      value: qr.content,
      size,
      bgColor: qr.background_color || "#ffffff",
      squaresColor: qr.squares_color || "#000000",
      pixelsColor: qr.pixels_color || "#000000",
      style: qr.style || "classic",
      pattern: qr.pattern || "solid",
    });
    if (!svgContent) return;

    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(url);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `qr-${qr.label || "code"}-${size}px.png`;
      a.click();
    };
    img.src = url;
  }

  const filtered = qrCodes.filter((qr) => {
    const displayContent = qr.original_url || qr.content;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      const matchLabel = qr.label?.toLowerCase().includes(q);
      const matchContent = displayContent.toLowerCase().includes(q);
      if (!matchLabel && !matchContent) return false;
    }

    // Type filter
    if (filter === "tracked") return qr.short_code && qr.original_url;
    if (filter === "url") return isUrlContent(displayContent);
    if (filter === "other") return !isUrlContent(displayContent);
    return true;
  });

  if (loading) {
    const s = { background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("140px", "28px", "0.5rem")} />
        <div style={b("200px", "14px", "1.5rem")} />
        <div className={styles.list}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className={styles.row}>
              <div style={b("56px", "56px")} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={b("40%", "14px")} />
                <div style={b("70%", "12px")} />
                <div style={b("30%", "10px")} />
              </div>
              <div style={b("80px", "14px")} />
            </div>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>All QR Codes</h1>
      <p className={styles.subheading}>Browse and manage all your saved QR codes.</p>

      {qrCodes.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No QR codes yet</div>
          <div className={styles.emptyDesc}>Create your first QR code to see it here.</div>
          <Link href="/dashboard/qr-codes" className={styles.createLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Create QR Code
          </Link>
        </div>
      ) : (
        <>
          <div className={styles.toolbar}>
            <input
              className={styles.searchInput}
              type="text"
              placeholder="Search by label or content..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`${styles.filterBtn} ${filter === f.key ? styles.filterBtnActive : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
            <span className={styles.countText}>
              {filtered.length} of {qrCodes.length}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className={styles.emptyState}>No QR codes match your search.</div>
          ) : (
            <div className={styles.list}>
              {filtered.map((qr) => {
                const displayContent = qr.original_url || qr.content;
                return (
                  <div key={qr.id} className={styles.row}>
                    <div className={styles.rowQr}>
                      <StyledQRCode
                        value={qr.content}
                        size={56}
                        bgColor={qr.background_color || "#ffffff"}
                        squaresColor={qr.squares_color || "#000000"}
                        pixelsColor={qr.pixels_color || "#000000"}
                        style={qr.style || "classic"}
                        pattern={qr.pattern || "solid"}
                      />
                    </div>
                    <div className={styles.rowInfo}>
                      {qr.label && <div className={styles.rowLabel}>{qr.label}</div>}
                      <div className={styles.rowContent} title={displayContent}>{displayContent}</div>
                      <div className={styles.rowMeta}>
                        <span className={styles.rowDate}>
                          {new Date(qr.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                        {scanCounts[qr.id] > 0 && (
                          <span className={styles.scanBadge}>
                            {scanCounts[qr.id]} scan{scanCounts[qr.id] !== 1 ? "s" : ""}
                          </span>
                        )}
                        {qr.short_code && qr.original_url && (
                          <span className={styles.trackingBadge}>Tracking</span>
                        )}
                      </div>
                    </div>
                    <div className={styles.rowActions}>
                      <Link href="/dashboard/qr-codes/analytics" className={styles.analyticsBtn} title="Analytics">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                      </Link>
                      <select
                        className={styles.sizeSelect}
                        value={downloadSizes[qr.id] || 1000}
                        onChange={(e) => setDownloadSizes((prev) => ({ ...prev, [qr.id]: Number(e.target.value) }))}
                        title="Download size"
                      >
                        {DOWNLOAD_SIZES.map((s) => (
                          <option key={s.key} value={s.key}>{s.label}</option>
                        ))}
                      </select>
                      <button className={styles.actionBtn} onClick={() => handleDownloadSvg(qr)} type="button" title="Download SVG">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        SVG
                      </button>
                      <button className={styles.actionBtn} onClick={() => handleDownloadPng(qr)} type="button" title="Download PNG">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        PNG
                      </button>
                      <button className={styles.deleteBtn} onClick={() => handleDelete(qr.id)} type="button" title="Delete">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}
