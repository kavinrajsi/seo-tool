"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/app/components/AuthProvider";
import { NAV_ITEMS, ADMIN_ITEM } from "./navConfig";
import ProjectSelector from "./ProjectSelector";
import UserSection from "./UserSection";
import styles from "./DashboardNav.module.css";

export default function DashboardNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, isAdmin, isHr, signOut, loading: authLoading } = useAuth();
  const [visibility, setVisibility] = useState(null);
  const [expandedMenus, setExpandedMenus] = useState({});

  useEffect(() => {
    async function fetchVisibility() {
      try {
        const res = await fetch("/api/settings/page-visibility");
        if (res.ok) {
          const data = await res.json();
          setVisibility(data.visibility || {});
        }
      } catch {
        // Failed to fetch, show all pages
      }
    }
    fetchVisibility();
  }, []);

  // Auto-expand menu if current path is in submenu
  useEffect(() => {
    NAV_ITEMS.forEach((item) => {
      if (item.isMenu && item.subItems) {
        const isSubActive = item.subItems.some((sub) =>
          pathname.startsWith(sub.href)
        );
        if (isSubActive) {
          setExpandedMenus((prev) => ({ ...prev, [item.label]: true }));
        }
      }
    });
  }, [pathname]);

  const toggleMenu = (label) => {
    setExpandedMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  async function handleLogout() {
    await signOut();
    router.push("/");
  }

  // Filter nav items based on visibility settings
  // While visibility is loading (null), only show items without a visibilityKey
  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.visibilityKey) return true;
    if (!visibility) return false; // Still loading — hide until we know
    return visibility[item.visibilityKey] !== false;
  }).map((item) => {
    if (item.isMenu && item.subItems) {
      const visibleSubItems = item.subItems.filter((sub) => {
        if (!sub.visibilityKey) return true;
        if (!visibility) return false;
        return visibility[sub.visibilityKey] !== false;
      });
      return { ...item, subItems: visibleSubItems };
    }
    return item;
  });

  // Only show Admin link once auth has fully loaded and user is confirmed admin
  const items = !authLoading && isAdmin ? [...visibleItems, ADMIN_ITEM] : visibleItems;

  return (
    <nav className={styles.nav}>
      <ProjectSelector />
      <div className={styles.navItems}>
        {items.map((item) => {
          if (item.isMenu) {
            const isExpanded = expandedMenus[item.label];
            const isSubActive = item.subItems?.some((sub) =>
              pathname.startsWith(sub.href)
            );

            return (
              <div key={item.label} className={styles.menuGroup}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.label)}
                  className={`${styles.link} ${styles.menuToggle} ${isSubActive ? styles.active : ""}`}
                >
                  {item.icon}
                  {item.label}
                  <svg
                    className={`${styles.chevron} ${isExpanded ? styles.chevronExpanded : ""}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {isExpanded && item.subItems && (
                  <div className={styles.submenu}>
                    {item.subItems.map((sub) => {
                      const isActive = pathname.startsWith(sub.href);
                      return (
                        <Link
                          key={sub.href}
                          href={sub.href}
                          className={`${styles.link} ${styles.subLink} ${isActive ? styles.active : ""}`}
                        >
                          {sub.icon}
                          {sub.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.link} ${isActive ? styles.active : ""}`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>

      <UserSection user={user} profile={profile} onLogout={handleLogout} />
    </nav>
  );
}
