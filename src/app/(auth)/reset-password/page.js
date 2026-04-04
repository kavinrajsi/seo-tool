"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">Loading...</div>}>
      <ResetPassword />
    </Suspense>
  );
}

function ResetPassword() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const urlError = searchParams.get("error");
    const errorCode = searchParams.get("error_code");
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.replace("#", ""));
    const hashError = hashParams.get("error");
    const hashErrorCode = hashParams.get("error_code");

    if (urlError === "access_denied" || hashError === "access_denied" ||
        errorCode === "otp_expired" || hashErrorCode === "otp_expired") {
      setExpired(true);
      return;
    }

    async function checkSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setReady(true); return; }
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) setExpired(true);
        else setReady(true);
      }
    }

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    return () => subscription.unsubscribe();
  }, [searchParams]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setError(error.message); setLoading(false); return; }

    setSuccess("Password updated successfully. Redirecting...");
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  const inputCls = "h-[42px] px-3 text-sm rounded-lg border border-border bg-background text-foreground outline-none transition-colors font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground";

  return (
    <div className="flex min-h-screen items-center justify-center font-sans bg-background">
      <div className="w-full max-w-[400px] px-5 py-8 sm:px-8 sm:py-10 sm:rounded-xl sm:border sm:border-border bg-card">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground mb-2">Reset Password</h1>
        <p className="text-sm text-muted-foreground mb-7 leading-normal">Enter your new password below.</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && <div className="text-[13px] text-red-700 dark:text-red-400 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">{error}</div>}
          {success && <div className="text-[13px] text-emerald-700 dark:text-emerald-400 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4">{success}</div>}

          {expired && (
            <div className="space-y-4">
              <div className="text-[13px] text-red-700 dark:text-red-400 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                This password reset link has expired. Reset links are valid for a limited time.
              </div>
              <a href="/forgot-password"
                className="flex items-center justify-center h-[42px] text-sm font-medium rounded-lg bg-primary text-primary-foreground cursor-pointer transition-opacity font-sans hover:opacity-90 no-underline">
                Request a New Reset Link
              </a>
            </div>
          )}

          {!expired && !ready && !success && (
            <div className="text-[13px] text-muted-foreground px-3 py-2.5 bg-muted rounded-lg">
              Verifying your reset link...
            </div>
          )}

          {!expired && ready && (
            <>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[13px] font-medium text-foreground">New Password</label>
                <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} className={inputCls} />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="confirmPassword" className="text-[13px] font-medium text-foreground">Confirm New Password</label>
                <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your new password" required className={inputCls} />
              </div>

              <button type="submit" className="h-[42px] mt-1 text-sm font-medium rounded-lg bg-primary text-primary-foreground cursor-pointer transition-opacity font-sans hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
