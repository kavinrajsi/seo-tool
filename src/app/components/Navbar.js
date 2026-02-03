"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        SEO <span className={styles.logoAccent}>Analyzer</span>
      </Link>
      <div className={styles.actions}>
        {user ? (
          <>
            <Link href="/dashboard" className={styles.link}>
              Dashboard
            </Link>
            <button className={styles.logoutBtn} onClick={signOut} type="button">
              Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className={styles.link}>
              Login
            </Link>
            <Link href="/register" className={styles.registerBtn}>
              Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
