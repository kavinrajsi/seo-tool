'use client';

import { useReportWebVitals } from 'next/web-vitals';

export default function WebVitals() {
  useReportWebVitals((metric) => {
    // Log metrics in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Web Vital:', metric);
    }

    // Send to analytics endpoint in production
    if (process.env.NODE_ENV === 'production') {
      const body = JSON.stringify({
        name: metric.name,
        value: metric.value,
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType,
      });

      // Send to your analytics endpoint
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics', body);
      } else {
        fetch('/api/analytics', {
          body,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          keepalive: true,
        }).catch(console.error);
      }
    }
  });

  return null;
}
