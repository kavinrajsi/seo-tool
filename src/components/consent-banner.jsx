"use client";

import { useState, useEffect } from "react";
import { CookieIcon, ShieldCheckIcon, XIcon, SettingsIcon } from "lucide-react";

const COOKIE_NAME = "cookie_consent";
const COOKIE_MAX_AGE = 365 * 24 * 60 * 60; // 1 year

function getCookie(name) {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? match[1] : null;
}

function setCookie(name, value) {
  document.cookie = `${name}=${value}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function updateConsent(granted) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: granted ? "granted" : "denied",
    ad_storage: granted ? "granted" : "denied",
    ad_user_data: granted ? "granted" : "denied",
    ad_personalization: granted ? "granted" : "denied",
    personalization_storage: granted ? "granted" : "denied",
  });
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = getCookie(COOKIE_NAME);
    if (!consent) setVisible(true);
  }, []);

  function handleAcceptAll() {
    setCookie(COOKIE_NAME, "granted");
    updateConsent(true);
    setVisible(false);
  }

  function handleRejectAll() {
    setCookie(COOKIE_NAME, "denied");
    updateConsent(false);
    setVisible(false);
  }

  function handleAcceptEssential() {
    setCookie(COOKIE_NAME, "essential");
    updateConsent(false);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[9999] p-4">
      <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card shadow-2xl shadow-black/40">
        <div className="p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CookieIcon size={20} className="text-amber-400 shrink-0" />
              <h3 className="text-sm font-bold">We value your privacy</h3>
            </div>
            <button
              onClick={handleRejectAll}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close"
            >
              <XIcon size={16} />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            We use cookies and Google Analytics to understand how you use our site and improve your experience.
            You can choose to accept all cookies, only essential cookies, or customize your preferences.
          </p>

          {/* Details panel */}
          {showDetails && (
            <div className="mt-3 rounded-lg border border-border bg-muted/30 p-3 space-y-2.5 text-xs">
              <div className="flex items-start gap-2">
                <ShieldCheckIcon size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Essential Cookies</p>
                  <p className="text-muted-foreground">Required for the site to function. Cannot be disabled.</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheckIcon size={14} className="text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Analytics Cookies</p>
                  <p className="text-muted-foreground">
                    Google Analytics collects anonymous usage data (pages visited, session duration, device type)
                    to help us improve the site. No personal information is shared for advertising.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <ShieldCheckIcon size={14} className="text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Advertising & Personalization</p>
                  <p className="text-muted-foreground">
                    Used for ad targeting and personalized content. Denied by default — only enabled if you accept all cookies.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mt-4">
            <button
              onClick={handleAcceptAll}
              className="flex-1 rounded-lg bg-primary hover:bg-primary/90 px-4 py-2 text-xs font-medium text-primary-foreground transition-colors"
            >
              Accept All
            </button>
            <button
              onClick={handleAcceptEssential}
              className="flex-1 rounded-lg border border-border hover:bg-muted/50 px-4 py-2 text-xs font-medium transition-colors"
            >
              Essential Only
            </button>
            <button
              onClick={handleRejectAll}
              className="flex-1 rounded-lg border border-border hover:bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground transition-colors"
            >
              Reject All
            </button>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border hover:bg-muted/50 px-3 py-2 text-xs text-muted-foreground transition-colors"
            >
              <SettingsIcon size={12} />
              {showDetails ? "Hide" : "Details"}
            </button>
          </div>

          {/* Links */}
          <div className="flex items-center justify-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <a href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <span>·</span>
            <a href="/terms" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </div>
  );
}
