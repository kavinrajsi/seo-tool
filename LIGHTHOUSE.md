# Lighthouse Integration Guide

This project now uses Lighthouse for comprehensive SEO and performance audits.

## What Changed

### 1. Direct Lighthouse Audits (Replaces PageSpeed API)

The analyze API now runs Lighthouse directly on your server instead of using the Google PageSpeed API.

**Benefits:**
- No API rate limits
- Full control over audit configuration
- More detailed results
- Faster for bulk scans

**Requirements:**
- Chrome/Chromium is launched automatically by `chrome-launcher`
- Requires sufficient server resources (CPU/memory)

### 2. Lighthouse CI for Your App

Monitor your own app's performance over time.

## Usage

### Running Lighthouse CI Manually

```bash
# Start your dev server first
npm run dev

# In another terminal, run Lighthouse CI
npm run lhci
```

Or run against production build:

```bash
npm run lighthouse
```

This will:
1. Build your Next.js app
2. Start the production server
3. Run Lighthouse audits on configured URLs
4. Upload results to temporary public storage (7-day retention)

### GitHub Actions (Automated)

The `.github/workflows/lighthouse-ci.yml` workflow automatically runs Lighthouse CI on:
- Every push to `main`
- Every pull request to `main`

Results are uploaded as artifacts and can be viewed in the Actions tab.

### Configuring URLs to Test

Edit `lighthouserc.js` to change which pages are audited:

```javascript
collect: {
  url: [
    'http://localhost:3000',
    'http://localhost:3000/login',
    'http://localhost:3000/dashboard',
    // Add more URLs here
  ],
}
```

### Adjusting Performance Thresholds

Edit the `assert.assertions` section in `lighthouserc.js`:

```javascript
assertions: {
  'categories:performance': ['warn', { minScore: 0.8 }], // 80%
  'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }], // 2.5s
  // etc.
}
```

## Lighthouse Results Storage

By default, results are stored temporarily (7 days) using Lighthouse's free public storage.

### Setting Up Permanent Storage (Optional)

For long-term tracking, set up a Lighthouse CI server:

1. Deploy a LHCI server (see https://github.com/GoogleChrome/lighthouse-ci/blob/main/docs/server.md)
2. Update `lighthouserc.js`:

```javascript
upload: {
  target: 'lhci',
  serverBaseUrl: 'https://your-lhci-server.com',
  token: process.env.LHCI_TOKEN,
}
```

3. Add `LHCI_TOKEN` to your environment variables

## Viewing Results

After running `npm run lhci`, you'll get:
- Console output with scores
- A public URL to view full HTML reports (7-day retention)
- JSON results in `.lighthouseci/` directory

## Core Web Vitals Tracked

The setup tracks all Core Web Vitals:
- **LCP** (Largest Contentful Paint) - Target: <2.5s
- **FID/TBT** (First Input Delay/Total Blocking Time) - Target: <300ms
- **CLS** (Cumulative Layout Shift) - Target: <0.1
- **FCP** (First Contentful Paint) - Target: <2.0s
- **TTI** (Time to Interactive)
- **Speed Index**

## Environment Variables

For production deployments, you may want to set:

- `LHCI_GITHUB_APP_TOKEN` - For GitHub status checks (optional)
- `LHCI_TOKEN` - For permanent LHCI server storage (optional)

## Troubleshooting

### "Chrome didn't launch" error

If Lighthouse can't launch Chrome:

```bash
# Install Chrome/Chromium dependencies on Linux
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 \
  libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2
```

### Timeouts during analysis

If target URLs are slow, increase timeout in `src/lib/lighthouse.js`:

```javascript
const runnerResult = await lighthouse(url, lighthouseOptions, null, 60000); // 60s
```

## Next Steps

1. Run `npm run lhci` to test your local app
2. Push to GitHub to trigger automated CI audits
3. Monitor performance trends over time
4. Set up alerts for performance regressions
