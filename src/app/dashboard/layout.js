"use client";

import Link from "next/link";
import Image from "next/image";
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
            <Image src="/logo.png" alt="Rank Scan" width={120} height={32} className={styles.logoImg} />
            <span className={styles.logoText}>Rank Scan</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.topBar}>
        <Link href="/" className={styles.logo}>
          <Image src="/logo.png" alt="Rank Scan" width={120} height={32} className={styles.logoImg} />
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
