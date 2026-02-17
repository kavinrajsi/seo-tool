"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import styles from "./SerpPreview.module.css";

const TABS = [
  { id: "desktop", label: "Desktop" },
  { id: "mobile", label: "Mobile" },
  { id: "twitter", label: "Twitter/X" },
  { id: "facebook", label: "Facebook" },
  { id: "linkedin", label: "LinkedIn" },
];

export default function SerpPreview({ data }) {
  const [activeTab, setActiveTab] = useState("desktop");

  const ogTags = data.results?.openGraph?.tags || {};
  const twTags = data.results?.twitterCards?.tags || {};

  const [title, setTitle] = useState(
    data.results?.title?.title || ""
  );
  const [description, setDescription] = useState(
    data.results?.metaDescription?.description || ""
  );
  const [pageUrl, setPageUrl] = useState(data.url || "");
  const [siteName, setSiteName] = useState(
    ogTags["og:site_name"] || new URL(data.url).hostname
  );
  const [imageUrl, setImageUrl] = useState(
    ogTags["og:image"] || twTags["twitter:image"] || ""
  );

  const displayDomain = (() => {
    try {
      return new URL(pageUrl).hostname;
    } catch {
      return pageUrl;
    }
  })();

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(displayDomain)}&sz=64`;

  const truncate = (str, max) =>
    str.length > max ? str.slice(0, max) + "..." : str;

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.heading}>SERP Preview</h3>

      {/* Input fields */}
      <div className={styles.fields}>
        <label className={styles.field}>
          <span className={styles.label}>
            Page Title{" "}
            <span className={title.length > 60 ? styles.charOver : styles.charCount}>
              {title.length}/60
            </span>
          </span>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a title"
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>
            Meta Description{" "}
            <span className={description.length > 160 ? styles.charOver : styles.charCount}>
              {description.length}/160
            </span>
          </span>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter a description"
            rows={2}
          />
        </label>
        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.label}>Page URL</span>
            <input
              className={styles.input}
              value={pageUrl}
              onChange={(e) => setPageUrl(e.target.value)}
              placeholder="https://example.com/best-seo-tools"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Site Name</span>
            <input
              className={styles.input}
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Your Site Name"
            />
          </label>
        </div>
        <label className={styles.field}>
          <span className={styles.label}>Social Image URL (1200x630)</span>
          <input
            className={styles.input}
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://example.com/og-image.jpg"
          />
        </label>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Preview area */}
      <div className={styles.previewArea}>
        {activeTab === "desktop" && (
          <DesktopPreview
            title={title}
            description={description}
            url={pageUrl}
            displayDomain={displayDomain}
            siteName={siteName}
            faviconUrl={faviconUrl}
            truncate={truncate}
          />
        )}
        {activeTab === "mobile" && (
          <MobilePreview
            title={title}
            description={description}
            url={pageUrl}
            displayDomain={displayDomain}
            siteName={siteName}
            faviconUrl={faviconUrl}
            truncate={truncate}
          />
        )}
        {activeTab === "twitter" && (
          <TwitterPreview
            title={title}
            description={description}
            displayDomain={displayDomain}
            imageUrl={imageUrl}
            truncate={truncate}
          />
        )}
        {activeTab === "facebook" && (
          <FacebookPreview
            title={title}
            description={description}
            displayDomain={displayDomain}
            siteName={siteName}
            imageUrl={imageUrl}
            truncate={truncate}
          />
        )}
        {activeTab === "linkedin" && (
          <LinkedInPreview
            title={title}
            description={description}
            displayDomain={displayDomain}
            imageUrl={imageUrl}
            truncate={truncate}
          />
        )}
      </div>
    </div>
  );
}

function Favicon({ src, fallback }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <span className={styles.serpFavicon}>{fallback}</span>
    );
  }

  return (
    <Image
      src={src}
      alt=""
      className={styles.serpFaviconImg}
      width={28}
      height={28}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}

function ImagePlaceholder({ className }) {
  return (
    <div className={`${styles.imagePlaceholder} ${className || ""}`}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span>1200 x 630</span>
    </div>
  );
}

/* Google Desktop SERP */
function DesktopPreview({ title, description, url, displayDomain, siteName, faviconUrl, truncate }) {
  return (
    <div className={styles.desktopSerp}>
      <div className={styles.serpBreadcrumb}>
        <Favicon src={faviconUrl} fallback={displayDomain.charAt(0).toUpperCase()} />
        <div className={styles.serpSiteInfo}>
          <span className={styles.serpSiteName}>{siteName || displayDomain}</span>
          <span className={styles.serpUrl}>{url || "https://example.com"}</span>
        </div>
      </div>
      <h3 className={styles.serpTitle}>
        {title ? truncate(title, 60) : "Page Title Will Appear Here"}
      </h3>
      <p className={styles.serpDescription}>
        {description ? truncate(description, 160) : "Your meta description will appear here. Write a compelling summary to increase click-through rates from search results."}
      </p>
    </div>
  );
}

/* Google Mobile SERP */
function MobilePreview({ title, description, url, displayDomain, siteName, faviconUrl, truncate }) {
  return (
    <div className={styles.mobileFrame}>
      <div className={styles.mobileSerp}>
        <div className={styles.serpBreadcrumb}>
          <Favicon src={faviconUrl} fallback={displayDomain.charAt(0).toUpperCase()} />
          <div className={styles.serpSiteInfo}>
            <span className={styles.serpSiteName}>{siteName || displayDomain}</span>
            <span className={styles.serpUrl}>{url || "https://example.com"}</span>
          </div>
        </div>
        <h3 className={styles.serpTitleMobile}>
          {title ? truncate(title, 60) : "Page Title Will Appear Here"}
        </h3>
        <p className={styles.serpDescriptionMobile}>
          {description ? truncate(description, 120) : "Your meta description will appear here. It may be truncated on mobile devices."}
        </p>
      </div>
    </div>
  );
}

/* Twitter/X Card */
function TwitterPreview({ title, description, displayDomain, imageUrl, truncate }) {
  return (
    <div className={styles.twitterCard}>
      {imageUrl ? (
        <Image src={imageUrl} alt="" className={styles.socialImage} width={1200} height={630} unoptimized />
      ) : (
        <ImagePlaceholder className={styles.socialImage} />
      )}
      <div className={styles.twitterBody}>
        <span className={styles.twitterTitle}>
          {title ? truncate(title, 70) : "Page Title"}
        </span>
        <span className={styles.twitterDesc}>
          {description ? truncate(description, 125) : "Description preview"}
        </span>
        <span className={styles.twitterDomain}>{displayDomain}</span>
      </div>
    </div>
  );
}

/* Facebook Card */
function FacebookPreview({ title, description, displayDomain, siteName, imageUrl, truncate }) {
  return (
    <div className={styles.facebookCard}>
      {imageUrl ? (
        <Image src={imageUrl} alt="" className={styles.socialImage} width={1200} height={630} unoptimized />
      ) : (
        <ImagePlaceholder className={styles.socialImage} />
      )}
      <div className={styles.facebookBody}>
        <span className={styles.facebookDomain}>{displayDomain}</span>
        <span className={styles.facebookTitle}>
          {title ? truncate(title, 65) : "Page Title"}
        </span>
        <span className={styles.facebookDesc}>
          {description ? truncate(description, 150) : "Description preview"}
        </span>
      </div>
    </div>
  );
}

/* LinkedIn Card */
function LinkedInPreview({ title, description, displayDomain, imageUrl, truncate }) {
  return (
    <div className={styles.linkedinCard}>
      {imageUrl ? (
        <Image src={imageUrl} alt="" className={styles.socialImage} width={1200} height={630} unoptimized />
      ) : (
        <ImagePlaceholder className={styles.socialImage} />
      )}
      <div className={styles.linkedinBody}>
        <span className={styles.linkedinTitle}>
          {title ? truncate(title, 70) : "Page Title"}
        </span>
        <span className={styles.linkedinDomain}>{displayDomain}</span>
      </div>
    </div>
  );
}
