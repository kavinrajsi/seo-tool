"use client";

import { useState, useEffect } from "react";
import styles from "../page.module.css";

export default function TagsPage() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    setLoading(true);
    try {
      const res = await fetch("/api/ecommerce/tags");
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch {
      setError("Failed to load tags");
    }
    setLoading(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newTag.trim()) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/ecommerce/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTag.trim() }),
      });

      if (res.ok) {
        setNewTag("");
        loadTags();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create tag");
      }
    } catch {
      setError("Network error");
    }
    setSaving(false);
  }

  async function handleDelete(id) {
    try {
      const res = await fetch(`/api/ecommerce/tags/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadTags();
      }
    } catch {
      setError("Failed to delete tag");
    }
  }

  if (loading) {
    return <div className={styles.page}><p className={styles.loading}>Loading...</p></div>;
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Tags</h1>
      <p className={styles.subheading}>Manage product tags for better organization.</p>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Add New Tag</h2>
        </div>

        <form onSubmit={handleAdd} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
          <div className={styles.field} style={{ flex: 1, marginBottom: 0 }}>
            <label className={styles.label}>Tag Name</label>
            <input
              type="text"
              className={styles.input}
              placeholder="Enter tag name..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={saving || !newTag.trim()}
          >
            {saving ? "Adding..." : "Add Tag"}
          </button>
        </form>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>All Tags ({tags.length})</h2>
        </div>

        {tags.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <p>No tags yet. Add your first tag above.</p>
          </div>
        ) : (
          <div className={styles.tagsContainer}>
            {tags.map((tag) => (
              <span key={tag.id} className={styles.tag}>
                {tag.name}
                <button
                  className={styles.tagRemove}
                  onClick={() => handleDelete(tag.id)}
                  title="Remove tag"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {tag.product_count > 0 && (
                  <span style={{ opacity: 0.7, marginLeft: "0.25rem" }}>({tag.product_count})</span>
                )}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
