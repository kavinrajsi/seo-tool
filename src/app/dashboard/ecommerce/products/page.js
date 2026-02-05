"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function ProductsPage() {
  const [connection, setConnection] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

        // Fetch products
        const prodRes = await fetch("/api/ecommerce/products");
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.products || []);
        }
      } catch {
        setError("Failed to load data");
      }
      setLoading(false);
    }
    loadData();
  }, []);

  async function handleSync() {
    setError("");
    setSuccess("");
    setSyncing(true);

    try {
      const res = await fetch("/api/ecommerce/shopify/sync", { method: "POST" });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to sync");
      } else {
        setSuccess(`Synced ${data.productCount} products from Shopify`);
        // Reload products
        const prodRes = await fetch("/api/ecommerce/products");
        if (prodRes.ok) {
          const prodData = await prodRes.json();
          setProducts(prodData.products || []);
        }
        // Update connection with new sync time
        setConnection((prev) => prev ? { ...prev, last_synced_at: data.syncedAt } : prev);
      }
    } catch {
      setError("Network error during sync");
    }
    setSyncing(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "Never";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  function formatPrice(price) {
    if (!price) return null;
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
      <h1 className={styles.heading}>Products</h1>
      <p className={styles.subheading}>View and sync your Shopify products.</p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.productsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Products</h2>
          <div className={styles.sectionActions}>
            <span className={styles.productCount}>{products.length} products</span>
            {connection && (
              <button
                className={styles.syncBtn}
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <>Syncing...</>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 4 23 10 17 10" />
                      <polyline points="1 20 1 14 7 14" />
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                    </svg>
                    Sync Products
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {products.length === 0 ? (
          <p className={styles.emptyState}>
            {connection
              ? "No products synced yet. Click 'Sync Products' to import from Shopify."
              : "Connect your Shopify store first to see products here."}
          </p>
        ) : (
          <>
            <div className={styles.productsGrid}>
              {products.map((product) => (
                <div key={product.id} className={styles.productCard}>
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.title}
                      className={styles.productImage}
                    />
                  ) : (
                    <div className={styles.productImagePlaceholder}>
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    </div>
                  )}
                  <div className={styles.productInfo}>
                    <div className={styles.productTitle}>{product.title}</div>
                    {product.vendor && (
                      <div className={styles.productVendor}>{product.vendor}</div>
                    )}
                    <div className={styles.productMeta}>
                      {product.price && (
                        <span className={styles.productPrice}>
                          {formatPrice(product.price)}
                        </span>
                      )}
                      <span
                        className={`${styles.productStatus} ${
                          product.status === "active"
                            ? styles.statusActive
                            : product.status === "draft"
                              ? styles.statusDraft
                              : styles.statusArchived
                        }`}
                      >
                        {product.status}
                      </span>
                      {product.variant_count > 1 && (
                        <span className={styles.productVariants}>
                          {product.variant_count} variants
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {connection?.last_synced_at && (
              <p className={styles.lastSynced}>
                Last synced: {formatDate(connection.last_synced_at)}
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
}
