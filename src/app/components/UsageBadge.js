'use client';

import { useUsageLimit } from '../hooks/useUsageLimit';
import { useAuth } from './AuthProvider';
import styles from './UsageBadge.module.css';

export default function UsageBadge() {
  const { user } = useAuth();
  const { remaining, limit, loading } = useUsageLimit();

  if (loading) return null;

  // Don't show for authenticated users with unlimited checks
  // (You can remove this condition if you want to show for all users)

  const isLowOnChecks = remaining <= 1;
  const isOutOfChecks = remaining === 0;

  return (
    <div className={`${styles.badge} ${isOutOfChecks ? styles.error : isLowOnChecks ? styles.warning : ''}`}>
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
      <span className={styles.text}>
        {isOutOfChecks ? (
          <>
            <strong>No checks left today</strong>
            {!user && <span className={styles.cta}> · <a href="/register">Sign up</a> for more</span>}
          </>
        ) : (
          <>
            <strong>{remaining} / {limit}</strong> free check{remaining !== 1 ? 's' : ''} left today
          </>
        )}
      </span>
    </div>
  );
}
