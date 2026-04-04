"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground text-sm">Loading...</div>}>
      <SignIn />
    </Suspense>
  );
}

function SignIn() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";
  const domainError = searchParams.get("error") === "domain";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [lastMethod, setLastMethod] = useState(null);

  useEffect(() => {
    try { setLastMethod(localStorage.getItem("last_login_method")); } catch {}
  }, []);

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    localStorage.setItem("last_login_method", "google");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    localStorage.setItem("last_login_method", "email");
    router.push(redirectTo);
  }

  return (
    <div className="flex min-h-screen items-center justify-center font-sans bg-background">
      <div className="w-full max-w-[400px] px-5 py-8 sm:px-8 sm:py-10 sm:rounded-xl sm:border sm:border-border bg-card">
        <h1 className="text-[28px] font-semibold tracking-tight text-foreground mb-2">Sign In</h1>
        <p className="text-sm text-muted-foreground mb-7 leading-normal">Welcome back. Enter your credentials to continue.</p>

        {(error || domainError) && (
          <div className="text-[13px] text-red-700 dark:text-red-400 px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
            {domainError ? "Only @madarth.com accounts are allowed." : error}
          </div>
        )}

        <button
          type="button"
          className={`flex items-center justify-center gap-2.5 h-[42px] w-full text-sm font-medium border rounded-lg bg-transparent text-foreground cursor-pointer transition-colors font-sans hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed ${lastMethod === "google" ? "border-primary/50 ring-1 ring-primary/20" : "border-border"}`}
          onClick={handleGoogleSignIn}
          disabled={googleLoading}
        >
          <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {googleLoading ? "Redirecting..." : "Sign in with Google"}
          {lastMethod === "google" && <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">Last used</span>}
        </button>

        <div className="flex items-center gap-3 my-5 text-xs text-muted-foreground uppercase tracking-widest before:content-[''] before:flex-1 before:h-px before:bg-border after:content-[''] after:flex-1 after:h-px after:bg-border">or</div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="email" className="text-[13px] font-medium text-foreground">Email</label>
              {lastMethod === "email" && <span className="text-[10px] text-primary font-medium bg-primary/10 px-1.5 py-0.5 rounded-full">Last used</span>}
            </div>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="h-[42px] px-3 text-sm rounded-lg border border-border bg-background text-foreground outline-none transition-colors font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-foreground">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              required
              className="h-[42px] px-3 text-sm rounded-lg border border-border bg-background text-foreground outline-none transition-colors font-sans focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
            />
          </div>

          <div className="text-right">
            <Link href="/forgot-password" className="text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">Forgot password?</Link>
          </div>

          <button type="submit" className="h-[42px] mt-1 text-sm font-medium rounded-lg bg-primary text-primary-foreground cursor-pointer transition-opacity font-sans hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-5 text-center text-[13px] text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-foreground font-medium underline underline-offset-2 hover:text-primary transition-colors">Sign Up</Link>
        </div>
      </div>
    </div>
  );
}
