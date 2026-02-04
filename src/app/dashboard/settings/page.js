"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

export default function SettingsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // GSC state
  const [gscStatus, setGscStatus] = useState({ connected: false });
  const [gscLoading, setGscLoading] = useState(true);
  const [gscMsg, setGscMsg] = useState({ type: "", text: "" });
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");

    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (data) setFullName(data.full_name || "");
    }
    loadProfile();

    // Load GSC status
    async function loadGscStatus() {
      try {
        const res = await fetch("/api/gsc/status");
        if (res.ok) {
          const data = await res.json();
          setGscStatus(data);
        }
      } catch {
        // Ignore — will show as disconnected
      }
      setGscLoading(false);
    }
    loadGscStatus();

    // Check for callback query params
    if (searchParams.get("gsc_connected") === "true") {
      setGscMsg({ type: "success", text: "Google Search Console connected successfully." });
      loadGscStatus();
    } else if (searchParams.get("gsc_error")) {
      setGscMsg({ type: "error", text: `Failed to connect: ${searchParams.get("gsc_error")}` });
    }
  }, [user, searchParams]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });
    setSavingProfile(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName }),
    });

    if (res.ok) {
      setProfileMsg({ type: "success", text: "Profile updated." });
    } else {
      const json = await res.json();
      setProfileMsg({ type: "error", text: json.error || "Failed to update." });
    }
    setSavingProfile(false);
  }

  async function handleDisconnectGsc() {
    setDisconnecting(true);
    setGscMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/gsc/disconnect", { method: "POST" });
      if (res.ok) {
        setGscStatus({ connected: false });
        setGscMsg({ type: "success", text: "Google Search Console disconnected." });
      } else {
        setGscMsg({ type: "error", text: "Failed to disconnect." });
      }
    } catch {
      setGscMsg({ type: "error", text: "Failed to disconnect." });
    }
    setDisconnecting(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordMsg({ type: "", text: "" });

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Passwords do not match." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }

    setSavingPassword(true);

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ newPassword }),
    });

    if (res.ok) {
      setPasswordMsg({ type: "success", text: "Password updated." });
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const json = await res.json();
      setPasswordMsg({ type: "error", text: json.error || "Failed to update." });
    }
    setSavingPassword(false);
  }

  return (
    <>
      <h1 className={styles.heading}>Settings</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Profile</h2>
        <p className={styles.sectionDesc}>Update your personal information.</p>

        {profileMsg.text && (
          <div className={profileMsg.type === "error" ? styles.error : styles.success}>
            {profileMsg.text}
          </div>
        )}

        <form onSubmit={handleSaveProfile} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">Email</label>
            <input
              id="email"
              className={`${styles.input} ${styles.inputDisabled}`}
              type="email"
              value={email}
              disabled
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              className={styles.input}
              type="text"
              placeholder="Your name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <button className={styles.saveBtn} type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Change Password</h2>
        <p className={styles.sectionDesc}>Update your account password.</p>

        {passwordMsg.text && (
          <div className={passwordMsg.type === "error" ? styles.error : styles.success}>
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handleChangePassword} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="newPassword">New Password</label>
            <input
              id="newPassword"
              className={styles.input}
              type="password"
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              className={styles.input}
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button className={styles.saveBtn} type="submit" disabled={savingPassword}>
            {savingPassword ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Google Search Console</h2>
        <p className={styles.sectionDesc}>
          Connect your Google Search Console account to see search queries, clicks, impressions, and index status in your SEO reports.
        </p>

        {gscMsg.text && (
          <div className={gscMsg.type === "error" ? styles.error : styles.success}>
            {gscMsg.text}
          </div>
        )}

        {!gscLoading && (
          gscStatus.connected ? (
            <div className={styles.gscConnected}>
              <div className={styles.gscInfo}>
                <span className={styles.gscDot} />
                <span>
                  Connected as <strong>{gscStatus.googleEmail || "Google Account"}</strong>
                  {gscStatus.connectedAt && (
                    <> &middot; since {new Date(gscStatus.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                  )}
                </span>
              </div>
              <button
                className={styles.dangerBtn}
                onClick={handleDisconnectGsc}
                disabled={disconnecting}
                type="button"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <a href="/api/gsc/connect" className={styles.gscConnectBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <polyline points="10 17 15 12 10 7" />
                <line x1="15" y1="12" x2="3" y2="12" />
              </svg>
              Connect Google Search Console
            </a>
          )
        )}
      </div>
    </>
  );
}
