"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import styles from "./page.module.css";

const CONTENT_TYPES = {
  blog_post: "Blog Post",
  ultimate_guide: "Ultimate Guide",
  listicle: "Listicle",
  case_study: "Case Study",
  how_to: "How-To Guide",
  comparison: "Comparison",
  other: "Other",
};

function formatDate(dateStr) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getStatusBadgeClass(status) {
  if (status === "in_progress") return styles.badgeInProgress;
  if (status === "completed") return styles.badgeCompleted;
  return styles.badgeDraft;
}

function getCardStatusClass(status) {
  if (status === "in_progress") return styles.briefCardInProgress;
  if (status === "completed") return styles.briefCardCompleted;
  return styles.briefCardDraft;
}

function statusLabel(status) {
  if (status === "in_progress") return "In Progress";
  if (status === "completed") return "Completed";
  return "Draft";
}

function briefToMarkdown(brief) {
  const lines = [];
  lines.push(`# ${brief.title}`);
  lines.push("");
  lines.push(`**Topic:** ${brief.topic}`);
  lines.push(`**Content Type:** ${CONTENT_TYPES[brief.content_type] || brief.content_type}`);
  lines.push(`**Target Audience:** ${brief.target_audience}`);
  lines.push(`**Recommended Word Count:** ${brief.recommended_word_count}`);
  lines.push(`**Status:** ${statusLabel(brief.status)}`);
  lines.push("");

  if (brief.target_keywords && brief.target_keywords.length > 0) {
    lines.push("## Target Keywords");
    lines.push("");
    for (const kw of brief.target_keywords) {
      lines.push(`- ${kw}`);
    }
    lines.push("");
  }

  if (brief.suggested_headings && brief.suggested_headings.length > 0) {
    lines.push("## Suggested Headings");
    lines.push("");
    for (const h of brief.suggested_headings) {
      lines.push(`### ${h.text}`);
      if (h.children && h.children.length > 0) {
        for (const c of h.children) {
          lines.push(`  - ${c.text}`);
        }
      }
    }
    lines.push("");
  }

  if (brief.competitor_notes && brief.competitor_notes.length > 0) {
    lines.push("## Competitor Analysis Notes");
    lines.push("");
    for (const note of brief.competitor_notes) {
      lines.push(`- ${note}`);
    }
    lines.push("");
  }

  if (brief.questions_to_answer && brief.questions_to_answer.length > 0) {
    lines.push("## Questions to Answer");
    lines.push("");
    brief.questions_to_answer.forEach((q, i) => {
      lines.push(`${i + 1}. ${q}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

export default function ContentBriefsPage() {
  const [briefs, setBriefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [formTopic, setFormTopic] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formContentType, setFormContentType] = useState("blog_post");
  const [formAudience, setFormAudience] = useState("");

  // Detail view state
  const [selectedBrief, setSelectedBrief] = useState(null);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const fetchBriefs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/content-briefs");
      if (res.ok) {
        const data = await res.json();
        setBriefs(data.briefs || []);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to load briefs");
      }
    } catch {
      setError("Network error");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBriefs();
  }, [fetchBriefs]);

  // Stats
  const stats = useMemo(() => {
    const total = briefs.length;
    const draft = briefs.filter((b) => b.status === "draft").length;
    const inProgress = briefs.filter((b) => b.status === "in_progress").length;
    const completed = briefs.filter((b) => b.status === "completed").length;
    return { total, draft, inProgress, completed };
  }, [briefs]);

  // Filtered briefs
  const filtered = useMemo(() => {
    return briefs.filter((b) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (b.title || "").toLowerCase().includes(q) ||
        (b.topic || "").toLowerCase().includes(q) ||
        (b.target_keywords || []).some((kw) => kw.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "all" || b.status === statusFilter;
      const matchesType = typeFilter === "all" || b.content_type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [briefs, search, statusFilter, typeFilter]);

  async function handleGenerate(e) {
    e.preventDefault();
    if (!formTopic.trim()) return;
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/content-briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: formTopic,
          targetKeywords: formKeywords,
          contentType: formContentType,
          targetAudience: formAudience,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setShowModal(false);
        setFormTopic("");
        setFormKeywords("");
        setFormContentType("blog_post");
        setFormAudience("");
        setSuccessMsg("Content brief generated successfully!");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchBriefs();
        // Open the newly created brief
        if (data.brief) {
          setSelectedBrief(data.brief);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to generate brief");
      }
    } catch {
      setError("Network error");
    }
    setGenerating(false);
  }

  async function handleStatusChange(briefId, newStatus) {
    try {
      const res = await fetch(`/api/content-briefs/${briefId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        if (selectedBrief && selectedBrief.id === briefId) {
          setSelectedBrief(data.brief);
        }
        fetchBriefs();
      }
    } catch {
      setError("Network error");
    }
  }

  async function handleDelete(briefId) {
    if (!confirm("Delete this content brief?")) return;
    try {
      const res = await fetch(`/api/content-briefs/${briefId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedBrief && selectedBrief.id === briefId) {
          setSelectedBrief(null);
        }
        fetchBriefs();
        setSuccessMsg("Brief deleted.");
        setTimeout(() => setSuccessMsg(""), 3000);
      }
    } catch {
      setError("Network error");
    }
  }

  function handleCopyMarkdown(brief) {
    const md = briefToMarkdown(brief);
    navigator.clipboard.writeText(md).then(() => {
      setSuccessMsg("Brief copied to clipboard as Markdown!");
      setTimeout(() => setSuccessMsg(""), 3000);
    });
  }

  // Loading skeleton
  if (loading) {
    const s = {
      background:
        "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s infinite",
      borderRadius: "8px",
    };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("260px", "28px", "0.5rem")} />
        <div style={b("450px", "14px", "2rem")} />
        <div className={styles.statsGrid}>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className={styles.statCard}>
              <div style={b("60%", "12px", "0.5rem")} />
              <div style={b("40%", "28px")} />
            </div>
          ))}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <div style={b("180px", "20px")} />
          </div>
          <div className={styles.briefGrid}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  ...s,
                  width: "100%",
                  height: "140px",
                  borderRadius: "var(--radius-md)",
                }}
              />
            ))}
          </div>
        </div>
      </>
    );
  }

  // Detail view
  if (selectedBrief) {
    const brief = selectedBrief;
    return (
      <>
        <button
          className={styles.backBtn}
          onClick={() => setSelectedBrief(null)}
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Briefs
        </button>

        {error && <div className={styles.error}>{error}</div>}
        {successMsg && (
          <div className={styles.success} onClick={() => setSuccessMsg("")}>
            {successMsg}
          </div>
        )}

        <div className={styles.briefDetail}>
          <div className={styles.briefDetailHeader}>
            <div>
              <h1 className={styles.briefDetailTitle}>{brief.title}</h1>
              <p className={styles.briefDetailTopic}>
                Topic: {brief.topic} &middot;{" "}
                {CONTENT_TYPES[brief.content_type] || brief.content_type} &middot;{" "}
                {brief.target_audience}
              </p>
            </div>
            <div className={styles.briefDetailActions}>
              <span className={`${styles.badge} ${getStatusBadgeClass(brief.status)}`}>
                {statusLabel(brief.status)}
              </span>
              <button
                className={styles.copyBtn}
                onClick={() => handleCopyMarkdown(brief)}
                type="button"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy as Markdown
              </button>
              <button
                className={`${styles.btn} ${styles.btnDanger} ${styles.btnSmall}`}
                onClick={() => handleDelete(brief.id)}
                type="button"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </button>
            </div>
          </div>

          {/* Status change buttons */}
          <div className={styles.briefSection}>
            <div className={styles.briefSectionTitle}>Status</div>
            <div className={styles.statusButtons}>
              <button
                type="button"
                className={`${styles.statusBtn} ${brief.status === "draft" ? styles.statusBtnActive : ""}`}
                onClick={() => handleStatusChange(brief.id, "draft")}
              >
                Draft
              </button>
              <button
                type="button"
                className={`${styles.statusBtn} ${brief.status === "in_progress" ? styles.statusBtnActive : ""}`}
                onClick={() => handleStatusChange(brief.id, "in_progress")}
              >
                In Progress
              </button>
              <button
                type="button"
                className={`${styles.statusBtn} ${brief.status === "completed" ? styles.statusBtnActive : ""}`}
                onClick={() => handleStatusChange(brief.id, "completed")}
              >
                Completed
              </button>
            </div>
          </div>

          {/* Target Keywords */}
          {brief.target_keywords && brief.target_keywords.length > 0 && (
            <div className={styles.briefSection}>
              <div className={styles.briefSectionTitle}>Target Keywords</div>
              <div className={styles.tagsContainer}>
                {brief.target_keywords.map((kw, i) => (
                  <span key={i} className={styles.tagKeyword}>
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Word Count */}
          <div className={styles.briefSection}>
            <div className={styles.briefSectionTitle}>Recommended Word Count</div>
            <div className={styles.wordCountRange}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              {brief.recommended_word_count}
            </div>
          </div>

          {/* Suggested Headings */}
          {brief.suggested_headings && brief.suggested_headings.length > 0 && (
            <div className={styles.briefSection}>
              <div className={styles.briefSectionTitle}>Suggested Headings</div>
              <ul className={styles.headingTree}>
                {brief.suggested_headings.map((h, i) => (
                  <li key={i}>
                    <div className={styles.headingH2}>{h.text}</div>
                    {h.children &&
                      h.children.map((c, j) => (
                        <div key={j} className={styles.headingH3}>
                          {c.text}
                        </div>
                      ))}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Competitor Analysis Notes */}
          {brief.competitor_notes && brief.competitor_notes.length > 0 && (
            <div className={styles.briefSection}>
              <div className={styles.briefSectionTitle}>Competitor Analysis Notes</div>
              <ul className={styles.competitorList}>
                {brief.competitor_notes.map((note, i) => (
                  <li key={i} className={styles.competitorItem}>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Questions to Answer */}
          {brief.questions_to_answer && brief.questions_to_answer.length > 0 && (
            <div className={styles.briefSection}>
              <div className={styles.briefSectionTitle}>Questions to Answer</div>
              <ol className={styles.questionList}>
                {brief.questions_to_answer.map((q, i) => (
                  <li key={i} className={styles.questionItem}>
                    {q}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </>
    );
  }

  // Main list view
  return (
    <>
      <div className={styles.headerRow}>
        <h1 className={styles.heading}>Content Brief Generator</h1>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => setShowModal(true)}
          type="button"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Generate Brief
        </button>
      </div>
      <p className={styles.subheading}>
        Auto-generate detailed content briefs with target keywords, headings, word count,
        competitor analysis, and questions to answer for writers.
      </p>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && (
        <div className={styles.success} onClick={() => setSuccessMsg("")}>
          {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Briefs</div>
          <div className={styles.statValue}>{stats.total}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Draft</div>
          <div className={styles.statValue} style={{ color: stats.draft > 0 ? "var(--color-warning)" : undefined }}>
            {stats.draft}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>In Progress</div>
          <div className={styles.statValue} style={{ color: stats.inProgress > 0 ? "#3b82f6" : undefined }}>
            {stats.inProgress}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Completed</div>
          <div className={`${styles.statValue} ${stats.completed > 0 ? styles.accent : ""}`}>
            {stats.completed}
          </div>
        </div>
      </div>

      {/* Briefs section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Briefs ({filtered.length})</h2>
          <div className={styles.sectionActions}>
            <button
              className={`${styles.btn} ${styles.btnSecondary}`}
              onClick={fetchBriefs}
              type="button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search briefs..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="draft">Draft</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {Object.entries(CONTENT_TYPES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <svg
              className={styles.emptyIcon}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <p>
              {briefs.length === 0
                ? "No content briefs yet. Click \"Generate Brief\" to create your first one."
                : "No briefs match your filters."}
            </p>
          </div>
        ) : (
          <div className={styles.briefGrid}>
            {filtered.map((brief) => (
              <div
                key={brief.id}
                className={`${styles.briefCard} ${getCardStatusClass(brief.status)}`}
                onClick={() => setSelectedBrief(brief)}
              >
                <div className={styles.briefCardHeader}>
                  <h3 className={styles.briefCardTitle}>{brief.title}</h3>
                  <span className={`${styles.badge} ${getStatusBadgeClass(brief.status)}`}>
                    {statusLabel(brief.status)}
                  </span>
                </div>
                <div className={styles.briefCardTopic}>{brief.topic}</div>
                <div className={styles.briefCardMeta}>
                  <span className={styles.typeBadge}>
                    {CONTENT_TYPES[brief.content_type] || brief.content_type}
                  </span>
                  <span className={styles.tag}>
                    {(brief.target_keywords || []).length} keywords
                  </span>
                  <span className={styles.tag}>{brief.recommended_word_count}</span>
                </div>
                <div className={styles.briefCardDate}>{formatDate(brief.created_at)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Brief Modal */}
      {showModal && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Generate Content Brief</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowModal(false)}
                type="button"
                aria-label="Close"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleGenerate}>
              <div className={styles.modalBody}>
                <div className={styles.form}>
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Topic <span className={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g., Technical SEO for eCommerce Sites"
                      value={formTopic}
                      onChange={(e) => setFormTopic(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Target Keywords</label>
                    <textarea
                      className={styles.textarea}
                      placeholder="Enter keywords separated by commas, e.g., technical seo, ecommerce seo, site speed"
                      value={formKeywords}
                      onChange={(e) => setFormKeywords(e.target.value)}
                      rows={3}
                    />
                    <span className={styles.hint}>
                      Leave empty to auto-derive keywords from the topic.
                    </span>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Content Type</label>
                    <select
                      className={styles.select}
                      value={formContentType}
                      onChange={(e) => setFormContentType(e.target.value)}
                    >
                      {Object.entries(CONTENT_TYPES).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Target Audience</label>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="e.g., Marketing managers, Small business owners"
                      value={formAudience}
                      onChange={(e) => setFormAudience(e.target.value)}
                    />
                    <span className={styles.hint}>
                      Defaults to &quot;General audience&quot; if left empty.
                    </span>
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
                  disabled={generating || !formTopic.trim()}
                >
                  {generating ? "Generating..." : "Generate Brief"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
