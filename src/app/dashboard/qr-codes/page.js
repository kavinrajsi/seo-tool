"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import StyledQRCode, { generateQRCodeSVG } from "./StyledQRCode";
import styles from "./page.module.css";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";

const QR_TYPES = [
  { key: "url", label: "URL" },
  { key: "text", label: "Plain Text" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "sms", label: "SMS" },
  { key: "contact", label: "Contact" },
  { key: "multiurl", label: "Multi-URL" },
  { key: "pdf", label: "PDF" },
  { key: "app", label: "App" },
];

const QR_STYLES = [
  { key: "classic", label: "Classic" },
  { key: "rounded", label: "Rounded" },
  { key: "thin", label: "Thin" },
  { key: "smooth", label: "Smooth" },
  { key: "circles", label: "Circles" },
];

const QR_PATTERNS = [
  { key: "solid", label: "Solid" },
  { key: "checkered", label: "Checkered" },
  { key: "horizontal", label: "Horizontal" },
  { key: "vertical", label: "Vertical" },
];

const DOWNLOAD_SIZES = [
  { key: 256, label: "256px" },
  { key: 512, label: "512px" },
  { key: 1000, label: "1000px" },
  { key: 2000, label: "2000px" },
];

function buildQrValue(type, fields) {
  switch (type) {
    case "url": {
      const raw = fields.url || "";
      if (!raw || !fields.utmSource) return raw;
      try {
        const u = new URL(raw);
        if (fields.utmSource) u.searchParams.set("utm_source", fields.utmSource);
        if (fields.utmMedium) u.searchParams.set("utm_medium", fields.utmMedium);
        if (fields.utmCampaign) u.searchParams.set("utm_campaign", fields.utmCampaign);
        if (fields.utmTerm) u.searchParams.set("utm_term", fields.utmTerm);
        if (fields.utmContent) u.searchParams.set("utm_content", fields.utmContent);
        return u.toString();
      } catch {
        return raw;
      }
    }
    case "text":
      return fields.text || "";
    case "email": {
      const params = [];
      if (fields.emailSubject) params.push(`subject=${encodeURIComponent(fields.emailSubject)}`);
      if (fields.emailBody) params.push(`body=${encodeURIComponent(fields.emailBody)}`);
      const query = params.length ? `?${params.join("&")}` : "";
      return fields.emailAddress ? `mailto:${fields.emailAddress}${query}` : "";
    }
    case "phone":
      return fields.phone ? `tel:${fields.phone}` : "";
    case "sms": {
      if (!fields.smsNumber) return "";
      const body = fields.smsBody ? `?body=${encodeURIComponent(fields.smsBody)}` : "";
      return `smsto:${fields.smsNumber}${body}`;
    }
    case "contact": {
      if (!fields.contactName) return "";
      const parts = (fields.contactName || "").split(" ");
      const lastName = parts.length > 1 ? parts.pop() : "";
      const firstName = parts.join(" ");
      let vcard = `BEGIN:VCARD\nVERSION:3.0\nN:${lastName};${firstName}\nFN:${fields.contactName}`;
      if (fields.contactPhone) vcard += `\nTEL:${fields.contactPhone}`;
      if (fields.contactEmail) vcard += `\nEMAIL:${fields.contactEmail}`;
      if (fields.contactOrg) vcard += `\nORG:${fields.contactOrg}`;
      if (fields.contactUrl) vcard += `\nURL:${fields.contactUrl}`;
      vcard += `\nEND:VCARD`;
      return vcard;
    }
    case "multiurl": {
      const urls = (fields.multiUrls || "").split("\n").map((u) => u.trim()).filter(Boolean);
      return urls.join("\n");
    }
    case "pdf":
      return fields.pdfUrl || "";
    case "app": {
      const lines = [];
      if (fields.appIos) lines.push(fields.appIos);
      if (fields.appAndroid) lines.push(fields.appAndroid);
      return lines.join("\n");
    }
    default:
      return "";
  }
}

