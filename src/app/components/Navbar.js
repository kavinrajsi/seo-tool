"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "./AuthProvider";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const { user, loading, signOut } = useAuth();

  if (loading) return null;

  return (
    <nav className={styles.nav}>
      <Link href="/" className={styles.logo}>
        <Image src="/logo.png" alt="Rank Scan" width={120} height={32} className={styles.logoImg} />
        <span className={styles.logoText}>Rank Scan</span>
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
