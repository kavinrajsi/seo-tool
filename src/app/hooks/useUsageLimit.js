'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';

const FREE_DAILY_LIMIT = 3;
const AUTH_DAILY_LIMIT = 10;
const STORAGE_KEY = 'seo_usage_limit';

// Helper to get today's date string (YYYY-MM-DD)
function getTodayString() {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

// Get anonymous user usage from localStorage
function getAnonymousUsage() {
  if (typeof window === 'undefined') return 0;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return 0;

    const data = JSON.parse(stored);
    const today = getTodayString();

    // If stored date is different from today, reset count
    if (data.date !== today) {
      localStorage.removeItem(STORAGE_KEY);
      return 0;
    }

    return data.count || 0;
  } catch {
    return 0;
  }
}

// Set anonymous user usage in localStorage
function setAnonymousUsage(count) {
  if (typeof window === 'undefined') return;

  try {
    const today = getTodayString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: today,
      count,
    }));
  } catch (error) {
    console.error('Failed to store usage:', error);
  }
}

export function useUsageLimit() {
  const { user } = useAuth();
  const [usage, setUsage] = useState({
    count: 0,
    limit: FREE_DAILY_LIMIT,
    remaining: FREE_DAILY_LIMIT,
    loading: true,
  });

  useEffect(() => {
    fetchUsage();
  }, [user]);

  const fetchUsage = async () => {
    try {
      if (!user) {
        // For anonymous users, use localStorage
        const count = getAnonymousUsage();
        setUsage({
          count,
          limit: FREE_DAILY_LIMIT,
          remaining: Math.max(0, FREE_DAILY_LIMIT - count),
          loading: false,
        });
        return;
      }

      // For authenticated users, fetch from API
      const response = await fetch('/api/usage-limit');
      const data = await response.json();

      if (response.ok) {
        setUsage({
          count: data.count || 0,
          limit: AUTH_DAILY_LIMIT,
          remaining: Math.max(0, AUTH_DAILY_LIMIT - (data.count || 0)),
          loading: false,
        });
      } else {
        setUsage({
          count: 0,
          limit: AUTH_DAILY_LIMIT,
          remaining: AUTH_DAILY_LIMIT,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      const limit = user ? AUTH_DAILY_LIMIT : FREE_DAILY_LIMIT;
      setUsage({
        count: 0,
        limit,
        remaining: limit,
        loading: false,
      });
    }
  };

  const incrementUsage = () => {
    setUsage(prev => {
      const newCount = prev.count + 1;
      const newRemaining = Math.max(0, prev.remaining - 1);

      // Store in localStorage for anonymous users
      if (!user) {
        setAnonymousUsage(newCount);
      }

      return {
        ...prev,
        count: newCount,
        remaining: newRemaining,
      };
    });
  };

  const hasReachedLimit = () => {
    return usage.remaining <= 0;
  };

  return {
    ...usage,
    incrementUsage,
    hasReachedLimit,
    refreshUsage: fetchUsage,
  };
}
