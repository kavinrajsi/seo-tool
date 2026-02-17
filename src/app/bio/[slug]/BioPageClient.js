"use client";

import { useEffect } from "react";
import Link from "next/link";
import { getThemeStyles, BIO_LINK_PRESETS } from "@/lib/bioThemes";
import styles from "./bio.module.css";

function trackView(pageId) {
  if (typeof window === "undefined") return;
  const key = `bio_view_${pageId}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, "1");

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/bio-pages/view",
      new Blob([JSON.stringify({ pageId })], { type: "application/json" })
    );
  } else {
    fetch("/api/bio-pages/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pageId }),
    }).catch(() => {});
  }
}

function trackClick(linkId) {
  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/bio-pages/click",
      new Blob([JSON.stringify({ linkId })], { type: "application/json" })
    );
  } else {
    fetch("/api/bio-pages/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ linkId }),
    }).catch(() => {});
  }
}

export default function BioPageClient({ page, links }) {
  const { containerStyle, cssVars, buttonStyle } = getThemeStyles(page.theme);

  useEffect(() => {
    trackView(page.id);
  }, [page.id]);

  const btnClass = [
    styles.linkButton,
    styles[`btn_${buttonStyle}`] || styles.btn_filled,
  ].join(" ");

  return (
    <div className={styles.wrapper} style={{ ...containerStyle, ...cssVars }}>
      <div className={styles.container}>
        {page.avatarSvg && (
          <div
            className={styles.avatar}
            dangerouslySetInnerHTML={{
              __html: page.avatarSvg,
            }}
          />
        )}

        <h1 className={styles.displayName}>{page.displayName}</h1>

        {page.bioText && (
          <p className={styles.bioText}>{page.bioText}</p>
        )}

        <div className={styles.linksContainer}>
          {links.map((link) => {
            const preset = BIO_LINK_PRESETS.find((p) => p.key === link.icon);
            const iconSvg = preset?.icon || link.icon;
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={btnClass}
                onClick={() => trackClick(link.id)}
              >
                <span className={styles.linkRow}>
                  {iconSvg && (
                    <span
                      className={styles.linkIcon}
                      dangerouslySetInnerHTML={{ __html: iconSvg }}
                    />
                  )}
                  <span className={styles.linkText}>
                    <span className={styles.linkTitle}>{link.title}</span>
                    {link.description && (
                      <span className={styles.linkDesc}>{link.description}</span>
                    )}
                  </span>
                </span>
              </a>
            );
          })}
        </div>

        <footer className={styles.footer}>
          <Link href="/" className={styles.footerLink}>
            Powered by Firefly
          </Link>
        </footer>
      </div>
    </div>
  );
}
