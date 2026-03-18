// Rule-based SEO recommendations engine
// Maps check names to priority-ranked fix suggestions

const PRIORITY = { critical: 3, important: 2, suggestion: 1 };

const RULES = {
  "Has title": {
    priority: "critical",
    title: "Add a page title",
    fix: `Add a <title> tag inside <head>:\n\n<title>Your Page Title — Brand Name</title>`,
  },
  "Title length (30-60 chars)": {
    priority: "important",
    title: "Optimize title length",
    fix: `Keep your title between 30-60 characters. Longer titles get truncated in search results.\n\nBefore: "Welcome to Our Amazing Website That Sells Great Products Online"\nAfter: "Premium Products Online — Brand Name"`,
  },
  "Has meta description": {
    priority: "critical",
    title: "Add a meta description",
    fix: `Add a meta description in <head>:\n\n<meta name="description" content="A compelling 120-160 character description of your page content." />`,
  },
  "Description length (120-160 chars)": {
    priority: "important",
    title: "Optimize description length",
    fix: `Keep meta descriptions between 120-160 characters. Include your primary keyword and a call to action.`,
  },
  "Has H1": {
    priority: "critical",
    title: "Add an H1 heading",
    fix: `Every page needs exactly one <h1> tag that describes the page content:\n\n<h1>Your Main Page Heading</h1>`,
  },
  "Single H1": {
    priority: "important",
    title: "Use only one H1 tag",
    fix: `Multiple H1 tags dilute heading hierarchy. Keep one H1 for the main topic, use H2-H6 for subsections.`,
  },
  "Has H2 tags": {
    priority: "suggestion",
    title: "Add H2 subheadings",
    fix: `Break content into sections with H2 tags. This improves readability and helps search engines understand content structure.`,
  },
  "Has canonical URL": {
    priority: "important",
    title: "Set a canonical URL",
    fix: `Add a canonical tag to prevent duplicate content issues:\n\n<link rel="canonical" href="https://example.com/page" />`,
  },
  "Has Open Graph title": {
    priority: "important",
    title: "Add Open Graph title",
    fix: `Add OG tags for better social media sharing:\n\n<meta property="og:title" content="Your Page Title" />`,
  },
  "Has Open Graph description": {
    priority: "suggestion",
    title: "Add Open Graph description",
    fix: `<meta property="og:description" content="Description for social media sharing" />`,
  },
  "Has Open Graph image": {
    priority: "important",
    title: "Add Open Graph image",
    fix: `Add an OG image (recommended 1200x630px):\n\n<meta property="og:image" content="https://example.com/og-image.jpg" />`,
  },
  "Has viewport meta": {
    priority: "critical",
    title: "Add viewport meta tag",
    fix: `Required for mobile responsiveness:\n\n<meta name="viewport" content="width=device-width, initial-scale=1" />`,
  },
  "Has lang attribute": {
    priority: "important",
    title: "Set HTML lang attribute",
    fix: `Declare the page language:\n\n<html lang="en">`,
  },
  "Word count > 300": {
    priority: "suggestion",
    title: "Add more content",
    fix: `Pages with thin content rank poorly. Aim for 300+ words of unique, valuable content. For competitive keywords, 1000+ words often performs better.`,
  },
  "Has llms.txt": {
    priority: "suggestion",
    title: "Add llms.txt for AI discovery",
    fix: `Create a /llms.txt file to help AI search engines understand your site content. See llmstxt.org for the format specification.`,
  },
  "llms.txt properly formatted": {
    priority: "suggestion",
    title: "Fix llms.txt formatting",
    fix: `Ensure your llms.txt follows the standard format with proper markdown headings and URL references.`,
  },
  charsetDeclaration: {
    priority: "critical",
    title: "Declare character encoding",
    fix: `Add charset declaration as the first element in <head>:\n\n<meta charset="UTF-8" />`,
  },
  htmlPageSize: {
    priority: "important",
    title: "Reduce HTML page size",
    fix: `Keep HTML under 100KB. Minimize inline styles/scripts, remove unused code, and consider lazy-loading non-critical content.`,
  },
  domSize: {
    priority: "important",
    title: "Reduce DOM size",
    fix: `Keep DOM under 1500 nodes. Simplify nested layouts, remove hidden elements, and use virtual scrolling for long lists.`,
  },
  deprecatedHtmlTags: {
    priority: "suggestion",
    title: "Remove deprecated HTML tags",
    fix: `Replace deprecated tags like <center>, <font>, <marquee> with modern CSS equivalents.`,
  },
  metaRefresh: {
    priority: "important",
    title: "Remove meta refresh redirect",
    fix: `Replace <meta http-equiv="refresh"> with a server-side 301 redirect. Meta refreshes are bad for SEO and user experience.`,
  },
  noindexTag: {
    priority: "critical",
    title: "Remove noindex directive",
    fix: `Your page has a noindex tag preventing search engine indexing. If this is unintentional, remove:\n\n<meta name="robots" content="noindex" />`,
  },
  nofollowTag: {
    priority: "important",
    title: "Review nofollow directive",
    fix: `Your page has a nofollow tag preventing link equity flow. Only use this intentionally on pages you don't want to pass authority.`,
  },
  httpsTest: {
    priority: "critical",
    title: "Enable HTTPS",
    fix: `Serve your site over HTTPS. Install an SSL certificate and redirect all HTTP traffic to HTTPS. This is a ranking factor.`,
  },
  hstsTest: {
    priority: "important",
    title: "Enable HSTS",
    fix: `Add Strict-Transport-Security header to force HTTPS:\n\nStrict-Transport-Security: max-age=31536000; includeSubDomains`,
  },
  gzipTest: {
    priority: "important",
    title: "Enable compression",
    fix: `Enable gzip or Brotli compression on your server to reduce transfer size by 60-80%.`,
  },
  urlRedirects: {
    priority: "suggestion",
    title: "Fix URL redirects",
    fix: `Your URL redirects before reaching the final page. Update internal links to point directly to the canonical URL to avoid redirect chains.`,
  },
  wwwRedirectConsistency: {
    priority: "suggestion",
    title: "Ensure www/non-www consistency",
    fix: `Pick either www or non-www and redirect the other. Both versions serving content causes duplicate content issues.`,
  },
  "All images have alt text": {
    priority: "important",
    title: "Add alt text to all images",
    fix: `Every <img> needs descriptive alt text for accessibility and SEO:\n\n<img src="photo.jpg" alt="Description of the image content" />`,
  },
  responsiveImages: {
    priority: "suggestion",
    title: "Use responsive images",
    fix: `Add srcset and sizes attributes or use <picture> for responsive images:\n\n<img srcset="small.jpg 480w, large.jpg 1024w" sizes="(max-width: 600px) 480px, 1024px" />`,
  },
  modernImageFormat: {
    priority: "suggestion",
    title: "Use modern image formats",
    fix: `Convert images to WebP or AVIF for 25-50% smaller file sizes. Use <picture> for fallbacks:\n\n<picture>\n  <source srcset="image.webp" type="image/webp" />\n  <img src="image.jpg" alt="..." />\n</picture>`,
  },
  mixedContent: {
    priority: "critical",
    title: "Fix mixed content",
    fix: `Your HTTPS page loads HTTP resources, causing security warnings. Update all resource URLs to HTTPS.`,
  },
  unsafeCrossOriginLinks: {
    priority: "important",
    title: "Secure cross-origin links",
    fix: `Add rel="noopener noreferrer" to external links with target="_blank":\n\n<a href="https://external.com" target="_blank" rel="noopener noreferrer">Link</a>`,
  },
  plaintextEmails: {
    priority: "suggestion",
    title: "Protect email addresses",
    fix: `Plain text emails get harvested by spam bots. Use a contact form or obfuscate email addresses.`,
  },
  spfRecords: {
    priority: "suggestion",
    title: "Add SPF DNS record",
    fix: `Add an SPF record to your DNS to prevent email spoofing and improve email deliverability.`,
  },
  directoryListing: {
    priority: "critical",
    title: "Disable directory listing",
    fix: `Directory listing exposes your file structure. Disable it in your server config or add an index.html to each directory.`,
  },
  structuredData: {
    priority: "important",
    title: "Add structured data",
    fix: `Add JSON-LD structured data for rich search results:\n\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "WebPage",\n  "name": "Page Title",\n  "description": "Page description"\n}\n</script>`,
  },
  faviconTest: {
    priority: "suggestion",
    title: "Add a favicon",
    fix: `Add a favicon for brand recognition in browser tabs:\n\n<link rel="icon" href="/favicon.ico" />`,
  },
  robotsTxt: {
    priority: "important",
    title: "Add robots.txt",
    fix: `Create a /robots.txt file to guide search engine crawlers:\n\nUser-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml`,
  },
  custom404Page: {
    priority: "suggestion",
    title: "Create a custom 404 page",
    fix: `Add a helpful 404 page with navigation links to help users find what they're looking for.`,
  },
  renderBlockingResources: {
    priority: "important",
    title: "Eliminate render-blocking resources",
    fix: `Defer non-critical CSS/JS:\n\n<script src="app.js" defer></script>\n<link rel="preload" href="style.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />`,
  },
  jsMinification: {
    priority: "suggestion",
    title: "Minify JavaScript",
    fix: `Minify JS files to reduce size. Use build tools like Terser, esbuild, or your framework's built-in minification.`,
  },
  cssMinification: {
    priority: "suggestion",
    title: "Minify CSS",
    fix: `Minify CSS files to remove whitespace and comments. Most frameworks do this automatically in production builds.`,
  },
  cdnUsage: {
    priority: "suggestion",
    title: "Use a CDN",
    fix: `Serve static assets through a CDN for faster global delivery. Vercel, Cloudflare, and AWS CloudFront are popular options.`,
  },
  totalPageRequests: {
    priority: "important",
    title: "Reduce page requests",
    fix: `Keep total requests under 30. Combine CSS/JS files, use sprites or inline SVGs, and lazy-load below-the-fold resources.`,
  },
  serverResponseTime: {
    priority: "important",
    title: "Improve server response time",
    fix: `Target under 1 second TTFB. Optimize database queries, enable caching, use a CDN, and consider upgrading your hosting.`,
  },
};

export function getRecommendations(checks) {
  if (!checks || !Array.isArray(checks)) return [];

  const recommendations = [];

  for (const check of checks) {
    if (check.status === "pass") continue;

    const rule = RULES[check.name];
    if (!rule) continue;

    recommendations.push({
      checkName: check.name,
      category: check.category,
      status: check.status,
      priority: rule.priority,
      priorityValue: PRIORITY[rule.priority] || 0,
      title: rule.title,
      fix: rule.fix,
      message: check.message || "",
    });
  }

  // Sort by priority (critical first), then by status (fail before warning)
  recommendations.sort((a, b) => {
    if (b.priorityValue !== a.priorityValue) return b.priorityValue - a.priorityValue;
    if (a.status === "fail" && b.status !== "fail") return -1;
    if (b.status === "fail" && a.status !== "fail") return 1;
    return 0;
  });

  return recommendations;
}
