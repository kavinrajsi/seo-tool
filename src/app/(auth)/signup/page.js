"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email.toLowerCase().endsWith("@madarth.com")) {
      setError("Only @madarth.com email addresses are allowed.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Check your email for a confirmation link to complete sign up.");
    setLoading(false);
  }

  const inputCls = "h-[42px] px-3 text-sm rounded-lg border border-border bg-background text-foreground outline-none transition-colors font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground";

  return (
    <div className="flex min-h-screen items-center justify-center font-sans bg-background">
      <div className="w-full max-w-[400px] px-5 py-8 sm:px-8 sm:py-10 sm:rounded-xl sm:border sm:border-border bg-card">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground mb-2">Sign Up</h1>
        <p className="text-sm text-muted-foreground mb-7 leading-normal">Create an account to get started.</p>

        {error && <div className="text-[13px] text-red-700 dark:text-red-400 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">{error}</div>}
        {success && <div className="text-[13px] text-emerald-700 dark:text-emerald-400 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4">{success}</div>}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-foreground">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-foreground">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} className={inputCls} />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirmPassword" className="text-[13px] font-medium text-foreground">Confirm Password</label>
            <input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat your password" required className={inputCls} />
          </div>

          <button type="submit" className="h-[42px] mt-1 text-sm font-medium rounded-lg bg-primary text-primary-foreground cursor-pointer transition-opacity font-sans hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-5 text-center text-[13px] text-muted-foreground">
          Already have an account?{" "}
          <Link href="/signin" className="text-foreground font-medium underline underline-offset-2 hover:text-primary transition-colors">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
