"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/app/components/AuthProvider";
import styles from "./page.module.css";

export default function AdminSettingsPage() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);

  // Per-section save state
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsMsg, setLimitsMsg] = useState({ type: "", text: "" });

  const [savingToggles, setSavingToggles] = useState(false);
  const [togglesMsg, setTogglesMsg] = useState({ type: "", text: "" });

  const [savingKeys, setSavingKeys] = useState(false);
  const [keysMsg, setKeysMsg] = useState({ type: "", text: "" });

  const [savingPages, setSavingPages] = useState(false);
  const [pagesMsg, setPagesMsg] = useState({ type: "", text: "" });

  const [savingSounds, setSavingSounds] = useState(false);
  const [soundsMsg, setSoundsMsg] = useState({ type: "", text: "" });

  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      const t = setTimeout(() => setLoading(false), 0);
      return () => clearTimeout(t);
    }

    async function load() {
      try {
        const res = await fetch("/api/admin/settings");
        if (res.ok) {
          const json = await res.json();
          setSettings(json.settings);
        }
      } catch {
        // Failed to load
      }
      setLoading(false);
    }
    load();
  }, [authLoading, isAdmin]);

  async function saveSection(keys, setSaving, setMsg) {
    setSaving(true);
    setMsg({ type: "", text: "" });

    const patch = {};
    for (const key of keys) {
      patch[key] = settings[key];
    }

    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: patch }),
      });

      if (res.ok) {
        setMsg({ type: "success", text: "Settings saved." });
      } else {
        const json = await res.json();
        setMsg({ type: "error", text: json.error || "Failed to save." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error." });
    }
    setSaving(false);
  }

  function updateSetting(key, value) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (authLoading || loading) {
    return <p className={styles.loading}>Loading...</p>;
  }

  if (!isAdmin) {
    return <p className={styles.denied}>Access denied. Admin only.</p>;
  }

  if (!settings) {
    return <p className={styles.denied}>Failed to load settings.</p>;
  }

  return (
    <>
      <Link href="/dashboard/admin" className={styles.backLink}>
        ← Back to Admin
      </Link>
      <h1 className={styles.heading}>Master Control Panel</h1>

      {/* Section 1: Scan Limits */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Scan Limits</h2>
        <p className={styles.sectionDesc}>Configure scan thresholds and rate limits.</p>

        {limitsMsg.text && (
          <div className={limitsMsg.type === "error" ? styles.error : styles.success}>
            {limitsMsg.text}
          </div>
        )}

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            saveSection(
              ["bulk_scan_max_urls", "daily_scan_limit", "sitemap_max_depth"],
              setSavingLimits,
              setLimitsMsg
            );
          }}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="bulkMaxUrls">
              Bulk Scan Max URLs
            </label>
            <input
              id="bulkMaxUrls"
              className={styles.input}
              type="number"
              min="1"
              max="100"
              value={settings.bulk_scan_max_urls}
              onChange={(e) => updateSetting("bulk_scan_max_urls", e.target.value)}
            />
            <span className={styles.hint}>1–100. Maximum URLs per bulk scan.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="dailyScanLimit">
              Daily Scan Limit Per User
            </label>
            <input
              id="dailyScanLimit"
              className={styles.input}
              type="number"
              min="0"
              value={settings.daily_scan_limit}
              onChange={(e) => updateSetting("daily_scan_limit", e.target.value)}
            />
            <span className={styles.hint}>0 = unlimited.</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="sitemapMaxDepth">
              Sitemap Max Depth
            </label>
            <input
              id="sitemapMaxDepth"
              className={styles.input}
              type="number"
              min="1"
              max="10"
              value={settings.sitemap_max_depth}
              onChange={(e) => updateSetting("sitemap_max_depth", e.target.value)}
            />
            <span className={styles.hint}>1–10. Maximum sitemap recursion depth.</span>
          </div>

          <button className={styles.saveBtn} type="submit" disabled={savingLimits}>
            {savingLimits ? "Saving..." : "Save Limits"}
          </button>
        </form>
      </div>

      {/* Section 2: Feature Toggles */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Feature Toggles</h2>
        <p className={styles.sectionDesc}>Enable or disable app features.</p>

        {togglesMsg.text && (
          <div className={togglesMsg.type === "error" ? styles.error : styles.success}>
            {togglesMsg.text}
          </div>
        )}

        <div className={styles.form}>
          {[
            { key: "feature_bulk_scan", label: "Bulk Scan" },
            { key: "feature_full_scan", label: "Full Scan" },
            { key: "feature_pdf_export", label: "PDF Export" },
            { key: "feature_google_oauth", label: "Google OAuth" },
          ].map(({ key, label }) => (
            <div key={key} className={styles.toggleRow}>
              <span className={styles.toggleLabel}>{label}</span>
              <button
                type="button"
                className={`${styles.toggle} ${settings[key] === "true" ? styles.toggleOn : ""}`}
                onClick={() => updateSetting(key, settings[key] === "true" ? "false" : "true")}
                aria-label={`Toggle ${label}`}
              />
            </div>
          ))}

          <button
            className={styles.saveBtn}
            type="button"
            disabled={savingToggles}
            onClick={() =>
              saveSection(
                [
                  "feature_bulk_scan",
                  "feature_full_scan",
                  "feature_pdf_export",
                  "feature_google_oauth",
                ],
                setSavingToggles,
                setTogglesMsg
              )
            }
          >
            {savingToggles ? "Saving..." : "Save Toggles"}
          </button>
        </div>
      </div>

      {/* Section: Notification Sounds */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Notification Sounds</h2>
        <p className={styles.sectionDesc}>Enable or disable notification sounds for all users.</p>

        {soundsMsg.text && (
          <div className={soundsMsg.type === "error" ? styles.error : styles.success}>
            {soundsMsg.text}
          </div>
        )}

        <div className={styles.form}>
          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>Notification Sounds</span>
            <button
              type="button"
              className={`${styles.toggle} ${settings.notification_sounds_enabled === "true" ? styles.toggleOn : ""}`}
              onClick={() =>
                updateSetting(
                  "notification_sounds_enabled",
                  settings.notification_sounds_enabled === "true" ? "false" : "true"
                )
              }
              aria-label="Toggle Notification Sounds"
            />
          </div>

          <button
            className={styles.saveBtn}
            type="button"
            disabled={savingSounds}
            onClick={() =>
              saveSection(
                ["notification_sounds_enabled"],
                setSavingSounds,
                setSoundsMsg
              )
            }
          >
            {savingSounds ? "Saving..." : "Save Sounds Setting"}
          </button>
        </div>
      </div>

      {/* Section 3: API Keys */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>API Keys</h2>
        <p className={styles.sectionDesc}>Configure external API keys. DB value overrides environment variable.</p>

        {keysMsg.text && (
          <div className={keysMsg.type === "error" ? styles.error : styles.success}>
            {keysMsg.text}
          </div>
        )}

        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            saveSection(["pagespeed_api_key"], setSavingKeys, setKeysMsg);
          }}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="pagespeedKey">
              PageSpeed API Key
            </label>
            <div className={styles.passwordWrap}>
              <input
                id="pagespeedKey"
                className={styles.input}
                type={showApiKey ? "text" : "password"}
                placeholder="Enter API key"
                value={settings.pagespeed_api_key}
                onChange={(e) => updateSetting("pagespeed_api_key", e.target.value)}
              />
              <button
                type="button"
                className={styles.showHideBtn}
                onClick={() => setShowApiKey((v) => !v)}
              >
                {showApiKey ? "Hide" : "Show"}
              </button>
            </div>
            <span className={styles.hint}>Leave empty to use environment variable.</span>
          </div>

          <button className={styles.saveBtn} type="submit" disabled={savingKeys}>
            {savingKeys ? "Saving..." : "Save API Keys"}
          </button>
        </form>
      </div>

      {/* Section 4: Page Visibility */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Page Visibility</h2>
        <p className={styles.sectionDesc}>Control which pages are visible to users or admin only.</p>

        {pagesMsg.text && (
          <div className={pagesMsg.type === "error" ? styles.error : styles.success}>
            {pagesMsg.text}
          </div>
        )}

        <div className={styles.form}>
          <h3 className={styles.visibilityGroup}>Main Pages</h3>
          {[
            { key: "page_seo", label: "SEO" },
            { key: "page_qr_codes", label: "QR Codes" },
            { key: "page_calendar", label: "Calendar" },
            { key: "page_ecommerce", label: "eCommerce" },
            { key: "page_google_reviews", label: "Google Reviews" },
            { key: "page_instagram", label: "Instagram" },
            { key: "page_google_analytics", label: "Google Analytics" },
            { key: "page_software", label: "Software" },
            { key: "page_employees", label: "Employees" },
            { key: "page_recruitsmart", label: "RecruitSmart" },
          ].map(({ key, label }) => (
            <div key={key} className={styles.visibilityRow}>
              <span className={styles.toggleLabel}>{label}</span>
              <select
                className={styles.visibilitySelect}
                value={settings[key] || "all"}
                onChange={(e) => updateSetting(key, e.target.value)}
              >
                <option value="all">All Users</option>
                <option value="admin">Admin Only</option>
              </select>
            </div>
          ))}

          <h3 className={styles.visibilityGroup}>SEO Sub-Pages</h3>
          {[
            { key: "page_bulk_scan", label: "Bulk Scan" },
            { key: "page_full_scan", label: "Full Scan" },
            { key: "page_sitemap_creator", label: "Sitemap Creator" },
            { key: "page_usage", label: "Usage" },
            { key: "page_score_history", label: "Score History" },
            { key: "page_broken_links", label: "Broken Links" },
          ].map(({ key, label }) => (
            <div key={key} className={styles.visibilityRow}>
              <span className={styles.toggleLabel}>{label}</span>
              <select
                className={styles.visibilitySelect}
                value={settings[key] || "all"}
                onChange={(e) => updateSetting(key, e.target.value)}
              >
                <option value="all">All Users</option>
                <option value="admin">Admin Only</option>
              </select>
            </div>
          ))}

          <button
            className={styles.saveBtn}
            type="button"
            disabled={savingPages}
            onClick={() =>
              saveSection(
                [
                  "page_seo",
                  "page_qr_codes",
                  "page_calendar",
                  "page_ecommerce",
                  "page_google_reviews",
                  "page_instagram",
                  "page_google_analytics",
                  "page_software",
                  "page_employees",
                  "page_recruitsmart",
                  "page_bulk_scan",
                  "page_full_scan",
                  "page_sitemap_creator",
                  "page_usage",
                  "page_score_history",
                  "page_broken_links",
                ],
                setSavingPages,
                setPagesMsg
              )
            }
          >
            {savingPages ? "Saving..." : "Save Page Visibility"}
          </button>
        </div>
      </div>
    </>
  );
}
