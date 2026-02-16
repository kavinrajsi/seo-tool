"use client";

import { useState, useEffect, useCallback } from "react";
import { useProject } from "@/app/components/ProjectProvider";
import { BIO_THEME_PRESETS, BIO_LINK_PRESETS, BUTTON_STYLES, getThemeStyles } from "@/lib/bioThemes";
import styles from "./page.module.css";

function formatDate(dateStr) {
  if (!dateStr) return "--";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getBioUrl(slug, customDomain, domainVerified) {
  if (customDomain && domainVerified) {
    return `https://${customDomain}`;
  }
  if (typeof window === "undefined") return `/bio/${slug}`;
  return `${window.location.origin}/bio/${slug}`;
}

// ── Live Preview Component ──
function LivePreview({ page, links }) {
  const theme = page.theme || { preset: "default" };
  const { containerStyle, cssVars, buttonStyle } = getThemeStyles(theme);

  return (
    <div className={styles.phoneFrame}>
      <div className={styles.phoneScreen} style={{ ...containerStyle, ...cssVars }}>
        {page.avatarSvg && (
          <div
            className={styles.previewAvatar}
            dangerouslySetInnerHTML={{
              __html: page.avatarSvg,
            }}
          />
        )}
        <div className={styles.previewName} style={{ color: cssVars["--bio-text"] }}>
          {page.displayName || "Display Name"}
        </div>
        {page.bioText && (
          <div className={styles.previewBio} style={{ color: cssVars["--bio-text"], opacity: 0.7 }}>
            {page.bioText}
          </div>
        )}
        <div className={styles.previewLinks}>
          {links.filter((l) => l.is_active !== false).map((link, i) => {
            const btnStyles = {
              backgroundColor: buttonStyle === "outline" ? "transparent" : cssVars["--bio-btn"],
              color: buttonStyle === "outline" ? cssVars["--bio-btn"] : cssVars["--bio-btn-text"],
              border: buttonStyle === "outline" ? `2px solid ${cssVars["--bio-btn"]}` : "none",
              borderRadius: buttonStyle === "rounded" ? "50px" : "6px",
              boxShadow: buttonStyle === "shadow" ? "3px 3px 0 rgba(0,0,0,0.3)" : "none",
            };
            const linkPreset = BIO_LINK_PRESETS.find((p) => p.key === link.icon);
            const linkSvg = linkPreset?.icon || link.icon;
            return (
              <div key={link.id || i} className={styles.previewLinkBtn} style={btnStyles}>
                {linkSvg && (
                  <span
                    className={styles.previewLinkIcon}
                    dangerouslySetInnerHTML={{ __html: linkSvg }}
                  />
                )}
                <span>{link.title || "Untitled"}</span>
              </div>
            );
          })}
        </div>
        <div className={styles.previewFooter}>Powered by Firefly</div>
      </div>
    </div>
  );
}

export default function BioLinksPage() {
  const { activeProject } = useProject();
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState(null);
  const [editLinks, setEditLinks] = useState([]);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [createSlug, setCreateSlug] = useState("");
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  // Edit form fields
  const [editSlug, setEditSlug] = useState("");
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editTheme, setEditTheme] = useState({ preset: "default" });
  const [saving, setSaving] = useState(false);

  // Custom domain
  const [editDomain, setEditDomain] = useState("");
  const [domainVerified, setDomainVerified] = useState(false);
  const [domainSaving, setDomainSaving] = useState(false);
  const [domainVerifying, setDomainVerifying] = useState(false);
  const [domainError, setDomainError] = useState("");
  const [domainVerifyResult, setDomainVerifyResult] = useState(null);

  // Add link form
  const [newLinkType, setNewLinkType] = useState("");
  const [newLinkTitle, setNewLinkTitle] = useState("");
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const [addingLink, setAddingLink] = useState(false);

  // Inline edit link
  const [editingLinkId, setEditingLinkId] = useState(null);
  const [editLinkTitle, setEditLinkTitle] = useState("");
  const [editLinkUrl, setEditLinkUrl] = useState("");

  const [copied, setCopied] = useState(false);

  // ── Fetch pages ──
  const fetchPages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeProject) params.set("projectId", activeProject);
      const res = await fetch(`/api/bio-pages?${params}`);
      if (res.ok) {
        const json = await res.json();
        setPages(json.pages || []);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [activeProject]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  // ── Create bio page ──
  const handleCreate = useCallback(async () => {
    if (!createSlug.trim() || !createName.trim()) return;
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/bio-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: createSlug.trim().toLowerCase(),
          displayName: createName.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create bio page");
        setCreating(false);
        return;
      }

      setPages((prev) => [data, ...prev]);
      setCreateSlug("");
      setCreateName("");
      setShowCreate(false);
    } catch (err) {
      setError(err.message || "Failed to create bio page");
    } finally {
      setCreating(false);
    }
  }, [createSlug, createName]);

  // ── Open edit mode ──
  const openEdit = useCallback(async (pageId) => {
    try {
      const res = await fetch(`/api/bio-pages/${pageId}`);
      if (!res.ok) return;
      const data = await res.json();
      setEditingPage(data);
      setEditLinks(data.bio_links || []);
      setEditSlug(data.slug);
      setEditName(data.display_name);
      setEditBio(data.bio_text || "");
      setEditAvatar(data.avatar_url || "");
      setEditTheme(data.theme || { preset: "default" });
      setEditDomain(data.custom_domain || "");
      setDomainVerified(data.domain_verified || false);
      setDomainError("");
      setDomainVerifyResult(null);
    } catch {
      // Silent fail
    }
  }, []);

  // ── Save profile changes ──
  const handleSaveProfile = useCallback(async () => {
    if (!editingPage) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/bio-pages/${editingPage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: editSlug,
          displayName: editName,
          bioText: editBio,
          avatarUrl: editAvatar,
          theme: editTheme,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        setSaving(false);
        return;
      }

      setEditingPage((prev) => ({ ...prev, ...data }));
      setPages((prev) => prev.map((p) => (p.id === data.id ? { ...p, ...data } : p)));
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }, [editingPage, editSlug, editName, editBio, editAvatar, editTheme]);

  // ── Add link ──
  const handleAddLink = useCallback(async () => {
    if (!editingPage || !newLinkTitle.trim() || !newLinkUrl.trim()) return;
    setAddingLink(true);

    try {
      const res = await fetch(`/api/bio-pages/${editingPage.id}/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newLinkTitle.trim(),
          url: newLinkUrl.trim(),
          icon: newLinkType || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setEditLinks((prev) => [...prev, data]);
        setNewLinkType("");
        setNewLinkTitle("");
        setNewLinkUrl("");
      }
    } catch {
      // Silent fail
    } finally {
      setAddingLink(false);
    }
  }, [editingPage, newLinkTitle, newLinkUrl, newLinkType]);

  // ── Toggle link active ──
  const toggleLinkActive = useCallback(async (link) => {
    try {
      const res = await fetch(`/api/bio-pages/${editingPage.id}/links/${link.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !link.is_active }),
      });

      if (res.ok) {
        setEditLinks((prev) =>
          prev.map((l) => (l.id === link.id ? { ...l, is_active: !l.is_active } : l))
        );
      }
    } catch {
      // Silent fail
    }
  }, [editingPage]);

  // ── Delete link ──
  const handleDeleteLink = useCallback(async (linkId) => {
    if (!confirm("Delete this link?")) return;
    try {
      const res = await fetch(`/api/bio-pages/${editingPage.id}/links/${linkId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setEditLinks((prev) => prev.filter((l) => l.id !== linkId));
      }
    } catch {
      // Silent fail
    }
  }, [editingPage]);

  // ── Save inline link edit ──
  const handleSaveLinkEdit = useCallback(async (linkId) => {
    try {
      const res = await fetch(`/api/bio-pages/${editingPage.id}/links/${linkId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editLinkTitle, url: editLinkUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setEditLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, ...data } : l)));
        setEditingLinkId(null);
      }
    } catch {
      // Silent fail
    }
  }, [editingPage, editLinkTitle, editLinkUrl]);

  // ── Move link ──
  const moveLink = useCallback(async (index, direction) => {
    const swapIndex = index + direction;
    if (swapIndex < 0 || swapIndex >= editLinks.length) return;

    const newLinks = [...editLinks];
    [newLinks[index], newLinks[swapIndex]] = [newLinks[swapIndex], newLinks[index]];

    const order = newLinks.map((l, i) => ({ id: l.id, position: i }));
    setEditLinks(newLinks);

    try {
      await fetch(`/api/bio-pages/${editingPage.id}/links`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order }),
      });
    } catch {
      // Silent fail
    }
  }, [editLinks, editingPage]);

  // ── Save custom domain ──
  const handleSaveDomain = useCallback(async () => {
    if (!editingPage || !editDomain.trim()) return;
    setDomainSaving(true);
    setDomainError("");
    setDomainVerifyResult(null);

    try {
      const res = await fetch(`/api/bio-pages/${editingPage.id}/domain`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: editDomain.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        setDomainError(data.error || "Failed to save domain");
        setDomainSaving(false);
        return;
      }

      setEditDomain(data.custom_domain || "");
      setDomainVerified(data.domain_verified || false);
      setEditingPage((prev) => ({
        ...prev,
        custom_domain: data.custom_domain,
        domain_verified: data.domain_verified,
      }));
      setPages((prev) =>
        prev.map((p) =>
          p.id === editingPage.id
            ? { ...p, custom_domain: data.custom_domain, domain_verified: data.domain_verified }
            : p
        )
      );
    } catch (err) {
      setDomainError(err.message);
    } finally {
      setDomainSaving(false);
    }
  }, [editingPage, editDomain]);

  // ── Verify DNS ──
  const handleVerifyDomain = useCallback(async () => {
    if (!editingPage) return;
    setDomainVerifying(true);
    setDomainError("");
    setDomainVerifyResult(null);

    try {
      const res = await fetch(`/api/bio-pages/${editingPage.id}/domain`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setDomainError(data.error || "Verification failed");
        setDomainVerifying(false);
        return;
      }

      setDomainVerifyResult(data);
      if (data.verified) {
        setDomainVerified(true);
        setEditingPage((prev) => ({ ...prev, domain_verified: true }));
        setPages((prev) =>
          prev.map((p) =>
            p.id === editingPage.id ? { ...p, domain_verified: true } : p
          )
        );
      }
    } catch (err) {
      setDomainError(err.message);
    } finally {
      setDomainVerifying(false);
    }
  }, [editingPage]);

  // ── Remove custom domain ──
  const handleRemoveDomain = useCallback(async () => {
    if (!editingPage) return;
    if (!confirm("Remove custom domain from this bio page?")) return;
    setDomainSaving(true);
    setDomainError("");
    setDomainVerifyResult(null);

    try {
      const res = await fetch(`/api/bio-pages/${editingPage.id}/domain`, {
        method: "DELETE",
      });

      if (res.ok) {
        setEditDomain("");
        setDomainVerified(false);
        setEditingPage((prev) => ({
          ...prev,
          custom_domain: null,
          domain_verified: false,
        }));
        setPages((prev) =>
          prev.map((p) =>
            p.id === editingPage.id
              ? { ...p, custom_domain: null, domain_verified: false }
              : p
          )
        );
      }
    } catch (err) {
      setDomainError(err.message);
    } finally {
      setDomainSaving(false);
    }
  }, [editingPage]);

  // ── Delete bio page ──
  const handleDeletePage = useCallback(async (id) => {
    if (!confirm("Delete this bio page? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/bio-pages/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPages((prev) => prev.filter((p) => p.id !== id));
        if (editingPage?.id === id) {
          setEditingPage(null);
        }
      }
    } catch {
      // Silent fail
    }
  }, [editingPage]);

  const handleCopy = useCallback((slug, customDomain, isVerified) => {
    navigator.clipboard.writeText(getBioUrl(slug, customDomain, isVerified)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  // ── Select theme preset ──
  const selectPreset = useCallback((presetKey) => {
    const preset = BIO_THEME_PRESETS[presetKey];
    setEditTheme({
      preset: presetKey,
      bgColor: preset.bgColor,
      textColor: preset.textColor,
      buttonColor: preset.buttonColor,
      buttonTextColor: preset.buttonTextColor,
      buttonStyle: preset.buttonStyle,
    });
  }, []);

  // ── Render ──

  // Edit mode
  if (editingPage) {
    const previewPage = {
      displayName: editName,
      bioText: editBio,
      avatarSvg: editAvatar,
      theme: editTheme,
    };

    return (
      <>
        <div className={styles.headerRow}>
          <button className={styles.backBtn} onClick={() => setEditingPage(null)} type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Back
          </button>
          <h1 className={styles.heading}>Edit Bio Page</h1>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.editLayout}>
          <div className={styles.editMain}>
            {/* Profile Card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Profile</h3>
              <div className={styles.fieldGroup}>
                <div className={styles.inputField}>
                  <label>Slug</label>
                  <div className={styles.slugInput}>
                    <span className={styles.slugPrefix}>/bio/</span>
                    <input
                      type="text"
                      value={editSlug}
                      onChange={(e) => setEditSlug(e.target.value.toLowerCase())}
                    />
                  </div>
                </div>
                <div className={styles.inputField}>
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div className={styles.inputField}>
                  <label>Bio</label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="A short description about yourself..."
                  />
                </div>
                <div className={styles.inputField}>
                  <label>Avatar (SVG)</label>
                  <textarea
                    rows={4}
                    value={editAvatar}
                    onChange={(e) => setEditAvatar(e.target.value)}
                    placeholder='<svg viewBox="0 0 96 96">...</svg>'
                    className={styles.customSvgInput}
                  />
                  {editAvatar && (
                    <div className={styles.avatarSvgPreview}>
                      <div
                        className={styles.avatarPreview}
                        dangerouslySetInnerHTML={{ __html: editAvatar }}
                      />
                      <button
                        className={styles.clearAvatarBtn}
                        onClick={() => setEditAvatar("")}
                        type="button"
                      >
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <button
                className={styles.saveBtn}
                onClick={handleSaveProfile}
                disabled={saving}
                type="button"
              >
                {saving ? <span className={styles.spinner} /> : "Save Changes"}
              </button>
            </div>

            {/* Custom Domain Card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Custom Domain</h3>

              {domainError && <div className={styles.domainError}>{domainError}</div>}

              <div className={styles.inputField}>
                <label>Domain</label>
                <input
                  type="text"
                  placeholder="links.yourdomain.com"
                  value={editDomain}
                  onChange={(e) => setEditDomain(e.target.value.toLowerCase().trim())}
                />
              </div>

              {editingPage.custom_domain && (
                <div className={styles.domainStatus}>
                  {domainVerified ? (
                    <span className={styles.domainVerifiedBadge}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      Verified
                    </span>
                  ) : (
                    <span className={styles.domainPendingBadge}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                      </svg>
                      Not verified
                    </span>
                  )}
                </div>
              )}

              {editingPage.custom_domain && !domainVerified && (
                <div className={styles.dnsInstructions}>
                  <p className={styles.dnsText}>
                    Add a CNAME record in your DNS settings:
                  </p>
                  <div className={styles.dnsTable}>
                    <div className={styles.dnsRow}>
                      <span className={styles.dnsLabel}>Type</span>
                      <span className={styles.dnsValue}>CNAME</span>
                    </div>
                    <div className={styles.dnsRow}>
                      <span className={styles.dnsLabel}>Name</span>
                      <span className={styles.dnsValue}>
                        {editingPage.custom_domain.split(".")[0]}
                      </span>
                    </div>
                    <div className={styles.dnsRow}>
                      <span className={styles.dnsLabel}>Target</span>
                      <span className={styles.dnsValue}>
                        {process.env.NEXT_PUBLIC_APP_DOMAIN || "your-app-domain.com"}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {domainVerifyResult && !domainVerifyResult.verified && (
                <div className={styles.domainError}>
                  {domainVerifyResult.found
                    ? `CNAME points to "${domainVerifyResult.found}" but expected "${domainVerifyResult.expected}"`
                    : `No CNAME record found. Expected target: ${domainVerifyResult.expected}`}
                </div>
              )}

              {domainVerifyResult && domainVerifyResult.verified && (
                <div className={styles.domainSuccess}>
                  Domain verified successfully.
                </div>
              )}

              <div className={styles.domainActions}>
                {!editingPage.custom_domain || editDomain !== editingPage.custom_domain ? (
                  <button
                    className={styles.saveBtn}
                    onClick={handleSaveDomain}
                    disabled={domainSaving || !editDomain.trim()}
                    type="button"
                  >
                    {domainSaving ? <span className={styles.spinner} /> : "Save Domain"}
                  </button>
                ) : (
                  <>
                    {!domainVerified && (
                      <button
                        className={styles.verifyBtn}
                        onClick={handleVerifyDomain}
                        disabled={domainVerifying}
                        type="button"
                      >
                        {domainVerifying ? <span className={styles.spinner} /> : "Verify DNS"}
                      </button>
                    )}
                  </>
                )}
                {editingPage.custom_domain && (
                  <button
                    className={styles.cancelBtn}
                    onClick={handleRemoveDomain}
                    disabled={domainSaving}
                    type="button"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Theme Card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Theme</h3>
              <div className={styles.presetGrid}>
                {Object.entries(BIO_THEME_PRESETS).map(([key, preset]) => {
                  const bg = preset.bgColor;
                  const isGradient = bg.startsWith("linear-gradient");
                  return (
                    <button
                      key={key}
                      className={`${styles.presetBtn} ${editTheme.preset === key ? styles.presetActive : ""}`}
                      onClick={() => selectPreset(key)}
                      type="button"
                    >
                      <div
                        className={styles.presetSwatch}
                        style={isGradient ? { background: bg } : { backgroundColor: bg }}
                      >
                        <div
                          className={styles.presetSwatchBtn}
                          style={{ backgroundColor: preset.buttonColor }}
                        />
                      </div>
                      <span className={styles.presetLabel}>{preset.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.customColors}>
                <h4 className={styles.subTitle}>Custom Colors</h4>
                <div className={styles.colorRow}>
                  <label>Background</label>
                  <input
                    type="color"
                    value={editTheme.bgColor?.startsWith("#") ? editTheme.bgColor : "#0a0a0a"}
                    onChange={(e) => setEditTheme((t) => ({ ...t, bgColor: e.target.value, preset: "custom" }))}
                  />
                </div>
                <div className={styles.colorRow}>
                  <label>Text</label>
                  <input
                    type="color"
                    value={editTheme.textColor || "#ffffff"}
                    onChange={(e) => setEditTheme((t) => ({ ...t, textColor: e.target.value, preset: "custom" }))}
                  />
                </div>
                <div className={styles.colorRow}>
                  <label>Button</label>
                  <input
                    type="color"
                    value={editTheme.buttonColor || "#8fff00"}
                    onChange={(e) => setEditTheme((t) => ({ ...t, buttonColor: e.target.value, preset: "custom" }))}
                  />
                </div>
                <div className={styles.colorRow}>
                  <label>Button Text</label>
                  <input
                    type="color"
                    value={editTheme.buttonTextColor || "#0a0a0a"}
                    onChange={(e) => setEditTheme((t) => ({ ...t, buttonTextColor: e.target.value, preset: "custom" }))}
                  />
                </div>
              </div>

              <div className={styles.buttonStyleSection}>
                <h4 className={styles.subTitle}>Button Style</h4>
                <div className={styles.buttonStyleTabs}>
                  {BUTTON_STYLES.map((bs) => (
                    <button
                      key={bs}
                      className={`${styles.styleTab} ${(editTheme.buttonStyle || "filled") === bs ? styles.styleTabActive : ""}`}
                      onClick={() => setEditTheme((t) => ({ ...t, buttonStyle: bs }))}
                      type="button"
                    >
                      {bs}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className={styles.saveBtn}
                onClick={handleSaveProfile}
                disabled={saving}
                type="button"
              >
                {saving ? <span className={styles.spinner} /> : "Save Theme"}
              </button>
            </div>

            {/* Links Card */}
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Links</h3>

              {/* Add link form */}
              <div className={styles.addLinkForm}>
                <div className={styles.linkTypeGrid}>
                  {BIO_LINK_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      className={`${styles.linkTypeBtn} ${newLinkType === preset.key ? styles.linkTypeActive : ""}`}
                      onClick={() => {
                        setNewLinkType(preset.key);
                        if (!newLinkTitle) setNewLinkTitle(preset.label);
                        setNewLinkUrl("");
                      }}
                      type="button"
                      title={preset.label}
                    >
                      <span
                        className={styles.linkTypeIcon}
                        dangerouslySetInnerHTML={{ __html: preset.icon }}
                      />
                      <span className={styles.linkTypeLabel}>{preset.label}</span>
                    </button>
                  ))}
                </div>
                <div className={styles.addLinkRow}>
                  <input
                    type="text"
                    placeholder="Link title"
                    value={newLinkTitle}
                    onChange={(e) => setNewLinkTitle(e.target.value)}
                    className={styles.addLinkInput}
                  />
                  <input
                    type="text"
                    placeholder={
                      BIO_LINK_PRESETS.find((p) => p.key === newLinkType)?.placeholder || "https://..."
                    }
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    className={styles.addLinkInput}
                  />
                  <button
                    className={styles.addLinkBtn}
                    onClick={handleAddLink}
                    disabled={addingLink || !newLinkTitle.trim() || !newLinkUrl.trim()}
                    type="button"
                  >
                    {addingLink ? <span className={styles.spinner} /> : "Add"}
                  </button>
                </div>
              </div>

              {/* Links list */}
              <div className={styles.linksList}>
                {editLinks.map((link, index) => (
                  <div
                    key={link.id}
                    className={`${styles.linkItem} ${!link.is_active ? styles.linkInactive : ""}`}
                  >
                    {editingLinkId === link.id ? (
                      <div className={styles.linkEditRow}>
                        <input
                          type="text"
                          value={editLinkTitle}
                          onChange={(e) => setEditLinkTitle(e.target.value)}
                          className={styles.linkEditInput}
                          placeholder="Title"
                        />
                        <input
                          type="text"
                          value={editLinkUrl}
                          onChange={(e) => setEditLinkUrl(e.target.value)}
                          className={styles.linkEditInput}
                          placeholder="URL"
                        />
                        <button
                          className={styles.linkSaveBtn}
                          onClick={() => handleSaveLinkEdit(link.id)}
                          type="button"
                        >
                          Save
                        </button>
                        <button
                          className={styles.linkCancelBtn}
                          onClick={() => setEditingLinkId(null)}
                          type="button"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className={styles.linkReorder}>
                          <button
                            className={styles.reorderBtn}
                            onClick={() => moveLink(index, -1)}
                            disabled={index === 0}
                            type="button"
                            title="Move up"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                          </button>
                          <button
                            className={styles.reorderBtn}
                            onClick={() => moveLink(index, 1)}
                            disabled={index === editLinks.length - 1}
                            type="button"
                            title="Move down"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                        </div>
                        <div className={styles.linkInfo}>
                          <div className={styles.linkTitleRow}>
                            {link.icon && (() => {
                              const p = BIO_LINK_PRESETS.find((pr) => pr.key === link.icon);
                              const svg = p?.icon || link.icon;
                              return (
                                <span
                                  className={styles.linkItemIcon}
                                  dangerouslySetInnerHTML={{ __html: svg }}
                                />
                              );
                            })()}
                            <span className={styles.linkTitle}>{link.title}</span>
                          </div>
                          <div className={styles.linkUrl}>{link.url}</div>
                          <div className={styles.linkClicks}>{link.clicks || 0} clicks</div>
                        </div>
                        <div className={styles.linkActions}>
                          <button
                            className={`${styles.actionBtn} ${link.is_active ? styles.toggleActive : styles.toggleInactive}`}
                            onClick={() => toggleLinkActive(link)}
                            type="button"
                            title={link.is_active ? "Deactivate" : "Activate"}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              {link.is_active ? (
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              ) : (
                                <>
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                  <line x1="1" y1="1" x2="23" y2="23" />
                                </>
                              )}
                              {link.is_active && <circle cx="12" cy="12" r="3" />}
                            </svg>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.editAction}`}
                            onClick={() => {
                              setEditingLinkId(link.id);
                              setEditLinkTitle(link.title);
                              setEditLinkUrl(link.url);
                            }}
                            type="button"
                            title="Edit"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            className={`${styles.actionBtn} ${styles.deleteAction}`}
                            onClick={() => handleDeleteLink(link.id)}
                            type="button"
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {editLinks.length === 0 && (
                  <div className={styles.noLinks}>No links yet. Add your first link above.</div>
                )}
              </div>
            </div>
          </div>

          {/* Preview sidebar */}
          <div className={styles.editSidebar}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Preview</h3>
              <LivePreview page={previewPage} links={editLinks} />
            </div>

            <div className={styles.actionsRow}>
              <button
                className={styles.copyUrlBtn}
                onClick={() => handleCopy(editSlug, editingPage.custom_domain, domainVerified)}
                type="button"
              >
                {copied ? "Copied!" : "Copy URL"}
              </button>
              <a
                className={styles.viewLiveBtn}
                href={getBioUrl(editSlug, editingPage.custom_domain, domainVerified)}
                target="_blank"
                rel="noopener noreferrer"
              >
                View Live
              </a>
            </div>
          </div>
        </div>
      </>
    );
  }

  // List mode
  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Bio Links</h1>
        <button
          className={styles.createBtn}
          onClick={() => setShowCreate(true)}
          type="button"
        >
          + New Bio Page
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Create form */}
      {showCreate && (
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Create Bio Page</h3>
          <div className={styles.createFormRow}>
            <div className={styles.inputField}>
              <label>Slug</label>
              <div className={styles.slugInput}>
                <span className={styles.slugPrefix}>/bio/</span>
                <input
                  type="text"
                  placeholder="my-page"
                  value={createSlug}
                  onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                />
              </div>
            </div>
            <div className={styles.inputField}>
              <label>Display Name</label>
              <input
                type="text"
                placeholder="Your Name"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
              />
            </div>
          </div>
          <div className={styles.createFormActions}>
            <button
              className={styles.saveBtn}
              onClick={handleCreate}
              disabled={creating || !createSlug.trim() || !createName.trim()}
              type="button"
            >
              {creating ? <span className={styles.spinner} /> : "Create"}
            </button>
            <button
              className={styles.cancelBtn}
              onClick={() => { setShowCreate(false); setError(""); }}
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <div className={styles.loadingState}>Loading bio pages...</div>}

      {/* Empty */}
      {!loading && pages.length === 0 && !showCreate && (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </div>
          <div className={styles.emptyTitle}>No bio pages yet</div>
          <div className={styles.emptyText}>Create a link-in-bio page to share all your links in one place.</div>
        </div>
      )}

      {/* Pages list */}
      {!loading && pages.length > 0 && (
        <div className={styles.pagesList}>
          {pages.map((page) => (
            <div key={page.id} className={styles.pageCard}>
              <div className={styles.pageInfo}>
                <div className={styles.pageName}>{page.display_name}</div>
                <div className={styles.pageSlug}>
                  /bio/{page.slug}
                  {page.custom_domain && (
                    <span className={page.domain_verified ? styles.domainVerifiedBadge : styles.domainPendingBadge}>
                      {page.custom_domain}
                    </span>
                  )}
                </div>
                <div className={styles.pageMeta}>
                  <span>{page.views || 0} views</span>
                  <span>{page.bio_links?.[0]?.count || 0} links</span>
                  <span>{formatDate(page.created_at)}</span>
                </div>
              </div>
              <div className={styles.pageActions}>
                <button
                  className={`${styles.actionBtn} ${styles.editAction}`}
                  onClick={() => openEdit(page.id)}
                  type="button"
                  title="Edit"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <a
                  className={`${styles.actionBtn} ${styles.viewAction}`}
                  href={getBioUrl(page.slug, page.custom_domain, page.domain_verified)}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="View live"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                    <polyline points="15 3 21 3 21 9" />
                    <line x1="10" y1="14" x2="21" y2="3" />
                  </svg>
                </a>
                <button
                  className={`${styles.actionBtn} ${styles.deleteAction}`}
                  onClick={() => handleDeletePage(page.id)}
                  type="button"
                  title="Delete"
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
    </>
  );
}
