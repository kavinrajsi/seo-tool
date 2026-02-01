"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";
import DashboardNav from "./components/DashboardNav";
import styles from "./layout.module.css";

export default function DashboardLayout({ children }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.logo}>
            SEO <span className={styles.logoAccent}>Analyzer</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.logo}>
          SEO <span className={styles.logoAccent}>Analyzer</span>
        </Link>
        <div className={styles.topActions}>
          <Link href="/" className={styles.homeLink}>
            Analyze
          </Link>
          <button className={styles.logoutBtn} onClick={handleLogout} type="button">
            Logout
          </button>
        </div>
      </div>
      <div className={styles.body}>
        <aside className={styles.sidebar}>
          <DashboardNav />
        </aside>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
