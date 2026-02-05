"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import { useAuth } from "@/app/components/AuthProvider";
import styles from "./page.module.css";

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      const t = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(t);
    }

    async function load() {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const json = await res.json();
        setUsers(json.users || []);
      } else if (res.status === 403) {
        setError("Access denied.");
      } else {
        setError("Failed to load users.");
      }
      setLoading(false);
    }
    load();
  }, [authLoading, isAdmin]);

  async function handleExpand(userId) {
    if (expandedId === userId) {
      setExpandedId(null);
      setReports([]);
      return;
    }
    setExpandedId(userId);
    setReports([]);
    setReportsLoading(true);
    const res = await fetch(`/api/admin/users/${userId}`);
    if (res.ok) {
      const json = await res.json();
      setReports(json.reports || []);
    }
    setReportsLoading(false);
  }

  async function handleRoleToggle(targetUser) {
    const newRole = targetUser.role === "admin" ? "user" : "admin";
    const action = newRole === "admin" ? "Make Admin" : "Remove Admin";
    if (!confirm(`${action} for ${targetUser.email}?`)) return;

    setUpdatingId(targetUser.id);
    const res = await fetch(`/api/admin/users/${targetUser.id}/role`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });

    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, role: newRole } : u))
      );
    }
    setUpdatingId(null);
  }

  async function handleShareReport(e, id) {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/share/${id}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatTime(dateStr) {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  function scoreColorClass(score) {
    if (score >= 70) return styles.scoreGood;
    if (score >= 40) return styles.scoreAverage;
    return styles.scorePoor;
  }

  if (authLoading || loading) {
    return <p className={styles.loading}>Loading...</p>;
  }

  if (!isAdmin || error) {
    return <p className={styles.denied}>{error || "Access denied. Admin only."}</p>;
  }

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const totalScans = users.reduce((sum, u) => sum + u.scanCount, 0);

  const reportsPanel = (
    <div className={styles.reportsPanel}>
      {reportsLoading ? (
        <p className={styles.reportsLoading}>Loading scans...</p>
      ) : reports.length === 0 ? (
        <p className={styles.reportsEmpty}>No scans found.</p>
      ) : (
        <div className={styles.reportsList}>
          <div className={styles.reportsHeader}>
            <span>URL</span>
            <span>Score</span>
            <span>Results</span>
            <span>Date</span>
            <span>Actions</span>
          </div>
          {reports.map((r) => (
            <div
              key={r.id}
              className={styles.reportRow}
              onClick={() => window.open(`/dashboard/reports/${r.id}`, "_blank")}
            >
              <span className={styles.reportUrl}>{r.url}</span>
              <span className={`${styles.reportScore} ${scoreColorClass(r.overall_score)}`}>
                {r.overall_score}
              </span>
              <div className={styles.severityCounts}>
                {r.fail_count > 0 && (
                  <span className={`${styles.countBadge} ${styles.countFail}`}>
                    {r.fail_count}
                  </span>
                )}
                {r.warning_count > 0 && (
                  <span className={`${styles.countBadge} ${styles.countWarning}`}>
                    {r.warning_count}
                  </span>
                )}
                {r.pass_count > 0 && (
                  <span className={`${styles.countBadge} ${styles.countPass}`}>
                    {r.pass_count}
                  </span>
                )}
              </div>
              <div className={styles.reportDateTime}>
                <span className={styles.reportDate}>{formatDate(r.created_at)}</span>
                <span className={styles.reportTime}>{formatTime(r.created_at)}</span>
              </div>
              <div className={styles.actionBtns}>
                <button
                  className={styles.viewBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/dashboard/reports/${r.id}`, "_blank");
                  }}
                  type="button"
                  title="View report"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
                <button
                  className={styles.shareBtn}
                  onClick={(e) => handleShareReport(e, r.id)}
                  type="button"
                  title={copiedId === r.id ? "Link copied!" : "Share report"}
                >
                  {copiedId === r.id ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className={styles.headingRow}>
        <h1 className={styles.heading}>Admin</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          <Link href="/dashboard/admin/trash" className={styles.settingsLink}>
            Trash
          </Link>
          <Link href="/dashboard/admin/settings" className={styles.settingsLink}>
            Settings
          </Link>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalUsers}</div>
          <div className={styles.statLabel}>Total Users</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{adminCount}</div>
          <div className={styles.statLabel}>Admins</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statValue}>{totalScans}</div>
          <div className={styles.statLabel}>Total Scans</div>
        </div>
      </div>

      {/* Desktop table */}
      <div className={styles.desktopOnly}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Reports</th>
                <th>Scans</th>
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <Fragment key={u.id}>
                  <tr
                    className={`${styles.clickableRow} ${expandedId === u.id ? styles.expandedRow : ""}`}
                    onClick={() => handleExpand(u.id)}
                  >
                    <td>
                      <div className={styles.userCell}>
                        <span className={styles.userName}>
                          {expandedId === u.id ? "▾" : "▸"}{" "}
                          {u.full_name || "—"}
                        </span>
                        <span className={styles.userEmail}>{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${u.role === "admin" ? styles.badgeAdmin : styles.badgeUser}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>{u.reportCount}</td>
                    <td>{u.scanCount}</td>
                    <td>
                      <div className={styles.joinedDateTime}>
                        <span>{formatDate(u.created_at)}</span>
                        <span className={styles.joinedTime}>{formatTime(u.created_at)}</span>
                      </div>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {u.id === user.id ? (
                        <span className={styles.selfLabel}>You</span>
                      ) : (
                        <button
                          className={styles.roleBtn}
                          onClick={() => handleRoleToggle(u)}
                          disabled={updatingId === u.id}
                        >
                          {updatingId === u.id
                            ? "Updating..."
                            : u.role === "admin"
                              ? "Remove Admin"
                              : "Make Admin"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedId === u.id && (
                    <tr>
                      <td colSpan={6} className={styles.expandedCell}>
                        {reportsPanel}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {users.map((u) => (
          <div key={u.id} className={styles.mobileCard}>
            <div
              className={styles.mobileCardHeader}
              onClick={() => handleExpand(u.id)}
              style={{ cursor: "pointer" }}
            >
              <div className={styles.userCell}>
                <span className={styles.userName}>
                  {expandedId === u.id ? "▾" : "▸"}{" "}
                  {u.full_name || "—"}
                </span>
                <span className={styles.userEmail}>{u.email}</span>
              </div>
              <span className={`${styles.badge} ${u.role === "admin" ? styles.badgeAdmin : styles.badgeUser}`}>
                {u.role}
              </span>
            </div>
            <div className={styles.mobileCardStats}>
              <div className={styles.mobileCardStat}>
                <div className={styles.mobileStatValue}>{u.reportCount}</div>
                <div className={styles.mobileStatLabel}>Reports</div>
              </div>
              <div className={styles.mobileCardStat}>
                <div className={styles.mobileStatValue}>{u.scanCount}</div>
                <div className={styles.mobileStatLabel}>Scans</div>
              </div>
              <div className={styles.mobileCardStat}>
                <div className={styles.mobileStatValue}>{formatDate(u.created_at)}</div>
                <div className={styles.mobileStatTime}>{formatTime(u.created_at)}</div>
                <div className={styles.mobileStatLabel}>Joined</div>
              </div>
            </div>
            <div className={styles.mobileCardFooter}>
              <span className={styles.joinedDate}></span>
              {u.id === user.id ? (
                <span className={styles.selfLabel}>You</span>
              ) : (
                <button
                  className={styles.roleBtn}
                  onClick={() => handleRoleToggle(u)}
                  disabled={updatingId === u.id}
                >
                  {updatingId === u.id
                    ? "Updating..."
                    : u.role === "admin"
                      ? "Remove Admin"
                      : "Make Admin"}
                </button>
              )}
            </div>
            {expandedId === u.id && reportsPanel}
          </div>
        ))}
      </div>
    </>
  );
}
