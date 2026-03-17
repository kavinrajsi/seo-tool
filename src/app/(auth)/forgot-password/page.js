"use client";

import { useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import styles from "../auth.module.scss";

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
      redirectTo: `${window.location.origin}/reset-password`,
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
    <div className={styles.page}>
      <div className={styles.card}>
        <h1>Forgot Password</h1>
        <p>Enter your email and we&apos;ll send you a link to reset your password.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <div className={styles.field}>
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

          <button type="submit" className={styles.submit} disabled={loading}>
            {loading ? "Sending link..." : "Send Reset Link"}
          </button>
        </form>

        <div className={styles.footer}>
          Remember your password? <Link href="/signin">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
