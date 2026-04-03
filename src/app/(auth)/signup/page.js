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
