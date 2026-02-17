"use client";

import { useState, useEffect } from "react";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "../page.module.css";

export default function WebhookLogsPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState({ status: "", topic: "" });
  const [copiedUrl, setCopiedUrl] = useState("");
  const [selectedLog, setSelectedLog] = useState(null);

  // Get the webhook URLs based on current origin
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const webhookUrls = {
    products: `${baseUrl}/api/webhooks/shopify/products`,
    collections: `${baseUrl}/api/webhooks/shopify/collections`,
    orders: `${baseUrl}/api/webhooks/shopify/orders`,
    carts: `${baseUrl}/api/webhooks/shopify/carts`,
    checkouts: `${baseUrl}/api/webhooks/shopify/checkouts`,
    customers: `${baseUrl}/api/webhooks/shopify/customers`,
  };

  function copyToClipboard(url, type) {
    navigator.clipboard.writeText(url);
    setCopiedUrl(type);
    setTimeout(() => setCopiedUrl(""), 2000);
  }

  useEffect(() => {
    loadLogs();
  }, [filter, projectFetch]);

  async function loadLogs() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (filter.status) params.set("status", filter.status);
      if (filter.topic) params.set("topic", filter.topic);

      const res = await projectFetch(`/api/webhooks/shopify/logs?${params}`);

      if (res.status === 403) {
        setError("Admin access required to view webhook logs");
        setLoading(false);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setSummary(data.summary);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load logs");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  function getStatusBadge(status) {
    const statusStyles = {
      success: styles.statusActive,
      error: styles.statusArchived,
      rejected: styles.statusArchived,
      duplicate: styles.statusDraft,
      received: styles.statusDraft,
    };
    return statusStyles[status] || styles.statusDraft;
  }

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("160px", "28px", "0.5rem")} />
        <div style={b("280px", "14px", "1.5rem")} />
        {/* Webhook URLs skeleton */}
        <div className={styles.section} style={{ marginBottom: "1.5rem" }}>
          <div style={b("140px", "20px", "1rem")} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1rem" }}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ ...s, height: "80px", borderRadius: "12px" }} />)}
          </div>
        </div>
        {/* Stats skeleton */}
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        {/* Table skeleton */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Time","Topic","Shop","Status","Message","Duration"].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j}><div style={b(j===2?"70%":"50%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Webhook Logs</h1>
      <p className={styles.subheading}>Monitor incoming Shopify webhooks.</p>

      {/* Webhook URLs Section */}
      <div className={styles.section} style={{ marginBottom: "1.5rem" }}>
        <h2 className={styles.sectionTitle}>Webhook URLs</h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Enter these URLs in your Shopify Admin → Settings → Notifications → Webhooks
        </p>

        {/* Products Webhook */}
        <div style={{ marginBottom: "1.25rem", padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Products Webhook</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <code style={{
              flex: 1,
              minWidth: "200px",
              background: "var(--color-bg-secondary)",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              border: "1px solid var(--color-border)",
              wordBreak: "break-all"
            }}>
              {webhookUrls.products}
            </code>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => copyToClipboard(webhookUrls.products, "products")}
              style={{ whiteSpace: "nowrap", padding: "0.5rem 0.75rem" }}
            >
              {copiedUrl === "products" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.5rem", fontSize: "0.7rem" }}>
            Events: <strong>products/create</strong>, <strong>products/update</strong>, <strong>products/delete</strong>
          </p>
        </div>

        {/* Collections Webhook */}
        <div style={{ marginBottom: "1.25rem", padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Collections Webhook</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <code style={{
              flex: 1,
              minWidth: "200px",
              background: "var(--color-bg-secondary)",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              border: "1px solid var(--color-border)",
              wordBreak: "break-all"
            }}>
              {webhookUrls.collections}
            </code>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => copyToClipboard(webhookUrls.collections, "collections")}
              style={{ whiteSpace: "nowrap", padding: "0.5rem 0.75rem" }}
            >
              {copiedUrl === "collections" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.5rem", fontSize: "0.7rem" }}>
            Events: <strong>collections/create</strong>, <strong>collections/update</strong>, <strong>collections/delete</strong>
          </p>
        </div>

        {/* Carts Webhook */}
        <div style={{ marginBottom: "1.25rem", padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2">
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Carts Webhook</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <code style={{
              flex: 1,
              minWidth: "200px",
              background: "var(--color-bg-secondary)",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              border: "1px solid var(--color-border)",
              wordBreak: "break-all"
            }}>
              {webhookUrls.carts}
            </code>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => copyToClipboard(webhookUrls.carts, "carts")}
              style={{ whiteSpace: "nowrap", padding: "0.5rem 0.75rem" }}
            >
              {copiedUrl === "carts" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.5rem", fontSize: "0.7rem" }}>
            Events: <strong>carts/create</strong>, <strong>carts/update</strong>
          </p>
        </div>

        {/* Checkouts Webhook */}
        <div style={{ marginBottom: "1.25rem", padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Checkouts Webhook</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <code style={{
              flex: 1,
              minWidth: "200px",
              background: "var(--color-bg-secondary)",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              border: "1px solid var(--color-border)",
              wordBreak: "break-all"
            }}>
              {webhookUrls.checkouts}
            </code>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => copyToClipboard(webhookUrls.checkouts, "checkouts")}
              style={{ whiteSpace: "nowrap", padding: "0.5rem 0.75rem" }}
            >
              {copiedUrl === "checkouts" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.5rem", fontSize: "0.7rem" }}>
            Events: <strong>checkouts/create</strong>, <strong>checkouts/update</strong>, <strong>checkouts/delete</strong>
          </p>
        </div>

        {/* Orders Webhook */}
        <div style={{ marginBottom: "1.25rem", padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Orders Webhook</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <code style={{
              flex: 1,
              minWidth: "200px",
              background: "var(--color-bg-secondary)",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              border: "1px solid var(--color-border)",
              wordBreak: "break-all"
            }}>
              {webhookUrls.orders}
            </code>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => copyToClipboard(webhookUrls.orders, "orders")}
              style={{ whiteSpace: "nowrap", padding: "0.5rem 0.75rem" }}
            >
              {copiedUrl === "orders" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.5rem", fontSize: "0.7rem" }}>
            Events: <strong>orders/create</strong>, <strong>orders/updated</strong>, <strong>orders/paid</strong>, <strong>orders/fulfilled</strong>, <strong>orders/cancelled</strong>
          </p>
        </div>

        {/* Customers Webhook */}
        <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Customers Webhook</span>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <code style={{
              flex: 1,
              minWidth: "200px",
              background: "var(--color-bg-secondary)",
              padding: "0.625rem 0.875rem",
              borderRadius: "var(--radius-md)",
              fontSize: "0.8rem",
              border: "1px solid var(--color-border)",
              wordBreak: "break-all"
            }}>
              {webhookUrls.customers}
            </code>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => copyToClipboard(webhookUrls.customers, "customers")}
              style={{ whiteSpace: "nowrap", padding: "0.5rem 0.75rem" }}
            >
              {copiedUrl === "customers" ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  Copy
                </>
              )}
            </button>
          </div>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "0.5rem", fontSize: "0.7rem" }}>
            Events: <strong>customers/create</strong>, <strong>customers/update</strong>, <strong>customers/delete</strong>, <strong>customers/enable</strong>, <strong>customers/disable</strong>
          </p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Summary Stats */}
      {summary && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Webhooks</div>
            <div className={styles.statValue}>{summary.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Successful</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{summary.success}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Errors</div>
            <div className={styles.statValue} style={{ color: "var(--color-critical)" }}>
              {summary.errors}
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Today</div>
            <div className={styles.statValue}>{summary.today}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Webhooks</h2>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={loadLogs}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <select
            className={styles.filterSelect}
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="rejected">Rejected</option>
            <option value="duplicate">Duplicate</option>
          </select>
          <select
            className={styles.filterSelect}
            value={filter.topic}
            onChange={(e) => setFilter({ ...filter, topic: e.target.value })}
          >
            <option value="">All Topics</option>
            <optgroup label="Products">
              <option value="products/create">products/create</option>
              <option value="products/update">products/update</option>
              <option value="products/delete">products/delete</option>
            </optgroup>
            <optgroup label="Collections">
              <option value="collections/create">collections/create</option>
              <option value="collections/update">collections/update</option>
              <option value="collections/delete">collections/delete</option>
            </optgroup>
            <optgroup label="Orders">
              <option value="orders/create">orders/create</option>
              <option value="orders/updated">orders/updated</option>
              <option value="orders/paid">orders/paid</option>
              <option value="orders/fulfilled">orders/fulfilled</option>
              <option value="orders/cancelled">orders/cancelled</option>
            </optgroup>
            <optgroup label="Carts">
              <option value="carts/create">carts/create</option>
              <option value="carts/update">carts/update</option>
            </optgroup>
            <optgroup label="Checkouts">
              <option value="checkouts/create">checkouts/create</option>
              <option value="checkouts/update">checkouts/update</option>
              <option value="checkouts/delete">checkouts/delete</option>
            </optgroup>
            <optgroup label="Customers">
              <option value="customers/create">customers/create</option>
              <option value="customers/update">customers/update</option>
              <option value="customers/delete">customers/delete</option>
              <option value="customers/enable">customers/enable</option>
              <option value="customers/disable">customers/disable</option>
            </optgroup>
          </select>
        </div>

        {logs.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>No webhook logs found. Webhooks will appear here when received from Shopify.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Topic</th>
                  <th>Shop</th>
                  <th>Resource ID</th>
                  <th>Status</th>
                  <th>Message</th>
                  <th>Duration</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ whiteSpace: "nowrap" }}>{formatDate(log.created_at)}</td>
                    <td>
                      <code style={{
                        fontSize: "0.75rem",
                        background: "var(--color-bg)",
                        padding: "0.125rem 0.375rem",
                        borderRadius: "4px"
                      }}>
                        {log.topic}
                      </code>
                    </td>
                    <td style={{ fontSize: "0.75rem" }}>{log.shop_domain}</td>
                    <td style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                      {log.resource_id || "-"}
                    </td>
                    <td>
                      <span className={`${styles.itemStatus} ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td style={{
                      fontSize: "0.75rem",
                      maxWidth: "200px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}>
                      {log.message || "-"}
                    </td>
                    <td style={{ fontSize: "0.75rem", textAlign: "right" }}>
                      {log.processing_time_ms ? `${log.processing_time_ms}ms` : "-"}
                    </td>
                    <td>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={() => setSelectedLog(log)}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Test Webhook Section */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Test Webhook</h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem", fontSize: "0.875rem" }}>
          Use the test script to send a sample webhook:
        </p>
        <pre style={{
          background: "var(--color-bg)",
          padding: "1rem",
          borderRadius: "var(--radius-md)",
          fontSize: "0.75rem",
          overflow: "auto"
        }}>
{`# From your project root, run:
node scripts/test-shopify-webhook.js

# With HMAC verification:
node scripts/test-shopify-webhook.js --secret "your_secret"

# With custom shop:
node scripts/test-shopify-webhook.js --shop "your-store.myshopify.com"`}
        </pre>
      </div>

      {/* Webhook Detail Modal */}
      {selectedLog && (
        <div className={styles.modalOverlay} onClick={() => setSelectedLog(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "700px" }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Webhook Details</h2>
              <button
                className={styles.modalClose}
                onClick={() => setSelectedLog(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div style={{ display: "grid", gap: "1rem" }}>
                {/* Status Badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className={`${styles.itemStatus} ${getStatusBadge(selectedLog.status)}`}>
                    {selectedLog.status}
                  </span>
                  <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                    {formatDate(selectedLog.created_at)}
                  </span>
                </div>

                {/* Info Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "1rem",
                  padding: "1rem",
                  background: "var(--color-bg)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--color-border)"
                }}>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Topic
                    </div>
                    <code style={{ fontSize: "0.875rem" }}>{selectedLog.topic}</code>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Shop Domain
                    </div>
                    <div style={{ fontSize: "0.875rem" }}>{selectedLog.shop_domain}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Resource ID
                    </div>
                    <code style={{ fontSize: "0.875rem" }}>{selectedLog.resource_id || "-"}</code>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Webhook ID
                    </div>
                    <code style={{ fontSize: "0.875rem", wordBreak: "break-all" }}>
                      {selectedLog.webhook_id || "-"}
                    </code>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      Processing Time
                    </div>
                    <div style={{ fontSize: "0.875rem" }}>
                      {selectedLog.processing_time_ms ? `${selectedLog.processing_time_ms}ms` : "-"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
                      API Version
                    </div>
                    <div style={{ fontSize: "0.875rem" }}>{selectedLog.api_version || "-"}</div>
                  </div>
                </div>

                {/* Message */}
                {selectedLog.message && (
                  <div>
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>
                      Message
                    </div>
                    <div style={{
                      padding: "0.75rem",
                      background: selectedLog.status === "error" || selectedLog.status === "rejected"
                        ? "rgba(220, 38, 38, 0.1)"
                        : "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.875rem"
                    }}>
                      {selectedLog.message}
                    </div>
                  </div>
                )}

                {/* Raw Payload */}
                {selectedLog.raw_payload && (
                  <div>
                    <div style={{
                      fontSize: "0.75rem",
                      color: "var(--color-text-secondary)",
                      marginBottom: "0.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <span>Raw Payload</span>
                      <button
                        className={`${styles.btn} ${styles.btnSecondary}`}
                        onClick={() => {
                          navigator.clipboard.writeText(
                            typeof selectedLog.raw_payload === "string"
                              ? selectedLog.raw_payload
                              : JSON.stringify(selectedLog.raw_payload, null, 2)
                          );
                        }}
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.7rem" }}
                      >
                        Copy
                      </button>
                    </div>
                    <pre style={{
                      padding: "1rem",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.75rem",
                      overflow: "auto",
                      maxHeight: "400px",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word"
                    }}>
                      {typeof selectedLog.raw_payload === "string"
                        ? (() => {
                            try {
                              return JSON.stringify(JSON.parse(selectedLog.raw_payload), null, 2);
                            } catch {
                              return selectedLog.raw_payload;
                            }
                          })()
                        : JSON.stringify(selectedLog.raw_payload, null, 2)
                      }
                    </pre>
                  </div>
                )}
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setSelectedLog(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
