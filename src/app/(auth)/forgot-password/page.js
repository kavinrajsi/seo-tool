"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Check your email for a password reset link.");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center font-sans bg-background">
      <div className="w-full max-w-[400px] px-5 py-8 sm:px-8 sm:py-10 sm:rounded-xl sm:border sm:border-border bg-card">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground mb-2">Forgot Password</h1>
        <p className="text-sm text-muted-foreground mb-7 leading-normal">Enter your email and we&apos;ll send you a link to reset your password.</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && <div className="text-[13px] text-red-700 dark:text-red-400 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">{error}</div>}
          {success && <div className="text-[13px] text-emerald-700 dark:text-emerald-400 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4">{success}</div>}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-foreground">Email</label>
            <input
              id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required
              className="h-[42px] px-3 text-sm rounded-lg border border-border bg-background text-foreground outline-none transition-colors font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            />
          </div>

          <button type="submit" className="h-[42px] mt-1 text-sm font-medium rounded-lg bg-primary text-primary-foreground cursor-pointer transition-opacity font-sans hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? "Sending link..." : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-5 text-center text-[13px] text-muted-foreground">
          Remember your password?{" "}
          <Link href="/signin" className="text-foreground font-medium underline underline-offset-2 hover:text-primary transition-colors">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