export default function QrCodesPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [qrType, setQrType] = useState("url");
  const [fields, setFields] = useState({});
  const [label, setLabel] = useState("");

  // Colors
  const [bgColor, setBgColor] = useState("#ffffff");
  const [squaresColor, setSquaresColor] = useState("#000000");
  const [pixelsColor, setPixelsColor] = useState("#000000");

  // Style and pattern
  const [qrStyle, setQrStyle] = useState("classic");
  const [qrPattern, setQrPattern] = useState("solid");
  const [downloadSize, setDownloadSize] = useState(1000);

  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [utmEnabled, setUtmEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [qrCodes, setQrCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(null);
  const [historySizes, setHistorySizes] = useState({});
  const qrRef = useRef(null);

  const qrValue = buildQrValue(qrType, fields);

  // Update generated timestamp when QR value changes
  const updateGeneratedAt = useCallback(() => {
    if (qrValue.trim()) {
      setGeneratedAt(new Date());
    } else {
      setGeneratedAt(null);
    }
  }, [qrValue]);

  useEffect(() => {
    updateGeneratedAt(); // eslint-disable-line react-hooks/set-state-in-effect -- sync derived state
  }, [updateGeneratedAt]);

  function updateField(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  const [scanCounts, setScanCounts] = useState({});

  const loadQrCodes = useCallback(async () => {
    try {
      const res = await projectFetch(`/api/qr-codes`);
      if (res.ok) {
        const data = await res.json();
        setQrCodes(data.qrCodes);
      }
    } catch {
      // Ignore load errors
    }
    setLoading(false);
  }, [projectFetch]);

  // Load scan counts separately
  useEffect(() => {
    async function loadScanCounts() {
      try {
        const res = await projectFetch("/api/qr-codes/analytics");
        if (res.ok) {
          const data = await res.json();
          const counts = {};
          for (const qr of data.qrCodes) {
            counts[qr.id] = qr.total_scans;
          }
          setScanCounts(counts);
        }
      } catch {
        // Ignore
      }
    }
    loadScanCounts();
  }, [qrCodes.length, projectFetch]);

  useEffect(() => {
    loadQrCodes(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetching on mount
  }, [loadQrCodes]);

  async function handleSave(e) {
    e.preventDefault();
    if (!qrValue.trim()) return;

    setMsg({ type: "", text: "" });
    setSaving(true);

    const isUrlWithTracking = qrType === "url" && trackingEnabled && fields.url;

    try {
      // First save with original content to get the short_code
      const saveContent = isUrlWithTracking ? "__tracking_placeholder__" : qrValue.trim();
      const res = await fetch("/api/qr-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: saveContent,
          label: label.trim() || null,
          backgroundColor: bgColor,
          squaresColor,
          pixelsColor,
          style: qrStyle,
          pattern: qrPattern,
          originalUrl: isUrlWithTracking ? qrValue.trim() : null,
          project_id: activeProjectId || null,
        }),
      });

      if (res.ok) {
        const saved = await res.json();

        // If tracking enabled, update content to tracking URL
        if (isUrlWithTracking && saved.short_code) {
          const trackingUrl = `${window.location.origin}/api/qr/r/${saved.short_code}`;
          await fetch(`/api/qr-codes/${saved.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: trackingUrl }),
          });
        }

        setMsg({ type: "success", text: isUrlWithTracking ? "QR code saved with tracking enabled." : "QR code saved." });
        loadQrCodes();
      } else {
        const data = await res.json();
        setMsg({ type: "error", text: data.error || "Failed to save." });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to save." });
    }

    setSaving(false);
  }

  function downloadFromCanvas(canvas, filename, format) {
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL(`image/${format}`);
    a.download = `${filename}.${format}`;
    a.click();
  }

  function handleDownloadPng() {
    // Generate high-res PNG at selected download size
    const svgContent = generateQRCodeSVG({
      value: qrValue,
      size: downloadSize,
      bgColor,
      squaresColor,
      pixelsColor,
      style: qrStyle,
      pattern: qrPattern,
    });
    if (!svgContent) return;

    const img = new Image();
    const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = downloadSize;
      canvas.height = downloadSize;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, downloadSize, downloadSize);
      URL.revokeObjectURL(url);

      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `qr-${label.trim() || "code"}-${downloadSize}px.png`;
      a.click();
    };
    img.src = url;
  }

  function handleDownloadSvg() {
    const svgContent = generateQRCodeSVG({
      value: qrValue,
      size: downloadSize,
      bgColor,
      squaresColor,
      pixelsColor,
      style: qrStyle,
      pattern: qrPattern,
    });
    if (!svgContent) return;

    const blob = new Blob([svgContent], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${label.trim() || "code"}-${downloadSize}px.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/qr-codes/${id}`, { method: "DELETE" });
      if (res.ok) {
        setQrCodes((prev) => prev.filter((qr) => qr.id !== id));
      }
    } catch {
      // Ignore delete errors
    }
  }

  function renderFields() {
    switch (qrType) {
      case "url":
        return (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-url">URL</label>
              <input
                id="qr-url"
                className={styles.input}
                type="url"
                placeholder="https://example.com"
                value={fields.url || ""}
                onChange={(e) => updateField("url", e.target.value)}
                required
              />
            </div>
            <div className={styles.trackingToggle}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={trackingEnabled}
                  onChange={(e) => setTrackingEnabled(e.target.checked)}
                  className={styles.checkbox}
                />
                Enable scan tracking
              </label>
              {trackingEnabled && (
                <span className={styles.trackingHint}>
                  QR code will use a tracking link to count scans
                </span>
              )}
            </div>
            <div className={styles.trackingToggle}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={utmEnabled}
                  onChange={(e) => setUtmEnabled(e.target.checked)}
                  className={styles.checkbox}
                />
                Add UTM parameters
              </label>
              {utmEnabled && (
                <span className={styles.trackingHint}>
                  Append campaign tracking parameters to the URL
                </span>
              )}
            </div>
            {utmEnabled && (
              <div className={styles.utmGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="qr-utm-source">Source *</label>
                  <input
                    id="qr-utm-source"
                    className={styles.input}
                    type="text"
                    placeholder="e.g. instagram, newsletter"
                    value={fields.utmSource || ""}
                    onChange={(e) => updateField("utmSource", e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="qr-utm-medium">Medium *</label>
                  <input
                    id="qr-utm-medium"
                    className={styles.input}
                    type="text"
                    placeholder="e.g. qr_code, social"
                    value={fields.utmMedium || ""}
                    onChange={(e) => updateField("utmMedium", e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="qr-utm-campaign">Campaign *</label>
                  <input
                    id="qr-utm-campaign"
                    className={styles.input}
                    type="text"
                    placeholder="e.g. spring_sale"
                    value={fields.utmCampaign || ""}
                    onChange={(e) => updateField("utmCampaign", e.target.value)}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="qr-utm-term">Term</label>
                  <input
                    id="qr-utm-term"
                    className={styles.input}
                    type="text"
                    placeholder="e.g. seo+tools"
                    value={fields.utmTerm || ""}
                    onChange={(e) => updateField("utmTerm", e.target.value)}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="qr-utm-content">Content</label>
                  <input
                    id="qr-utm-content"
                    className={styles.input}
                    type="text"
                    placeholder="e.g. header_link"
                    value={fields.utmContent || ""}
                    onChange={(e) => updateField("utmContent", e.target.value)}
                  />
                </div>
              </div>
            )}
          </>
        );
      case "text":
        return (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="qr-text">Text</label>
            <textarea
              id="qr-text"
              className={`${styles.input} ${styles.textarea}`}
              placeholder="Enter your text here"
              value={fields.text || ""}
              onChange={(e) => updateField("text", e.target.value)}
              rows={3}
              required
            />
          </div>
        );
      case "email":
        return (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-email">Email Address</label>
              <input
                id="qr-email"
                className={styles.input}
                type="email"
                placeholder="hello@example.com"
                value={fields.emailAddress || ""}
                onChange={(e) => updateField("emailAddress", e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-email-subject">Subject (optional)</label>
              <input
                id="qr-email-subject"
                className={styles.input}
                type="text"
                placeholder="Email subject"
                value={fields.emailSubject || ""}
                onChange={(e) => updateField("emailSubject", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-email-body">Body (optional)</label>
              <textarea
                id="qr-email-body"
                className={`${styles.input} ${styles.textarea}`}
                placeholder="Email body"
                value={fields.emailBody || ""}
                onChange={(e) => updateField("emailBody", e.target.value)}
                rows={2}
              />
            </div>
          </>
        );
      case "phone":
        return (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="qr-phone">Phone Number</label>
            <input
              id="qr-phone"
              className={styles.input}
              type="tel"
              placeholder="+1 234 567 8900"
              value={fields.phone || ""}
              onChange={(e) => updateField("phone", e.target.value)}
              required
            />
          </div>
        );
      case "sms":
        return (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-sms-number">Phone Number</label>
              <input
                id="qr-sms-number"
                className={styles.input}
                type="tel"
                placeholder="+1 234 567 8900"
                value={fields.smsNumber || ""}
                onChange={(e) => updateField("smsNumber", e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-sms-body">Message (optional)</label>
              <textarea
                id="qr-sms-body"
                className={`${styles.input} ${styles.textarea}`}
                placeholder="Your message"
                value={fields.smsBody || ""}
                onChange={(e) => updateField("smsBody", e.target.value)}
                rows={2}
              />
            </div>
          </>
        );
      case "contact":
        return (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-contact-name">Full Name</label>
              <input
                id="qr-contact-name"
                className={styles.input}
                type="text"
                placeholder="John Doe"
                value={fields.contactName || ""}
                onChange={(e) => updateField("contactName", e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-contact-phone">Phone (optional)</label>
              <input
                id="qr-contact-phone"
                className={styles.input}
                type="tel"
                placeholder="+1 234 567 8900"
                value={fields.contactPhone || ""}
                onChange={(e) => updateField("contactPhone", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-contact-email">Email (optional)</label>
              <input
                id="qr-contact-email"
                className={styles.input}
                type="email"
                placeholder="john@example.com"
                value={fields.contactEmail || ""}
                onChange={(e) => updateField("contactEmail", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-contact-org">Organization (optional)</label>
              <input
                id="qr-contact-org"
                className={styles.input}
                type="text"
                placeholder="Acme Inc."
                value={fields.contactOrg || ""}
                onChange={(e) => updateField("contactOrg", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-contact-url">Website (optional)</label>
              <input
                id="qr-contact-url"
                className={styles.input}
                type="url"
                placeholder="https://example.com"
                value={fields.contactUrl || ""}
                onChange={(e) => updateField("contactUrl", e.target.value)}
              />
            </div>
          </>
        );
      case "multiurl":
        return (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="qr-multiurl">URLs (one per line)</label>
            <textarea
              id="qr-multiurl"
              className={`${styles.input} ${styles.textarea}`}
              placeholder={"https://example.com\nhttps://another.com"}
              value={fields.multiUrls || ""}
              onChange={(e) => updateField("multiUrls", e.target.value)}
              rows={4}
              required
            />
          </div>
        );
      case "pdf":
        return (
          <div className={styles.field}>
            <label className={styles.label} htmlFor="qr-pdf">PDF Link</label>
            <input
              id="qr-pdf"
              className={styles.input}
              type="url"
              placeholder="https://example.com/document.pdf"
              value={fields.pdfUrl || ""}
              onChange={(e) => updateField("pdfUrl", e.target.value)}
              required
            />
          </div>
        );
      case "app":
        return (
          <>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-app-ios">App Store URL (optional)</label>
              <input
                id="qr-app-ios"
                className={styles.input}
                type="url"
                placeholder="https://apps.apple.com/app/..."
                value={fields.appIos || ""}
                onChange={(e) => updateField("appIos", e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-app-android">Google Play URL (optional)</label>
              <input
                id="qr-app-android"
                className={styles.input}
                type="url"
                placeholder="https://play.google.com/store/apps/..."
                value={fields.appAndroid || ""}
                onChange={(e) => updateField("appAndroid", e.target.value)}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  }

  return (
    <>
      <h1 className={styles.heading}>QR Codes</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Generate QR Code</h2>
        <p className={styles.sectionDesc}>Choose a type, fill in the details, and customize appearance.</p>

        <div className={styles.typeTabs}>
          {QR_TYPES.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`${styles.typeTab} ${qrType === t.key ? styles.typeTabActive : ""}`}
              onClick={() => { setQrType(t.key); setFields({}); setUtmEnabled(false); }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {msg.text && (
          <div className={msg.type === "error" ? styles.error : styles.success} style={{ marginBottom: "var(--space-4)" }}>
            {msg.text}
          </div>
        )}

        <div className={styles.generator}>
          <form onSubmit={handleSave} className={styles.form}>
            {renderFields()}

            <div className={styles.field}>
              <label className={styles.label} htmlFor="qr-label">Label (optional)</label>
              <input
                id="qr-label"
                className={styles.input}
                type="text"
                placeholder="My QR code"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className={styles.subsection}>
              <span className={styles.subsectionTitle}>Colors</span>
              <div className={styles.colorGrid}>
                <div className={styles.colorField}>
                  <label className={styles.label} htmlFor="qr-bg">Background</label>
                  <input
                    id="qr-bg"
                    className={styles.colorInput}
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                  />
                </div>
                <div className={styles.colorField}>
                  <label className={styles.label} htmlFor="qr-squares">Squares</label>
                  <input
                    id="qr-squares"
                    className={styles.colorInput}
                    type="color"
                    value={squaresColor}
                    onChange={(e) => setSquaresColor(e.target.value)}
                  />
                </div>
                <div className={styles.colorField}>
                  <label className={styles.label} htmlFor="qr-pixels">Pixels</label>
                  <input
                    id="qr-pixels"
                    className={styles.colorInput}
                    type="color"
                    value={pixelsColor}
                    onChange={(e) => setPixelsColor(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.subsection}>
              <span className={styles.subsectionTitle}>Style</span>
              <div className={styles.optionTabs}>
                {QR_STYLES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`${styles.optionTab} ${qrStyle === s.key ? styles.optionTabActive : ""}`}
                    onClick={() => setQrStyle(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.subsection}>
              <span className={styles.subsectionTitle}>Pattern</span>
              <div className={styles.optionTabs}>
                {QR_PATTERNS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    className={`${styles.optionTab} ${qrPattern === p.key ? styles.optionTabActive : ""}`}
                    onClick={() => setQrPattern(p.key)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.subsection}>
              <span className={styles.subsectionTitle}>Download Size</span>
              <div className={styles.optionTabs}>
                {DOWNLOAD_SIZES.map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    className={`${styles.optionTab} ${downloadSize === s.key ? styles.optionTabActive : ""}`}
                    onClick={() => setDownloadSize(s.key)}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              <button className={styles.saveBtn} type="submit" disabled={saving || !qrValue.trim()}>
                {saving ? "Saving..." : "Save QR Code"}
              </button>
              <button
                className={styles.downloadBtn}
                type="button"
                onClick={handleDownloadSvg}
                disabled={!qrValue.trim()}
              >
                Download SVG
              </button>
              <button
                className={styles.downloadBtn}
                type="button"
                onClick={handleDownloadPng}
                disabled={!qrValue.trim()}
              >
                Download PNG
              </button>
            </div>
          </form>

          <div className={styles.previewWrapper}>
            <div className={styles.preview} ref={qrRef}>
              {qrValue.trim() ? (
                <StyledQRCode
                  value={qrValue}
                  size={180}
                  bgColor={bgColor}
                  squaresColor={squaresColor}
                  pixelsColor={pixelsColor}
                  style={qrStyle}
                  pattern={qrPattern}
                />
              ) : (
                <span className={styles.previewPlaceholder}>
                  Fill in the fields to see a live preview
                </span>
              )}
            </div>
            {generatedAt && (
              <div className={styles.generatedAt}>
                Generated: {generatedAt.toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div>
            <h2 className={styles.sectionTitle}>Saved QR Codes</h2>
            <p className={styles.sectionDesc}>Your previously generated QR codes.</p>
          </div>
          <Link href="/dashboard/qr-codes/analytics" className={styles.analyticsLink}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            View Analytics
          </Link>
        </div>

        {loading ? (
          <div className={styles.emptyState}>Loading...</div>
        ) : qrCodes.length === 0 ? (
          <div className={styles.emptyState}>No saved QR codes yet.</div>
        ) : (
          <div className={styles.historyList}>
            {qrCodes.map((qr) => (
              <div key={qr.id} className={styles.historyItem}>
                <div className={styles.historyQr}>
                  <StyledQRCode
                    value={qr.content}
                    size={56}
                    bgColor={qr.background_color || "#ffffff"}
                    squaresColor={qr.squares_color || "#000000"}
                    pixelsColor={qr.pixels_color || "#000000"}
                    style={qr.style || "classic"}
                    pattern={qr.pattern || "solid"}
                  />
                </div>
                <div className={styles.historyInfo}>
                  {qr.label && <div className={styles.historyLabel}>{qr.label}</div>}
                  <div className={styles.historyContent}>{qr.original_url || qr.content}</div>
                  <div className={styles.historyMeta}>
                    <span className={styles.historyDate}>
                      {new Date(qr.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                    {scanCounts[qr.id] > 0 && (
                      <span className={styles.scanBadge}>
                        {scanCounts[qr.id]} scan{scanCounts[qr.id] !== 1 ? "s" : ""}
                      </span>
                    )}
                    {qr.short_code && qr.original_url && (
                      <span className={styles.trackingBadge}>Tracking</span>
                    )}
                  </div>
                </div>
                <div className={styles.historyActions}>
                  <select
                    className={styles.historySizeSelect}
                    value={historySizes[qr.id] || 1000}
                    onChange={(e) => setHistorySizes((prev) => ({ ...prev, [qr.id]: Number(e.target.value) }))}
                    title="Download size"
                  >
                    {DOWNLOAD_SIZES.map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                  <button
                    className={styles.historyDownloadBtn}
                    onClick={() => {
                      const size = historySizes[qr.id] || 1000;
                      const svgContent = generateQRCodeSVG({
                        value: qr.content,
                        size,
                        bgColor: qr.background_color || "#ffffff",
                        squaresColor: qr.squares_color || "#000000",
                        pixelsColor: qr.pixels_color || "#000000",
                        style: qr.style || "classic",
                        pattern: qr.pattern || "solid",
                      });
                      if (!svgContent) return;
                      const blob = new Blob([svgContent], { type: "image/svg+xml" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `qr-${qr.label || "code"}-${size}px.svg`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    title="Download SVG"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    SVG
                  </button>
                  <button
                    className={styles.historyDownloadBtn}
                    onClick={() => {
                      const size = historySizes[qr.id] || 1000;
                      const svgContent = generateQRCodeSVG({
                        value: qr.content,
                        size,
                        bgColor: qr.background_color || "#ffffff",
                        squaresColor: qr.squares_color || "#000000",
                        pixelsColor: qr.pixels_color || "#000000",
                        style: qr.style || "classic",
                        pattern: qr.pattern || "solid",
                      });
                      if (!svgContent) return;

                      const img = new Image();
                      const svgBlob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
                      const url = URL.createObjectURL(svgBlob);

                      img.onload = () => {
                        const canvas = document.createElement("canvas");
                        canvas.width = size;
                        canvas.height = size;
                        const ctx = canvas.getContext("2d");
                        ctx.drawImage(img, 0, 0, size, size);
                        URL.revokeObjectURL(url);

                        const a = document.createElement("a");
                        a.href = canvas.toDataURL("image/png");
                        a.download = `qr-${qr.label || "code"}-${size}px.png`;
                        a.click();
                      };
                      img.src = url;
                    }}
                    title="Download PNG"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    PNG
                  </button>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(qr.id)}
                    title="Delete"
                    type="button"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
