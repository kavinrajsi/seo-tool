"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  StarIcon,
  SearchIcon,
  BuildingIcon,
  MapPinIcon,
  MessageSquareIcon,
  SendIcon,
  LoaderIcon,
  AlertTriangleIcon,
  ExternalLinkIcon,
  PhoneIcon,
  GlobeIcon,
  KeyIcon,
  RefreshCwIcon,
  ChevronDownIcon,
  UserIcon,
  XIcon,
} from "lucide-react";

/* ── Tabs ─────────────────────────────────────────────────────────── */
const TABS = [
  { id: "business", label: "My Business Reviews", icon: BuildingIcon },
  { id: "places", label: "Search Any Business", icon: SearchIcon },
];

/* ── Star rendering ───────────────────────────────────────────────── */
function Stars({ rating, size = 14 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          size={size}
          className={n <= rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

/* ── Star breakdown bar ───────────────────────────────────────────── */
function StarBreakdown({ breakdown, total }) {
  return (
    <div className="space-y-1.5">
      {[5, 4, 3, 2, 1].map((star) => {
        const count = breakdown[star] || 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <div key={star} className="flex items-center gap-2 text-xs">
            <span className="w-3 text-right">{star}</span>
            <StarIcon size={10} className="text-amber-400 fill-amber-400" />
            <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-6 text-right text-muted-foreground">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Rating display ───────────────────────────────────────────────── */
function RatingOverview({ rating, total }) {
  return (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <p className="text-4xl font-bold">{rating?.toFixed(1) || "—"}</p>
        <Stars rating={Math.round(rating || 0)} size={16} />
        <p className="text-xs text-muted-foreground mt-1">{total || 0} reviews</p>
      </div>
    </div>
  );
}

/* ── Review card ──────────────────────────────────────────────────── */
function ReviewCard({ review, source, locationId, onReplySubmit }) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replying, setReplying] = useState(false);

  const name = source === "business" ? review.reviewer : review.authorName;
  const rating = source === "business" ? ratingToNumber(review.starRating) : review.rating;
  const text = source === "business" ? review.comment : review.text;
  const date = source === "business"
    ? new Date(review.createTime).toLocaleDateString()
    : review.relativeTime;

  async function handleReply() {
    if (!replyText.trim()) return;
    setReplying(true);
    try {
      await onReplySubmit(locationId, review.reviewId, replyText.trim());
      setShowReply(false);
      setReplyText("");
    } catch {
      // Error handled in parent
    } finally {
      setReplying(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
            <UserIcon size={16} className="text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">{name || "Anonymous"}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Stars rating={rating} size={12} />
              <span className="text-xs text-muted-foreground">{date}</span>
            </div>
          </div>
        </div>
      </div>

      {text && (
        <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{text}</p>
      )}

      {/* Existing reply */}
      {review.reply && (
        <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3">
          <p className="text-xs font-medium text-blue-400 mb-1">Owner&apos;s reply</p>
          <p className="text-xs text-muted-foreground">{review.reply.comment}</p>
        </div>
      )}

      {/* Reply button for business reviews */}
      {source === "business" && !review.reply && (
        <div className="mt-3">
          {!showReply ? (
            <button
              onClick={() => setShowReply(true)}
              className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <MessageSquareIcon size={12} />
              Reply
            </button>
          ) : (
            <div className="space-y-2">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write your reply…"
                rows={3}
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none resize-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleReply}
                  disabled={!replyText.trim() || replying}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 px-3 py-1.5 text-xs font-medium text-white transition-colors"
                >
                  {replying ? <LoaderIcon size={12} className="animate-spin" /> : <SendIcon size={12} />}
                  Send Reply
                </button>
                <button
                  onClick={() => { setShowReply(false); setReplyText(""); }}
                  className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                >
                  <XIcon size={12} />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ratingToNumber(starRating) {
  const map = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };
  return map[starRating] || 0;
}

/* ── Sentiment badge ──────────────────────────────────────────────── */
function SentimentBadge({ rating }) {
  if (rating >= 4) return <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Positive</span>;
  if (rating >= 3) return <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">Neutral</span>;
  return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">Negative</span>;
}

/* ── Filter buttons ───────────────────────────────────────────────── */
const FILTERS = [
  { label: "All", value: "all" },
  { label: "5★", value: 5 },
  { label: "4★", value: 4 },
  { label: "3★", value: 3 },
  { label: "2★", value: 2 },
  { label: "1★", value: 1 },
];

/* ════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function ReviewsPage() {
  const [tab, setTab] = useState("business");
  const [error, setError] = useState(null);

  // Business Profile state
  const [googleConnected, setGoogleConnected] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [locations, setLocations] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [businessReviews, setBusinessReviews] = useState(null);
  const [businessLoading, setBusinessLoading] = useState(false);

  // Places state
  const [placesApiKey, setPlacesApiKey] = useState("");
  const [savedPlacesKey, setSavedPlacesKey] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [placesDetail, setPlacesDetail] = useState(null);
  const [placesLoading, setPlacesLoading] = useState(false);

  // Shared
  const [filter, setFilter] = useState("all");
  const [history, setHistory] = useState([]);

  // Check Google connection + load saved Places key on mount
  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: tokenRow } = await supabase
          .from("google_tokens")
          .select("id")
          .eq("user_id", user.id)
          .single();

        setGoogleConnected(!!tokenRow);

        // Load saved Places API key
        const { data: prefRow } = await supabase
          .from("user_preferences")
          .select("places_api_key")
          .eq("user_id", user.id)
          .single();

        if (prefRow?.places_api_key) {
          setSavedPlacesKey(prefRow.places_api_key);
          setPlacesApiKey(prefRow.places_api_key);
        }

        // Load review history
        const { data: historyRows } = await supabase
          .from("google_reviews")
          .select("id, location_id, source, business_name, average_rating, total_reviews, fetched_at")
          .eq("user_id", user.id)
          .order("fetched_at", { ascending: false })
          .limit(10);

        if (historyRows) setHistory(historyRows);
      } catch { /* not logged in */ }
    })();
  }, []);

  /* ── Business Profile handlers ──────────────────────────────────── */
  async function loadAccounts() {
    setBusinessLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.needsReauth) {
          setError("Google Business Profile permission missing. Please reconnect: Settings → Disconnect Google → Reconnect.");
        } else {
          throw new Error(data.error);
        }
        return;
      }
      setAccounts(data.accounts || []);
      if (data.accounts?.length === 1) {
        setSelectedAccount(data.accounts[0]);
        loadLocations(data.accounts[0].name);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusinessLoading(false);
    }
  }

  async function loadLocations(accountName) {
    setBusinessLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: accountName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLocations(data.locations || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusinessLoading(false);
    }
  }

  async function loadBusinessReviews(location) {
    setBusinessLoading(true);
    setError(null);
    setSelectedLocation(location);
    try {
      const res = await fetch("/api/reviews/business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: selectedAccount.name, locationId: location.name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBusinessReviews(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusinessLoading(false);
    }
  }

  async function handleReplySubmit(locationId, reviewId, comment) {
    setError(null);
    try {
      const res = await fetch("/api/reviews/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locationId, reviewId, comment }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Refresh reviews
      if (selectedLocation) loadBusinessReviews(selectedLocation);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }

  /* ── Places API handlers ────────────────────────────────────────── */
  async function savePlacesKey() {
    if (!placesApiKey.trim()) return;
    setSavedPlacesKey(placesApiKey.trim());
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("user_preferences").upsert(
          { user_id: user.id, places_api_key: placesApiKey.trim(), updated_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
      }
    } catch { /* optional */ }
  }

  async function searchPlaces() {
    if (!searchQuery.trim()) return;
    setPlacesLoading(true);
    setError(null);
    setPlacesDetail(null);
    try {
      const res = await fetch("/api/reviews/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: savedPlacesKey || placesApiKey, query: searchQuery }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSearchResults(data.places || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacesLoading(false);
    }
  }

  async function loadPlaceDetails(placeId) {
    setPlacesLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/reviews/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: savedPlacesKey || placesApiKey, placeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPlacesDetail(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setPlacesLoading(false);
    }
  }

  /* ── Filter reviews helper ──────────────────────────────────────── */
  function getFilteredReviews(reviews, source) {
    if (filter === "all") return reviews;
    return reviews.filter((r) => {
      const rating = source === "business" ? ratingToNumber(r.starRating) : r.rating;
      return rating === filter;
    });
  }

  /* ── Render ─────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold">Google Reviews</h1>
          <p className="text-xs text-muted-foreground">Manage your business reviews & research competitors</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => { setTab(t.id); setError(null); }}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors ${
              tab === t.id
                ? "bg-primary/10 text-primary font-medium"
                : "text-muted-foreground hover:bg-muted/50"
            }`}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-400 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <AlertTriangleIcon size={14} />
          {error}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         TAB: MY BUSINESS REVIEWS
         ═══════════════════════════════════════════════════════════════ */}
      {tab === "business" && (
        <>
          {!googleConnected ? (
            <div className="max-w-lg mx-auto mt-8">
              <div className="rounded-xl border border-border bg-card p-8 text-center">
                <BuildingIcon size={32} className="mx-auto text-muted-foreground mb-4" />
                <h2 className="text-lg font-bold mb-2">Connect Google Account</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect your Google account to access your Business Profile reviews.
                  If you&apos;ve already connected for Analytics, you may need to reconnect to grant Business Profile permissions.
                </p>
                <a
                  href="/api/google/auth"
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  Connect Google
                </a>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Account / Location selectors */}
              {accounts.length === 0 && !businessLoading && (
                <button
                  onClick={loadAccounts}
                  className="flex items-center gap-2 rounded-lg bg-blue-500 hover:bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors"
                >
                  <BuildingIcon size={16} />
                  Load Business Accounts
                </button>
              )}

              {accounts.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  {/* Account selector */}
                  <div className="relative">
                    <select
                      value={selectedAccount?.name || ""}
                      onChange={(e) => {
                        const acc = accounts.find((a) => a.name === e.target.value);
                        setSelectedAccount(acc || null);
                        setLocations([]);
                        setSelectedLocation(null);
                        setBusinessReviews(null);
                        if (acc) loadLocations(acc.name);
                      }}
                      className="appearance-none rounded-lg border border-border bg-card pl-3 pr-8 py-1.5 text-sm outline-none"
                    >
                      <option value="">Select account</option>
                      {accounts.map((a) => (
                        <option key={a.name} value={a.name}>{a.accountName}</option>
                      ))}
                    </select>
                    <ChevronDownIcon size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  </div>

                  {/* Location selector */}
                  {locations.length > 0 && (
                    <div className="relative">
                      <select
                        value={selectedLocation?.name || ""}
                        onChange={(e) => {
                          const loc = locations.find((l) => l.name === e.target.value);
                          if (loc) loadBusinessReviews(loc);
                        }}
                        className="appearance-none rounded-lg border border-border bg-card pl-3 pr-8 py-1.5 text-sm outline-none"
                      >
                        <option value="">Select location</option>
                        {locations.map((l) => (
                          <option key={l.name} value={l.name}>
                            {l.title} — {l.address}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    </div>
                  )}

                  {selectedLocation && (
                    <button
                      onClick={() => loadBusinessReviews(selectedLocation)}
                      disabled={businessLoading}
                      className="rounded-lg border border-border p-1.5 hover:bg-muted/50 disabled:opacity-50 transition-colors"
                    >
                      <RefreshCwIcon size={16} className={businessLoading ? "animate-spin" : ""} />
                    </button>
                  )}
                </div>
              )}

              {businessLoading && (
                <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                  <LoaderIcon size={20} className="animate-spin" />
                  <span>Loading reviews…</span>
                </div>
              )}

              {!businessLoading && businessReviews && (
                <>
                  {/* Rating overview */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-center">
                      <RatingOverview
                        rating={businessReviews.averageRating}
                        total={businessReviews.totalReviewCount}
                      />
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="text-sm font-medium mb-3">Rating Distribution</h3>
                      <StarBreakdown
                        breakdown={businessReviews.reviews.reduce((acc, r) => {
                          const n = ratingToNumber(r.starRating);
                          acc[n] = (acc[n] || 0) + 1;
                          return acc;
                        }, {})}
                        total={businessReviews.reviews.length}
                      />
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="text-sm font-medium mb-3">Reply Status</h3>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Replied</span>
                          <span className="font-medium text-emerald-400">
                            {businessReviews.reviews.filter((r) => r.reply).length}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Pending</span>
                          <span className="font-medium text-amber-400">
                            {businessReviews.reviews.filter((r) => !r.reply).length}
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-400"
                            style={{
                              width: `${businessReviews.reviews.length > 0
                                ? (businessReviews.reviews.filter((r) => r.reply).length / businessReviews.reviews.length) * 100
                                : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Filter:</span>
                    {FILTERS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          filter === f.value
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Reviews list */}
                  <div className="space-y-3">
                    {getFilteredReviews(businessReviews.reviews, "business").map((r, i) => (
                      <ReviewCard
                        key={r.reviewId || i}
                        review={r}
                        source="business"
                        locationId={selectedLocation?.name}
                        onReplySubmit={handleReplySubmit}
                      />
                    ))}
                    {getFilteredReviews(businessReviews.reviews, "business").length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">No reviews match this filter.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════
         TAB: SEARCH ANY BUSINESS (Places API)
         ═══════════════════════════════════════════════════════════════ */}
      {tab === "places" && (
        <>
          {/* API key input */}
          {!savedPlacesKey && (
            <div className="max-w-lg mx-auto">
              <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-center gap-2 mb-4">
                  <KeyIcon size={20} className="text-amber-400" />
                  <h2 className="text-base font-bold">Google Places API Key</h2>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Enter your Google Places API key to search reviews for any business.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={placesApiKey}
                    onChange={(e) => setPlacesApiKey(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && savePlacesKey()}
                    placeholder="AIza..."
                    className="flex-1 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    onClick={savePlacesKey}
                    disabled={!placesApiKey.trim()}
                    className="rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 px-4 py-2 text-sm font-medium text-white transition-colors"
                  >
                    Save
                  </button>
                </div>
                <div className="mt-4 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">How to get your API key:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>Go to <strong>Google Cloud Console</strong> → APIs & Services</li>
                    <li>Enable <strong>Places API</strong></li>
                    <li>Create credentials → API Key</li>
                    <li>Paste it above</li>
                  </ol>
                </div>
              </div>
            </div>
          )}

          {savedPlacesKey && (
            <div className="space-y-4">
              {/* Search bar */}
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
                  <SearchIcon size={16} className="text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchPlaces()}
                    placeholder="Search business name & location (e.g. 'Pizza Hut New York')"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  onClick={searchPlaces}
                  disabled={!searchQuery.trim() || placesLoading}
                  className="flex items-center gap-2 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50 px-4 py-2 text-sm font-medium text-primary-foreground transition-colors"
                >
                  {placesLoading && !placesDetail ? <LoaderIcon size={14} className="animate-spin" /> : <SearchIcon size={14} />}
                  Search
                </button>
                <button
                  onClick={() => { setSavedPlacesKey(null); setPlacesApiKey(""); }}
                  className="rounded-lg border border-red-500/30 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Remove Key
                </button>
              </div>

              {/* Search results */}
              {searchResults.length > 0 && !placesDetail && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {searchResults.map((p) => (
                    <button
                      key={p.placeId}
                      onClick={() => loadPlaceDetails(p.placeId)}
                      className="text-left rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
                    >
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <MapPinIcon size={10} />
                        {p.address}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Stars rating={Math.round(p.rating)} size={10} />
                        <span className="text-xs text-muted-foreground">
                          {p.rating} ({p.totalRatings} reviews)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Loading detail */}
              {placesLoading && !searchResults.length && (
                <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
                  <LoaderIcon size={20} className="animate-spin" />
                  <span>Loading…</span>
                </div>
              )}

              {/* Place detail + reviews */}
              {placesDetail && (
                <>
                  <button
                    onClick={() => { setPlacesDetail(null); }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    ← Back to search results
                  </button>

                  {/* Business info card */}
                  <div className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-bold">{placesDetail.name}</h2>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPinIcon size={12} />
                          {placesDetail.address}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {placesDetail.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <PhoneIcon size={10} /> {placesDetail.phone}
                            </span>
                          )}
                          {placesDetail.website && (
                            <a
                              href={placesDetail.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 flex items-center gap-1 hover:underline"
                            >
                              <GlobeIcon size={10} /> Website
                            </a>
                          )}
                          {placesDetail.googleMapsUrl && (
                            <a
                              href={placesDetail.googleMapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 flex items-center gap-1 hover:underline"
                            >
                              <ExternalLinkIcon size={10} /> Google Maps
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <RatingOverview rating={placesDetail.rating} total={placesDetail.totalRatings} />
                      </div>
                    </div>
                  </div>

                  {/* Rating breakdown */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="text-sm font-medium mb-3">Rating Distribution</h3>
                      <StarBreakdown
                        breakdown={placesDetail.starBreakdown}
                        total={placesDetail.reviews.length}
                      />
                    </div>
                    <div className="rounded-xl border border-border bg-card p-5">
                      <h3 className="text-sm font-medium mb-3">Sentiment Overview</h3>
                      <div className="space-y-2">
                        {[
                          { label: "Positive (4-5★)", count: placesDetail.reviews.filter((r) => r.rating >= 4).length, color: "bg-emerald-400" },
                          { label: "Neutral (3★)", count: placesDetail.reviews.filter((r) => r.rating === 3).length, color: "bg-amber-400" },
                          { label: "Negative (1-2★)", count: placesDetail.reviews.filter((r) => r.rating <= 2).length, color: "bg-red-400" },
                        ].map((s) => (
                          <div key={s.label} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${s.color}`} />
                              <span className="text-muted-foreground">{s.label}</span>
                            </div>
                            <span className="font-medium">{s.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Filter */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Filter:</span>
                    {FILTERS.map((f) => (
                      <button
                        key={f.value}
                        onClick={() => setFilter(f.value)}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          filter === f.value
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground hover:bg-muted/50"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* Reviews */}
                  <div className="space-y-3">
                    {getFilteredReviews(placesDetail.reviews, "places").map((r, i) => (
                      <ReviewCard key={i} review={r} source="places" />
                    ))}
                    {getFilteredReviews(placesDetail.reviews, "places").length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">No reviews match this filter.</p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Review history ─────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="text-sm font-medium mb-3">Recent Lookups</h3>
          <div className="space-y-2">
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-sm rounded-lg border border-border px-3 py-2">
                <div className="flex items-center gap-2">
                  <SentimentBadge rating={h.average_rating} />
                  <span className="font-medium">{h.business_name || h.location_id}</span>
                  <span className="text-xs text-muted-foreground capitalize">({h.source?.replace("_", " ")})</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{h.average_rating?.toFixed(1)}★ · {h.total_reviews} reviews</span>
                  <span>{new Date(h.fetched_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
