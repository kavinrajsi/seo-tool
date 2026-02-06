"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function CollectionsPage() {
  const [collections, setCollections] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    product_ids: [],
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [collRes, prodRes] = await Promise.all([
        fetch("/api/ecommerce/collections"),
        fetch("/api/ecommerce/products"),
      ]);
      if (collRes.ok) {
        const data = await collRes.json();
        setCollections(data.collections || []);
      }
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.products || []);
      }
    } catch {
      setError("Failed to load data");
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/ecommerce/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({ title: "", description: "", product_ids: [] });
        loadData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create collection");
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this collection?")) return;

    try {
      const res = await fetch(`/api/ecommerce/collections/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
      }
    } catch {
      setError("Failed to delete collection");
    }
  }

  function toggleProduct(productId) {
    setFormData((prev) => {
      const ids = prev.product_ids.includes(productId)
        ? prev.product_ids.filter((id) => id !== productId)
        : [...prev.product_ids, productId];
      return { ...prev, product_ids: ids };
    });
  }

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>Loading...</p></div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Collections</h1>
      <p className={styles.subheading}>Organize products into collections.</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Collections ({collections.length})</h2>
          <button
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={() => setShowModal(true)}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Collection
          </button>
        </div>

        {collections.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <p>No collections yet. Create your first collection to organize products.</p>
          </div>
        ) : (
          <div className={styles.itemsGrid}>
            {collections.map((collection) => (
              <div key={collection.id} className={styles.itemCard}>
                <div className={styles.itemImagePlaceholder}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                  </svg>
                </div>
                <div className={styles.itemInfo}>
                  <div className={styles.itemTitle}>{collection.title}</div>
                  <div className={styles.itemMeta}>
                    <span>{collection.product_count || 0} products</span>
                  </div>
                  {collection.description && (
                    <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                      {collection.description.substring(0, 60)}
                      {collection.description.length > 60 ? "..." : ""}
                    </p>
                  )}
                  <button
                    className={`${styles.btn} ${styles.btnDanger}`}
                    style={{ marginTop: "0.5rem", padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                    onClick={() => handleDelete(collection.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Collection</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>Title *</label>
                    <input
                      type="text"
                      className={styles.input}
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Description</label>
                    <textarea
                      className={styles.textarea}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Products</label>
                    <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "0.5rem" }}>
                      {products.length === 0 ? (
                        <p style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                          No products available
                        </p>
                      ) : (
                        products.map((product) => (
                          <label
                            key={product.id}
                            style={{ display: "flex", alignItems: "center", gap: "0.5rem", padding: "0.375rem", cursor: "pointer" }}
                          >
                            <input
                              type="checkbox"
                              checked={formData.product_ids.includes(product.id)}
                              onChange={() => toggleProduct(product.id)}
                            />
                            <span style={{ fontSize: "0.875rem" }}>{product.title}</span>
                          </label>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSecondary}`}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`${styles.btn} ${styles.btnPrimary}`}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Add Collection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
