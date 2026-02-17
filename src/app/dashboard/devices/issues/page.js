"use client";

import { useState, useEffect, useCallback } from "react";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

const STATUS_LABELS = { open: "Open", in_progress: "In Progress", resolved: "Resolved" };
const STATUS_STYLES = { open: styles.statusOpen, in_progress: styles.statusInProgress, resolved: styles.statusResolved };

function StatusBadge({ status }) {
  return <span className={STATUS_STYLES[status] || styles.statusOpen}>{STATUS_LABELS[status] || status}</span>;
}

function formatDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function DeviceIssuesPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [resolvingId, setResolvingId] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectFetch("/api/devices/issues");
      if (res.ok) {
        const data = await res.json();
        setIssues(data.issues || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => { loadIssues(); }, [loadIssues]);

  async function handleUpdateStatus(issue, newStatus, resolutionNotes) {
    setUpdatingId(issue.id);
    try {
      const body = { issue_status: newStatus };
      if (resolutionNotes) body.resolution_notes = resolutionNotes;
      const res = await fetch(`/api/devices/${issue.device_id}/issues/${issue.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setResolvingId(null);
        setResolveNotes("");
        loadIssues();
      }
    } catch {
      // silent
    }
    setUpdatingId(null);
  }

  const filtered = issues.filter((issue) => {
    const q = search.toLowerCase();
    const matchesSearch = !q ||
      issue.title.toLowerCase().includes(q) ||
      (issue.description || "").toLowerCase().includes(q) ||
      (issue.device ? `${issue.device.brand} ${issue.device.model}`.toLowerCase().includes(q) : false) ||
      (issue.reporter ? `${issue.reporter.first_name} ${issue.reporter.last_name}`.toLowerCase().includes(q) : false);
    const matchesStatus = statusFilter === "all" || issue.issue_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openCount = issues.filter((i) => i.issue_status === "open").length;
  const inProgressCount = issues.filter((i) => i.issue_status === "in_progress").length;
  const resolvedCount = issues.filter((i) => i.issue_status === "resolved").length;

  return (
    <>
      <h1 className={styles.heading}>Device Issues</h1>
      <p className={styles.subheading}>All reported issues across devices.</p>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Issues</div>
          <div className={styles.statValue}>{issues.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Open</div>
          <div className={styles.statValue} style={{ color: openCount > 0 ? "var(--color-critical)" : undefined }}>{openCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In Progress</div>
          <div className={styles.statValue} style={{ color: inProgressCount > 0 ? "#f59e0b" : undefined }}>{inProgressCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Resolved</div>
          <div className={styles.statValue} style={{ color: "var(--color-pass)" }}>{resolvedCount}</div>
        </div>
      </div>

      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search by title, device, or reporter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {loading && <p className={styles.loadingText}>Loading issues...</p>}

      {!loading && issues.length === 0 && (
        <div className={styles.empty}>
          <p>No issues reported yet.</p>
        </div>
      )}

      {!loading && filtered.length === 0 && issues.length > 0 && (
        <p className={styles.loadingText}>No issues match your search.</p>
      )}

      {!loading && filtered.length > 0 && (
        <div className={styles.issueList}>
          {filtered.map((issue) => (
            <div key={issue.id} className={styles.issueCard}>
              <div className={styles.issueHeader}>
                <h4 className={styles.issueTitle}>{issue.title}</h4>
                <StatusBadge status={issue.issue_status} />
              </div>
              {issue.device && (
                <span className={styles.issueDevice}>{issue.device.brand} {issue.device.model}</span>
              )}
              {issue.description && <p className={styles.issueDesc}>{issue.description}</p>}
              <div className={styles.issueMeta}>
                {issue.reporter && (
                  <span className={styles.issueMetaItem}>Reported by: {issue.reporter.first_name} {issue.reporter.last_name}</span>
                )}
                <span className={styles.issueMetaItem}>Created: {formatDate(issue.created_at)}</span>
                {issue.resolved_at && (
                  <span className={styles.issueMetaItem}>Resolved: {formatDate(issue.resolved_at)}</span>
                )}
              </div>
              {issue.resolution_notes && (
                <div className={styles.resolution}>Resolution: {issue.resolution_notes}</div>
              )}
              {issue.issue_status !== "resolved" && (
                <div className={styles.issueActions}>
                  {issue.issue_status === "open" && (
                    <button
                      className={styles.actionBtn}
                      disabled={updatingId === issue.id}
                      onClick={() => handleUpdateStatus(issue, "in_progress")}
                    >
                      Mark In Progress
                    </button>
                  )}
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    onClick={() => {
                      if (resolvingId === issue.id) {
                        setResolvingId(null);
                        setResolveNotes("");
                      } else {
                        setResolvingId(issue.id);
                        setResolveNotes("");
                      }
                    }}
                  >
                    {resolvingId === issue.id ? "Cancel" : "Mark Resolved"}
                  </button>
                </div>
              )}
              {resolvingId === issue.id && (
                <div className={styles.resolveForm}>
                  <textarea
                    className={styles.resolveTextarea}
                    rows={2}
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    placeholder="Resolution notes (optional)..."
                  />
                  <button
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    disabled={updatingId === issue.id}
                    onClick={() => handleUpdateStatus(issue, "resolved", resolveNotes)}
                  >
                    {updatingId === issue.id ? "Saving..." : "Confirm Resolve"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
