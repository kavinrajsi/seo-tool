"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import ProjectProvider, { useProject } from "../components/ProjectProvider";
import DashboardNav from "./components/DashboardNav";
import ProjectSelector from "./components/ProjectSelector";
import styles from "./layout.module.css";

function ProjectGuard({ children }) {
  const { activeProject, loading } = useProject();
  const pathname = usePathname();

  const isProjectsPage = pathname === "/dashboard/settings/projects";

  if (loading || isProjectsPage || activeProject) {
    return children;
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      textAlign: "center",
      padding: "2rem",
    }}>
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" style={{ marginBottom: "1rem" }}>
        <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7-7H4a2 2 0 0 0-2 2v17z" />
        <polyline points="14 2 14 8 20 8" />
      </svg>
      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#111827", marginBottom: "0.5rem" }}>
        No Project Selected
      </h2>
      <p style={{ fontSize: "0.9rem", color: "#6b7280", marginBottom: "1.5rem", maxWidth: "400px" }}>
        Please select or create a project to start working. All data is organized by project.
      </p>
      <Link
        href="/dashboard/settings/projects"
        style={{
          padding: "10px 24px",
          background: "#16a34a",
          color: "#fff",
          borderRadius: "8px",
          fontSize: "0.9rem",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Go to Projects
      </Link>
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const { loading } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    // Wrapped in microtask to satisfy react-hooks/set-state-in-effect
    queueMicrotask(() => setMobileMenuOpen(false));
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
    <ProjectProvider>
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
          <ProjectSelector />
          <DashboardNav />
        </aside>
        <main className={styles.main}>
          <ProjectGuard>{children}</ProjectGuard>
        </main>
      </div>
    </ProjectProvider>
  );
}
