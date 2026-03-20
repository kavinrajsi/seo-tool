"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  UserIcon,
  MailIcon,
  CalendarIcon,
  LogOutIcon,
  KeyIcon,
  ShieldIcon,
} from "lucide-react";

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      setUser(data.user);
      setLoading(false);
    });
  }, []);

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordMsg("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setPasswordError(error.message);
    } else {
      setPasswordMsg("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/signin");
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">
        Loading...
      </div>
    );
  }

  const createdAt = user?.created_at
    ? new Date(user.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Unknown";

  const provider = user?.app_metadata?.provider || "email";
  const lastSignIn = user?.last_sign_in_at
    ? new Date(user.last_sign_in_at).toLocaleString()
    : "Unknown";

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground mt-1">Manage your account and security settings.</p>
      </div>

      {/* Account info */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          Account Information
        </h3>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-semibold">
              {(user?.email || "U")[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">Auth provider: {provider}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wider">Member since</span>
              </div>
              <p className="text-sm">{createdAt}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <ShieldIcon className="h-3.5 w-3.5" />
                <span className="text-xs uppercase tracking-wider">Last sign in</span>
              </div>
              <p className="text-sm">{lastSignIn}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 pt-2 border-t border-border text-xs text-muted-foreground">
            <MailIcon className="h-3.5 w-3.5" />
            User ID: <span className="font-mono">{user?.id}</span>
          </div>
        </div>
      </div>

      {/* Change password */}
      <form onSubmit={handlePasswordChange} className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
          <KeyIcon className="h-4 w-4 text-muted-foreground" />
          Change Password
        </h3>
        <div className="space-y-3">
          <input
            type="password"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full rounded-md border border-border bg-background px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          {passwordError && (
            <p className="text-xs text-red-400">{passwordError}</p>
          )}
          {passwordMsg && (
            <p className="text-xs text-green-400">{passwordMsg}</p>
          )}
          <button
            type="submit"
            disabled={changingPassword}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {changingPassword ? "Updating..." : "Update Password"}
          </button>
        </div>
      </form>

      {/* Sign out */}
      <div className="rounded-lg border border-border bg-card p-5">
        <button
          onClick={handleSignOut}
          className="text-sm text-red-400 hover:text-red-300 flex items-center gap-2"
        >
          <LogOutIcon className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
