"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

export default function SettingsPage() {
  const { user } = useAuth();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

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
  }, [user]);

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
    </>
  );
}
