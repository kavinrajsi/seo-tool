"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import styles from "../../page.module.css";

export default function ProductDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    loadProduct();
  }, [id]);

  async function loadProduct() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ecommerce/products/${id}`);
      if (res.ok) {
        const data = await res.json();
        setProduct(data.product);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load product");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  function formatPrice(price) {
    if (!price) return "-";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(parseFloat(price));
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function getMetafield(key) {
    if (!product?.metafields) return null;
    const mf = product.metafields.find(
      (m) => m.key === key || m.key === key.replace(/_/g, "-") || m.key?.toLowerCase() === key.toLowerCase()
    );
    return mf?.value || null;
  }

  if (loading) {
    const shimmer = {
      background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      borderRadius: "8px",
    };
    const skeletonCard = {
      background: "var(--color-bg-secondary)",
      borderRadius: "12px",
      border: "1px solid var(--color-border)",
      padding: "1.25rem",
      marginBottom: "1rem",
    };
    const skeletonLine = (width, height = "14px", mb = "0.75rem") => ({
      ...shimmer,
      width,
      height,
      marginBottom: mb,
    });

    return (
      <>
        <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

        {/* Back nav skeleton */}
        <div style={skeletonLine("80px", "14px", "1rem")} />

        {/* Title + badge skeleton */}
        <div className={styles.titleRow}>
          <div style={skeletonLine("260px", "24px", "0")} />
          <div style={skeletonLine("60px", "22px", "0")} />
        </div>

        {/* Two-column layout */}
        <div className={styles.detailLayout}>

          {/* Left column */}
          <div>
            {/* Title & Description card */}
            <div style={skeletonCard}>
              <div style={skeletonLine("40px", "12px")} />
              <div style={skeletonLine("100%", "38px", "1rem")} />
              <div style={skeletonLine("60px", "12px")} />
              <div style={skeletonLine("100%", "100px", "0")} />
            </div>

            {/* Media card */}
            <div style={skeletonCard}>
              <div style={skeletonLine("50px", "13px")} />
              <div style={skeletonLine("100%", "240px", "0.5rem")} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <div style={skeletonLine("80px", "80px", "0")} />
                <div style={skeletonLine("80px", "80px", "0")} />
              </div>
            </div>

            {/* Pricing card */}
            <div style={skeletonCard}>
              <div style={skeletonLine("55px", "13px")} />
              <div className={styles.twoCol} style={{ marginBottom: "1rem" }}>
                <div>
                  <div style={skeletonLine("40px", "12px")} />
                  <div style={skeletonLine("100%", "38px", "0")} />
                </div>
                <div>
                  <div style={skeletonLine("100px", "12px")} />
                  <div style={skeletonLine("100%", "38px", "0")} />
                </div>
              </div>
              <div style={skeletonLine("180px", "18px", "0")} />
            </div>

            {/* Inventory card */}
            <div style={skeletonCard}>
              <div style={skeletonLine("65px", "13px")} />
              <div className={styles.twoCol} style={{ marginBottom: "1rem" }}>
                <div>
                  <div style={skeletonLine("60px", "12px")} />
                  <div style={skeletonLine("100%", "38px", "0")} />
                </div>
                <div>
                  <div style={skeletonLine("80px", "12px")} />
                  <div style={skeletonLine("100%", "38px", "0")} />
                </div>
              </div>
              <div style={skeletonLine("120px", "18px", "0.75rem")} />
              <div style={skeletonLine("100%", "120px", "0")} />
            </div>

            {/* Shipping card */}
            <div style={skeletonCard}>
              <div style={skeletonLine("60px", "13px")} />
              <div style={skeletonLine("200px", "18px", "0")} />
            </div>
          </div>

          {/* Right column */}
          <div>
            {/* System info card */}
            <div style={{ ...skeletonCard, background: "transparent" }}>
              <div style={skeletonLine("120px", "12px")} />
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <div style={skeletonLine("70px", "13px", "0")} />
                  <div style={skeletonLine("90px", "13px", "0")} />
                </div>
              ))}
            </div>

            {/* Status card */}
            <div style={skeletonCard}>
              <div style={skeletonLine("45px", "13px")} />
              <div style={skeletonLine("100%", "38px", "0")} />
            </div>

            {/* Publishing card */}
            <div style={skeletonCard}>
              <div style={skeletonLine("70px", "13px")} />
              <div style={skeletonLine("100px", "16px", "0")} />
            </div>

            {/* Product organization card */}
            <div style={skeletonCard}>
              <div style={skeletonLine("130px", "13px")} />
              <div style={skeletonLine("80px", "12px")} />
              <div style={skeletonLine("100%", "38px", "1rem")} />
              <div style={skeletonLine("50px", "12px")} />
              <div style={skeletonLine("100%", "38px", "1rem")} />
              <div style={skeletonLine("35px", "12px")} />
              <div style={{ display: "flex", gap: "0.375rem" }}>
                <div style={skeletonLine("60px", "24px", "0")} />
                <div style={skeletonLine("50px", "24px", "0")} />
                <div style={skeletonLine("70px", "24px", "0")} />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <div className={styles.error}>{error || "Product not found"}</div>
        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={() => router.push("/dashboard/ecommerce/products")}>
          Back to Products
        </button>
      </>
    );
  }

  const images = product.images || [];
  const variants = product.variants || [];
  const options = product.options || [];
  const pv = variants[0] || {};
  const metafields = product.metafields || [];

  // Shopify Admin-style tokens
  const card = {
    background: "var(--color-bg-secondary)",
    borderRadius: "12px",
    border: "1px solid var(--color-border)",
    padding: "1.25rem",
    marginBottom: "1rem",
  };

  const cardTitle = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "var(--color-text)",
    marginBottom: "1rem",
  };

  const fieldLabel = {
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "var(--color-text)",
    marginBottom: "0.375rem",
  };

  const fieldInput = {
    width: "100%",
    padding: "0.5rem 0.75rem",
    background: "var(--color-bg)",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontSize: "0.875rem",
    color: "var(--color-text)",
    lineHeight: 1.5,
  };

  const checkboxRow = {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    padding: "0.5rem 0",
  };

  const checkbox = (checked) => ({
    width: "18px",
    height: "18px",
    borderRadius: "4px",
    border: checked ? "none" : "2px solid var(--color-border)",
    background: checked ? "var(--color-accent)" : "transparent",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  const statusDot = (status) => {
    const colors = { active: "#22c55e", draft: "#f59e0b", archived: "#6b7280" };
    return {
      width: "8px",
      height: "8px",
      borderRadius: "50%",
      background: colors[status] || colors.draft,
      flexShrink: 0,
    };
  };

  return (
    <>
      {/* Shopify-style back nav */}
      <button
        onClick={() => router.push("/dashboard/ecommerce/products")}
        style={{
          background: "none",
          border: "none",
          color: "var(--color-text-secondary)",
          cursor: "pointer",
          padding: 0,
          fontSize: "0.8125rem",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          marginBottom: "1rem",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Products
      </button>

      {/* Page title */}
      <div className={styles.titleRow}>
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600, color: "var(--color-text)", margin: 0 }}>
          {product.title}
        </h1>
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.375rem",
          padding: "0.2rem 0.625rem",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 500,
          background: product.status === "active" ? "rgba(34,197,94,0.12)" : product.status === "archived" ? "rgba(107,114,128,0.12)" : "rgba(245,158,11,0.12)",
          color: product.status === "active" ? "#22c55e" : product.status === "archived" ? "#9ca3af" : "#f59e0b",
          textTransform: "capitalize",
        }}>
          <span style={statusDot(product.status)} />
          {product.status}
        </span>
      </div>

      {/* Two-column Shopify layout: 62% left, 38% right */}
      <div className={styles.detailLayout}>

        {/* ===== LEFT COLUMN (main content) ===== */}
        <div className={styles.detailColumn}>

          {/* Title & Description */}
          <div style={card}>
            <div style={{ marginBottom: "1rem" }}>
              <div style={fieldLabel}>Title</div>
              <div style={fieldInput}>{product.title}</div>
            </div>
            <div>
              <div style={fieldLabel}>Description</div>
              <div style={{ ...fieldInput, minHeight: "100px" }}>
                {product.body_html ? (
                  <div
                    style={{ lineHeight: 1.7 }}
                    dangerouslySetInnerHTML={{ __html: product.body_html }}
                  />
                ) : (
                  <span style={{ color: "var(--color-text-secondary)" }}>No description</span>
                )}
              </div>
            </div>
          </div>

          {/* Media */}
          <div style={card}>
            <div style={cardTitle}>Media</div>
            {images.length > 0 ? (
              <div className={images.length === 1 ? styles.imageGridSingle : styles.imageGrid}>
                {/* First image large if multiple, full if single */}
                <div
                  onClick={() => setActiveImageIndex(0)}
                  style={{
                    gridColumn: images.length > 1 ? "1 / -1" : undefined,
                    aspectRatio: images.length === 1 ? "4/3" : "16/9",
                    borderRadius: "8px",
                    overflow: "hidden",
                    background: "var(--color-bg)",
                    border: activeImageIndex === 0 ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                    cursor: "pointer",
                  }}
                >
                  <img
                    src={images[0].src}
                    alt={images[0].alt || product.title}
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
                {/* Remaining images in grid */}
                {images.slice(1).map((img, idx) => (
                  <div
                    key={img.id || idx + 1}
                    onClick={() => setActiveImageIndex(idx + 1)}
                    style={{
                      aspectRatio: "1",
                      borderRadius: "8px",
                      overflow: "hidden",
                      background: "var(--color-bg)",
                      border: activeImageIndex === idx + 1 ? "2px solid var(--color-accent)" : "1px solid var(--color-border)",
                      cursor: "pointer",
                    }}
                  >
                    <img
                      src={img.src}
                      alt={img.alt || ""}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "2.5rem",
                background: "var(--color-bg)",
                borderRadius: "8px",
                border: "2px dashed var(--color-border)",
                color: "var(--color-text-secondary)",
              }}>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: "0.5rem" }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
                <span style={{ fontSize: "0.8125rem" }}>No media uploaded</span>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div style={card}>
            <div style={cardTitle}>Pricing</div>
            <div className={styles.twoCol} style={{ marginBottom: "1rem" }}>
              <div>
                <div style={fieldLabel}>Price</div>
                <div style={fieldInput}>{formatPrice(product.price)}</div>
              </div>
              <div>
                <div style={fieldLabel}>Compare-at price</div>
                <div style={fieldInput}>
                  {product.compare_at_price ? formatPrice(product.compare_at_price) : "-"}
                </div>
              </div>
            </div>
            <div style={checkboxRow}>
              <div style={checkbox(pv.taxable)}>
                {pv.taxable && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text)" }}>Charge tax on this product</span>
            </div>
            <div style={{ borderTop: "1px solid var(--color-border)", marginTop: "0.75rem", paddingTop: "0.75rem" }}>
              <div className={styles.twoCol}>
                <div>
                  <div style={fieldLabel}>Cost per item</div>
                  <div style={fieldInput}>{pv.price ? formatPrice(pv.price) : "-"}</div>
                </div>
                <div>
                  <div style={fieldLabel}>Profit</div>
                  <div style={fieldInput}>
                    {product.compare_at_price && product.price
                      ? formatPrice(parseFloat(product.compare_at_price) - parseFloat(product.price))
                      : "-"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Inventory */}
          <div style={card}>
            <div style={cardTitle}>Inventory</div>
            <div className={styles.twoCol} style={{ marginBottom: "1rem" }}>
              <div>
                <div style={fieldLabel}>SKU (Stock Keeping Unit)</div>
                <div style={fieldInput}><code>{pv.sku || "-"}</code></div>
              </div>
              <div>
                <div style={fieldLabel}>Barcode (ISBN, UPC, GTIN, etc.)</div>
                <div style={fieldInput}><code>{pv.barcode || "-"}</code></div>
              </div>
            </div>

            <div style={checkboxRow}>
              <div style={checkbox(!!pv.inventory_management)}>
                {pv.inventory_management && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text)" }}>Track quantity</span>
            </div>

            {/* Quantity by location */}
            <div style={{ borderTop: "1px solid var(--color-border)", marginTop: "0.75rem", paddingTop: "0.75rem" }}>
              <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text)", marginBottom: "0.75rem" }}>
                Quantities
              </div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Location</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Unavailable</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Committed</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Available</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>On hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, idx) => {
                      const qty = v.inventory_quantity || 0;
                      return (
                        <tr key={idx} style={{ borderBottom: idx < variants.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                          <td style={{ padding: "0.625rem 0.75rem", fontWeight: 500, color: "var(--color-text)" }}>
                            {v.title || "Default"}
                          </td>
                          <td style={{ textAlign: "center", padding: "0.625rem 0.75rem", color: "var(--color-text-secondary)" }}>0</td>
                          <td style={{ textAlign: "center", padding: "0.625rem 0.75rem", color: "var(--color-text-secondary)" }}>0</td>
                          <td style={{ textAlign: "center", padding: "0.625rem 0.75rem", fontWeight: 600, color: qty > 0 ? "var(--color-accent)" : "#ef4444" }}>
                            {qty}
                          </td>
                          <td style={{ textAlign: "center", padding: "0.625rem 0.75rem", fontWeight: 500, color: "var(--color-text)" }}>{qty}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div style={card}>
            <div style={cardTitle}>Shipping</div>
            <div style={checkboxRow}>
              <div style={checkbox(pv.requires_shipping)}>
                {pv.requires_shipping && (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0a0a0a" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text)" }}>This is a physical product</span>
            </div>

            {pv.requires_shipping && (
              <div style={{ borderTop: "1px solid var(--color-border)", marginTop: "0.75rem", paddingTop: "0.75rem" }}>
                <div className={styles.twoCol} style={{ marginBottom: "1rem" }}>
                  <div>
                    <div style={fieldLabel}>Weight</div>
                    <div style={fieldInput}>
                      {pv.weight ? `${pv.weight} ${pv.weight_unit || "kg"}` : pv.grams ? `${pv.grams}g` : "-"}
                    </div>
                  </div>
                  <div>
                    <div style={fieldLabel}>Package</div>
                    <div style={fieldInput}>
                      {pv.fulfillment_service === "manual" ? "Standard package" : pv.fulfillment_service || "-"}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 500, color: "var(--color-text)", marginBottom: "0.75rem" }}>
                  Customs information
                </div>
                <div className={styles.twoCol}>
                  <div>
                    <div style={fieldLabel}>Country/Region of origin</div>
                    <div style={fieldInput}>
                      <span style={{ color: "var(--color-text-secondary)" }}>-</span>
                    </div>
                  </div>
                  <div>
                    <div style={fieldLabel}>HS code</div>
                    <div style={fieldInput}>
                      <span style={{ color: "var(--color-text-secondary)" }}>-</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Variants */}
          {variants.length > 0 && (
            <div style={card}>
              <div style={cardTitle}>Variants</div>

              {/* Option chips */}
              {options.length > 0 && options[0]?.name !== "Title" && (
                <div style={{ marginBottom: "1rem" }}>
                  {options.map((opt, idx) => (
                    <div key={idx} style={{ marginBottom: idx < options.length - 1 ? "0.75rem" : 0 }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "0.375rem" }}>
                        {opt.name}
                      </div>
                      <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                        {(opt.values || []).map((v, vidx) => (
                          <span key={vidx} style={{
                            padding: "0.25rem 0.75rem",
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                            borderRadius: "8px",
                            fontSize: "0.8125rem",
                            color: "var(--color-text)",
                          }}>
                            {v}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ borderBottom: "1px solid var(--color-border)", margin: "1rem 0 0" }} />
                </div>
              )}

              {/* Variant table */}
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8125rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Variant</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Price</th>
                      <th style={{ textAlign: "center", padding: "0.5rem 0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>Available</th>
                      <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 500, color: "var(--color-text-secondary)" }}>SKU</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v, idx) => (
                      <tr key={idx} style={{ borderBottom: idx < variants.length - 1 ? "1px solid var(--color-border)" : "none" }}>
                        <td style={{ padding: "0.625rem 0.75rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                            {v.image_id && images.find((img) => img.id === v.image_id) ? (
                              <img
                                src={images.find((img) => img.id === v.image_id).src}
                                alt=""
                                style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", border: "1px solid var(--color-border)" }}
                              />
                            ) : product.image_url ? (
                              <img
                                src={product.image_url}
                                alt=""
                                style={{ width: "32px", height: "32px", borderRadius: "6px", objectFit: "cover", border: "1px solid var(--color-border)", opacity: 0.5 }}
                              />
                            ) : (
                              <div style={{ width: "32px", height: "32px", borderRadius: "6px", background: "var(--color-bg)", border: "1px solid var(--color-border)" }} />
                            )}
                            <span style={{ fontWeight: 500, color: "var(--color-text)" }}>{v.title || "Default"}</span>
                          </div>
                        </td>
                        <td style={{ padding: "0.625rem 0.75rem", color: "var(--color-text)" }}>{formatPrice(v.price)}</td>
                        <td style={{ textAlign: "center", padding: "0.625rem 0.75rem", fontWeight: 500, color: (v.inventory_quantity || 0) > 0 ? "var(--color-text)" : "#ef4444" }}>
                          {v.inventory_quantity ?? "-"}
                        </td>
                        <td style={{ padding: "0.625rem 0.75rem", color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                          <code>{v.sku || "-"}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Metafields */}
          <div style={card}>
            <div style={cardTitle}>Product metafields</div>
            {(() => {
              const metafieldDefs = [
                { key: "taste", label: "Taste" },
                { key: "shelf_life", label: "Shelf Life" },
                { key: "nutritional_values", label: "Nutritional Values" },
                { key: "allergens_declaration", label: "Allergens Declaration" },
                { key: "additives_declaration", label: "Additives Declaration" },
                { key: "ingredients", label: "Ingredients" },
              ];

              const shownKeys = new Set(metafieldDefs.map((d) => d.key));
              const extraMetafields = metafields.filter(
                (m) => !shownKeys.has(m.key) && !shownKeys.has(m.key?.replace(/-/g, "_"))
              );

              if (metafields.length === 0) {
                return (
                  <div style={{
                    padding: "1.5rem",
                    textAlign: "center",
                    color: "var(--color-text-secondary)",
                    background: "var(--color-bg)",
                    borderRadius: "8px",
                    border: "1px dashed var(--color-border)",
                    fontSize: "0.8125rem",
                    lineHeight: 1.6,
                  }}>
                    No metafields available. Metafields will appear here when synced from Shopify.
                  </div>
                );
              }

              return (
                <div style={{ display: "grid", gap: "0.75rem" }}>
                  {metafieldDefs.map((def) => {
                    const mfVal = getMetafield(def.key);
                    return (
                      <div key={def.key}>
                        <div style={fieldLabel}>{def.label}</div>
                        <div style={fieldInput}>
                          {mfVal || <span style={{ color: "var(--color-text-secondary)" }}>-</span>}
                        </div>
                      </div>
                    );
                  })}
                  {extraMetafields.map((mf, idx) => (
                    <div key={idx}>
                      <div style={fieldLabel}>
                        {mf.key} <span style={{ fontSize: "0.6875rem", color: "var(--color-text-secondary)", fontWeight: 400 }}>({mf.namespace})</span>
                      </div>
                      <div style={fieldInput}>{mf.value || "-"}</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>

          {/* Search engine listing */}
          <div style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={cardTitle}>Search engine listing</div>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <div style={fieldLabel}>Page title</div>
              <div style={fieldInput}>{product.seo_title || product.title}</div>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <div style={fieldLabel}>Meta description</div>
              <div style={{ ...fieldInput, minHeight: "60px" }}>
                {product.seo_description || (
                  product.body_html
                    ? product.body_html.replace(/<[^>]+>/g, "").substring(0, 160)
                    : <span style={{ color: "var(--color-text-secondary)" }}>No meta description</span>
                )}
              </div>
            </div>

            <div style={{ marginBottom: "1rem" }}>
              <div style={fieldLabel}>URL handle</div>
              <div style={{ ...fieldInput, display: "flex", alignItems: "center", gap: "0" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>/products/</span>
                <span>{product.handle || "-"}</span>
              </div>
            </div>

            {/* Google SERP preview */}
            <div style={{
              padding: "1rem",
              background: "#202124",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ fontSize: "0.6875rem", color: "var(--color-text-secondary)", marginBottom: "0.625rem", letterSpacing: "0.02em" }}>
                Preview
              </div>
              <div style={{ fontSize: "1.125rem", color: "#8ab4f8", marginBottom: "0.25rem", lineHeight: 1.3 }}>
                {product.seo_title || product.title}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#bdc1c6", marginBottom: "0.375rem" }}>
                {product.shop_domain} &rsaquo; products &rsaquo; {product.handle}
              </div>
              <div style={{ fontSize: "0.8125rem", color: "#969ba1", lineHeight: 1.5 }}>
                {product.seo_description || (
                  product.body_html
                    ? product.body_html.replace(/<[^>]+>/g, "").substring(0, 160) + "..."
                    : "No description available."
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== RIGHT COLUMN (sidebar) ===== */}
        <div className={styles.detailColumn}>

          {/* System info */}
          <div style={{ ...card, background: "transparent", border: "1px solid var(--color-border)" }}>
            <div style={{ ...cardTitle, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>System information</div>
            <div style={{ display: "grid", gap: "0.625rem", fontSize: "0.8125rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Shopify ID</span>
                <code style={{ fontSize: "0.75rem", color: "var(--color-text)" }}>{product.shopify_id}</code>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Shop</span>
                <span style={{ color: "var(--color-text)" }}>{product.shop_domain}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Created</span>
                <span style={{ color: "var(--color-text)" }}>{formatDate(product.created_at_shopify)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Updated</span>
                <span style={{ color: "var(--color-text)" }}>{formatDate(product.updated_at_shopify)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--color-text-secondary)" }}>Last synced</span>
                <span style={{ color: "var(--color-text)" }}>{formatDate(product.synced_at)}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div style={card}>
            <div style={cardTitle}>Status</div>
            <div style={{
              ...fieldInput,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              textTransform: "capitalize",
              fontWeight: 500,
            }}>
              <span style={statusDot(product.status)} />
              {product.status}
            </div>
            {product.published_at && (
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.5rem" }}>
                Published on {formatDate(product.published_at)}
              </div>
            )}
          </div>

          {/* Publishing */}
          <div style={card}>
            <div style={cardTitle}>Publishing</div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8125rem", color: "var(--color-text)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              Online Store
            </div>
            {product.published_scope && (
              <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.375rem", paddingLeft: "1.5rem" }}>
                Scope: {product.published_scope}
              </div>
            )}
          </div>

          {/* Product organization */}
          <div style={card}>
            <div style={cardTitle}>Product organization</div>

            <div style={{ marginBottom: "0.75rem" }}>
              <div style={fieldLabel}>Product type</div>
              <div style={fieldInput}>{product.product_type || "-"}</div>
            </div>

            <div style={{ marginBottom: "0.75rem" }}>
              <div style={fieldLabel}>Vendor</div>
              <div style={fieldInput}>{product.vendor || "-"}</div>
            </div>

            <div>
              <div style={fieldLabel}>Tags</div>
              {product.tags ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.375rem", marginTop: "0.25rem" }}>
                  {product.tags.split(",").map((tag, idx) => (
                    <span key={idx} style={{
                      padding: "0.2rem 0.625rem",
                      background: "var(--color-bg)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "8px",
                      fontSize: "0.75rem",
                      color: "var(--color-text)",
                    }}>
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <div style={{ ...fieldInput }}><span style={{ color: "var(--color-text-secondary)" }}>-</span></div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
