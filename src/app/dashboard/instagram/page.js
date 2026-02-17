"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useProjectFetch } from "@/app/hooks/useProjectFetch";
import styles from "./page.module.css";

export default function InstagramPage() {
  const { projectFetch, activeProjectId } = useProjectFetch();
  const [connected, setConnected] = useState(false);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedPost, setSelectedPost] = useState(null);

  const loadData = useCallback(async () => {
    try {
      const [profileRes, postsRes] = await Promise.all([
        projectFetch(`/api/instagram/profile`),
        projectFetch(`/api/instagram/posts`),
      ]);

      if (profileRes.ok) {
        setProfile(await profileRes.json());
      }

      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData.posts || []);
        setStats(postsData.stats);
      }
    } catch {
      setError("Failed to load Instagram data");
    }
  }, [projectFetch]);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await projectFetch("/api/instagram/status");
      if (res.ok) {
        const data = await res.json();
        setConnected(data.connected);
        if (data.connected) {
          await loadData();
        }
      }
    } catch {
      setError("Failed to check connection status");
    }
    setLoading(false);
  }, [projectFetch, loadData]);

  useEffect(() => {
    checkStatus(); // eslint-disable-line react-hooks/set-state-in-effect -- data fetching on mount
  }, [checkStatus]);

  function getMediaTypeBadge(type) {
    switch (type) {
      case "IMAGE": return styles.mediaTypeImage;
      case "VIDEO": return styles.mediaTypeVideo;
      case "CAROUSEL_ALBUM": return styles.mediaTypeCarousel;
      default: return styles.mediaTypeImage;
    }
  }

  function formatMediaType(type) {
    switch (type) {
      case "IMAGE": return "Image";
      case "VIDEO": return "Video";
      case "CAROUSEL_ALBUM": return "Carousel";
      default: return type;
    }
  }

  const filteredPosts = posts.filter((p) => {
    const matchesSearch = (p.caption?.toLowerCase() || "").includes(search.toLowerCase());
    const matchesType = typeFilter === "all" || p.mediaType === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    const s = { background: "linear-gradient(90deg, var(--color-bg-secondary) 25%, rgba(255,255,255,0.06) 50%, var(--color-bg-secondary) 75%)", backgroundSize: "200% 100%", animation: "shimmer 1.5s infinite", borderRadius: "8px" };
    const b = (w, h = "14px", mb = "0") => ({ ...s, width: w, height: h, marginBottom: mb });
    return (
      <>
        <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={b("140px", "28px", "0.5rem")} />
        <div style={b("300px", "14px", "1.5rem")} />
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", padding: "1.5rem", background: "var(--color-bg-secondary)", borderRadius: "12px", border: "1px solid var(--color-border)", marginBottom: "2rem" }}>
          <div style={{ ...s, width: "64px", height: "64px", borderRadius: "50%" }} />
          <div style={{ flex: 1 }}>
            <div style={b("160px", "20px", "0.5rem")} />
            <div style={b("250px", "14px", "0.5rem")} />
            <div style={{ display: "flex", gap: "1.5rem" }}>
              <div style={b("80px", "14px")} />
              <div style={b("80px", "14px")} />
            </div>
          </div>
        </div>
        <div className={styles.statsGrid}>
          {[1,2,3,4].map(i => <div key={i} className={styles.statCard}><div style={b("60%", "12px", "0.5rem")} /><div style={b("40%", "28px")} /></div>)}
        </div>
        <div className={styles.section}>
          <div className={styles.sectionHeader}><div style={b("180px", "20px")} /></div>
          <div className={styles.itemsGrid}>
            {[1,2,3,4,5,6].map(i => <div key={i} style={{ ...s, height: "280px", borderRadius: "8px" }} />)}
          </div>
        </div>
      </>
    );
  }

  if (!connected) {
    return (
      <>
        <h1 className={styles.heading}>Instagram</h1>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}
        <div className={styles.connectPrompt}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: "#e1306c", marginBottom: "1rem" }}>
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
          </svg>
          <h2 style={{ color: "var(--color-text)", margin: "0 0 0.5rem" }}>Connect Your Instagram Account</h2>
          <p>Link your Instagram Business or Creator account from Settings to view your content, engagement metrics, and analytics.</p>
          <Link href="/dashboard/settings" className={styles.connectBtn}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Go to Settings
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 className={styles.heading}>Instagram</h1>
          <p className={styles.subheading}>View your Instagram content and engagement metrics.</p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={loadData}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Refresh
          </button>
          <Link href="/dashboard/settings" className={`${styles.btn} ${styles.btnSecondary}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Profile Card */}
      {profile && (
        <div className={styles.profileCard}>
          {profile.profilePictureUrl ? (
            <Image src={profile.profilePictureUrl} alt={profile.username} width={64} height={64} unoptimized className={styles.profileAvatar} />
          ) : (
            <div className={styles.profileAvatarPlaceholder}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          )}
          <div className={styles.profileDetails}>
            <h2 className={styles.profileUsername}>@{profile.username}</h2>
            {profile.biography && <p className={styles.profileBio}>{profile.biography}</p>}
            <div className={styles.profileStats}>
              <span className={styles.profileStatItem}>
                <strong>{(profile.followersCount || 0).toLocaleString()}</strong> followers
              </span>
              <span className={styles.profileStatItem}>
                <strong>{(profile.followsCount || 0).toLocaleString()}</strong> following
              </span>
              <span className={styles.profileStatItem}>
                <strong>{(profile.mediaCount || 0).toLocaleString()}</strong> posts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {stats && (
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Posts</div>
            <div className={styles.statValue}>{stats.totalPosts}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Likes</div>
            <div className={`${styles.statValue} ${styles.accent}`}>{stats.totalLikes.toLocaleString()}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Total Comments</div>
            <div className={styles.statValue}>{stats.totalComments.toLocaleString()}</div>
          </div>
          <div className={styles.statCard}>
            <div className={styles.statLabel}>Avg Engagement</div>
            <div className={styles.statValue}>{stats.avgEngagement}</div>
          </div>
        </div>
      )}

      {/* Posts Section */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Posts ({filteredPosts.length})</h2>
        </div>

        <div className={styles.toolbar}>
          <input
            type="text"
            placeholder="Search by caption..."
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
            <option value="CAROUSEL_ALBUM">Carousel</option>
          </select>
        </div>

        {filteredPosts.length === 0 ? (
          <div className={styles.emptyState}>
            <svg className={styles.emptyIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
            </svg>
            <p>No posts found.</p>
          </div>
        ) : (
          <div className={styles.itemsGrid}>
            {filteredPosts.map((post) => (
              <div key={post.id} className={styles.itemCard} onClick={() => setSelectedPost(post)}>
                {(post.mediaType === "VIDEO" ? post.thumbnailUrl : post.mediaUrl) ? (
                  <Image
                    src={post.mediaType === "VIDEO" ? (post.thumbnailUrl || post.mediaUrl) : post.mediaUrl}
                    alt={post.caption?.slice(0, 50) || "Instagram post"}
                    width={400}
                    height={400}
                    unoptimized
                    className={styles.itemImage}
                  />
                ) : (
                  <div className={styles.itemImagePlaceholder}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                )}
                <div className={styles.itemInfo}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                    <span className={`${styles.mediaTypeBadge} ${getMediaTypeBadge(post.mediaType)}`}>
                      {formatMediaType(post.mediaType)}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                      {new Date(post.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  {post.caption && (
                    <p className={styles.itemTitle} title={post.caption}>
                      {post.caption.length > 80 ? post.caption.slice(0, 80) + "..." : post.caption}
                    </p>
                  )}
                  <div className={styles.metricsRow}>
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                      {post.likeCount.toLocaleString()}
                    </span>
                    <span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                      {post.commentsCount.toLocaleString()}
                    </span>
                    {post.reach > 0 && (
                      <span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                        {post.reach.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Post Detail Modal */}
      {selectedPost && (
        <div className={styles.modalOverlay} onClick={() => setSelectedPost(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Post Details</h3>
              <button className={styles.modalClose} onClick={() => setSelectedPost(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className={styles.modalBody}>
              {selectedPost.mediaUrl && (
                selectedPost.mediaType === "VIDEO" ? (
                  <video
                    src={selectedPost.mediaUrl}
                    controls
                    style={{ width: "100%", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}
                  />
                ) : (
                  <Image
                    src={selectedPost.mediaUrl}
                    alt="Post"
                    width={800}
                    height={800}
                    unoptimized
                    style={{ width: "100%", height: "auto", borderRadius: "var(--radius-md)", marginBottom: "1rem" }}
                  />
                )
              )}

              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
                <span className={`${styles.mediaTypeBadge} ${getMediaTypeBadge(selectedPost.mediaType)}`}>
                  {formatMediaType(selectedPost.mediaType)}
                </span>
                <span style={{ fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                  {new Date(selectedPost.timestamp).toLocaleString()}
                </span>
              </div>

              {selectedPost.caption && (
                <p style={{ fontSize: "0.875rem", color: "var(--color-text)", lineHeight: 1.6, marginBottom: "1rem", whiteSpace: "pre-wrap" }}>
                  {selectedPost.caption}
                </p>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.75rem" }}>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Likes</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)" }}>{selectedPost.likeCount.toLocaleString()}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Comments</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)" }}>{selectedPost.commentsCount.toLocaleString()}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Impressions</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)" }}>{selectedPost.impressions.toLocaleString()}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Reach</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)" }}>{selectedPost.reach.toLocaleString()}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Saved</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-text)" }}>{selectedPost.saved.toLocaleString()}</div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statLabel}>Engagement</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--color-accent)" }}>{selectedPost.engagement.toLocaleString()}</div>
                </div>
              </div>

              {selectedPost.permalink && (
                <a
                  href={selectedPost.permalink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", marginTop: "1rem", fontSize: "0.875rem", color: "var(--color-accent)" }}
                >
                  View on Instagram
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
