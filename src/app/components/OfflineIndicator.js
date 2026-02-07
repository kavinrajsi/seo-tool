"use client";

import { useState, useEffect, useCallback } from "react";
import styles from "./OfflineIndicator.module.css";

export default function OfflineIndicator() {
  const [wasOffline, setWasOffline] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [bannerType, setBannerType] = useState(null);
  const [queueCount, setQueueCount] = useState(0);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const requestQueueCount = useCallback(() => {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "GET_QUEUE_COUNT" });
    }
  }, []);

  useEffect(() => {
    const handleOffline = () => {
      setWasOffline(true);
      setBannerType("offline");
      setShowBanner(true);
      requestQueueCount();
    };

    const handleOnline = () => {
      // Only show "Back online" if the user was actually offline
      setWasOffline((prev) => {
        if (prev) {
          setBannerType("online");
          setShowBanner(true);
          setTimeout(() => setShowBanner(false), 3000);
        }
        return false;
      });
    };

    // Check initial state — only show if genuinely offline at mount
    if (!navigator.onLine) {
      setWasOffline(true);
      setBannerType("offline");
      setShowBanner(true);
    }

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [requestQueueCount]);

  // Listen for SW messages bridged as window events
  useEffect(() => {
    const handleQueued = (e) => {
      addToast(`Saved offline: ${e.detail.method} ${e.detail.url}`, "queued");
      setQueueCount((c) => c + 1);
    };

    const handleSynced = (e) => {
      addToast(`Synced: ${e.detail.method} ${e.detail.url}`, "synced");
      setQueueCount((c) => Math.max(0, c - 1));
    };

    const handleFailed = (e) => {
      addToast(`Failed to sync: ${e.detail.method} ${e.detail.url}`, "failed");
      setQueueCount((c) => Math.max(0, c - 1));
    };

    const handleQueueCount = (e) => {
      setQueueCount(e.detail.count);
    };

    window.addEventListener("sw-mutation-queued", handleQueued);
    window.addEventListener("sw-mutation-synced", handleSynced);
    window.addEventListener("sw-mutation-failed", handleFailed);
    window.addEventListener("sw-queue-count", handleQueueCount);

    return () => {
      window.removeEventListener("sw-mutation-queued", handleQueued);
      window.removeEventListener("sw-mutation-synced", handleSynced);
      window.removeEventListener("sw-mutation-failed", handleFailed);
      window.removeEventListener("sw-queue-count", handleQueueCount);
    };
  }, [addToast]);

  if (!showBanner && toasts.length === 0) return null;

  return (
    <>
      {showBanner && (
        <div
          className={`${styles.banner} ${
            bannerType === "offline" ? styles.bannerOffline : styles.bannerOnline
          }`}
          role="status"
          aria-live="polite"
        >
          <span className={styles.bannerIcon}>
            {bannerType === "offline" ? "⚠" : "✓"}
          </span>
          <span className={styles.bannerText}>
            {bannerType === "offline"
              ? "You are offline"
              : "Back online"}
            {bannerType === "offline" && queueCount > 0 && (
              <span className={styles.queueBadge}>
                {queueCount} pending
              </span>
            )}
          </span>
          {bannerType === "offline" && (
            <button
              className={styles.bannerDismiss}
              onClick={() => setShowBanner(false)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
      )}

      {toasts.length > 0 && (
        <div className={styles.toastContainer} aria-live="polite">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`${styles.toast} ${styles[`toast_${toast.type}`]}`}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
