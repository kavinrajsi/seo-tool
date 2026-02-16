import Link from "next/link";
import Image from "next/image";
import styles from "./layout.module.css";

export default function AuthLayout({ children }) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <Link href="/" className={styles.logoLink}>
            <Image src="/logo.png" alt="Firefly" width={120} height={36} className={styles.logoImg} />
            <span className={styles.logoText}>Firefly</span>
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
