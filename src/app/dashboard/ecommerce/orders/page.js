"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function OrdersPage() {
  const [connection, setConnection] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch connection
        const connRes = await fetch("/api/ecommerce/shopify");
        if (connRes.ok) {
          const connData = await connRes.json();
          setConnection(connData.connection);
        }

        // Fetch orders (placeholder - implement API if needed)
        // const ordersRes = await fetch("/api/ecommerce/orders");
        // if (ordersRes.ok) {
        //   const ordersData = await ordersRes.json();
        //   setOrders(ordersData.orders || []);
        // }
      } catch {
        setError("Failed to load data");
      }
      setLoading(false);
    }
    loadData();
  }, []);

  function formatDate(dateStr) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatPrice(price) {
    if (!price) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(price));
  }

  if (loading) {
    return <p className={styles.loading}>Loading...</p>;
  }

  return (
    <>
      <h1 className={styles.heading}>Orders</h1>
      <p className={styles.subheading}>View and manage your store orders.</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.ordersSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Orders</h2>
          <span className={styles.productCount}>{orders.length} orders</span>
        </div>

        {!connection ? (
          <p className={styles.emptyState}>
            Connect your Shopify store first to see orders here.
          </p>
        ) : orders.length === 0 ? (
          <div className={styles.emptyStateCard}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={styles.emptyIcon}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p className={styles.emptyTitle}>No orders yet</p>
            <p className={styles.emptyDesc}>Orders from your Shopify store will appear here.</p>
          </div>
        ) : (
          <div className={styles.ordersTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className={styles.orderNumber}>#{order.order_number}</td>
                    <td>{order.customer_name || "Guest"}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>
                      <span className={`${styles.orderStatus} ${styles[`status${order.fulfillment_status || "unfulfilled"}`]}`}>
                        {order.fulfillment_status || "Unfulfilled"}
                      </span>
                    </td>
                    <td className={styles.orderTotal}>{formatPrice(order.total)}</td>
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
