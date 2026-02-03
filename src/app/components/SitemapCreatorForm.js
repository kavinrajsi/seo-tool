"use client";

import { useState } from "react";
import styles from "./SitemapCreatorForm.module.css";

export default function SitemapCreatorForm({
  domain,
  setDomain,
  crawlMethod,
  setCrawlMethod,
  discovering,
  urls,
  selectedUrls,
  urlConfig,
  error,
  generatedXml,
  onDiscoverUrls,
  onToggleUrl,
  onSelectAll,
  onDeselectAll,
  onUpdateConfig,
  onGenerateSitemap,
  onDownloadSitemap,
}) {
  const [expandedUrl, setExpandedUrl] = useState(null);

  const hasUrls = urls.length > 0;
  const hasSitemap = generatedXml !== "";

  return (
    <div className={styles.wrapper}>
      {!hasSitemap && (
        <>
          {/* Step 1: Discover URLs */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>Step 1: Discover URLs</h2>

            <div className={styles.methodToggle}>
              <button
                className={`${styles.methodBtn} ${crawlMethod === "sitemap" ? styles.active : ""}`}
                onClick={() => setCrawlMethod("sitemap")}
                disabled={discovering || hasUrls}
                type="button"
              >
                From Sitemap
              </button>
              <button
                className={`${styles.methodBtn} ${crawlMethod === "crawl" ? styles.active : ""}`}
                onClick={() => setCrawlMethod("crawl")}
                disabled={discovering || hasUrls}
                type="button"
              >
                Crawl Site
              </button>
            </div>

            <div className={styles.inputRow}>
              <input
                type="text"
                className={styles.input}
                placeholder="Enter domain (e.g., example.com)"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                disabled={discovering || hasUrls}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !discovering && !hasUrls && domain.trim()) {
                    e.preventDefault();
                    onDiscoverUrls();
                  }
                }}
              />
              {!hasUrls && (
                <button
                  className={styles.discoverBtn}
                  onClick={onDiscoverUrls}
                  disabled={discovering || !domain.trim()}
                  type="button"
                >
                  {discovering ? (
                    <>
                      <span className={styles.spinner} />
                      Discovering...
                    </>
                  ) : (
                    `Discover URLs`
                  )}
                </button>
              )}
            </div>

            {error && <p className={styles.error}>{error}</p>}
          </div>

          {/* Step 2: Select & Configure URLs */}
          {hasUrls && (
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <h2 className={styles.sectionTitle}>
                  Step 2: Select & Configure URLs ({selectedUrls.size} of {urls.length} selected)
                </h2>
                <div className={styles.selectActions}>
                  <button
                    className={styles.textBtn}
                    onClick={onSelectAll}
                    type="button"
                  >
                    Select All
                  </button>
                  <button
                    className={styles.textBtn}
                    onClick={onDeselectAll}
                    type="button"
                  >
                    Deselect All
                  </button>
                </div>
              </div>

              <div className={styles.urlList}>
                {urls.map((url) => {
                  const isSelected = selectedUrls.has(url);
                  const isExpanded = expandedUrl === url;
                  const config = urlConfig[url] || {};

                  return (
                    <div
                      key={url}
                      className={`${styles.urlItem} ${isSelected ? styles.selected : ""}`}
                    >
                      <div className={styles.urlHeader}>
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleUrl(url)}
                          />
                          <span className={styles.checkmark} />
                        </label>
                        <span className={styles.urlText}>{url}</span>
                        <button
                          className={styles.expandBtn}
                          onClick={() => setExpandedUrl(isExpanded ? null : url)}
                          type="button"
                          aria-label={isExpanded ? "Collapse" : "Expand"}
                        >
                          <svg
                            className={`${styles.chevron} ${isExpanded ? styles.rotated : ""}`}
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <polyline points="6 9 12 15 18 9" />
                          </svg>
                        </button>
                      </div>

                      {isExpanded && (
                        <div className={styles.urlConfig}>
                          <div className={styles.configRow}>
                            <label className={styles.configLabel}>
                              Last Modified
                              <input
                                type="date"
                                className={styles.configInput}
                                value={config.lastmod || ""}
                                onChange={(e) => onUpdateConfig(url, "lastmod", e.target.value)}
                              />
                            </label>

                            <label className={styles.configLabel}>
                              Change Frequency
                              <select
                                className={styles.configSelect}
                                value={config.changefreq || "weekly"}
                                onChange={(e) => onUpdateConfig(url, "changefreq", e.target.value)}
                              >
                                <option value="always">Always</option>
                                <option value="hourly">Hourly</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                                <option value="yearly">Yearly</option>
                                <option value="never">Never</option>
                              </select>
                            </label>

                            <label className={styles.configLabel}>
                              Priority (0.0-1.0)
                              <input
                                type="number"
                                className={styles.configInput}
                                value={config.priority || "0.5"}
                                onChange={(e) => onUpdateConfig(url, "priority", e.target.value)}
                                min="0"
                                max="1"
                                step="0.1"
                              />
                            </label>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <button
                className={styles.generateBtn}
                onClick={onGenerateSitemap}
                disabled={selectedUrls.size === 0}
                type="button"
              >
                Generate Sitemap ({selectedUrls.size} URL{selectedUrls.size !== 1 ? "s" : ""})
              </button>
            </div>
          )}
        </>
      )}

      {/* Step 3: Download Sitemap */}
      {hasSitemap && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Step 3: Download Sitemap</h2>

          <div className={styles.preview}>
            <div className={styles.previewHeader}>
              <span className={styles.previewTitle}>sitemap.xml</span>
              <button
                className={styles.copyBtn}
                onClick={() => {
                  navigator.clipboard.writeText(generatedXml);
                }}
                type="button"
              >
                Copy
              </button>
            </div>
            <pre className={styles.previewContent}>{generatedXml}</pre>
          </div>

          <button
            className={styles.downloadBtn}
            onClick={onDownloadSitemap}
            type="button"
          >
            <svg className={styles.downloadIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download sitemap.xml
          </button>
        </div>
      )}
    </div>
  );
}
