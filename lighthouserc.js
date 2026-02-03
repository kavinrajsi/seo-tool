module.exports = {
  ci: {
    collect: {
      // URLs to test (adjust based on your needs)
      url: [
        'http://localhost:3000',
        'http://localhost:3000/login',
        'http://localhost:3000/dashboard',
      ],
      numberOfRuns: 3, // Run 3 times and take median
      settings: {
        preset: 'desktop', // or 'mobile'
        // Optionally add authentication headers if needed
        // extraHeaders: JSON.stringify({ Cookie: 'session=...' }),
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.9 }],

        // Core Web Vitals thresholds
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'temporary-public-storage', // Free temporary storage for 7 days
      // For permanent storage, use 'lhci' and set up a LHCI server
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
      // token: process.env.LHCI_TOKEN,
    },
  },
};
