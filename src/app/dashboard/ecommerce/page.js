"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./page.module.css";

export default function EcommercePage() {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [shopifyStatus, setShopifyStatus] = useState(null);
  const [shopDomain, setShopDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    // Handle OAuth redirect feedback
    if (searchParams.get("shopify_connected") === "true") {
      setFeedback({ type: "success", message: "Shopify store connected successfully." });
    } else if (searchParams.get("shopify_error")) {
      const errorCode = searchParams.get("shopify_error");
      const messages = {
        missing_params: "Missing required parameters from Shopify.",
        not_configured: "Shopify integration is not configured.",
        invalid_hmac: "Invalid signature. Please try connecting again.",
        invalid_state: "Invalid state parameter. Please try again.",
        auth_mismatch: "Authentication mismatch. Please log in and try again.",
        shop_mismatch: "Shop domain mismatch. Please try again.",
        token_exchange_failed: "Failed to exchange authorization code.",
        no_access_token: "No access token received from Shopify.",
        db_save_failed: "Failed to save connection. Please try again.",
      };
      setFeedback({
        type: "error",
        message: messages[errorCode] || `Connection failed: ${errorCode}`,
      });
    }
  }, [searchParams]);

  useEffect(() => {
    async function loadData() {
      try {
        const [statsRes, statusRes] = await Promise.all([
          fetch("/api/ecommerce/stats"),
          fetch("/api/shopify/status"),
        ]);

        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }

        if (statusRes.ok) {
          const data = await statusRes.json();
          setShopifyStatus(data);
        }
      } catch {
        // Failed to load
      }
      setLoading(false);
    }
    loadData();
  }, []);

  function handleConnect(e) {
    e.preventDefault();
    if (!shopDomain.trim()) return;

    setConnecting(true);
    setFeedback(null);

    // Normalize: ensure it ends with .myshopify.com
    let domain = shopDomain.trim()
      .replace("https://", "")
      .replace("http://", "")
      .replace(/\/$/, "");

    if (!domain.includes(".myshopify.com")) {
      domain = `${domain}.myshopify.com`;
    }

    // Redirect to connect endpoint
    window.location.href = `/api/shopify/connect?shop=${encodeURIComponent(domain)}`;
  }

  async function handleDisconnect() {
    if (!confirm("Are you sure you want to disconnect your Shopify store?")) return;

    setDisconnecting(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/shopify/disconnect", { method: "POST" });
      if (res.ok) {
        setShopifyStatus({ connected: false });
        setFeedback({ type: "success", message: "Shopify store disconnected." });
      } else {
        setFeedback({ type: "error", message: "Failed to disconnect. Please try again." });
      }
    } catch {
      setFeedback({ type: "error", message: "Failed to disconnect. Please try again." });
    }
    setDisconnecting(false);
  }

  if (loading) {
    return <><p className={styles.loading}>Loading...</p></>;
  }

  return (
    <>
      <h1 className={styles.heading}>eCommerce</h1>
      <p className={styles.subheading}>Manage your products, orders, and inventory.</p>

      {feedback && (
        <div className={feedback.type === "success" ? styles.success : styles.error}>
          {feedback.message}
        </div>
      )}

      {/* Shopify Connection */}
      <div className={styles.section} style={{ marginBottom: "1.5rem" }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Shopify Connection</h2>
        </div>

        {shopifyStatus?.connected ? (
          <div className={styles.gbpConnected}>
            <div className={styles.gbpConnectedInfo}>
              <span className={styles.gbpConnectedLabel}>Store</span>
              <span className={styles.gbpConnectedValue}>
                {shopifyStatus.storeName || shopifyStatus.shopDomain}
              </span>
            </div>
            <div className={styles.gbpConnectedInfo}>
              <span className={styles.gbpConnectedLabel}>Domain</span>
              <span className={styles.gbpConnectedValue}>{shopifyStatus.shopDomain}</span>
            </div>
            {shopifyStatus.lastSyncedAt && (
              <div className={styles.gbpConnectedInfo}>
                <span className={styles.gbpConnectedLabel}>Last Synced</span>
                <span className={styles.gbpConnectedValue}>
                  {new Date(shopifyStatus.lastSyncedAt).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className={styles.gbpActions}>
              <span className={`${styles.tag}`}>
                {shopifyStatus.webhooksEnabled ? "Webhooks Active" : "Webhooks Inactive"}
              </span>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className={`${styles.btn} ${styles.btnDanger}`}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className={styles.gbpCardDesc}>
              Connect your Shopify store to sync products, orders, and customers automatically.
            </p>
            <form onSubmit={handleConnect} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div className={styles.field} style={{ flex: 1, minWidth: "200px" }}>
                <label className={styles.label} htmlFor="shopDomain">Shop Domain</label>
                <input
                  id="shopDomain"
                  type="text"
                  className={styles.input}
                  placeholder="my-store.myshopify.com"
                  value={shopDomain}
                  onChange={(e) => setShopDomain(e.target.value)}
                  required
                />
                <span className={styles.hint}>Enter your Shopify store domain</span>
              </div>
              <button
                type="submit"
                disabled={connecting || !shopDomain.trim()}
                className={`${styles.btn} ${styles.btnPrimary}`}
                style={{ height: "fit-content" }}
              >
                {connecting ? "Connecting..." : "Connect Shopify"}
              </button>
            </form>
          </>
        )}
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Products</div>
          <div className={`${styles.statValue} ${styles.accent}`}>
            {stats?.products ?? 0}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={styles.statValue}>{stats?.orders ?? 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Collections</div>
          <div className={styles.statValue}>{stats?.collections ?? 0}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tags</div>
          <div className={styles.statValue}>{stats?.tags ?? 0}</div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <Link href="/dashboard/ecommerce/products" className={`${styles.btn} ${styles.btnPrimary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            View Products
          </Link>
          <Link href="/dashboard/ecommerce/orders" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            View Orders
          </Link>
          <Link href="/dashboard/ecommerce/collections" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Collections
          </Link>
          <Link href="/dashboard/ecommerce/tags" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            Tags
          </Link>
          <Link href="/dashboard/ecommerce/tracking" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            Tracking
          </Link>
        </div>
      </div>
    </>
  );
}
