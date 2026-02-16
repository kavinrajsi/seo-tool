"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/components/AuthProvider";
import styles from "./page.module.css";

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

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

  async function handleRoleChange(targetUser, newRole) {
    if (newRole === targetUser.role) return;
    const roleLabels = { admin: "Admin", hr: "HR", user: "User" };
    if (!confirm(`Change role of ${targetUser.email} to ${roleLabels[newRole]}?`)) return;

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

  async function handleDeleteUser(targetUser) {
    if (!confirm(`Delete user "${targetUser.full_name || targetUser.email}"? This will permanently remove their account and all associated data.`)) return;

    setDeletingId(targetUser.id);
    const res = await fetch(`/api/admin/users/${targetUser.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
    } else {
      const json = await res.json().catch(() => ({}));
      alert(json.error || "Failed to delete user.");
    }
    setDeletingId(null);
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

  if (authLoading || loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("100px", "28px", "1.5rem")} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {[1,2,3].map(i => <div key={i} style={{ ...s, height: "80px", borderRadius: "12px" }} />)}
        </div>
        <div style={b("120px", "20px", "1rem")} />
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "1rem", padding: "0.875rem 0", borderBottom: "1px solid var(--color-border)" }}>
            <div style={b("32px", "32px")} />
            <div style={{ flex: 1 }}><div style={b("50%", "14px", "0.375rem")} /><div style={b("30%", "12px")} /></div>
            <div style={b("60px", "28px")} />
          </div>
        ))}
      </>
    );
  }

  if (!isAdmin || error) {
    return <p className={styles.denied}>{error || "Access denied. Admin only."}</p>;
  }

  const totalUsers = users.length;
  const adminCount = users.filter((u) => u.role === "admin").length;
  const hrCount = users.filter((u) => u.role === "hr").length;

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
          <div className={styles.statValue}>{hrCount}</div>
          <div className={styles.statLabel}>HR</div>
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
                <th>Joined</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.userName}>
                        {u.full_name || "—"}
                      </span>
                      <span className={styles.userEmail}>{u.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${u.role === "admin" ? styles.badgeAdmin : u.role === "hr" ? styles.badgeHr : styles.badgeUser}`}>
                      {u.role === "hr" ? "HR" : u.role}
                    </span>
                  </td>
                  <td>
                    <div className={styles.joinedDateTime}>
                      <span>{formatDate(u.created_at)}</span>
                      <span className={styles.joinedTime}>{formatTime(u.created_at)}</span>
                    </div>
                  </td>
                  <td>
                    {u.id === user.id ? (
                      <span className={styles.selfLabel}>You</span>
                    ) : (
                      <div className={styles.actionBtns}>
                        <select
                          className={styles.roleSelect}
                          value={u.role}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          disabled={updatingId === u.id}
                        >
                          <option value="user">User</option>
                          <option value="hr">HR</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          className={styles.deleteUserBtn}
                          onClick={() => handleDeleteUser(u)}
                          disabled={deletingId === u.id}
                          title="Delete user"
                        >
                          {deletingId === u.id ? (
                            "..."
                          ) : (
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {users.map((u) => (
          <div key={u.id} className={styles.mobileCard}>
            <div className={styles.mobileCardHeader}>
              <div className={styles.userCell}>
                <span className={styles.userName}>
                  {u.full_name || "—"}
                </span>
                <span className={styles.userEmail}>{u.email}</span>
              </div>
              <span className={`${styles.badge} ${u.role === "admin" ? styles.badgeAdmin : u.role === "hr" ? styles.badgeHr : styles.badgeUser}`}>
                {u.role === "hr" ? "HR" : u.role}
              </span>
            </div>
            <div className={styles.mobileCardStats}>
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
                <div className={styles.actionBtns}>
                  <select
                    className={styles.roleSelect}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u, e.target.value)}
                    disabled={updatingId === u.id}
                  >
                    <option value="user">User</option>
                    <option value="hr">HR</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    className={styles.deleteUserBtn}
                    onClick={() => handleDeleteUser(u)}
                    disabled={deletingId === u.id}
                    title="Delete user"
                  >
                    {deletingId === u.id ? (
                      "..."
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
