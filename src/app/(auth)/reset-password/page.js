"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess("Password updated successfully. Redirecting...");
    setTimeout(() => router.push("/dashboard"), 2000);
  }

  return (
    <div className="flex min-h-screen items-center justify-center font-sans bg-[var(--background)]">
      <div className="w-full max-w-[400px] px-5 py-8 rounded-none border-none sm:px-8 sm:py-10 sm:rounded-xl sm:border sm:border-[#2a2a2a] bg-[#141414] [&_h1]:text-[28px] [&_h1]:font-semibold [&_h1]:tracking-[-1px] [&_h1]:text-[#ededed] [&_h1]:mb-2 [&_>p]:text-sm [&_>p]:text-[#999] [&_>p]:mb-7 [&_>p]:leading-normal">
        <h1>Reset Password</h1>
        <p>Enter your new password below.</p>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {error && <div className="text-[13px] text-[#ef5350] px-3 py-2.5 bg-[#2c1a1a] rounded-lg mb-4">{error}</div>}
          {success && <div className="text-[13px] text-[#66bb6a] px-3 py-2.5 bg-[#1a2c1a] rounded-lg mb-4">{success}</div>}

          {!ready && !success && (
            <div className="text-[13px] text-[#ef5350] px-3 py-2.5 bg-[#2c1a1a] rounded-lg">
              Invalid or expired reset link. Please{" "}
              <a href="/forgot-password" style={{ textDecoration: "underline" }}>
                request a new one
              </a>.
            </div>
          )}

          {ready && (
            <>
              <div className="flex flex-col gap-1.5 [&_label]:text-[13px] [&_label]:font-medium [&_label]:text-[#ededed] [&_input]:h-[42px] [&_input]:px-3 [&_input]:text-sm [&_input]:rounded-lg [&_input]:border [&_input]:border-[#2a2a2a] [&_input]:bg-[#141414] [&_input]:text-[#ededed] [&_input]:outline-none [&_input]:transition-[border-color] [&_input]:duration-150 [&_input]:font-sans focus:[&_input]:border-[#ededed]">
                <label htmlFor="password">New Password</label>
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
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                />
              </div>

              <button type="submit" className="h-[42px] mt-1 text-sm font-medium border-none rounded-lg bg-[#ededed] text-[var(--background)] cursor-pointer transition-opacity duration-150 font-sans hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
