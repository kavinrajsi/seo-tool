"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    loadOrders();
  }, []);

  async function loadOrders() {
    setLoading(true);
    try {
      const res = await fetch("/api/ecommerce/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
      }
    } catch {
      setError("Failed to load orders");
    }
    setLoading(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatPrice(price, currency = "INR") {
    if (!price) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(parseFloat(price));
  }

  function getFinancialStatusColor(status) {
    switch (status) {
      case "paid":
        return styles.statusActive;
      case "pending":
      case "authorized":
        return styles.statusDraft;
      case "refunded":
      case "voided":
        return styles.statusArchived;
      default:
        return styles.statusDraft;
    }
  }

  function getFulfillmentStatusColor(status) {
    switch (status) {
      case "fulfilled":
        return styles.statusActive;
      case "partial":
        return styles.statusDraft;
      case "unfulfilled":
      default:
        return styles.statusArchived;
    }
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer_name?.toLowerCase().includes(search.toLowerCase());

    let matchesStatus = statusFilter === "all";
    if (!matchesStatus) {
      matchesStatus = o.status === statusFilter || o.financial_status === statusFilter;
    }

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const paidOrders = orders.filter(o => o.financial_status === "paid");
  const unfulfilledOrders = orders.filter(o => o.status === "unfulfilled");
  const totalRevenue = paidOrders.reduce((sum, o) => sum + parseFloat(o.total_price || 0), 0);

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("100px", "28px", "0.5rem")} />
        <div style={b("300px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("140px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Order","Customer","Date","Fulfillment","Payment","Total"].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5,6].map(j => <td key={j}><div style={b(j===2?"70%":"50%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <h1 className={styles.heading}>Orders</h1>
      <p className={styles.subheading}>View Shopify orders synced via webhooks.</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Orders</div>
          <div className={styles.statValue}>{orders.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Paid</div>
          <div className={styles.statValue}>{paidOrders.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Unfulfilled</div>
          <div className={styles.statValue}>{unfulfilledOrders.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Revenue</div>
          <div className={`${styles.statValue} ${styles.accent}`}>
            {formatPrice(totalRevenue)}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Orders</h2>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search by order #, email, or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <optgroup label="Fulfillment">
              <option value="unfulfilled">Unfulfilled</option>
              <option value="partial">Partial</option>
              <option value="fulfilled">Fulfilled</option>
            </optgroup>
            <optgroup label="Financial">
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="refunded">Refunded</option>
            </optgroup>
          </select>
        </div>

        {filteredOrders.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <p>No orders found.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Fulfillment</th>
                  <th>Payment</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>
                      <div>{order.customer_name || "-"}</div>
                      <div style={{ fontSize: "0.75rem", color: "#888" }}>
                        {order.customer_email || "-"}
                      </div>
                    </td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <span
                        className={`${styles.itemStatus} ${getFulfillmentStatusColor(order.status)}`}
                      >
                        {order.status || "unfulfilled"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.itemStatus} ${getFinancialStatusColor(order.financial_status)}`}
                      >
                        {order.financial_status || "pending"}
                      </span>
                    </td>
                    <td>{formatPrice(order.total_price, order.currency || "INR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
