"use client";

import { useState } from "react";
import Navbar from "@/app/components/Navbar";
import SitemapCreatorForm from "@/app/components/SitemapCreatorForm";
import styles from "./page.module.css";

export default function SitemapCreatorPage() {
  const [domain, setDomain] = useState("");
  const [crawling, setCrawling] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [urls, setUrls] = useState([]);
  const [selectedUrls, setSelectedUrls] = useState(new Set());
  const [urlConfig, setUrlConfig] = useState({});
  const [error, setError] = useState("");
  const [generatedXml, setGeneratedXml] = useState("");
  const [crawlMethod, setCrawlMethod] = useState("sitemap"); // sitemap or crawl

  const handleDiscoverUrls = async () => {
    if (!domain.trim()) {
      setError("Please enter a domain");
      return;
    }

    setDiscovering(true);
    setError("");
    setUrls([]);
    setSelectedUrls(new Set());
    setUrlConfig({});
    setGeneratedXml("");

    try {
      if (crawlMethod === "sitemap") {
        // Use existing sitemap API
        const response = await fetch("/api/sitemap-urls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: domain }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to fetch sitemap");
        }

        const data = await response.json();
        setUrls(data.urls || []);
        setSelectedUrls(new Set(data.urls || []));

        // Initialize default config for all URLs
        const config = {};
        (data.urls || []).forEach((url) => {
          config[url] = {
            changefreq: "weekly",
            priority: "0.5",
            lastmod: new Date().toISOString().split('T')[0],
          };
        });
        setUrlConfig(config);
      } else {
        // Use crawl API
        const response = await fetch("/api/sitemap-creator/crawl", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: domain, maxPages: 100 }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to crawl site");
        }

        const data = await response.json();
        setUrls(data.urls || []);
        setSelectedUrls(new Set(data.urls || []));

        // Initialize default config for all URLs
        const config = {};
        (data.urls || []).forEach((url) => {
          config[url] = {
            changefreq: "weekly",
            priority: "0.5",
            lastmod: new Date().toISOString().split('T')[0],
          };
        });
        setUrlConfig(config);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setDiscovering(false);
    }
  };

  const handleToggleUrl = (url) => {
    const newSelected = new Set(selectedUrls);
    if (newSelected.has(url)) {
      newSelected.delete(url);
    } else {
      newSelected.add(url);
    }
    setSelectedUrls(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedUrls(new Set(urls));
  };

  const handleDeselectAll = () => {
    setSelectedUrls(new Set());
  };

  const handleUpdateConfig = (url, field, value) => {
    setUrlConfig((prev) => ({
      ...prev,
      [url]: {
        ...prev[url],
        [field]: value,
      },
    }));
  };

  const handleGenerateSitemap = () => {
    if (selectedUrls.size === 0) {
      setError("Please select at least one URL");
      return;
    }

    // Generate XML
    const urlsArray = Array.from(selectedUrls);
    const urlEntries = urlsArray
      .map((url) => {
        const config = urlConfig[url] || {};
        return `  <url>
    <loc>${url}</loc>
    <lastmod>${config.lastmod || new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${config.changefreq || "weekly"}</changefreq>
    <priority>${config.priority || "0.5"}</priority>
  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;

    setGeneratedXml(xml);
  };

  const handleDownloadSitemap = () => {
    if (!generatedXml) return;

    const blob = new Blob([generatedXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    setDomain("");
    setUrls([]);
    setSelectedUrls(new Set());
    setUrlConfig({});
    setGeneratedXml("");
    setError("");
  };

  return (
    <>
      <Navbar />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.hero}>
            <h1 className={styles.heading}>
              Sitemap <span className={styles.accent}>Creator</span>
            </h1>
            <p className={styles.description}>
              Generate a custom XML sitemap for your website. Discover URLs from an existing sitemap or crawl your site, then customize each URL's settings and download a ready-to-use sitemap.xml file.
            </p>
          </div>

          <div className={styles.content}>
            {generatedXml && (
              <div className={styles.headerRow}>
                <button
                  className={styles.resetBtn}
                  onClick={handleReset}
                  type="button"
                >
                  Create New Sitemap
                </button>
              </div>
            )}

            <SitemapCreatorForm
              domain={domain}
              setDomain={setDomain}
              crawlMethod={crawlMethod}
              setCrawlMethod={setCrawlMethod}
              discovering={discovering}
              urls={urls}
              selectedUrls={selectedUrls}
              urlConfig={urlConfig}
              error={error}
              generatedXml={generatedXml}
              onDiscoverUrls={handleDiscoverUrls}
              onToggleUrl={handleToggleUrl}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
              onUpdateConfig={handleUpdateConfig}
              onGenerateSitemap={handleGenerateSitemap}
              onDownloadSitemap={handleDownloadSitemap}
            />
          </div>
        </div>
      </main>
    </>
  );
}
