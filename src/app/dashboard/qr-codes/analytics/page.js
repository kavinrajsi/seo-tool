"use client";

import { useState, useEffect } from "react";
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

export default function QrAnalyticsPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloadSizes, setDownloadSizes] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const res = await projectFetch("/api/qr-codes/analytics");
        if (res.ok) {
          setData(await res.json());
        }
      } catch {
        // Ignore
      }
      setLoading(false);
    }
    load();
  }, [projectFetch]);

  if (loading) {
    const s = { background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("160px", "28px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.statCard}>
              <div style={b("40%", "28px", "0.5rem")} />
              <div style={b("60%", "12px")} />
            </div>
          ))}
        </div>
        <div className={styles.section}>
          <div style={b("140px", "20px", "1rem")} />
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} style={{ display: "flex", gap: "1rem", padding: "0.5rem 0" }}>
              <div style={b("50px", "14px")} />
              <div style={{ ...b("60%", "16px"), flex: 1 }} />
              <div style={b("30px", "14px")} />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!data) {
    return <p className={styles.emptyState}>Could not load analytics data.</p>;
  }

  const maxDaily = Math.max(...data.dailyScans.map((d) => d.count), 1);
  const totalDeviceScans = data.deviceBreakdown.mobile + data.deviceBreakdown.desktop + data.deviceBreakdown.tablet;
  const maxHourly = Math.max(...(data.scansByHour || []).map((h) => h.count), 1);
  const osEntries = Object.entries(data.scansByOS || {}).sort((a, b) => b[1] - a[1]);
  const totalOS = osEntries.reduce((sum, [, c]) => sum + c, 0) || 1;
  const browserEntries = Object.entries(data.scansByBrowser || {}).sort((a, b) => b[1] - a[1]);
  const totalBrowser = browserEntries.reduce((sum, [, c]) => sum + c, 0) || 1;
  const countryEntries = Object.entries(data.scansByCountry || {}).sort((a, b) => b[1] - a[1]);
  const totalCountry = countryEntries.reduce((sum, [, c]) => sum + c, 0) || 1;

  function formatDate(dateStr) {
    if (!dateStr) return "Never";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  function formatBarDate(dateStr) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  const hasScans = data.totalScans > 0;

  return (
    <>
      <Link href="/dashboard/qr-codes" className={styles.backLink}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to QR Codes
      </Link>

      <h1 className={styles.heading}>QR Code Analytics</h1>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.totalQrCodes}</div>
          <div className={styles.statLabel}>Total QR Codes</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.trackableCount}</div>
          <div className={styles.statLabel}>Trackable</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.totalScans}</div>
          <div className={styles.statLabel}>Total Scans</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{data.scansToday}</div>
          <div className={styles.statLabel}>Scans Today</div>
        </div>
      </div>

      {!hasScans ? (
        <div className={styles.section}>
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </span>
            <div className={styles.emptyTitle}>No scan data yet</div>
            <div className={styles.emptyDesc}>
              Enable scan tracking on your URL-type QR codes to start collecting analytics. Go to the QR Codes page, create or edit a URL QR code, and check &quot;Enable scan tracking&quot;.
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Scans Over Time</h2>
            <p className={styles.sectionDesc}>Last 30 days</p>
            <div className={styles.barChart}>
              {data.dailyScans.map((day) => (
                <div key={day.date} className={styles.barRow}>
                  <span className={styles.barLabel}>{formatBarDate(day.date)}</span>
                  <div className={styles.barTrack}>
                    <div
                      className={styles.barFill}
                      style={{ width: `${(day.count / maxDaily) * 100}%` }}
                    />
                  </div>
                  <span className={styles.barValue}>{day.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Device Breakdown</h2>
            <p className={styles.sectionDesc}>How QR codes are scanned</p>
            <div className={styles.deviceList}>
              {["mobile", "desktop", "tablet"].map((type) => {
                const count = data.deviceBreakdown[type] || 0;
                const pct = totalDeviceScans > 0 ? Math.round((count / totalDeviceScans) * 100) : 0;
                const fillClass = type === "mobile" ? styles.deviceFillMobile : type === "desktop" ? styles.deviceFillDesktop : styles.deviceFillTablet;
                return (
                  <div key={type} className={styles.deviceItem}>
                    <span className={styles.deviceLabel}>{type}</span>
                    <div className={styles.deviceTrack}>
                      <div className={`${styles.deviceFill} ${fillClass}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className={styles.deviceValue}>{count} ({pct}%)</span>
                  </div>
                );
              })}
            </div>
          </div>

          {data.scansByHour && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Scans by Time of Day</h2>
              <p className={styles.sectionDesc}>Hourly distribution of scans</p>
              <div className={styles.hourChart}>
                {data.scansByHour.map((h) => (
                  <div key={h.hour} className={styles.hourBar}>
                    {h.count > 0 && <span className={styles.hourBarCount}>{h.count}</span>}
                    <div
                      className={styles.hourBarFill}
                      style={{ height: `${(h.count / maxHourly) * 100}%` }}
                    />
                    <span className={styles.hourBarLabel}>{h.hour}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={styles.twoColGrid}>
            {osEntries.length > 0 && (
              <div className={styles.section} style={{ marginBottom: 0 }}>
                <h2 className={styles.sectionTitle}>OS Breakdown</h2>
                <p className={styles.sectionDesc}>Operating system of scanners</p>
                <div className={styles.breakdownList}>
                  {osEntries.map(([name, count]) => {
                    const pct = Math.round((count / totalOS) * 100);
                    return (
                      <div key={name} className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>{name}</span>
                        <div className={styles.breakdownTrack}>
                          <div className={`${styles.breakdownFill} ${styles.breakdownFillOS}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={styles.breakdownValue}>{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {browserEntries.length > 0 && (
              <div className={styles.section} style={{ marginBottom: 0 }}>
                <h2 className={styles.sectionTitle}>Browser Breakdown</h2>
                <p className={styles.sectionDesc}>Browser used to scan</p>
                <div className={styles.breakdownList}>
                  {browserEntries.map(([name, count]) => {
                    const pct = Math.round((count / totalBrowser) * 100);
                    return (
                      <div key={name} className={styles.breakdownItem}>
                        <span className={styles.breakdownLabel}>{name}</span>
                        <div className={styles.breakdownTrack}>
                          <div className={`${styles.breakdownFill} ${styles.breakdownFillBrowser}`} style={{ width: `${pct}%` }} />
                        </div>
                        <span className={styles.breakdownValue}>{count} ({pct}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {countryEntries.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Top Countries</h2>
              <p className={styles.sectionDesc}>Where scans originate</p>
              <div className={styles.breakdownList}>
                {countryEntries.slice(0, 15).map(([code, count]) => {
                  const pct = Math.round((count / totalCountry) * 100);
                  return (
                    <div key={code} className={styles.breakdownItem}>
                      <span className={styles.breakdownLabel}>{code}</span>
                      <div className={styles.breakdownTrack}>
                        <div className={`${styles.breakdownFill} ${styles.breakdownFillCountry}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className={styles.breakdownValue}>{count} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {data.topCities && data.topCities.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Top Cities</h2>
              <p className={styles.sectionDesc}>Most active scan locations</p>
              <table className={styles.cityTable}>
                <thead>
                  <tr>
                    <th>City</th>
                    <th>Region</th>
                    <th>Country</th>
                    <th>Scans</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCities.map((c, i) => (
                    <tr key={i}>
                      <td>{c.city}</td>
                      <td>{c.region || "—"}</td>
                      <td>{c.country || "—"}</td>
                      <td className={styles.cityCount}>{c.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data.locationClusters && data.locationClusters.length > 0 && (
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Location Clusters</h2>
              <p className={styles.sectionDesc}>Scan locations grouped by area (~11km radius)</p>
              <div className={styles.clusterList}>
                {data.locationClusters.slice(0, 20).map((cl, i) => {
                  const locationName = [cl.city, cl.region, cl.country].filter(Boolean).join(", ");
                  return (
                    <div key={i} className={styles.clusterItem}>
                      <div className={styles.clusterInfo}>
                        {locationName && <span className={styles.clusterName}>{locationName}</span>}
                        <span className={styles.clusterCoords}>{cl.latitude}, {cl.longitude}</span>
                      </div>
                      <span className={styles.clusterCount}>{cl.count} scans</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>QR Codes</h2>
            <p className={styles.sectionDesc}>Sorted by total scans</p>
            <div className={styles.historyList}>
              {data.qrCodes.map((qr) => (
                <div key={qr.id} className={styles.historyItem}>
                  <div className={styles.historyQr}>
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
                  <div className={styles.historyInfo}>
                    {qr.label && <div className={styles.historyLabel}>{qr.label}</div>}
                    <div className={styles.historyContent}>{qr.original_url || qr.content}</div>
                    <div className={styles.historyMeta}>
                      <span className={styles.historyDate}>{formatDate(qr.created_at)}</span>
                      {qr.total_scans > 0 && (
                        <span className={styles.scanBadge}>
                          {qr.total_scans} scan{qr.total_scans !== 1 ? "s" : ""}
                        </span>
                      )}
                      {qr.last_scan_at && (
                        <span className={styles.lastScanText}>Last: {formatDate(qr.last_scan_at)}</span>
                      )}
                      {qr.short_code && qr.original_url && (
                        <span className={styles.trackingBadge}>Tracking</span>
                      )}
                    </div>
                  </div>
                  <div className={styles.historyActions}>
                    <select
                      className={styles.historySizeSelect}
                      value={downloadSizes[qr.id] || 1000}
                      onChange={(e) => setDownloadSizes((prev) => ({ ...prev, [qr.id]: Number(e.target.value) }))}
                      title="Download size"
                    >
                      {DOWNLOAD_SIZES.map((s) => (
                        <option key={s.key} value={s.key}>{s.label}</option>
                      ))}
                    </select>
                    <button
                      className={styles.historyDownloadBtn}
                      onClick={() => {
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
                      }}
                      title="Download SVG"
                      type="button"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      SVG
                    </button>
                    <button
                      className={styles.historyDownloadBtn}
                      onClick={() => {
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
                      }}
                      title="Download PNG"
                      type="button"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                      PNG
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
