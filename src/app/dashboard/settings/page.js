"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { useProject } from "@/app/components/ProjectProvider";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

export default function SettingsPage() {
  const { user } = useAuth();
  const { activeProject, activeProjectId } = useProject();
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

  // Notification sound state
  const [notificationSound, setNotificationSound] = useState("walmart_notification.mp3");
  const [availableSounds, setAvailableSounds] = useState([]);
  const [soundsEnabled, setSoundsEnabled] = useState(true);
  const [savingSound, setSavingSound] = useState(false);
  const [soundMsg, setSoundMsg] = useState({ type: "", text: "" });
  const [playingSound, setPlayingSound] = useState(null);
  const audioRef = useRef(null);

  // GA state
  const [gaStatus, setGaStatus] = useState({ connected: false });
  const [gaLoading, setGaLoading] = useState(true);
  const [gaMsg, setGaMsg] = useState({ type: "", text: "" });
  const [gaDisconnecting, setGaDisconnecting] = useState(false);

  // GSC state
  const [gscStatus, setGscStatus] = useState({ connected: false });
  const [gscLoading, setGscLoading] = useState(true);
  const [gscMsg, setGscMsg] = useState({ type: "", text: "" });
  const [gscDisconnecting, setGscDisconnecting] = useState(false);

  // Google Calendar state
  const [gcalStatus, setGcalStatus] = useState({ connected: false });
  const [gcalLoading, setGcalLoading] = useState(true);
  const [gcalMsg, setGcalMsg] = useState({ type: "", text: "" });
  const [gcalDisconnecting, setGcalDisconnecting] = useState(false);

  // Instagram state
  const [igStatus, setIgStatus] = useState({ connected: false });
  const [igLoading, setIgLoading] = useState(true);
  const [igMsg, setIgMsg] = useState({ type: "", text: "" });
  const [igDisconnecting, setIgDisconnecting] = useState(false);

  const pq = activeProjectId ? `?project_id=${activeProjectId}` : "";

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");

    async function loadProfile() {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, notification_sound")
        .eq("id", user.id)
        .single();
      if (data) {
        setFullName(data.full_name || "");
        if (data.notification_sound !== undefined && data.notification_sound !== null) {
          setNotificationSound(data.notification_sound);
        }
      }
    }
    loadProfile();

    async function loadSoundSettings() {
      try {
        const res = await fetch("/api/sounds");
        if (res.ok) {
          const json = await res.json();
          setAvailableSounds(json.sounds);
          setSoundsEnabled(json.globalEnabled);
        }
      } catch {
        // Ignore
      }
    }
    loadSoundSettings();

    // Load GA status
    async function loadGaStatus() {
      try {
        const res = await fetch(`/api/analytics/status${pq}`);
        if (res.ok) {
          const data = await res.json();
          setGaStatus(data);
        }
      } catch {
        // Ignore — will show as disconnected
      }
      setGaLoading(false);
    }
    loadGaStatus();

    // Load GSC status
    async function loadGscStatus() {
      try {
        const res = await fetch(`/api/gsc/status${pq}`);
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

    // Load Google Calendar status
    async function loadGcalStatus() {
      try {
        const res = await fetch(`/api/gcal/status${pq}`);
        if (res.ok) {
          const data = await res.json();
          setGcalStatus(data);
        }
      } catch {
        // Ignore — will show as disconnected
      }
      setGcalLoading(false);
    }
    loadGcalStatus();

    // Load Instagram status
    async function loadIgStatus() {
      try {
        const res = await fetch(`/api/instagram/status${pq}`);
        if (res.ok) {
          const data = await res.json();
          setIgStatus(data);
        }
      } catch {
        // Ignore — will show as disconnected
      }
      setIgLoading(false);
    }
    loadIgStatus();

    // Check for callback query params
    if (searchParams.get("ga_connected") === "true") {
      setGaMsg({ type: "success", text: "Google Analytics connected successfully." });
      loadGaStatus();
    } else if (searchParams.get("ga_error")) {
      setGaMsg({ type: "error", text: `Failed to connect: ${searchParams.get("ga_error")}` });
    }

    if (searchParams.get("gsc_connected") === "true") {
      setGscMsg({ type: "success", text: "Google Search Console connected successfully." });
      loadGscStatus();
    } else if (searchParams.get("gsc_error")) {
      setGscMsg({ type: "error", text: `Failed to connect: ${searchParams.get("gsc_error")}` });
    }

    if (searchParams.get("gcal_connected") === "true") {
      setGcalMsg({ type: "success", text: "Google Calendar connected successfully." });
      loadGcalStatus();
    } else if (searchParams.get("gcal_error")) {
      setGcalMsg({ type: "error", text: `Failed to connect: ${searchParams.get("gcal_error")}` });
    }

    if (searchParams.get("ig_connected") === "true") {
      setIgMsg({ type: "success", text: "Instagram connected successfully." });
      loadIgStatus();
    } else if (searchParams.get("ig_error")) {
      setIgMsg({ type: "error", text: `Failed to connect: ${searchParams.get("ig_error")}` });
    }
  }, [user, searchParams, activeProjectId]);

  function handlePreviewSound(soundUrl, filename) {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (playingSound === filename) {
      setPlayingSound(null);
      return;
    }
    const audio = new Audio(soundUrl);
    audio.onended = () => setPlayingSound(null);
    audio.play().catch(() => setPlayingSound(null));
    audioRef.current = audio;
    setPlayingSound(filename);
  }

  function handleStopPreview() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingSound(null);
  }

  async function handleSaveSound() {
    setSavingSound(true);
    setSoundMsg({ type: "", text: "" });

    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationSound: notificationSound }),
    });

    if (res.ok) {
      setSoundMsg({ type: "success", text: "Sound preference saved." });
    } else {
      const json = await res.json();
      setSoundMsg({ type: "error", text: json.error || "Failed to save." });
    }
    setSavingSound(false);
  }

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

  async function handleDisconnectGa() {
    setGaDisconnecting(true);
    setGaMsg({ type: "", text: "" });
    try {
      const res = await fetch(`/api/analytics/disconnect${pq}`, { method: "POST" });
      if (res.ok) {
        setGaStatus({ connected: false });
        setGaMsg({ type: "success", text: "Google Analytics disconnected." });
      } else {
        setGaMsg({ type: "error", text: "Failed to disconnect." });
      }
    } catch {
      setGaMsg({ type: "error", text: "Failed to disconnect." });
    }
    setGaDisconnecting(false);
  }

  async function handleDisconnectGsc() {
    setGscDisconnecting(true);
    setGscMsg({ type: "", text: "" });
    try {
      const res = await fetch(`/api/gsc/disconnect${pq}`, { method: "POST" });
      if (res.ok) {
        setGscStatus({ connected: false });
        setGscMsg({ type: "success", text: "Google Search Console disconnected." });
      } else {
        setGscMsg({ type: "error", text: "Failed to disconnect." });
      }
    } catch {
      setGscMsg({ type: "error", text: "Failed to disconnect." });
    }
    setGscDisconnecting(false);
  }

  async function handleDisconnectGcal() {
    setGcalDisconnecting(true);
    setGcalMsg({ type: "", text: "" });
    try {
      const res = await fetch(`/api/gcal/disconnect${pq}`, { method: "POST" });
      if (res.ok) {
        setGcalStatus({ connected: false });
        setGcalMsg({ type: "success", text: "Google Calendar disconnected." });
      } else {
        setGcalMsg({ type: "error", text: "Failed to disconnect." });
      }
    } catch {
      setGcalMsg({ type: "error", text: "Failed to disconnect." });
    }
    setGcalDisconnecting(false);
  }

  async function handleDisconnectIg() {
    setIgDisconnecting(true);
    setIgMsg({ type: "", text: "" });
    try {
      const res = await fetch(`/api/instagram/disconnect${pq}`, { method: "POST" });
      if (res.ok) {
        setIgStatus({ connected: false });
        setIgMsg({ type: "success", text: "Instagram disconnected." });
      } else {
        setIgMsg({ type: "error", text: "Failed to disconnect." });
      }
    } catch {
      setIgMsg({ type: "error", text: "Failed to disconnect." });
    }
    setIgDisconnecting(false);
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

      {/* Row 1: Profile + Change Password */}
      <div className={styles.settingsRow}>
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
      </div>

      {/* Row 2: Notification Sound */}
      <div className={styles.settingsRow}>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Notification Sound</h2>
          <p className={styles.sectionDesc}>
            Choose a sound to play when scans complete.
          </p>

          {soundMsg.text && (
            <div className={soundMsg.type === "error" ? styles.error : styles.success}>
              {soundMsg.text}
            </div>
          )}

          {!soundsEnabled && (
            <p className={styles.soundDisabledNote}>
              Notification sounds have been disabled by the administrator.
            </p>
          )}

          <div className={styles.soundList}>
            <div
              className={`${styles.soundOption} ${notificationSound === "" ? styles.soundOptionSelected : ""}`}
              onClick={() => { handleStopPreview(); setNotificationSound(""); }}
            >
              <label className={styles.soundRadio}>
                <input
                  type="radio"
                  name="notificationSound"
                  checked={notificationSound === ""}
                  onChange={() => { handleStopPreview(); setNotificationSound(""); }}
                />
                <span className={styles.soundName}>None (silent)</span>
              </label>
            </div>

            {availableSounds.map((sound) => (
              <div
                key={sound.filename}
                className={`${styles.soundOption} ${notificationSound === sound.filename ? styles.soundOptionSelected : ""}`}
                onClick={() => setNotificationSound(sound.filename)}
              >
                <label className={styles.soundRadio}>
                  <input
                    type="radio"
                    name="notificationSound"
                    checked={notificationSound === sound.filename}
                    onChange={() => setNotificationSound(sound.filename)}
                  />
                  <span className={styles.soundName}>{sound.name}</span>
                </label>
                <button
                  type="button"
                  className={styles.previewBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviewSound(sound.url, sound.filename);
                  }}
                >
                  {playingSound === sound.filename ? "Stop" : "Play"}
                </button>
              </div>
            ))}
          </div>

          <button
            className={styles.saveBtn}
            type="button"
            disabled={savingSound || !soundsEnabled}
            onClick={handleSaveSound}
            style={{ marginTop: "var(--space-4)" }}
          >
            {savingSound ? "Saving..." : "Save Sound"}
          </button>
        </div>
      </div>

      {activeProject && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Connections for {activeProject.name}</h2>
          <p className={styles.sectionDesc}>
            Manage integrations for this project. Switch projects using the selector in the sidebar.
          </p>
        </div>
      )}

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Google Analytics</h2>
        <p className={styles.sectionDesc}>
          Connect your Google Analytics account to view traffic data, top pages, and audience insights in the dashboard.
        </p>

        {gaMsg.text && (
          <div className={gaMsg.type === "error" ? styles.error : styles.success}>
            {gaMsg.text}
          </div>
        )}

        {!gaLoading && (
          gaStatus.connected ? (
            <div className={styles.gscConnected}>
              <div className={styles.gscInfo}>
                <span className={styles.gscDot} />
                <span>
                  Connected as <strong>{gaStatus.googleEmail || "Google Account"}</strong>
                  {gaStatus.connectedAt && (
                    <> &middot; since {new Date(gaStatus.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                  )}
                </span>
              </div>
              <button
                className={styles.dangerBtn}
                onClick={handleDisconnectGa}
                disabled={gaDisconnecting}
                type="button"
              >
                {gaDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <a href={`/api/analytics/connect${pq}`} className={styles.gscConnectBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
              Connect Google Analytics
            </a>
          )
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Google Search Console</h2>
        <p className={styles.sectionDesc}>
          Connect your Google Search Console account to view search performance, top queries, and page insights.
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
                disabled={gscDisconnecting}
                type="button"
              >
                {gscDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <a href={`/api/gsc/connect${pq}`} className={styles.gscConnectBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Connect Search Console
            </a>
          )
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Google Calendar</h2>
        <p className={styles.sectionDesc}>
          Connect your Google Calendar to sync calendar events from the Content and eCommerce calendars.
        </p>

        {gcalMsg.text && (
          <div className={gcalMsg.type === "error" ? styles.error : styles.success}>
            {gcalMsg.text}
          </div>
        )}

        {!gcalLoading && (
          gcalStatus.connected ? (
            <div className={styles.gscConnected}>
              <div className={styles.gscInfo}>
                <span className={styles.gscDot} />
                <span>
                  Connected as <strong>{gcalStatus.googleEmail || "Google Account"}</strong>
                  {gcalStatus.connectedAt && (
                    <> &middot; since {new Date(gcalStatus.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                  )}
                  {gcalStatus.lastSyncedAt && (
                    <> &middot; last synced {new Date(gcalStatus.lastSyncedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                  )}
                </span>
              </div>
              <button
                className={styles.dangerBtn}
                onClick={handleDisconnectGcal}
                disabled={gcalDisconnecting}
                type="button"
              >
                {gcalDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <a href={`/api/gcal/connect${pq}`} className={styles.gscConnectBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Connect Google Calendar
            </a>
          )
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Instagram</h2>
        <p className={styles.sectionDesc}>
          Connect your Instagram Business or Creator account to view your content, engagement metrics, and analytics.
        </p>

        {igMsg.text && (
          <div className={igMsg.type === "error" ? styles.error : styles.success}>
            {igMsg.text}
          </div>
        )}

        {!igLoading && (
          igStatus.connected ? (
            <div className={styles.gscConnected}>
              <div className={styles.gscInfo}>
                <span className={styles.gscDot} />
                <span>
                  Connected as <strong>{igStatus.username ? `@${igStatus.username}` : "Instagram Account"}</strong>
                  {igStatus.connectedAt && (
                    <> &middot; since {new Date(igStatus.connectedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                  )}
                </span>
              </div>
              <button
                className={styles.dangerBtn}
                onClick={handleDisconnectIg}
                disabled={igDisconnecting}
                type="button"
              >
                {igDisconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <a href={`/api/instagram/connect${pq}`} className={styles.gscConnectBtn}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
              </svg>
              Connect Instagram
            </a>
          )
        )}
      </div>
    </>
  );
}
