"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/app/components/AuthProvider";
import { useProject } from "@/app/components/ProjectProvider";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

const COLOR_OPTIONS = ["#8fff00", "#3b82f6", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"];

export default function SettingsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const searchParams = useSearchParams();
  const { projects, refreshProjects } = useProject();
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

  // Project state
  const [teams, setTeams] = useState([]);
  const [teamsLoading, setTeamsLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newTeamId, setNewTeamId] = useState("");
  const [newColor, setNewColor] = useState("#8fff00");
  const [newWebsiteUrl, setNewWebsiteUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // GA state
  const [gaStatus, setGaStatus] = useState({ connected: false });
  const [gaLoading, setGaLoading] = useState(true);
  const [gaMsg, setGaMsg] = useState({ type: "", text: "" });
  const [gaDisconnecting, setGaDisconnecting] = useState(false);

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

    // Load teams for project creation
    async function loadTeams() {
      try {
        const res = await fetch("/api/teams");
        if (res.ok) {
          const json = await res.json();
          setTeams(json.teams || []);
        }
      } catch {
        // ignore
      }
      setTeamsLoading(false);
    }
    loadTeams();

    // Load GA status
    async function loadGaStatus() {
      try {
        const res = await fetch("/api/analytics/status");
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

    // Load Google Calendar status
    async function loadGcalStatus() {
      try {
        const res = await fetch("/api/gcal/status");
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
        const res = await fetch("/api/instagram/status");
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
  }, [user, searchParams]);

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

  async function handleCreateProject(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        teamId: newTeamId || undefined,
        color: newColor,
        websiteUrl: newWebsiteUrl.trim() || undefined,
      }),
    });
    if (res.ok) {
      setNewName("");
      setNewDescription("");
      setNewTeamId("");
      setNewColor("#8fff00");
      setNewWebsiteUrl("");
      setShowForm(false);
      await refreshProjects();
    }
    setCreating(false);
  }

  async function handleDisconnectGa() {
    setGaDisconnecting(true);
    setGaMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/analytics/disconnect", { method: "POST" });
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

  async function handleDisconnectGcal() {
    setGcalDisconnecting(true);
    setGcalMsg({ type: "", text: "" });
    try {
      const res = await fetch("/api/gcal/disconnect", { method: "POST" });
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
      const res = await fetch("/api/instagram/disconnect", { method: "POST" });
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

      {/* Row 2: Projects + Notification Sound */}
      <div className={styles.settingsRow}>
        <div className={styles.section}>
          <div className={styles.projectHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Projects</h2>
              <p className={styles.sectionDesc}>Manage your projects.</p>
            </div>
            <button
              type="button"
              className={styles.newProjectBtn}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? "Cancel" : "+ New Project"}
            </button>
          </div>

          {showForm && (
            <form className={styles.projectForm} onSubmit={handleCreateProject}>
              <div className={styles.projectFormRow}>
                <input
                  className={styles.input}
                  type="text"
                  placeholder="Project name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
                <input
                  className={styles.input}
                  type="url"
                  placeholder="Website URL (optional)"
                  value={newWebsiteUrl}
                  onChange={(e) => setNewWebsiteUrl(e.target.value)}
                />
              </div>
              <input
                className={styles.input}
                type="text"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
              />
              <select
                className={styles.projectSelect}
                value={newTeamId}
                onChange={(e) => setNewTeamId(e.target.value)}
              >
                <option value="">Personal project (no team)</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
              <div className={styles.colorPickerRow}>
                <span className={styles.colorLabel}>Color</span>
                <div className={styles.colorOptions}>
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={`${styles.colorSwatch} ${newColor === c ? styles.colorSwatchActive : ""}`}
                      style={{ background: c }}
                      onClick={() => setNewColor(c)}
                    />
                  ))}
                </div>
              </div>
              <button className={styles.saveBtn} type="submit" disabled={creating || !newName.trim()}>
                {creating ? "Creating..." : "Create Project"}
              </button>
            </form>
          )}

          <div className={styles.projectGrid}>
            {projects.map((project) => (
              <Link key={project.id} href={`/dashboard/projects/${project.id}`} className={styles.projectCard}>
                <div className={styles.projectCardLeft}>
                  <span className={styles.projectDot} style={{ background: project.color || "#8fff00" }} />
                  <div className={styles.projectCardInfo}>
                    <span className={styles.projectName}>{project.name}</span>
                    {project.website_url && (
                      <span className={styles.projectUrl}>{project.website_url}</span>
                    )}
                    {project.description && (
                      <span className={styles.projectDesc}>{project.description}</span>
                    )}
                    <span className={styles.projectMeta}>
                      {project.teams?.name ? project.teams.name : "Personal"}
                    </span>
                  </div>
                </div>
                <span className={styles.projectChevron}>&#8250;</span>
              </Link>
            ))}
            {!teamsLoading && projects.length === 0 && !showForm && (
              <div className={styles.projectEmpty}>No projects yet. Create one to organize your data.</div>
            )}
          </div>
        </div>

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
            <a href="/api/analytics/connect" className={styles.gscConnectBtn}>
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
            <a href="/api/gcal/connect" className={styles.gscConnectBtn}>
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
            <a href="/api/instagram/connect" className={styles.gscConnectBtn}>
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
