"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import styles from "./DashboardNav.module.css";

export default function UserSection({ user, profile, onLogout }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    }
    if (showUserMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showUserMenu]);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "";
  const initials = displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={styles.userSection} ref={userMenuRef}>
      <div className={styles.userRow}>
        <button
          type="button"
          className={styles.userInfo}
          onClick={() => setShowUserMenu((prev) => !prev)}
        >
          <span className={styles.userAvatar}>{initials}</span>
          <span className={styles.userNameGroup}>
            <span className={styles.userName}>{displayName}</span>
            {user?.email && <span className={styles.userEmail}>{user.email}</span>}
          </span>
        </button>
        <button type="button" className={styles.notificationBtn} aria-label="Notifications">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>
      </div>

      {showUserMenu && (
        <div className={styles.userMenu}>
          <button
            type="button"
            className={styles.userMenuItem}
            onClick={onLogout}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
          <button
            type="button"
            className={styles.userMenuItem}
            onClick={() => {
              setShowUserMenu(false);
              window.open("mailto:sikaviraj@gmail.com", "_blank");
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            Help
          </button>
          <Link
            href="/dashboard/upcoming-features"
            className={styles.userMenuItem}
            onClick={() => setShowUserMenu(false)}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Upcoming Features
          </Link>
        </div>
      )}
    </div>
  );
}
