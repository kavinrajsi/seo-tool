'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthProvider';

const FREE_DAILY_LIMIT = 3;
const AUTH_DAILY_LIMIT = 10;

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
      const response = await fetch('/api/usage-limit');
      const data = await response.json();

      if (response.ok) {
        const limit = user ? AUTH_DAILY_LIMIT : FREE_DAILY_LIMIT;
        setUsage({
          count: data.count || 0,
          limit,
          remaining: Math.max(0, limit - (data.count || 0)),
          loading: false,
        });
      } else {
        setUsage({
          count: 0,
          limit: user ? AUTH_DAILY_LIMIT : FREE_DAILY_LIMIT,
          remaining: user ? AUTH_DAILY_LIMIT : FREE_DAILY_LIMIT,
          loading: false,
        });
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error);
      setUsage({
        count: 0,
        limit: user ? AUTH_DAILY_LIMIT : FREE_DAILY_LIMIT,
        remaining: user ? AUTH_DAILY_LIMIT : FREE_DAILY_LIMIT,
        loading: false,
      });
    }
  };

  const incrementUsage = () => {
    setUsage(prev => ({
      ...prev,
      count: prev.count + 1,
      remaining: Math.max(0, prev.remaining - 1),
    }));
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
