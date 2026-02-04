const CACHE_PREFIX = 'seo_analysis_';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Store analysis result in localStorage with expiry
 */
export function cacheAnalysisResult(url, data) {
  try {
    const cacheKey = CACHE_PREFIX + normalizeUrl(url);
    const cacheData = {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + CACHE_DURATION,
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Failed to cache result:', error);
    // Fail silently - caching is optional
  }
}

/**
 * Get cached analysis result if not expired
 */
export function getCachedAnalysisResult(url) {
  try {
    const cacheKey = CACHE_PREFIX + normalizeUrl(url);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const cacheData = JSON.parse(cached);

    // Check if expired
    if (Date.now() > cacheData.expiresAt) {
      localStorage.removeItem(cacheKey);
      return null;
    }

    return cacheData.data;
  } catch (error) {
    console.error('Failed to get cached result:', error);
    return null;
  }
}

/**
 * Clear all expired cache entries
 */
export function cleanupExpiredCache() {
  try {
    const keys = Object.keys(localStorage);
    const now = Date.now();

    keys.forEach(key => {
      if (key.startsWith(CACHE_PREFIX)) {
        try {
          const cached = JSON.parse(localStorage.getItem(key));
          if (cached && now > cached.expiresAt) {
            localStorage.removeItem(key);
          }
        } catch {
          // Invalid cache entry, remove it
          localStorage.removeItem(key);
        }
      }
    });
  } catch (error) {
    console.error('Failed to cleanup cache:', error);
  }
}

/**
 * Clear cache for specific URL
 */
export function clearCachedResult(url) {
  try {
    const cacheKey = CACHE_PREFIX + normalizeUrl(url);
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

/**
 * Get time remaining until cache expires
 */
export function getCacheTimeRemaining(url) {
  try {
    const cacheKey = CACHE_PREFIX + normalizeUrl(url);
    const cached = localStorage.getItem(cacheKey);

    if (!cached) {
      return null;
    }

    const cacheData = JSON.parse(cached);
    const remaining = cacheData.expiresAt - Date.now();

    if (remaining <= 0) {
      return null;
    }

    return remaining;
  } catch (error) {
    return null;
  }
}

/**
 * Normalize URL for consistent cache keys
 */
function normalizeUrl(url) {
  try {
    // Remove protocol and www, lowercase
    let normalized = url.toLowerCase().trim();
    normalized = normalized.replace(/^(https?:\/\/)?(www\.)?/, '');
    normalized = normalized.replace(/\/$/, ''); // Remove trailing slash
    return normalized;
  } catch {
    return url;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  try {
    const keys = Object.keys(localStorage);
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    const now = Date.now();

    let validCount = 0;
    let expiredCount = 0;

    cacheKeys.forEach(key => {
      try {
        const cached = JSON.parse(localStorage.getItem(key));
        if (cached && now <= cached.expiresAt) {
          validCount++;
        } else {
          expiredCount++;
        }
      } catch {
        expiredCount++;
      }
    });

    return {
      total: cacheKeys.length,
      valid: validCount,
      expired: expiredCount,
    };
  } catch {
    return { total: 0, valid: 0, expired: 0 };
  }
}
