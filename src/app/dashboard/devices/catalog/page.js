"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import styles from "./page.module.css";

const DEVICE_TYPES = ["laptop", "desktop", "monitor", "phone", "tablet", "printer", "other"];

function formatPrice(price, currency) {
  if (!price && price !== 0) return "-";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 0 }).format(price);
}

export default function DeviceCatalogPage() {
  const { activeProject } = useProject();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ brand: "", model: "", device_type: "laptop", price: "", currency: "INR", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  // Search & filter
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  function showSuccessMsg(msg) {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }

  const loadItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeProject) params.set("projectId", activeProject);
      const res = await fetch(`/api/devices/catalog?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => { loadItems(); }, [loadItems]);

  function openAddForm() {
    setForm({ brand: "", model: "", device_type: "laptop", price: "", currency: "INR", notes: "" });
    setEditingId(null);
    setShowForm(true);
    setError("");
  }

  function openEditForm(item) {
    setForm({
      brand: item.brand || "",
      model: item.model || "",
      device_type: item.device_type || "laptop",
      price: item.price ?? "",
      currency: item.currency || "INR",
      notes: item.notes || "",
    });
    setEditingId(item.id);
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.brand.trim() || !form.model.trim()) {
      setError("Brand and model are required");
      return;
    }
    setSubmitting(true);
    setError("");

    try {
      const payload = {
        ...form,
        price: form.price === "" ? null : Number(form.price),
        projectId: activeProject || null,
      };

      const url = editingId ? `/api/devices/catalog/${editingId}` : "/api/devices/catalog";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        setSubmitting(false);
        return;
      }

      showSuccessMsg(editingId ? "Item updated" : "Item added");
      setShowForm(false);
      setEditingId(null);
      loadItems();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm("Remove this item from the catalog?")) return;
    try {
      const res = await fetch(`/api/devices/catalog/${id}`, { method: "DELETE" });
      if (res.ok) {
        showSuccessMsg("Item removed");
        setItems((prev) => prev.filter((i) => i.id !== id));
      }
    } catch {
      // silent
    }
  }

  const filtered = items.filter((item) => {
    const q = search.toLowerCase();
    const matchesSearch = !q || item.brand.toLowerCase().includes(q) || item.model.toLowerCase().includes(q);
    const matchesType = filterType === "all" || item.device_type === filterType;
    return matchesSearch && matchesType;
  });

  const totalValue = items.reduce((sum, i) => sum + (i.price || 0), 0);
  const brands = [...new Set(items.map((i) => i.brand))];

  return (
    <>
      <h1 className={styles.heading}>Device Catalog</h1>
      <p className={styles.subheading}>Manage device brands, models, and pricing.</p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Items</div>
          <div className={styles.statValue}>{items.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Brands</div>
          <div className={styles.statValue}>{brands.length}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Value</div>
          <div className={styles.statValue}>{formatPrice(totalValue, "INR")}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search brand or model..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className={styles.filterSelect} value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="all">All Types</option>
          {DEVICE_TYPES.map((t) => (
            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
          ))}
        </select>
        <button className={styles.addBtn} onClick={openAddForm}>+ Add Item</button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <div className={styles.formCard}>
          <h3 className={styles.formTitle}>{editingId ? "Edit Item" : "Add to Catalog"}</h3>
          <form onSubmit={handleSubmit}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Brand *</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.brand}
                  onChange={(e) => setForm((p) => ({ ...p, brand: e.target.value }))}
                  placeholder="e.g. Apple, Dell, Samsung"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Model *</label>
                <input
                  className={styles.input}
                  type="text"
                  value={form.model}
                  onChange={(e) => setForm((p) => ({ ...p, model: e.target.value }))}
                  placeholder="e.g. MacBook Pro 14&quot;"
                  required
                />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Type</label>
                <select className={styles.select} value={form.device_type} onChange={(e) => setForm((p) => ({ ...p, device_type: e.target.value }))}>
                  {DEVICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Price</label>
                <div className={styles.priceRow}>
                  <select className={styles.currencySelect} value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))}>
                    <option value="INR">INR</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                  <input
                    className={styles.input}
                    type="number"
                    min="0"
                    step="1"
                    value={form.price}
                    onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
            <div className={styles.field} style={{ marginTop: "0.75rem" }}>
              <label className={styles.label}>Notes</label>
              <textarea
                className={styles.textarea}
                rows={2}
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Specs, config, etc."
              />
            </div>
            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn} disabled={submitting}>
                {submitting ? "Saving..." : editingId ? "Update" : "Add"}
              </button>
              <button type="button" className={styles.cancelBtn} onClick={() => { setShowForm(false); setEditingId(null); setError(""); }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Loading */}
      {loading && <p className={styles.loadingText}>Loading catalog...</p>}

      {/* Empty */}
      {!loading && items.length === 0 && !showForm && (
        <div className={styles.empty}>
          <p>No items in the catalog yet.</p>
          <button className={styles.addBtn} onClick={openAddForm}>+ Add First Item</button>
        </div>
      )}

      {/* Table */}
      {!loading && filtered.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Brand</th>
                <th>Model</th>
                <th>Type</th>
                <th>Price</th>
                <th>Notes</th>
                <th style={{ width: "100px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><span className={styles.brandText}>{item.brand}</span></td>
                  <td>{item.model}</td>
                  <td><span className={styles.typeBadge}>{item.device_type}</span></td>
                  <td><span className={styles.priceText}>{formatPrice(item.price, item.currency)}</span></td>
                  <td className={styles.notesCell}>{item.notes || "-"}</td>
                  <td>
                    <div className={styles.actions}>
                      <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => openEditForm(item)} title="Edit">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(item.id)} title="Remove">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

      {!loading && filtered.length === 0 && items.length > 0 && (
        <p className={styles.loadingText}>No items match your search.</p>
      )}
    </>
  );
}
