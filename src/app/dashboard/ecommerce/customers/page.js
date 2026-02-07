"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ecommerce/customers");
      if (res.ok) {
        const data = await res.json();
        setCustomers(data.customers || []);
        setStats(data.stats);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load customers");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }

  function formatDate(dateStr) {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatCurrency(amount, currency = "INR") {
    if (!amount) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency,
    }).format(parseFloat(amount));
  }

  function getCustomerName(customer) {
    if (customer.first_name || customer.last_name) {
      return `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
    }
    return customer.email || "Unknown";
  }

  function getStateBadge(state) {
    const stateStyles = {
      enabled: { label: "Enabled", className: styles.statusActive },
      disabled: { label: "Disabled", className: styles.statusArchived },
      invited: { label: "Invited", className: styles.statusDraft },
      declined: { label: "Declined", className: styles.statusArchived },
    };
    return stateStyles[state] || { label: state || "Unknown", className: styles.statusDraft };
  }

  const filteredCustomers = customers.filter((c) => {
    const searchLower = search.toLowerCase();
    const matchesSearch =
      (c.email?.toLowerCase() || "").includes(searchLower) ||
      (c.first_name?.toLowerCase() || "").includes(searchLower) ||
      (c.last_name?.toLowerCase() || "").includes(searchLower) ||
      (c.phone?.toLowerCase() || "").includes(searchLower);

    const matchesStatus =
      statusFilter === "all" ||
      c.state === statusFilter ||
      (statusFilter === "marketing" && c.accepts_marketing) ||
      (statusFilter === "verified" && c.verified_email);

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <div className={styles.page}>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("140px", "28px", "0.5rem")} />
        <div style={b("260px", "14px", "1.5rem")} />
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("200px", "20px")} /></div>
          <div className={styles.toolbar}><div style={{ ...s, flex: 1, height: "38px", borderRadius: "8px" }} /><div style={b("120px", "38px")} /></div>
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead><tr>{["Customer","Email","Orders","Total Spent","Status","Marketing","Actions"].map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>{[1,2,3,4,5].map(i => <tr key={i}>{[1,2,3,4,5,6,7].map(j => <td key={j}><div style={b(j===1||j===2?"70%":"50%", "14px")} /></td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Customers</h1>
      <p className={styles.subheading}>View and manage your customers.</p>

      {error && <div className={styles.error}>{error}</div>}

      {/* Stats */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Customers</div>
            <div className={styles.statValue}>{stats.totalCustomers}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Accepts Marketing</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.acceptsMarketing}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Verified Email</div>
            <div className={styles.statValue}>{stats.verifiedEmail}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Orders</div>
            <div className={styles.statValue}>{stats.totalOrders}</div>
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Customers ({filteredCustomers.length})</h2>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={loadCustomers}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Filters */}
        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Customers</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
            <option value="invited">Invited</option>
            <option value="marketing">Accepts Marketing</option>
            <option value="verified">Verified Email</option>
          </select>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <p>No customers found. Customers will appear here when received from Shopify.</p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Email</th>
                  <th>Orders</th>
                  <th>Total Spent</th>
                  <th>Status</th>
                  <th>Marketing</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => {
                  const status = getStateBadge(customer.state);
                  return (
                    <tr key={customer.id}>
                      <td>
                        <div style={{ fontWeight: 500 }}>{getCustomerName(customer)}</div>
                        {customer.phone && (
                          <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                            {customer.phone}
                          </div>
                        )}
                      </td>
                      <td style={{ fontSize: "0.875rem" }}>{customer.email || "-"}</td>
                      <td style={{ textAlign: "center", fontWeight: 500 }}>{customer.orders_count || 0}</td>
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrency(customer.total_spent, customer.currency)}
                      </td>
                      <td>
                        <span className={`${styles.itemStatus} ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        {customer.accepts_marketing ? (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        ) : (
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        )}
                      </td>
                      <td>
                        <button
                          className={`${styles.btn} ${styles.btnSecondary}`}
                          onClick={() => setSelectedCustomer(customer)}
                          style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className={styles.modalOverlay} onClick={() => setSelectedCustomer(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px" }}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Customer Details</h2>
              <button
                className={styles.modalClose}
                onClick={() => setSelectedCustomer(null)}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Customer Header */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
                <div style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "50%",
                  background: "var(--color-accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  color: "var(--color-bg)"
                }}>
                  {(selectedCustomer.first_name?.[0] || selectedCustomer.email?.[0] || "?").toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 600 }}>{getCustomerName(selectedCustomer)}</div>
                  <div style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>
                    {selectedCustomer.email}
                  </div>
                </div>
                <span className={`${styles.itemStatus} ${getStateBadge(selectedCustomer.state).className}`} style={{ marginLeft: "auto" }}>
                  {getStateBadge(selectedCustomer.state).label}
                </span>
              </div>

              <div style={{ display: "grid", gap: "1.5rem" }}>
                {/* Overview */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Overview
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "1rem",
                    padding: "1rem",
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Total Orders</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>{selectedCustomer.orders_count || 0}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Total Spent</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 600, color: "var(--color-accent)" }}>
                        {formatCurrency(selectedCustomer.total_spent, selectedCustomer.currency)}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Last Order</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCustomer.last_order_name || "-"}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Customer Since</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCustomer.created_at_shopify)}</div>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Contact Information
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    padding: "1rem",
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Email</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCustomer.email || "-"}</div>
                      {selectedCustomer.verified_email && (
                        <span style={{ fontSize: "0.7rem", color: "var(--color-accent)" }}>Verified</span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Phone</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCustomer.phone || "-"}</div>
                    </div>
                  </div>
                </div>

                {/* Marketing */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Marketing
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    padding: "1rem",
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Accepts Marketing</div>
                      <div style={{ fontSize: "0.875rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {selectedCustomer.accepts_marketing ? (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            Yes
                          </>
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-critical)" strokeWidth="2">
                              <line x1="18" y1="6" x2="6" y2="18" />
                              <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            No
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Opt-in Level</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCustomer.marketing_opt_in_level || "-"}</div>
                    </div>
                    {selectedCustomer.accepts_marketing_updated_at && (
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Marketing Updated</div>
                        <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCustomer.accepts_marketing_updated_at)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Default Address */}
                {selectedCustomer.default_address && (
                  <div>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                      Default Address
                    </h3>
                    <div style={{
                      padding: "1rem",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--color-border)",
                      fontSize: "0.875rem",
                      lineHeight: 1.6
                    }}>
                      <div>{selectedCustomer.default_address.first_name} {selectedCustomer.default_address.last_name}</div>
                      {selectedCustomer.default_address.company && <div>{selectedCustomer.default_address.company}</div>}
                      <div>{selectedCustomer.default_address.address1}</div>
                      {selectedCustomer.default_address.address2 && <div>{selectedCustomer.default_address.address2}</div>}
                      <div>
                        {selectedCustomer.default_address.city}, {selectedCustomer.default_address.province_code} {selectedCustomer.default_address.zip}
                      </div>
                      <div>{selectedCustomer.default_address.country}</div>
                      {selectedCustomer.default_address.phone && <div>{selectedCustomer.default_address.phone}</div>}
                    </div>
                  </div>
                )}

                {/* All Addresses */}
                {selectedCustomer.addresses && selectedCustomer.addresses.length > 1 && (
                  <div>
                    <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                      All Addresses ({selectedCustomer.addresses_count || selectedCustomer.addresses.length})
                    </h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                      {selectedCustomer.addresses.map((addr, idx) => (
                        <div key={idx} style={{
                          padding: "1rem",
                          background: "var(--color-bg)",
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--color-border)",
                          fontSize: "0.875rem",
                          lineHeight: 1.6
                        }}>
                          {addr.default && (
                            <span style={{
                              fontSize: "0.7rem",
                              background: "var(--color-accent)",
                              color: "var(--color-bg)",
                              padding: "0.125rem 0.5rem",
                              borderRadius: "4px",
                              marginBottom: "0.5rem",
                              display: "inline-block"
                            }}>
                              Default
                            </span>
                          )}
                          <div>{addr.first_name} {addr.last_name}</div>
                          {addr.company && <div>{addr.company}</div>}
                          <div>{addr.address1}</div>
                          {addr.address2 && <div>{addr.address2}</div>}
                          <div>{addr.city}, {addr.province_code} {addr.zip}</div>
                          <div>{addr.country}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags & Notes */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
                  {selectedCustomer.tags && (
                    <div>
                      <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                        Tags
                      </h3>
                      <div style={{
                        padding: "1rem",
                        background: "var(--color-bg)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "0.5rem"
                      }}>
                        {selectedCustomer.tags.split(",").map((tag, idx) => (
                          <span key={idx} style={{
                            fontSize: "0.75rem",
                            background: "var(--color-bg-secondary)",
                            padding: "0.25rem 0.5rem",
                            borderRadius: "4px",
                            border: "1px solid var(--color-border)"
                          }}>
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedCustomer.note && (
                    <div>
                      <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                        Note
                      </h3>
                      <div style={{
                        padding: "1rem",
                        background: "var(--color-bg)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--color-border)",
                        fontSize: "0.875rem"
                      }}>
                        {selectedCustomer.note}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tax Information */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    Tax Information
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    padding: "1rem",
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Tax Exempt</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCustomer.tax_exempt ? "Yes" : "No"}</div>
                    </div>
                    {selectedCustomer.tax_exemptions && selectedCustomer.tax_exemptions.length > 0 && (
                      <div>
                        <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Tax Exemptions</div>
                        <div style={{ fontSize: "0.875rem" }}>{selectedCustomer.tax_exemptions.join(", ")}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* System Info */}
                <div>
                  <h3 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}>
                    System Information
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "1rem",
                    padding: "1rem",
                    background: "var(--color-bg)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--color-border)"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Shopify ID</div>
                      <code style={{ fontSize: "0.75rem" }}>{selectedCustomer.shopify_id}</code>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Shop Domain</div>
                      <div style={{ fontSize: "0.875rem" }}>{selectedCustomer.shop_domain}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Created</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCustomer.created_at_shopify)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Last Updated</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCustomer.updated_at_shopify)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.7rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>Last Synced</div>
                      <div style={{ fontSize: "0.875rem" }}>{formatDate(selectedCustomer.synced_at)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                className={`${styles.btn} ${styles.btnSecondary}`}
                onClick={() => setSelectedCustomer(null)}
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
