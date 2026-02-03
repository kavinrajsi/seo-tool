import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const isProduction = process.env.VERCEL || process.env.NODE_ENV === 'production';
const LIGHTHOUSE_SERVICE_URL = process.env.LIGHTHOUSE_SERVICE_URL;

export async function runLighthouse(url, options = {}) {
  // Use external Lighthouse service in production if configured
  if (isProduction && LIGHTHOUSE_SERVICE_URL) {
    return runExternalLighthouse(url, options);
  }

  // Fallback to PageSpeed API in production if no external service
  if (isProduction && !LIGHTHOUSE_SERVICE_URL) {
    console.log('Using PageSpeed API fallback in production');
    return runPageSpeedFallback(url, options);
  }

  // Run local Lighthouse in development
  return runLocalLighthouse(url, options);
}

async function runLocalLighthouse(url, options = {}) {
  let chrome;

  try {
    chrome = await chromeLauncher.launch({
      chromeFlags: ['--headless', '--no-sandbox', '--disable-dev-shm-usage'],
    });

    const lighthouseOptions = {
      logLevel: 'error',
      output: 'json',
      onlyCategories: options.categories || ['performance', 'accessibility', 'best-practices', 'seo'],
      port: chrome.port,
      formFactor: options.formFactor || 'mobile',
      screenEmulation: {
        mobile: options.formFactor !== 'desktop',
        width: options.formFactor === 'desktop' ? 1350 : 360,
        height: options.formFactor === 'desktop' ? 940 : 640,
        deviceScaleFactor: options.formFactor === 'desktop' ? 1 : 2.625,
      },
    };

    const runnerResult = await lighthouse(url, lighthouseOptions);

    if (!runnerResult || !runnerResult.lhr) {
      throw new Error('Lighthouse did not return valid results');
    }

    return formatLighthouseResults(runnerResult.lhr);
  } catch (error) {
    console.error('Lighthouse error:', error);
    return { error: error.message || 'lighthouse_failed' };
  } finally {
    if (chrome) {
      await chrome.kill();
    }
  }
}

