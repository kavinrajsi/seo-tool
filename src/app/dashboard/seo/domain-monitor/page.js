"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

function formatDate(dateStr) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getHttpBadgeClass(code) {
  if (!code || code === 0) return styles.httpZero;
  if (code >= 200 && code < 300) return styles.http2xx;
  if (code >= 300 && code < 400) return styles.http3xx;
  if (code >= 400 && code < 500) return styles.http4xx;
  return styles.http5xx;
}

function getStatusBadge(status) {
  switch (status) {
    case "up":
      return { cls: styles.statusUp, label: "Up" };
    case "down":
      return { cls: styles.statusDown, label: "Down" };
    case "issue":
      return { cls: styles.statusIssue, label: "Issue" };
    default:
      return { cls: styles.statusUnknown, label: "Unknown" };
  }
}

function getRtClass(ms) {
  if (ms <= 500) return styles.rtFast;
  if (ms <= 2000) return styles.rtMedium;
  return styles.rtSlow;
}

export default function DomainMonitorPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [domainInput, setDomainInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recheckingId, setRecheckingId] = useState(null);

  const stats = useMemo(() => {
    const total = domains.length;
    const up = domains.filter((d) => d.status === "up").length;
    const down = domains.filter((d) => d.status === "down").length;
    const issues = domains.filter((d) => d.status === "issue").length;
    return { total, up, down, issues };
  }, [domains]);

  const fetchDomains = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      const res = await projectFetch(`/api/domain-monitor?${params}`);
      if (res.ok) {
        const json = await res.json();
        setDomains(json.domains || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  const handleAdd = useCallback(async () => {
    if (!domainInput.trim()) return;
    setError("");
    setChecking(true);

    try {
      // Check domain first
      const checkRes = await fetch("/api/domain-monitor/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domainInput.trim() }),
      });

      const checkData = await checkRes.json();
      if (!checkRes.ok) {
        setError(checkData.error || "Failed to check domain");
        setChecking(false);
        return;
      }

      // Save to database
      const saveRes = await fetch("/api/domain-monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...checkData, project_id: activeProjectId || null }),
      });

      if (saveRes.ok) {
        const saved = await saveRes.json();
        setDomains((prev) => [saved, ...prev]);
        setDomainInput("");
      } else {
        const saveErr = await saveRes.json();
        setError(saveErr.error || "Failed to save domain");
      }
    } catch (err) {
      setError(err.message || "Failed to add domain");
    } finally {
      setChecking(false);
    }
  }, [domainInput, activeProjectId]);

  const handleRecheck = useCallback(async (item) => {
    setRecheckingId(item.id);
    try {
      const checkRes = await fetch("/api/domain-monitor/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: item.domain }),
      });

      if (!checkRes.ok) {
        setRecheckingId(null);
        return;
      }

      const checkData = await checkRes.json();

      const updateRes = await fetch(`/api/domain-monitor/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkData),
      });

      if (updateRes.ok) {
        const updated = await updateRes.json();
        setDomains((prev) => prev.map((d) => (d.id === item.id ? updated : d)));
      }
    } catch {
      // Silent fail
    } finally {
      setRecheckingId(null);
    }
  }, []);

  const handleDelete = useCallback(async (id) => {
    if (!confirm("Remove this domain from monitoring?")) return;
    try {
      const res = await fetch(`/api/domain-monitor/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDomains((prev) => prev.filter((d) => d.id !== id));
      }
    } catch {
      // Silent fail
    }
  }, []);

  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Domain Monitor</h1>
      </div>

      {/* Add domain form */}
      <div className={styles.addForm}>
        <div className={styles.inputField}>
          <label htmlFor="domain-input">Domain</label>
          <input
            id="domain-input"
            type="text"
            placeholder="example.com"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !checking) handleAdd();
            }}
          />
        </div>
        <button
          className={styles.addBtn}
          onClick={handleAdd}
          disabled={checking || !domainInput.trim()}
          type="button"
        >
          {checking ? <span className={styles.spinner} /> : "Add & Check"}
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stats grid */}
      {domains.length > 0 && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statValue}>{stats.total}</div>
            <div className={styles.statLabel}>Total Domains</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${styles.statValueUp}`}>{stats.up}</div>
            <div className={styles.statLabel}>Up</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${stats.down > 0 ? styles.statValueDown : ""}`}>{stats.down}</div>
            <div className={styles.statLabel}>Down</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statValue} ${stats.issues > 0 ? styles.statValueIssue : ""}`}>{stats.issues}</div>
            <div className={styles.statLabel}>Issues</div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <div className={styles.loadingState}>Loading domains...</div>}

      {/* Empty state */}
      {!loading && domains.length === 0 && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </div>
          <div className={styles.emptyTitle}>No domains monitored yet</div>
          <div className={styles.emptyText}>Add a domain above to start monitoring its status, SSL, and response time.</div>
        </div>
      )}

      {/* Desktop table */}
      {!loading && domains.length > 0 && (
        <>
          <table className={styles.domainsTable}>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Status</th>
                <th>HTTP</th>
                <th>Response Time</th>
                <th>SSL</th>
                <th>Server</th>
                <th>Last Checked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {domains.map((item) => {
                const badge = getStatusBadge(item.status);
                return (
                  <tr key={item.id}>
                    <td className={styles.domainCell}>{item.domain}</td>
                    <td>
                      <span className={`${styles.statusBadge} ${badge.cls}`}>
                        <span className={styles.statusDot} />
                        {badge.label}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.httpBadge} ${getHttpBadgeClass(item.http_status)}`}>
                        {item.http_status || "N/A"}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.responseTime} ${getRtClass(item.response_time)}`}>
                        {item.response_time ? `${item.response_time}ms` : "--"}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.sslBadge} ${item.ssl ? styles.sslYes : styles.sslNo}`}>
                        {item.ssl ? (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        ) : (
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
                          </svg>
                        )}
                        {item.ssl ? "HTTPS" : "HTTP"}
                      </span>
                    </td>
                    <td>
                      {item.server_header ? (
                        <span className={styles.serverBadge}>{item.server_header}</span>
                      ) : (
                        <span className={styles.dateText}>--</span>
                      )}
                    </td>
                    <td>
                      <span className={styles.dateText}>{formatDate(item.last_checked_at)}</span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.recheckBtn}
                          onClick={() => handleRecheck(item)}
                          disabled={recheckingId === item.id}
                          type="button"
                          title="Recheck"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={recheckingId === item.id ? styles.spinning : ""}
                          >
                            <polyline points="23 4 23 10 17 10" />
                            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                          </svg>
                        </button>
                        <button
                          className={styles.deleteBtn}
                          onClick={() => handleDelete(item.id)}
                          type="button"
                          title="Remove"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Mobile cards */}
          <div className={styles.mobileCards}>
            {domains.map((item) => {
              const badge = getStatusBadge(item.status);
              return (
                <div key={item.id} className={styles.mobileCard}>
                  <div className={styles.mobileCardHeader}>
                    <span className={styles.mobileCardDomain}>{item.domain}</span>
                    <span className={`${styles.statusBadge} ${badge.cls}`}>
                      <span className={styles.statusDot} />
                      {badge.label}
                    </span>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <span className={`${styles.httpBadge} ${getHttpBadgeClass(item.http_status)}`}>
                      {item.http_status || "N/A"}
                    </span>
                    <span className={`${styles.responseTime} ${getRtClass(item.response_time)}`}>
                      {item.response_time ? `${item.response_time}ms` : "--"}
                    </span>
                    <span className={`${styles.sslBadge} ${item.ssl ? styles.sslYes : styles.sslNo}`}>
                      {item.ssl ? "HTTPS" : "HTTP"}
                    </span>
                    {item.server_header && (
                      <span className={styles.serverBadge}>{item.server_header}</span>
                    )}
                  </div>
                  <div className={styles.dateText}>{formatDate(item.last_checked_at)}</div>
                  <div className={styles.mobileCardActions}>
                    <button
                      className={styles.recheckBtn}
                      onClick={() => handleRecheck(item)}
                      disabled={recheckingId === item.id}
                      type="button"
                      title="Recheck"
                    >
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={recheckingId === item.id ? styles.spinning : ""}
                      >
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                    </button>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDelete(item.id)}
                      type="button"
                      title="Remove"
                    >
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
        </>
      )}
    </>
  );
}
