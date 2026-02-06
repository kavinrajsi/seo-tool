"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "./page.module.css";

export default function EcommercePage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/ecommerce/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch {
        // Failed to load stats
      }
      setLoading(false);
    }
    loadStats();
  }, []);

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>Loading...</p></div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>eCommerce</h1>
      <p className={styles.subheading}>Manage your products, orders, and inventory.</p>

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
    </div>
  );
}
