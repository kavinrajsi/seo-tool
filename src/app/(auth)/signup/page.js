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
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogleSignUp() {
    setError("");
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Check your email for a confirmation link to complete sign up.");
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center font-sans bg-[var(--background)]">
      <div className="w-full max-w-[400px] px-5 py-8 rounded-none border-none sm:px-8 sm:py-10 sm:rounded-xl sm:border sm:border-[#2a2a2a] bg-[#141414] [&_h1]:text-[28px] [&_h1]:font-semibold [&_h1]:tracking-[-1px] [&_h1]:text-[#ededed] [&_h1]:mb-2 [&_>p]:text-sm [&_>p]:text-[#999] [&_>p]:mb-7 [&_>p]:leading-normal">
        <h1>Sign Up</h1>
        <p>Create an account to get started.</p>

        {error && <div className="text-[13px] text-[#ef5350] px-3 py-2.5 bg-[#2c1a1a] rounded-lg mb-4">{error}</div>}
        {success && <div className="text-[13px] text-[#66bb6a] px-3 py-2.5 bg-[#1a2c1a] rounded-lg mb-4">{success}</div>}

        <button
          type="button"
          className="flex items-center justify-center gap-2.5 h-[42px] w-full text-sm font-medium border border-[#2a2a2a] rounded-lg bg-transparent text-[#ededed] cursor-pointer transition-[background,border-color] duration-150 font-sans hover:bg-white/5 hover:border-[#999] disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:w-[18px] [&_svg]:h-[18px]"
          onClick={handleGoogleSignUp}
          disabled={googleLoading}
        >
          <svg viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {googleLoading ? "Redirecting..." : "Sign up with Google"}
        </button>

        <div className="flex items-center gap-3 text-xs text-[#999] uppercase tracking-[0.5px] before:content-[''] before:flex-1 before:h-px before:bg-[#2a2a2a] after:content-[''] after:flex-1 after:h-px after:bg-[#2a2a2a]">or</div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>

          <div className="flex flex-col gap-1.5 [&_label]:text-[13px] [&_label]:font-medium [&_label]:text-[#ededed] [&_input]:h-[42px] [&_input]:px-3 [&_input]:text-sm [&_input]:rounded-lg [&_input]:border [&_input]:border-[#2a2a2a] [&_input]:bg-[#141414] [&_input]:text-[#ededed] [&_input]:outline-none [&_input]:transition-[border-color] [&_input]:duration-150 [&_input]:font-sans focus:[&_input]:border-[#ededed]">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5 [&_label]:text-[13px] [&_label]:font-medium [&_label]:text-[#ededed] [&_input]:h-[42px] [&_input]:px-3 [&_input]:text-sm [&_input]:rounded-lg [&_input]:border [&_input]:border-[#2a2a2a] [&_input]:bg-[#141414] [&_input]:text-[#ededed] [&_input]:outline-none [&_input]:transition-[border-color] [&_input]:duration-150 [&_input]:font-sans focus:[&_input]:border-[#ededed]">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              required
              minLength={6}
            />
          </div>

          <div className="flex flex-col gap-1.5 [&_label]:text-[13px] [&_label]:font-medium [&_label]:text-[#ededed] [&_input]:h-[42px] [&_input]:px-3 [&_input]:text-sm [&_input]:rounded-lg [&_input]:border [&_input]:border-[#2a2a2a] [&_input]:bg-[#141414] [&_input]:text-[#ededed] [&_input]:outline-none [&_input]:transition-[border-color] [&_input]:duration-150 [&_input]:font-sans focus:[&_input]:border-[#ededed]">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              required
            />
          </div>

          <button type="submit" className="h-[42px] mt-1 text-sm font-medium border-none rounded-lg bg-[#ededed] text-[var(--background)] cursor-pointer transition-opacity duration-150 font-sans hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <div className="mt-5 text-center text-[13px] text-[#999] [&_a]:text-[#ededed] [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2">
          Already have an account? <Link href="/signin">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
