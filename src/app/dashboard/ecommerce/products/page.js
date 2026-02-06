"use client";

import { useState, useEffect, useRef } from "react";
import styles from "../page.module.css";

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [csvPreview, setCsvPreview] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "table"
  const fileInputRef = useRef(null);
  const [formData, setFormData] = useState({
    // Title & Description
    title: "",
    description: "",
    // Media
    image_url: "",
    // Pricing
    price: "",
    compare_at_price: "",
    cost_per_item: "",
    charge_tax: true,
    // Inventory
    sku: "",
    barcode: "",
    inventory_quantity: "",
    track_inventory: true,
    continue_selling: false,
    // Shipping
    is_physical: true,
    weight: "",
    weight_unit: "kg",
    country_of_origin: "",
    hs_code: "",
    // Product Organization
    product_type: "",
    vendor: "",
    collections: "",
    tags: "",
    // Theme & Catalogs
    template_suffix: "",
    // Publishing
    status: "active",
    // SEO
    seo_title: "",
    seo_description: "",
    handle: "",
  });

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const res = await fetch("/api/ecommerce/products");
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch {
      setError("Failed to load products");
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/ecommerce/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowModal(false);
        setFormData({
          title: "",
          description: "",
          image_url: "",
          price: "",
          compare_at_price: "",
          cost_per_item: "",
          charge_tax: true,
          sku: "",
          barcode: "",
          inventory_quantity: "",
          track_inventory: true,
          continue_selling: false,
          is_physical: true,
          weight: "",
          weight_unit: "kg",
          country_of_origin: "",
          hs_code: "",
          product_type: "",
          vendor: "",
          collections: "",
          tags: "",
          template_suffix: "",
          status: "active",
          seo_title: "",
          seo_description: "",
          handle: "",
        });
        loadProducts();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create product");
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  async function handleDelete(id, source = "manual") {
    if (!confirm("Are you sure you want to delete this product?")) return;

    try {
      const res = await fetch(`/api/ecommerce/products/${id}?source=${source}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadProducts();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete product");
      }
    } catch {
      setError("Failed to delete product");
    }
  }

  function parseCSV(text) {
    const lines = text.split("\n");
    if (lines.length < 2) return [];

    // Parse header row
    const headers = parseCSVLine(lines[0]);
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || "";
      });
      data.push(row);
    }

    return data;
  }

  function parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());

    return result;
  }

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === "string") {
        const data = parseCSV(text);
        // Extract unique products (rows with Title)
        const productsPreview = data.filter((row) => row.Title && row.Title.trim());
        setCsvPreview(productsPreview);
        setShowImportModal(true);
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (csvPreview.length === 0) return;

    setImporting(true);
    setError("");
    setSuccess("");

    try {
      // Get full CSV data (including variants)
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        setError("No file selected");
        setImporting(false);
        return;
      }

      const text = await file.text();
      const fullData = parseCSV(text);

      const res = await fetch("/api/ecommerce/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csvData: fullData }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`Successfully imported ${data.imported} products`);
        setShowImportModal(false);
        setCsvPreview([]);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        loadProducts();
      } else {
        setError(data.error || "Failed to import products");
      }
    } catch {
      setError("Network error during import");
    }
    setImporting(false);
  }

  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>Loading...</p></div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Products</h1>
      <p className={styles.subheading}>Manage your product catalog.</p>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Products ({filteredProducts.length})</h2>
          <div className={styles.sectionActions}>
            <input
              type="file"
              accept=".csv"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={() => fileInputRef.current?.click()}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Import CSV
            </button>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => setShowModal(true)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Product
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <div style={{ display: "flex", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              style={{
                padding: "0.5rem",
                background: viewMode === "grid" ? "var(--color-accent)" : "var(--color-bg-secondary)",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Grid view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={viewMode === "grid" ? "var(--color-bg)" : "var(--color-text-secondary)"} strokeWidth="2">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              style={{
                padding: "0.5rem",
                background: viewMode === "table" ? "var(--color-accent)" : "var(--color-bg-secondary)",
                border: "none",
                borderLeft: "1px solid var(--color-border)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Table view"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={viewMode === "table" ? "var(--color-bg)" : "var(--color-text-secondary)"} strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            </svg>
            <p>No products found. Add your first product or import from CSV.</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className={styles.itemsGrid}>
            {filteredProducts.map((product) => (
              <div key={product.id} className={styles.itemCard}>
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.title}
                    className={styles.itemImage}
                  />
                ) : (
                  <div className={styles.itemImagePlaceholder}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
                <div className={styles.itemInfo}>
                  <div className={styles.itemTitle}>{product.title}</div>
                  {product.vendor && (
                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      {product.vendor}
                    </div>
                  )}
                  <div className={styles.itemMeta}>
                    {product.price && (
                      <span className={styles.itemPrice}>${product.price}</span>
                    )}
                    <span
                      className={`${styles.itemStatus} ${
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
                      <span style={{ fontSize: "0.675rem", color: "var(--color-text-secondary)" }}>
                        {product.variant_count} variants
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                    {product.source === "shopify" ? (
                      <span style={{
                        fontSize: "0.625rem",
                        padding: "0.125rem 0.375rem",
                        background: "rgba(150, 191, 71, 0.2)",
                        color: "#96bf47",
                        borderRadius: "4px",
                        fontWeight: 500
                      }}>
                        Shopify
                      </span>
                    ) : (
                      <span style={{
                        fontSize: "0.625rem",
                        padding: "0.125rem 0.375rem",
                        background: "var(--color-bg)",
                        color: "var(--color-text-secondary)",
                        borderRadius: "4px"
                      }}>
                        Manual
                      </span>
                    )}
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() => setSelectedProduct(product)}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                      View
                    </button>
                    <button
                      className={`${styles.btn} ${styles.btnDanger}`}
                      style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                      onClick={() => handleDelete(product.id, product.source)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: "50px" }}>Image</th>
                  <th>Title</th>
                  <th>Vendor</th>
                  <th>Price</th>
                  <th>Inventory</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                            borderRadius: "var(--radius-sm)"
                          }}
                        />
                      ) : (
                        <div style={{
                          width: "40px",
                          height: "40px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--color-bg)",
                          borderRadius: "var(--radius-sm)"
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{product.title}</div>
                      {product.variant_count > 1 && (
                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)" }}>
                          {product.variant_count} variants
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                      {product.vendor || "-"}
                    </td>
                    <td>
                      {product.price ? (
                        <span style={{ fontWeight: 500, color: "var(--color-accent)" }}>${product.price}</span>
                      ) : "-"}
                    </td>
                    <td style={{ fontSize: "0.875rem" }}>
                      {product.total_inventory ?? "-"}
                    </td>
                    <td>
                      <span
                        className={`${styles.itemStatus} ${
                          product.status === "active"
                            ? styles.statusActive
                            : product.status === "draft"
                              ? styles.statusDraft
                              : styles.statusArchived
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>
                    <td>
                      {product.source === "shopify" ? (
                        <span style={{
                          fontSize: "0.625rem",
                          padding: "0.125rem 0.375rem",
                          background: "rgba(150, 191, 71, 0.2)",
                          color: "#96bf47",
                          borderRadius: "4px",
                          fontWeight: 500
                        }}>
                          Shopify
                        </span>
                      ) : (
                        <span style={{
                          fontSize: "0.625rem",
                          padding: "0.125rem 0.375rem",
                          background: "var(--color-bg)",
                          color: "var(--color-text-secondary)",
                          borderRadius: "4px"
                        }}>
                          Manual
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "0.375rem" }}>
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => setSelectedProduct(product)}
                        >
                          View
                        </button>
                        <button
                          className={`${styles.btn} ${styles.btnDanger}`}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                          onClick={() => handleDelete(product.id, product.source)}
                        >
                          Delete
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

      {/* Add Product Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Add Product</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
              <div className={styles.modalBody} style={{ overflow: "auto", flex: 1 }}>
                <div style={{ display: "grid", gap: "1.5rem" }}>

                  {/* Section: Title & Description */}
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Title & Description
                    </h4>
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
                    <div className={styles.field} style={{ marginTop: "1rem" }}>
                      <label className={styles.label}>Description</label>
                      <textarea
                        className={styles.textarea}
                        rows={4}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Product description (supports HTML)"
                      />
                    </div>
                  </div>

                  {/* Section: Media */}
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Media
                    </h4>
                    <div className={styles.field}>
                      <label className={styles.label}>Image URL</label>
                      <input
                        type="url"
                        className={styles.input}
                        value={formData.image_url}
                        onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                        placeholder="https://example.com/image.jpg"
                      />
                    </div>
                    {formData.image_url && (
                      <div style={{ marginTop: "0.75rem" }}>
                        <img
                          src={formData.image_url}
                          alt="Preview"
                          style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                  </div>

                  {/* Section: Pricing */}
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Pricing
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                      <div className={styles.field}>
                        <label className={styles.label}>Price</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={styles.input}
                          value={formData.price}
                          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Compare-at price</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={styles.input}
                          value={formData.compare_at_price}
                          onChange={(e) => setFormData({ ...formData, compare_at_price: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Cost per item</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className={styles.input}
                          value={formData.cost_per_item}
                          onChange={(e) => setFormData({ ...formData, cost_per_item: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: "1rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                        <input
                          type="checkbox"
                          checked={formData.charge_tax}
                          onChange={(e) => setFormData({ ...formData, charge_tax: e.target.checked })}
                        />
                        Charge tax on this product
                      </label>
                    </div>
                  </div>

                  {/* Section: Inventory */}
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Inventory
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                      <div className={styles.field}>
                        <label className={styles.label}>SKU (Stock Keeping Unit)</label>
                        <input
                          type="text"
                          className={styles.input}
                          value={formData.sku}
                          onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Barcode (ISBN, UPC, GTIN)</label>
                        <input
                          type="text"
                          className={styles.input}
                          value={formData.barcode}
                          onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Quantity</label>
                        <input
                          type="number"
                          min="0"
                          className={styles.input}
                          value={formData.inventory_quantity}
                          onChange={(e) => setFormData({ ...formData, inventory_quantity: e.target.value })}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                        <input
                          type="checkbox"
                          checked={formData.track_inventory}
                          onChange={(e) => setFormData({ ...formData, track_inventory: e.target.checked })}
                        />
                        Track quantity
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                        <input
                          type="checkbox"
                          checked={formData.continue_selling}
                          onChange={(e) => setFormData({ ...formData, continue_selling: e.target.checked })}
                        />
                        Continue selling when out of stock
                      </label>
                    </div>
                  </div>

                  {/* Section: Shipping */}
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Shipping
                    </h4>
                    <div style={{ marginBottom: "1rem" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                        <input
                          type="checkbox"
                          checked={formData.is_physical}
                          onChange={(e) => setFormData({ ...formData, is_physical: e.target.checked })}
                        />
                        This is a physical product
                      </label>
                    </div>
                    {formData.is_physical && (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                        <div className={styles.field}>
                          <label className={styles.label}>Weight</label>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              className={styles.input}
                              style={{ flex: 1 }}
                              value={formData.weight}
                              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                              placeholder="0.0"
                            />
                            <select
                              className={styles.select}
                              style={{ width: "80px" }}
                              value={formData.weight_unit}
                              onChange={(e) => setFormData({ ...formData, weight_unit: e.target.value })}
                            >
                              <option value="kg">kg</option>
                              <option value="g">g</option>
                              <option value="lb">lb</option>
                              <option value="oz">oz</option>
                            </select>
                          </div>
                        </div>
                        <div className={styles.field}>
                          <label className={styles.label}>Country/Region of origin</label>
                          <input
                            type="text"
                            className={styles.input}
                            value={formData.country_of_origin}
                            onChange={(e) => setFormData({ ...formData, country_of_origin: e.target.value })}
                            placeholder="e.g., United States"
                          />
                        </div>
                        <div className={styles.field}>
                          <label className={styles.label}>HS (Harmonized System) code</label>
                          <input
                            type="text"
                            className={styles.input}
                            value={formData.hs_code}
                            onChange={(e) => setFormData({ ...formData, hs_code: e.target.value })}
                            placeholder="e.g., 6109.10"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Section: Product Organization */}
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Product Organization
                    </h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                      <div className={styles.field}>
                        <label className={styles.label}>Type</label>
                        <input
                          type="text"
                          className={styles.input}
                          value={formData.product_type}
                          onChange={(e) => setFormData({ ...formData, product_type: e.target.value })}
                          placeholder="e.g., T-Shirts"
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label}>Vendor</label>
                        <input
                          type="text"
                          className={styles.input}
                          value={formData.vendor}
                          onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                          placeholder="e.g., Nike"
                        />
                      </div>
                    </div>
                    <div className={styles.field} style={{ marginTop: "1rem" }}>
                      <label className={styles.label}>Collections</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={formData.collections}
                        onChange={(e) => setFormData({ ...formData, collections: e.target.value })}
                        placeholder="Comma-separated collection names"
                      />
                    </div>
                    <div className={styles.field} style={{ marginTop: "1rem" }}>
                      <label className={styles.label}>Tags</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={formData.tags}
                        onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                        placeholder="Comma-separated tags"
                      />
                    </div>
                  </div>

                  {/* Section: Theme template */}
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Theme Template
                    </h4>
                    <div className={styles.field}>
                      <label className={styles.label}>Template suffix</label>
                      <select
                        className={styles.select}
                        value={formData.template_suffix}
                        onChange={(e) => setFormData({ ...formData, template_suffix: e.target.value })}
                      >
                        <option value="">Default product template</option>
                        <option value="alternate">Alternate template</option>
                        <option value="featured">Featured product</option>
                      </select>
                    </div>
                  </div>

                  {/* Section: Publishing */}
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Publishing
                    </h4>
                    <div className={styles.field}>
                      <label className={styles.label}>Status</label>
                      <select
                        className={styles.select}
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="draft">Draft</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>

                  {/* Section: Search Engine Listing */}
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Search Engine Listing
                    </h4>
                    <div className={styles.field}>
                      <label className={styles.label}>Page title</label>
                      <input
                        type="text"
                        className={styles.input}
                        value={formData.seo_title}
                        onChange={(e) => setFormData({ ...formData, seo_title: e.target.value })}
                        placeholder={formData.title || "Product title"}
                        maxLength={70}
                      />
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                        {formData.seo_title.length}/70 characters
                      </div>
                    </div>
                    <div className={styles.field} style={{ marginTop: "1rem" }}>
                      <label className={styles.label}>Meta description</label>
                      <textarea
                        className={styles.textarea}
                        rows={2}
                        value={formData.seo_description}
                        onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                        placeholder="Brief description for search engines"
                        maxLength={160}
                      />
                      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
                        {formData.seo_description.length}/160 characters
                      </div>
                    </div>
                    <div className={styles.field} style={{ marginTop: "1rem" }}>
                      <label className={styles.label}>URL handle</label>
                      <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
                        <span style={{ padding: "0.5rem 0.75rem", background: "var(--color-bg-secondary)", border: "1px solid var(--color-border)", borderRight: "none", borderRadius: "var(--radius-md) 0 0 var(--radius-md)", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                          /products/
                        </span>
                        <input
                          type="text"
                          className={styles.input}
                          style={{ borderRadius: "0 var(--radius-md) var(--radius-md) 0" }}
                          value={formData.handle}
                          onChange={(e) => setFormData({ ...formData, handle: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                          placeholder={formData.title ? formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : "product-handle"}
                        />
                      </div>
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
                  {saving ? "Saving..." : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import CSV Modal */}
      {showImportModal && (
        <div className={styles.modalOverlay} onClick={() => setShowImportModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "600px" }}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Import Products from CSV</h3>
              <button className={styles.modalClose} onClick={() => setShowImportModal(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              <p style={{ marginBottom: "1rem", color: "var(--color-text-secondary)" }}>
                Found <strong style={{ color: "var(--color-accent)" }}>{csvPreview.length}</strong> products to import:
              </p>
              <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Vendor</th>
                      <th>Price</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.map((product, i) => (
                      <tr key={i}>
                        <td>{product.Title}</td>
                        <td>{product.Vendor || "-"}</td>
                        <td>{product.Price ? `$${product.Price}` : "-"}</td>
                        <td>
                          <span
                            className={`${styles.itemStatus} ${
                              (product.Status || "").toLowerCase() === "active"
                                ? styles.statusActive
                                : styles.statusDraft
                            }`}
                          >
                            {product.Status || "active"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ marginTop: "1rem", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                Product variants will be counted and inventory quantities will be summed.
              </p>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => {
                  setShowImportModal(false);
                  setCsvPreview([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnPrimary}`}
                onClick={handleImport}
                disabled={importing}
              >
                {importing ? "Importing..." : `Import ${csvPreview.length} Products`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Product Modal */}
      {selectedProduct && (
        <div className={styles.modalOverlay} onClick={() => setSelectedProduct(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "900px", maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div className={styles.modalHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <h3 className={styles.modalTitle}>Product Details</h3>
                <span className={`${styles.itemStatus} ${
                  selectedProduct.status === "active"
                    ? styles.statusActive
                    : selectedProduct.status === "draft"
                      ? styles.statusDraft
                      : styles.statusArchived
                }`}>
                  {selectedProduct.status}
                </span>
                {selectedProduct.source === "shopify" && (
                  <span style={{
                    fontSize: "0.625rem",
                    padding: "0.125rem 0.375rem",
                    background: "rgba(150, 191, 71, 0.2)",
                    color: "#96bf47",
                    borderRadius: "4px",
                    fontWeight: 500
                  }}>
                    Shopify
                  </span>
                )}
              </div>
              <button className={styles.modalClose} onClick={() => setSelectedProduct(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody} style={{ overflow: "auto", flex: 1 }}>
              <div style={{ display: "grid", gap: "1.5rem" }}>

                {/* Section: Title & Description */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Title & Description
                  </h4>
                  <div style={{ marginBottom: "1rem" }}>
                    <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Title</label>
                    <div style={{ fontSize: "1rem", fontWeight: 500 }}>{selectedProduct.title}</div>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Description</label>
                    {selectedProduct.description ? (
                      <div
                        style={{ fontSize: "0.875rem", lineHeight: 1.6, maxHeight: "120px", overflow: "auto" }}
                        dangerouslySetInnerHTML={{ __html: selectedProduct.description }}
                      />
                    ) : (
                      <div style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>No description</div>
                    )}
                  </div>
                </div>

                {/* Section: Media */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Media
                  </h4>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    {selectedProduct.image_url || (selectedProduct.images && selectedProduct.images.length > 0) ? (
                      <>
                        {selectedProduct.image_url && (
                          <img
                            src={selectedProduct.image_url}
                            alt={selectedProduct.title}
                            style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "2px solid var(--color-accent)" }}
                          />
                        )}
                        {selectedProduct.images && selectedProduct.images.map((img, i) => (
                          img.src !== selectedProduct.image_url && (
                            <img
                              key={i}
                              src={img.src}
                              alt={img.alt || `Image ${i + 1}`}
                              style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}
                            />
                          )
                        ))}
                      </>
                    ) : (
                      <div style={{ width: "120px", height: "120px", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", border: "1px dashed var(--color-border)" }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="1.5">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <polyline points="21 15 16 10 5 21" />
                        </svg>
                      </div>
                    )}
                  </div>
                </div>

                {/* Section: Pricing */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Pricing
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Price</label>
                      <div style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-accent)" }}>
                        {selectedProduct.price ? `$${selectedProduct.price}` : "-"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Compare-at price</label>
                      <div style={{ fontSize: "1rem", textDecoration: selectedProduct.compare_at_price ? "line-through" : "none", color: "var(--color-text-secondary)" }}>
                        {selectedProduct.compare_at_price ? `$${selectedProduct.compare_at_price}` : "-"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Unit price</label>
                      <div style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.variants?.[0]?.unit_price || "-"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Charge tax</label>
                      <div style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.variants?.[0]?.taxable !== false ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Inventory */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Inventory
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Total Inventory</label>
                      <div style={{ fontSize: "1rem", fontWeight: 500 }}>
                        {selectedProduct.total_inventory ?? "-"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>SKU (Stock Keeping Unit)</label>
                      <code style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.variants?.[0]?.sku || "-"}
                      </code>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Barcode (ISBN, UPC, GTIN)</label>
                      <code style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.variants?.[0]?.barcode || "-"}
                      </code>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Inventory Policy</label>
                      <div style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.variants?.[0]?.inventory_policy || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Shipping */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Shipping
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Physical product</label>
                      <div style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.variants?.[0]?.requires_shipping !== false ? "Yes" : "No"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Weight</label>
                      <div style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.variants?.[0]?.weight ? `${selectedProduct.variants[0].weight} ${selectedProduct.variants[0].weight_unit || 'g'}` : "-"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Country/Region of origin</label>
                      <div style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.variants?.[0]?.country_code_of_origin || "-"}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>HS Code</label>
                      <code style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.variants?.[0]?.harmonized_system_code || "-"}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Section: Variants */}
                {selectedProduct.variants && selectedProduct.variants.length > 0 && (
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Variants ({selectedProduct.variants.length})
                    </h4>
                    <div style={{ maxHeight: "250px", overflow: "auto", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)" }}>
                      <table className={styles.table} style={{ fontSize: "0.75rem" }}>
                        <thead>
                          <tr>
                            <th>Title</th>
                            <th>SKU</th>
                            <th>Barcode</th>
                            <th>Price</th>
                            <th>Inventory</th>
                            <th>Weight</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedProduct.variants.map((variant, i) => (
                            <tr key={i}>
                              <td style={{ fontWeight: 500 }}>{variant.title || "Default"}</td>
                              <td><code>{variant.sku || "-"}</code></td>
                              <td><code>{variant.barcode || "-"}</code></td>
                              <td style={{ color: "var(--color-accent)" }}>${variant.price || "-"}</td>
                              <td>{variant.inventory_quantity ?? "-"}</td>
                              <td>{variant.weight ? `${variant.weight} ${variant.weight_unit || 'g'}` : "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Section: Product Organization */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Product Organization
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Type</label>
                      <div style={{ fontSize: "0.875rem" }}>{selectedProduct.product_type || "-"}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Vendor</label>
                      <div style={{ fontSize: "0.875rem" }}>{selectedProduct.vendor || "-"}</div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.5rem" }}>Collections</label>
                      {selectedProduct.collections && selectedProduct.collections.length > 0 ? (
                        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                          {selectedProduct.collections.map((collection, i) => (
                            <span key={i} style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", background: "rgba(99, 102, 241, 0.1)", color: "#6366f1", borderRadius: "4px", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                              {typeof collection === 'string' ? collection : collection.title || collection.handle}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>No collections</div>
                      )}
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.5rem" }}>Tags</label>
                      {selectedProduct.tags ? (
                        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                          {selectedProduct.tags.split(",").map((tag, i) => (
                            <span key={i} style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", background: "var(--color-bg-secondary)", borderRadius: "4px", border: "1px solid var(--color-border)" }}>
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: "var(--color-text-secondary)", fontStyle: "italic" }}>No tags</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section: Theme & Catalogs */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Theme & Catalogs
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Theme template</label>
                      <div style={{ fontSize: "0.875rem" }}>{selectedProduct.template_suffix || "Default product template"}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Catalogs</label>
                      {selectedProduct.catalogs && selectedProduct.catalogs.length > 0 ? (
                        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                          {selectedProduct.catalogs.map((catalog, i) => (
                            <span key={i} style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", background: "var(--color-bg-secondary)", borderRadius: "4px", border: "1px solid var(--color-border)" }}>
                              {typeof catalog === 'string' ? catalog : catalog.title}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>-</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Section: Publishing */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Publishing
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Status</label>
                      <span className={`${styles.itemStatus} ${
                        selectedProduct.status === "active"
                          ? styles.statusActive
                          : selectedProduct.status === "draft"
                            ? styles.statusDraft
                            : styles.statusArchived
                      }`}>
                        {selectedProduct.status || "draft"}
                      </span>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Published scope</label>
                      <div style={{ fontSize: "0.875rem" }}>{selectedProduct.published_scope || "web"}</div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Published at</label>
                      <div style={{ fontSize: "0.875rem" }}>
                        {selectedProduct.published_at ? new Date(selectedProduct.published_at).toLocaleString() : "-"}
                      </div>
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.5rem" }}>Sales channels</label>
                      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem" }}>
                          <span style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: selectedProduct.status === "active" ? "var(--color-accent)" : "var(--color-text-secondary)"
                          }}></span>
                          Online Store
                        </div>
                        {selectedProduct.published_scope === "global" && (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem", fontSize: "0.875rem" }}>
                            <span style={{
                              width: "8px",
                              height: "8px",
                              borderRadius: "50%",
                              background: "var(--color-accent)"
                            }}></span>
                            Point of Sale
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section: Options */}
                {selectedProduct.options && selectedProduct.options.length > 0 && (
                  <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Options
                    </h4>
                    <div style={{ display: "grid", gap: "0.75rem" }}>
                      {selectedProduct.options.map((option, i) => (
                        <div key={i}>
                          <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>{option.name}</label>
                          <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                            {(option.values || []).map((value, j) => (
                              <span key={j} style={{ fontSize: "0.75rem", padding: "0.25rem 0.5rem", background: "var(--color-bg-secondary)", borderRadius: "4px", border: "1px solid var(--color-border)" }}>
                                {value}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section: Metafields */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Metafields
                  </h4>
                  {selectedProduct.metafields && Object.keys(selectedProduct.metafields).length > 0 ? (
                    <div style={{ display: "grid", gap: "0.5rem" }}>
                      {Object.entries(selectedProduct.metafields).map(([key, value], i) => (
                        <div key={i} style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem" }}>
                          <code style={{ color: "var(--color-text-secondary)" }}>{key}:</code>
                          <span>{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ color: "var(--color-text-secondary)", fontStyle: "italic", fontSize: "0.875rem" }}>
                      No metafields configured
                    </div>
                  )}
                </div>

                {/* Section: Search Engine Listing */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Search Engine Listing
                  </h4>
                  <div style={{ display: "grid", gap: "1rem" }}>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Page title</label>
                      <div style={{ fontSize: "0.875rem", color: "#1a0dab" }}>
                        {selectedProduct.seo_title || selectedProduct.title}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Meta description</label>
                      <div style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                        {selectedProduct.seo_description || (selectedProduct.description ? selectedProduct.description.replace(/<[^>]*>/g, '').substring(0, 160) + '...' : '-')}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>URL handle</label>
                      <code style={{ fontSize: "0.875rem", color: "#006621" }}>
                        {selectedProduct.shop_domain ? `https://${selectedProduct.shop_domain}/products/` : '/products/'}{selectedProduct.handle || "-"}
                      </code>
                    </div>
                  </div>
                  {/* SERP Preview */}
                  <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--color-bg-secondary)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                    <div style={{ fontSize: "0.625rem", color: "var(--color-text-secondary)", marginBottom: "0.5rem", textTransform: "uppercase" }}>Preview</div>
                    <div style={{ fontSize: "1.125rem", color: "#1a0dab", marginBottom: "0.25rem" }}>
                      {selectedProduct.seo_title || selectedProduct.title}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#006621", marginBottom: "0.25rem" }}>
                      {selectedProduct.shop_domain || 'your-store.myshopify.com'}/products/{selectedProduct.handle || 'product-handle'}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "#545454" }}>
                      {selectedProduct.seo_description || (selectedProduct.description ? selectedProduct.description.replace(/<[^>]*>/g, '').substring(0, 160) : 'No description available.')}
                    </div>
                  </div>
                </div>

                {/* Section: System Info */}
                <div style={{ padding: "1rem", background: "var(--color-bg)", borderRadius: "var(--radius-md)", border: "1px solid var(--color-border)" }}>
                  <h4 style={{ margin: "0 0 1rem 0", fontSize: "0.875rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    System Information
                  </h4>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", fontSize: "0.75rem" }}>
                    {selectedProduct.shopify_id && (
                      <div>
                        <label style={{ color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Shopify ID</label>
                        <code>{selectedProduct.shopify_id}</code>
                      </div>
                    )}
                    {selectedProduct.shop_domain && (
                      <div>
                        <label style={{ color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Shop Domain</label>
                        <div>{selectedProduct.shop_domain}</div>
                      </div>
                    )}
                    {selectedProduct.created_at && (
                      <div>
                        <label style={{ color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Created</label>
                        <div>{new Date(selectedProduct.created_at).toLocaleString()}</div>
                      </div>
                    )}
                    {selectedProduct.updated_at && (
                      <div>
                        <label style={{ color: "var(--color-text-secondary)", display: "block", marginBottom: "0.25rem" }}>Updated</label>
                        <div>{new Date(selectedProduct.updated_at).toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setSelectedProduct(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
