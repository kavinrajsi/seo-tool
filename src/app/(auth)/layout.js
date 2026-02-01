import Link from "next/link";
import styles from "./layout.module.css";

export default function AuthLayout({ children }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Link href="/" className={styles.logoLink}>
            SEO <span className={styles.logoAccent}>Analyzer</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
