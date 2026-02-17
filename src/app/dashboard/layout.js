"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import DashboardNav from "./components/DashboardNav";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }) {
  const { loading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <aside className={styles.sidebar}>
          <Link href="/" className={styles.logo}>
            <Image src="/logo.png" alt="Firefly" width={120} height={32} className={styles.logoImg} />
          </Link>
        </aside>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {/* Mobile top bar with hamburger */}
      <div className={styles.mobileBar}>
        <button
          type="button"
          className={styles.hamburger}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
        <Link href="/" className={styles.logo}>
          <Image src="/logo.png" alt="Firefly" width={120} height={32} className={styles.logoImg} />
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div className={styles.overlay} onClick={() => setMobileMenuOpen(false)} />
      )}

      <aside className={`${styles.sidebar} ${mobileMenuOpen ? styles.sidebarOpen : ""}`}>
        <Link href="/" className={styles.logo}>
          <Image src="/logo.png" alt="Firefly" width={120} height={32} className={styles.logoImg} />
        </Link>
        <DashboardNav />
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
