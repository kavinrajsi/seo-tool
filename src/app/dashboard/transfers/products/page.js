"use client";

import { useState, useEffect } from "react";
import styles from "./page.module.css";

const EMPTY_FORM = {
  product_name: "",
  product_code: "",
  product_category: "",
  brand: "",
  unit: "pcs",
  price: "",
  currency: "INR",
  image_url: "",
  notes: "",
};

export default function TransferProductsPage() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/transfers/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
        setStats(data.stats || null);
        setCategories(data.categories || []);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load products");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  function showSuccess(msg) {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  function openAddModal() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setFormError("");
    setShowModal(true);
  }

  function openEditModal(product) {
    setForm({
      product_name: product.product_name || "",
      product_code: product.product_code || "",
      product_category: product.product_category || "",
      brand: product.brand || "",
      unit: product.unit || "pcs",
      price: product.price || "",
      currency: product.currency || "INR",
      image_url: product.image_url || "",
      notes: product.notes || "",
    });
    setEditingId(product.id);
    setFormError("");
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingId(null);
    setFormError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    const payload = { ...form };
    if (payload.price) payload.price = parseFloat(payload.price);

    try {
      const url = editingId ? `/api/transfers/products/${editingId}` : "/api/transfers/products";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        showSuccess(editingId ? "Product updated" : "Product added");
        closeModal();
        loadProducts();
      } else {
        setFormError(data.error || "Failed to save");
      }
    } catch {
      setFormError("Network error");
    }
    setSubmitting(false);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this product?")) return;
    try {
      const res = await fetch(`/api/transfers/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccess("Product deleted");
        loadProducts();
      }
    } catch {
      setError("Network error");
    }
  }

  async function handleToggleActive(product) {
    try {
      await fetch(`/api/transfers/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !product.is_active }),
      });
      loadProducts();
    } catch {
      // silently fail
    }
  }

  const filtered = products.filter((p) => {
    const q = search.toLowerCase();
    const matchSearch =
      p.product_name.toLowerCase().includes(q) ||
      (p.product_code || "").toLowerCase().includes(q) ||
      (p.brand || "").toLowerCase().includes(q);
    const matchCategory = categoryFilter === "all" || p.product_category === categoryFilter;
    return matchSearch && matchCategory;
  });

  function formatPrice(price, currency) {
    if (!price) return "-";
    return `${currency === "INR" ? "\u20B9" : currency} ${Number(price).toLocaleString()}`;
  }

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("220px", "28px", "0.5rem")} />
        <div style={b("380px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3].map((i) => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /></div>
          <table className={styles.table}>
            <thead><tr>{["Name", "SKU", "Category", "Brand", "Unit", "Price", "Status", "Actions"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{[1, 2, 3].map((i) => <tr key={i}>{[1, 2, 3, 4, 5, 6, 7, 8].map((j) => <td key={j}><div style={b("60%", "14px")} /></td>)}</tr>)}</tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <>
      <div className={styles.sectionHeader} style={{ padding: 0, background: "none", border: "none", marginBottom: "0.5rem" }}>
        <div>
          <h1 className={styles.heading}>Transfer Products</h1>
          <p className={styles.subheading} style={{ margin: 0 }}>Manage your product catalog for transfers.</p>
        </div>
        <div className={styles.sectionActions}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={openAddModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && <div className={styles.success} onClick={() => setSuccessMsg("")} style={{ cursor: "pointer" }}>{successMsg}</div>}

      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Products</div>
            <div className={styles.statValue}>{stats.total}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Active</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.active}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Categories</div>
            <div className={styles.statValue} style={{ color: "#3b82f6" }}>{stats.categories}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Products ({filtered.length})</h2>
          <div className={styles.sectionActions}>
            <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadProducts}>Refresh</button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by name, SKU, brand..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className={styles.filterSelect} value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            <p>No products found. Add a product to get started.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Unit</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th style={{ width: "120px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td style={{ fontWeight: 500 }}>{product.product_name}</td>
                    <td><code style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{product.product_code || "-"}</code></td>
                    <td>
                      {product.product_category ? (
                        <span className={styles.categoryBadge}>{product.product_category}</span>
                      ) : "-"}
                    </td>
                    <td style={{ fontSize: "0.8rem" }}>{product.brand || "-"}</td>
                    <td>{product.unit}</td>
                    <td style={{ fontSize: "0.8rem" }}>{formatPrice(product.price, product.currency)}</td>
                    <td>
                      <span
                        className={product.is_active ? styles.statusActive : styles.statusInactive}
                        style={{ cursor: "pointer" }}
                        onClick={() => handleToggleActive(product)}
                        title="Click to toggle"
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSmall}`} onClick={() => openEditModal(product)} title="Edit">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`} onClick={() => handleDelete(product.id)} title="Delete">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>{editingId ? "Edit Product" : "Add Product"}</h3>
              <button className={styles.modalClose} onClick={closeModal}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className={styles.modalBody}>
                {formError && <div className={styles.error}>{formError}</div>}
                <div className={styles.form}>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Product Name *</label>
                      <input className={styles.input} type="text" value={form.product_name} onChange={(e) => setForm((p) => ({ ...p, product_name: e.target.value }))} placeholder="e.g. Samsung Galaxy S24" required />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>SKU / Product Code</label>
                      <input className={styles.input} type="text" value={form.product_code} onChange={(e) => setForm((p) => ({ ...p, product_code: e.target.value }))} placeholder="e.g. SGS24-BLK-128" />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Category</label>
                      <input className={styles.input} type="text" value={form.product_category} onChange={(e) => setForm((p) => ({ ...p, product_category: e.target.value }))} placeholder="e.g. Smartphones" list="category-suggestions" />
                      <datalist id="category-suggestions">
                        {categories.map((c) => <option key={c} value={c} />)}
                      </datalist>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Brand</label>
                      <input className={styles.input} type="text" value={form.brand} onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))} placeholder="e.g. Samsung" />
                    </div>
                  </div>
                  <div className={styles.formRow}>
                    <div className={styles.field}>
                      <label className={styles.label}>Unit</label>
                      <select className={styles.select} value={form.unit} onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}>
                        <option value="pcs">pcs</option>
                        <option value="kg">kg</option>
                        <option value="box">box</option>
                      </select>
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Price</label>
                      <input className={styles.input} type="number" step="0.01" min="0" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} placeholder="0.00" />
                    </div>
                    <div className={styles.field}>
                      <label className={styles.label}>Currency</label>
                      <select className={styles.select} value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}>
                        <option value="INR">INR</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Image URL</label>
                    <input className={styles.input} type="url" value={form.image_url} onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))} placeholder="https://..." />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Notes</label>
                    <textarea className={styles.textarea} rows={2} value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={`${styles.btn} ${styles.btnSecondary}`} onClick={closeModal}>Cancel</button>
                <button type="submit" className={`${styles.btn} ${styles.btnPrimary}`} disabled={submitting}>
                  {submitting ? "Saving..." : editingId ? "Update Product" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
