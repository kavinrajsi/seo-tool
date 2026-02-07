"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./ServiceWorkerRegister.module.css";

export default function ServiceWorkerRegister() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  const handleUpdate = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
      setUpdateAvailable(false);
      window.location.reload();
    }
  }, [waitingWorker]);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") {
      return;
    }

    // --- Register SW ---
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered:", registration.scope);

        // Check for waiting worker on load (e.g. user refreshed while update pending)
        if (registration.waiting) {
          setWaitingWorker(registration.waiting);
          setUpdateAvailable(true);
        }

        // Detect new updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New SW installed but waiting to activate
              setWaitingWorker(newWorker);
              setUpdateAvailable(true);
            }
          });
        });
      })
      .catch((error) => {
        console.log("SW registration failed:", error);
      });

    // --- Bridge SW messages to window events ---
    const handleMessage = (event) => {
      const { type, ...data } = event.data || {};

      const eventMap = {
        SW_MUTATION_QUEUED: "sw-mutation-queued",
        SW_MUTATION_SYNCED: "sw-mutation-synced",
        SW_MUTATION_FAILED: "sw-mutation-failed",
        QUEUE_COUNT: "sw-queue-count",
      };

      const windowEvent = eventMap[type];
      if (windowEvent) {
        window.dispatchEvent(new CustomEvent(windowEvent, { detail: data }));
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    // --- Send online status changes to SW ---
    const handleOnline = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "ONLINE_STATUS_CHANGED",
          online: true,
        });
      }
      // Try Background Sync registration as well
      navigator.serviceWorker.ready.then((registration) => {
        if (registration.sync) {
          registration.sync.register("mutation-queue-sync").catch(() => {
            // Background Sync not supported — SW message fallback already sent
          });
        }
      });
    };

    const handleOffline = () => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "ONLINE_STATUS_CHANGED",
          online: false,
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!updateAvailable) return null;

  return (
    <div className={styles.updateBanner} role="alert">
      <span>A new version is available.</span>
      <button className={styles.updateButton} onClick={handleUpdate}>
        Update
      </button>
    </div>
  );
}