async function runExternalLighthouse(url, options = {}) {
  try {
    const response = await fetch(LIGHTHOUSE_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, formFactor: options.formFactor || 'mobile' }),
    });

    if (!response.ok) {
      throw new Error(`External service returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('External Lighthouse service error:', error);
    return { error: error.message || 'external_service_failed' };
  }
}

async function runPageSpeedFallback(url, options = {}) {
  const apiKey = process.env.PAGESPEED_API_KEY || '';
  const base = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';
  const categoryParams = '&category=performance&category=accessibility&category=best-practices&category=seo';
  const keyParam = apiKey ? `&key=${apiKey}` : '';
  const strategy = options.formFactor === 'desktop' ? 'desktop' : 'mobile';
  const apiUrl = `${base}?url=${encodeURIComponent(url)}${categoryParams}${keyParam}&strategy=${strategy}`;

  try {
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(60000) });
    if (!res.ok) return { error: `pagespeed_http_${res.status}` };

    const data = await res.json();
    return formatPageSpeedResults(data);
  } catch (error) {
    console.error('PageSpeed API error:', error);
    return { error: 'pagespeed_failed' };
  }
}

function formatPageSpeedResults(data) {
  const categories = {};
  const lighthouseCategories = data.lighthouseResult?.categories || {};

  for (const [key, cat] of Object.entries(lighthouseCategories)) {
    categories[key] = Math.round((cat.score || 0) * 100);
  }

  const audits = data.lighthouseResult?.audits || {};
  const metrics = {};

  const metricMap = {
    'first-contentful-paint': { label: 'First Contentful Paint (FCP)', key: 'fcp' },
    'largest-contentful-paint': { label: 'Largest Contentful Paint (LCP)', key: 'lcp' },
    'total-blocking-time': { label: 'Total Blocking Time (TBT)', key: 'tbt' },
    'cumulative-layout-shift': { label: 'Cumulative Layout Shift (CLS)', key: 'cls' },
    'speed-index': { label: 'Speed Index', key: 'si' },
    'interactive': { label: 'Time to Interactive (TTI)', key: 'tti' },
  };

  for (const [auditKey, meta] of Object.entries(metricMap)) {
    const audit = audits[auditKey];
    if (audit) {
      metrics[meta.key] = {
        value: audit.numericValue,
        display: audit.displayValue,
        score: audit.score,
        label: meta.label,
      };
    }
  }

  const opportunities = [];
  const opportunityKeys = [
    'render-blocking-resources', 'uses-optimized-images', 'uses-responsive-images',
    'unminified-css', 'unminified-javascript', 'unused-css-rules', 'unused-javascript',
    'uses-text-compression', 'uses-rel-preconnect', 'efficient-animated-content',
    'offscreen-images', 'modern-image-formats',
  ];

  for (const key of opportunityKeys) {
    const audit = audits[key];
    if (audit && audit.score !== null && audit.score < 0.9 && audit.title) {
      opportunities.push({
        title: audit.title,
        description: audit.description,
        displayValue: audit.displayValue || null,
        score: audit.score,
      });
    }
  }

  return {
    categories,
    metrics,
    opportunities,
    performanceScore: categories.performance ?? null,
    seoScore: categories.seo ?? null,
    accessibilityScore: categories.accessibility ?? null,
    bestPracticesScore: categories['best-practices'] ?? null,
    fetchTime: data.lighthouseResult?.fetchTime,
    finalUrl: data.lighthouseResult?.finalUrl,
    usingFallback: true,
  };
}

function formatLighthouseResults(lhr) {
  const categories = {};

  for (const [key, category] of Object.entries(lhr.categories || {})) {
    categories[key] = Math.round((category.score || 0) * 100);
  }

  const audits = lhr.audits || {};
  const metrics = {};

  const metricMap = {
    'first-contentful-paint': { label: 'First Contentful Paint (FCP)', key: 'fcp' },
    'largest-contentful-paint': { label: 'Largest Contentful Paint (LCP)', key: 'lcp' },
    'total-blocking-time': { label: 'Total Blocking Time (TBT)', key: 'tbt' },
    'cumulative-layout-shift': { label: 'Cumulative Layout Shift (CLS)', key: 'cls' },
    'speed-index': { label: 'Speed Index', key: 'si' },
    'interactive': { label: 'Time to Interactive (TTI)', key: 'tti' },
    'max-potential-fid': { label: 'Max Potential FID', key: 'fid' },
  };

  for (const [auditKey, meta] of Object.entries(metricMap)) {
    const audit = audits[auditKey];
    if (audit) {
      metrics[meta.key] = {
        value: audit.numericValue,
        display: audit.displayValue,
        score: audit.score,
        label: meta.label,
      };
    }
  }

  const opportunityAudits = [
    'render-blocking-resources',
    'uses-optimized-images',
    'uses-responsive-images',
    'unminified-css',
    'unminified-javascript',
    'unused-css-rules',
    'unused-javascript',
    'uses-text-compression',
    'uses-rel-preconnect',
    'efficient-animated-content',
    'offscreen-images',
    'modern-image-formats',
    'uses-long-cache-ttl',
    'dom-size',
    'critical-request-chains',
    'user-timings',
    'bootup-time',
    'mainthread-work-breakdown',
    'font-display',
    'third-party-summary',
  ];

  const opportunities = [];
  for (const auditKey of opportunityAudits) {
    const audit = audits[auditKey];
    if (audit && audit.score !== null && audit.score < 0.9 && audit.title) {
      opportunities.push({
        title: audit.title,
        description: audit.description,
        displayValue: audit.displayValue || null,
        score: audit.score,
      });
    }
  }

  return {
    categories,
    metrics,
    opportunities,
    performanceScore: categories.performance ?? null,
    seoScore: categories.seo ?? null,
    accessibilityScore: categories.accessibility ?? null,
    bestPracticesScore: categories['best-practices'] ?? null,
    fetchTime: lhr.fetchTime,
    finalUrl: lhr.finalUrl,
    userAgent: lhr.userAgent,
  };
}
