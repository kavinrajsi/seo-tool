"use client";

import { useState, createContext, useContext } from "react";

const AccordionContext = createContext(null);
import Link from "next/link";
import {
  SearchIcon,
  GlobeIcon,
  LinkIcon,
  GaugeIcon,
  MapPinIcon,
  TrendingUpIcon,
  Unlink,
  ShieldCheckIcon,
  FileTextIcon,
  BellIcon,
  BotIcon,
  ZapIcon,
  SparklesIcon,
  QrCodeIcon,
  BarChart3Icon,
  InstagramIcon,
  CalendarIcon,
  SwordsIcon,
  NewspaperIcon,
  FolderIcon,
  UsersIcon,
  UserIcon,
  SettingsIcon,
  BookOpenIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  FileDownIcon,
  KeyIcon,
  ShieldIcon,
  MailIcon,
  StarIcon,
  ShoppingCartIcon,
  LayoutDashboardIcon,
  SmileIcon,
} from "lucide-react";

function Section({ id, icon: Icon, title, children }) {
  const { openSection, setOpenSection } = useContext(AccordionContext);
  const isOpen = openSection === id;
  return (
    <div id={id} className="rounded-lg border border-border bg-card scroll-mt-20">
      <button
        onClick={() => setOpenSection(isOpen ? null : id)}
        className="flex w-full items-center justify-between p-5 text-left"
      >
        <h2 className="text-base font-semibold flex items-center gap-2.5">
          {Icon && <Icon className="h-5 w-5 text-primary" />}
          {title}
        </h2>
        {isOpen ? (
          <ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-border pt-4 prose-sm">
          {children}
        </div>
      )}
    </div>
  );
}

function Step({ number, children }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
        {number}
      </span>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="rounded-md border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm text-blue-400 mt-3">
      <strong>Tip:</strong> {children}
    </div>
  );
}

function NavLink({ href, children }) {
  return (
    <Link href={href} className="text-primary hover:underline inline-flex items-center gap-1 text-sm">
      {children} <ExternalLinkIcon className="h-3 w-3" />
    </Link>
  );
}

const TOC = [
  { id: "getting-started", label: "Getting Started" },
  { id: "seo-analyzer", label: "SEO Analyzer" },
  { id: "site-crawler", label: "Site Crawler" },
  { id: "backlinks", label: "Backlinks Checker" },
  { id: "speed-monitor", label: "Site Speed & Performance" },
  { id: "keyword-tracker", label: "Keyword Tracker" },
  { id: "broken-links", label: "Broken Link Checker" },
  { id: "validators", label: "Validators" },
  { id: "sitemap-generator", label: "Sitemap Generator" },
  { id: "monitoring", label: "SEO Monitoring" },
  { id: "llms-generator", label: "LLMs.txt Generator" },
  { id: "indexnow", label: "IndexNow" },
  { id: "ai-assistant", label: "AI Assistant" },
  { id: "qr-generator", label: "QR Code Generator" },
  { id: "analytics", label: "Google Analytics" },
  { id: "cloudflare", label: "Cloudflare Analytics" },
  { id: "google-reviews", label: "Google Reviews" },
  { id: "shopify", label: "Shopify Integration" },
  { id: "content-social", label: "Content & Social" },
  { id: "basecamp", label: "Basecamp Integration" },
  { id: "pm-dashboard", label: "PM Dashboard" },
  { id: "employees", label: "Employees" },
  { id: "departments", label: "Departments" },
  { id: "candidates", label: "Candidates (Recruiting)" },
  { id: "leave", label: "Leave Management" },
  { id: "holidays", label: "Holiday Calendar" },
  { id: "email-templates", label: "Email Templates" },
  { id: "performance", label: "Performance Management" },
  { id: "engagement", label: "Employee Engagement" },
  { id: "capacity", label: "Capacity Check-in" },
  { id: "devices", label: "Device Management" },
  { id: "events", label: "Events" },
  { id: "habits", label: "Daily Habits & Goals" },
  { id: "hard-disk", label: "Hard Disk" },
  { id: "software-renewals", label: "Software Renewals" },
  { id: "roadmap", label: "Roadmap" },
  { id: "admin", label: "Admin & Roles" },
  { id: "pdf-export", label: "PDF Export" },
  { id: "serp-preview", label: "SERP & Social Previews" },
  { id: "recommendations", label: "SEO Recommendations" },
  { id: "settings", label: "Settings & Preferences" },
  { id: "profile", label: "Profile & Account" },
  { id: "keyboard", label: "Keyboard Shortcuts" },
  { id: "faq", label: "FAQ" },
];

export default function Help() {
  const [search, setSearch] = useState("");
  const [openSection, setOpenSection] = useState(null);

  const filtered = search
    ? TOC.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()))
    : TOC;

  return (
    <div className="flex flex-1 gap-6 py-4">
      {/* Sticky table of contents */}
      <div className="hidden lg:block w-56 shrink-0">
        <div className="sticky top-4 space-y-1 max-h-[calc(100vh-120px)] overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
            Contents
          </p>
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setOpenSection(item.id);
                setTimeout(() => {
                  document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }, 50);
              }}
              className={`block w-full text-left rounded-md px-2 py-1.5 text-xs transition-colors truncate ${
                openSection === item.id
                  ? "text-foreground bg-accent/50 font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/30"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <AccordionContext.Provider value={{ openSection, setOpenSection }}>
      <div className="flex-1 space-y-4 max-w-4xl">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <BookOpenIcon className="h-6 w-6 text-primary" />
            Help & Documentation
          </h1>
          <p className="text-muted-foreground mt-1">
            Everything you need to know about using the SEO Tool platform.
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search documentation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-border bg-card pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>

        {/* ═══ Getting Started ═══ */}
        <Section id="getting-started" icon={BookOpenIcon} title="Getting Started">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Welcome to the SEO Tool — an all-in-one platform for SEO analysis, content generation, site monitoring, and team collaboration.
            </p>
            <h3 className="text-sm font-semibold mt-4">Quick Start</h3>
            <div className="space-y-2">
              <Step number={1}>Create an account or sign in at <NavLink href="/signin">Sign In</NavLink></Step>
              <Step number={2}>Navigate to <NavLink href="/seo">SEO Analyzer</NavLink> and enter any URL to get your first analysis</Step>
              <Step number={3}>Connect Google in <NavLink href="/ga">Analytics</NavLink> to unlock Search Console and keyword tracking</Step>
              <Step number={4}>Set up <NavLink href="/monitoring">Monitoring</NavLink> to get email alerts when your SEO score drops</Step>
              <Step number={5}>Explore <NavLink href="/devices">Devices</NavLink>, <NavLink href="/employees">HR</NavLink>, <NavLink href="/events">Events</NavLink>, and <NavLink href="/habits">Habits</NavLink> modules</Step>
            </div>
            <Tip>All your data is automatically saved. Only @madarth.com accounts can sign in.</Tip>
          </div>
        </Section>

        {/* ═══ SEO Tools ═══ */}
        <Section id="seo-analyzer" icon={SearchIcon} title="SEO Analyzer">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              The SEO Analyzer runs 40+ checks on any URL and generates a comprehensive score from 0-100.
            </p>
            <h3 className="text-sm font-semibold">How to Use</h3>
            <div className="space-y-2">
              <Step number={1}>Enter a URL in the search bar (e.g., <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5">example.com</code>)</Step>
              <Step number={2}>Click "Analyze" and wait for the results</Step>
              <Step number={3}>Review your score, category breakdowns, and individual checks</Step>
              <Step number={4}>Scroll down for SERP previews, recommendations, and keyword analysis</Step>
            </div>
            <h3 className="text-sm font-semibold mt-4">Categories Checked</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>On-Page SEO</strong> — title, meta description, H1/H2 tags, Open Graph, canonical URL, viewport</li>
              <li><strong>Technical SEO</strong> — HTTPS, HSTS, gzip, charset, DOM size, redirects, noindex/nofollow</li>
              <li><strong>Content</strong> — word count, keywords, llms.txt validation</li>
              <li><strong>Images</strong> — alt text, responsive images, modern formats</li>
              <li><strong>Security</strong> — mixed content, cross-origin links, email exposure, SPF records</li>
              <li><strong>Structured Data</strong> — Schema.org, favicon, robots.txt, ads.txt, custom 404</li>
              <li><strong>Performance</strong> — render-blocking resources, JS/CSS minification, CDN usage, response time</li>
            </ul>
            <Tip>Click "Full Report" to generate a branded PDF combining SEO analysis with PageSpeed and crawl data.</Tip>
          </div>
        </Section>

        <Section id="site-crawler" icon={GlobeIcon} title="Site Crawler">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Crawls up to 50 pages of your site using BFS (breadth-first search), analyzing HTTP status codes, sitemap coverage, crawl depth, internal links, markup types, canonicalization, hreflang, and AMP links.
            </p>
            <h3 className="text-sm font-semibold">Key Metrics</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>HTTP Status Codes</strong> — 2xx, 3xx, 4xx, 5xx distribution</li>
              <li><strong>Sitemap Coverage</strong> — pages in sitemap vs crawled pages</li>
              <li><strong>Crawl Depth</strong> — how many clicks from homepage</li>
              <li><strong>Incoming Links</strong> — orphan pages with zero internal links</li>
              <li><strong>Markup</strong> — Schema.org, Open Graph, Twitter Cards, Microformats</li>
            </ul>
            <Tip>Switch between Tile and Graph views for different visualization styles.</Tip>
          </div>
        </Section>

        <Section id="backlinks" icon={LinkIcon} title="Backlinks Checker">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Analyzes backlinks pointing to your domain. Enter a domain name to discover referring domains, anchor text distribution, and link quality metrics. Results are saved automatically for historical comparison.
          </p>
        </Section>

        <Section id="speed-monitor" icon={GaugeIcon} title="Site Speed & Outage">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Uses the Google PageSpeed Insights API to measure Core Web Vitals and performance metrics.
            </p>
            <h3 className="text-sm font-semibold">Metrics Measured</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>First Contentful Paint (FCP)</li>
              <li>Largest Contentful Paint (LCP)</li>
              <li>Cumulative Layout Shift (CLS)</li>
              <li>Total Blocking Time (TBT)</li>
              <li>Speed Index</li>
              <li>Overall Performance Score</li>
            </ul>
            <Tip>Toggle between Mobile and Desktop strategies to compare performance across devices.</Tip>
          </div>
        </Section>

        <Section id="keyword-tracker" icon={TrendingUpIcon} title="Keyword Tracker">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track keyword positions over time using Google Search Console data. Requires a connected Google account.
            </p>
            <h3 className="text-sm font-semibold">How to Use</h3>
            <div className="space-y-2">
              <Step number={1}>Connect Google account in <NavLink href="/ga">Analytics</NavLink></Step>
              <Step number={2}>Select your Search Console property</Step>
              <Step number={3}>Type a keyword and click "Add Keyword"</Step>
              <Step number={4}>View position history, impressions, and clicks over time</Step>
            </div>
            <Tip>Click any keyword row to see detailed position and click charts below the table.</Tip>
          </div>
        </Section>

        <Section id="broken-links" icon={Unlink} title="Broken Link Checker">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Crawls up to 50 pages and checks up to 200 external links to find dead URLs on your site.
            </p>
            <h3 className="text-sm font-semibold">What It Reports</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Source page</strong> — where the broken link was found</li>
              <li><strong>Broken URL</strong> — the dead link</li>
              <li><strong>Link text</strong> — the anchor text used</li>
              <li><strong>Type</strong> — internal or external</li>
              <li><strong>Status code</strong> — 404, 500, timeout, etc.</li>
            </ul>
            <Tip>Filter by internal/external to focus on the links you can fix first.</Tip>
          </div>
        </Section>

        <Section id="validators" icon={ShieldCheckIcon} title="Robots.txt & Sitemap Validator">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Two-tab validator for checking your robots.txt rules and sitemap XML structure.
            </p>
            <h3 className="text-sm font-semibold">Robots.txt Tab</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Parses all User-agent groups and rules</li>
              <li>Flags issues (missing wildcard group, invalid directives)</li>
              <li>Lists referenced sitemaps</li>
              <li><strong>URL Tester</strong> — test any path against the rules to see if it's blocked or allowed</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Sitemap Tab</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Validates XML structure and namespace</li>
              <li>Checks priority, changefreq, lastmod values</li>
              <li>Spot-checks 5 URLs for reachability</li>
              <li>Reports the total URL count and any issues</li>
            </ul>
          </div>
        </Section>

        <Section id="sitemap-generator" icon={FileTextIcon} title="Sitemap Generator">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Generate XML sitemaps from a fresh crawl or existing crawl data.
            </p>
            <div className="space-y-2">
              <Step number={1}>Enter a URL or select from recent crawls</Step>
              <Step number={2}>Select/deselect URLs to include</Step>
              <Step number={3}>Set priority, changefreq, and lastmod per URL</Step>
              <Step number={4}>Click "Generate Sitemap XML"</Step>
              <Step number={5}>Copy or download the generated sitemap.xml</Step>
            </div>
          </div>
        </Section>

        <Section id="monitoring" icon={BellIcon} title="SEO Monitoring & Alerts">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Automatically re-analyze URLs every 6 hours and get email alerts when SEO scores drop.
            </p>
            <h3 className="text-sm font-semibold">How to Set Up</h3>
            <div className="space-y-2">
              <Step number={1}>Enter a URL to monitor</Step>
              <Step number={2}>Set your alert email and score drop threshold (default: 10 points)</Step>
              <Step number={3}>Click "Monitor" — the URL will be checked every 6 hours automatically</Step>
              <Step number={4}>View score history sparklines and recent alerts</Step>
            </div>
            <h3 className="text-sm font-semibold mt-3">Controls</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Refresh icon</strong> — run a manual check immediately</li>
              <li><strong>Pause/Play</strong> — temporarily disable monitoring without deleting</li>
              <li><strong>Trash</strong> — remove a monitored URL</li>
            </ul>
            <Tip>Requires a Resend API key configured in your environment for email delivery. Set <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5">RESEND_API_KEY</code> in your .env.local.</Tip>
          </div>
        </Section>

        <Section id="llms-generator" icon={BotIcon} title="LLMs.txt Generator">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Auto-generate an llms.txt file so AI chatbots and search engines can properly index and cite your site.
            </p>
            <div className="space-y-2">
              <Step number={1}>Enter your site URL</Step>
              <Step number={2}>The tool crawls your site and analyzes the homepage</Step>
              <Step number={3}>An llms.txt is auto-generated with pages, topics, and structured data</Step>
              <Step number={4}>Customize the site name and description, then regenerate</Step>
              <Step number={5}>Copy or download and place at <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5">yoursite.com/llms.txt</code></Step>
            </div>
            <Tip>For Next.js sites, put the file in the <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5">public/</code> directory.</Tip>
          </div>
        </Section>

        <Section id="indexnow" icon={ZapIcon} title="IndexNow">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Instantly notify Bing, Yandex, Naver, and Seznam when pages are created, updated, or deleted using the IndexNow protocol.
            </p>
            <h3 className="text-sm font-semibold">Setup</h3>
            <div className="space-y-2">
              <Step number={1}>Generate an API key (or enter your existing one)</Step>
              <Step number={2}>Host a verification file at <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5">yoursite.com/{"<key>"}.txt</code> containing your key</Step>
              <Step number={3}>Add URLs individually or paste in bulk</Step>
              <Step number={4}>Click "Submit to IndexNow"</Step>
            </div>
            <Tip>Submit URLs after every deploy to get pages indexed faster.</Tip>
          </div>
        </Section>

        {/* ═══ AI Tools ═══ */}
        <Section id="ai-assistant" icon={SparklesIcon} title="AI Assistant">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Chat with an AI-powered SEO & SMO assistant that can analyze your sites, pull Google Analytics & Search Console data, and give actionable recommendations.
            </p>
            <h3 className="text-sm font-semibold">Capabilities</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Run SEO analysis on any URL via chat</li>
              <li>Fetch Google Analytics traffic data</li>
              <li>Query Search Console rankings and queries</li>
              <li>Get Google Reviews for any business</li>
              <li>Marketing skills system for specialized prompts</li>
              <li>Conversation history with token usage tracking</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Setup</h3>
            <div className="space-y-2">
              <Step number={1}>Add your Anthropic API key in <NavLink href="/settings">Settings</NavLink></Step>
              <Step number={2}>Connect Google account for Analytics/Search Console data</Step>
              <Step number={3}>Start chatting — the AI will use tools automatically</Step>
            </div>
            <Tip>Enable Skills to get specialized marketing expertise in areas like content strategy, hashtag research, or competitor analysis.</Tip>
          </div>
        </Section>

        <Section id="qr-generator" icon={QrCodeIcon} title="QR Code Generator">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Generate customizable QR codes for 15 different data types with live preview.
            </p>
            <h3 className="text-sm font-semibold">Supported Types</h3>
            <p className="text-sm text-muted-foreground">
              Link, Text, Email, Call, SMS, V-Card, WhatsApp, Wi-Fi, PDF, App Store, Image, Video, Social Media, Event
            </p>
            <h3 className="text-sm font-semibold mt-3">Customization Options</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Foreground & background colors</li>
              <li>6 dot styles (square, dots, rounded, etc.)</li>
              <li>3 corner styles</li>
              <li>Size and margin sliders</li>
              <li>Logo upload (centered on QR code)</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Output</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Download as PNG or SVG</li>
              <li>Copy to clipboard</li>
              <li>Save to your account (with history)</li>
              <li>Quick presets: Business Card, Wi-Fi Guest, Event Invite</li>
            </ul>
          </div>
        </Section>

        {/* ═══ Content & Social ═══ */}
        <Section id="analytics" icon={BarChart3Icon} title="Google Analytics & Search Console">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect your Google account to view Analytics and Search Console data directly in the dashboard.
            </p>
            <h3 className="text-sm font-semibold">How to Connect</h3>
            <div className="space-y-2">
              <Step number={1}>Go to <NavLink href="/ga">Analytics</NavLink></Step>
              <Step number={2}>Click "Connect Google Account"</Step>
              <Step number={3}>Authorize access to Analytics and Search Console</Step>
              <Step number={4}>Select your GA4 property and Search Console site</Step>
            </div>
            <h3 className="text-sm font-semibold mt-3">Data Available</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Analytics</strong> — active users, sessions, page views, bounce rate, traffic sources, devices, countries, daily trends</li>
              <li><strong>Search Console</strong> — top queries, search pages, device/country breakdown, daily click/impression trends</li>
            </ul>
            <Tip>Requires <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5">GOOGLE_CLIENT_ID</code> and <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5">GOOGLE_CLIENT_SECRET</code> in your environment variables.</Tip>
          </div>
        </Section>

        {/* ═══ Cloudflare Analytics ═══ */}
        <Section id="cloudflare" icon={GlobeIcon} title="Cloudflare Analytics">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              View Cloudflare traffic analytics including requests, bandwidth, caching, Core Web Vitals, and TTFB/TTLB performance metrics.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Requests Through Cloudflare (total, cached, uncached)</li>
              <li>Bandwidth (total, cached, uncached)</li>
              <li>Unique Visitors with min/max</li>
              <li>Core Web Vitals — LCP, INP, CLS with P75 values</li>
              <li>TTFB & Page Load breakdown (P50, P75, P99)</li>
              <li>Traffic by country with progress bars</li>
              <li>Browser distribution and HTTP status codes</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Setup</h3>
            <div className="space-y-2">
              <Step number={1}>Add your Cloudflare API token in <NavLink href="/settings">Settings</NavLink></Step>
              <Step number={2}>Select your zone (domain) and date range</Step>
            </div>
            <Tip>The token needs Zone Analytics:Read + Zone:Zone:Read permissions.</Tip>
          </div>
        </Section>

        {/* ═══ Google Reviews ═══ */}
        <Section id="google-reviews" icon={StarIcon} title="Google Reviews">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Search and view Google Reviews for any business. Monitor ratings, read reviews, and track sentiment.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Search any business by name</li>
              <li>View overall rating, total reviews, and individual reviews</li>
              <li>Sentiment breakdown (positive, neutral, negative)</li>
              <li>Star rating and review count shown inline with search results</li>
              <li>Review history stored in database</li>
            </ul>
            <Tip>Uses Google Places API key from environment variable or Settings.</Tip>
          </div>
        </Section>

        {/* ═══ Shopify ═══ */}
        <Section id="shopify" icon={ShoppingCartIcon} title="Shopify Integration">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect your Shopify store to browse products and track orders without leaving the platform.
            </p>
            <h3 className="text-sm font-semibold">Product Catalog</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Grid and list view toggle</li>
              <li>SKU, pricing, inventory count, vendor, tags, and status (active/draft/archived)</li>
              <li>Search and filter products</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Order Tracker</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Sync and view orders from Shopify</li>
              <li>Order status, total, customer, and fulfillment details</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Setup</h3>
            <div className="space-y-2">
              <Step number={1}>Go to <NavLink href="/shopify/products">Product Catalog</NavLink></Step>
              <Step number={2}>Click "Connect Shopify" and authorize via OAuth</Step>
              <Step number={3}>Click "Sync" to import your latest products and orders</Step>
            </div>
          </div>
        </Section>

        {/* ═══ Content & Social ═══ */}
        <Section id="content-social" icon={NewspaperIcon} title="Content & Social">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tools for managing influencers, planning social content, and monitoring competitors.
            </p>
            <h3 className="text-sm font-semibold">Influencer CRM</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Contact database for influencer partnerships</li>
              <li>Track campaigns, reach, and engagement metrics</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Planned Features <span className="text-[10px] text-muted-foreground font-normal">(in development)</span></h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Instagram Manager</strong> — social media content management</li>
              <li><strong>Content Calendar</strong> — plan content across channels</li>
              <li><strong>Competitor Tracker</strong> — monitor competitor websites</li>
              <li><strong>News Consolidator</strong> — aggregate industry news</li>
            </ul>
          </div>
        </Section>

        {/* ═══ Basecamp ═══ */}
        <Section id="basecamp" icon={FolderIcon} title="Basecamp Integration">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Connect your Basecamp account to view projects, tasks, documents, files, and people — all synced via webhooks and stored locally.
            </p>
            <h3 className="text-sm font-semibold">Modules</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Activity Feed</strong> — real-time webhook events from all projects (todos, documents, messages, uploads, etc.)</li>
              <li><strong>My Readings</strong> — personal inbox, mentions, and bookmarked items</li>
              <li><strong>Todos</strong> — filter and browse todo events by status</li>
              <li><strong>Documents & Files</strong> — browse Basecamp documents and uploads</li>
              <li><strong>Messages</strong> — view messages and comments across projects</li>
              <li><strong>People</strong> — sync team members with avatars, roles (owner/admin), and removed status</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Setup</h3>
            <div className="space-y-2">
              <Step number={1}>Go to <NavLink href="/settings">Settings</NavLink> and click "Connect Basecamp"</Step>
              <Step number={2}>Authorize via OAuth — your access token is saved automatically</Step>
              <Step number={3}>Register webhooks from the Projects page to start receiving real-time events</Step>
              <Step number={4}>Sync People to import team members from Basecamp</Step>
            </div>
            <Tip>All Basecamp data is paginated automatically — syncs all pages, not just the first 15.</Tip>
          </div>
        </Section>

        {/* ═══ PM Dashboard ═══ */}
        <Section id="pm-dashboard" icon={LayoutDashboardIcon} title="PM Dashboard">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create and maintain a weekly status document inside each Basecamp project's Docs & Files. Your single source of truth — replacing ad-hoc status-check conversations.
            </p>
            <h3 className="text-sm font-semibold">What the Dashboard Contains</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Overall Status</strong> — 🟢 On Track / 🟡 At Risk / 🔴 Blocked</li>
              <li><strong>What's On Track</strong> — bullet list of progressing items</li>
              <li><strong>What's At Risk</strong> — items that need attention</li>
              <li><strong>Who's Blocked</strong> — people waiting on something</li>
              <li><strong>Next Week's Priorities</strong> — numbered priority list</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">How to Use</h3>
            <div className="space-y-2">
              <Step number={1}>Go to <NavLink href="/basecamp/pm-dashboard">PM Dashboard</NavLink> — all active Basecamp projects are listed</Step>
              <Step number={2}>Click "Create" on a project to write the first dashboard</Step>
              <Step number={3}>Fill in status, on-track items, risks, blockers, and next week's plan (one item per line)</Step>
              <Step number={4}>Click "Create in Basecamp" — the formatted document is published directly to Docs & Files</Step>
              <Step number={5}>Click "Update" each week to refresh the document in Basecamp</Step>
            </div>
            <Tip>Each line in a text area becomes a bullet point. Leave a section blank to show "—". The status dot is cached locally so the overview page loads instantly.</Tip>
          </div>
        </Section>

        {/* ═══ Employees ═══ */}
        <Section id="employees" icon={UsersIcon} title="Employees">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Complete employee records with 24 editable fields, sorted by joining date (active first) and exit date (inactive last).
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Active employees listed by date of joining (oldest first)</li>
              <li>Inactive employees moved to the bottom, ordered by exit date</li>
              <li>Inline edit for joining date and DOB directly in the table</li>
              <li>Click the status badge to toggle active/inactive</li>
              <li>Detail drawer with all 24 fields editable (including Exit Date for inactive employees)</li>
              <li>Search by name, email, employee ID, or department</li>
              <li>Filter by department</li>
              <li>Employee registration form with PAN, Aadhaar, and document uploads</li>
            </ul>
            <Tip>When marking an employee inactive, set the Exit Date in their edit drawer so the inactive list sorts correctly.</Tip>
          </div>
        </Section>

        <Section id="departments" icon={UsersIcon} title="Departments">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage departments used across the platform. Departments appear as dropdown options when registering employees.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Add, edit (inline), and delete departments</li>
              <li>Only admin, owner, and HR can manage departments</li>
              <li>All users can view the department list</li>
              <li>Departments auto-populate in employee registration form</li>
            </ul>
          </div>
        </Section>

        {/* ═══ Candidates ═══ */}
        <Section id="candidates" icon={UsersIcon} title="Candidates (Recruiting)">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track job applicants through a customisable hiring pipeline with Kanban view, email workflows, and custom statuses.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Kanban board grouped by candidate status with colour-coded columns</li>
              <li>Search and filter by status or role</li>
              <li>Inline notes and resume uploads per candidate</li>
              <li>Send email on status change using HR-managed templates</li>
              <li>Email confirmation modal before sending — shows template preview</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Custom Statuses</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>HR/admin can create pipeline stages with custom names and hex colours at <NavLink href="/candidate-statuses">Candidate Statuses</NavLink></li>
              <li>Reorder stages with up/down arrows — order determines Kanban column order</li>
              <li>Colours appear as column headers and dot indicators on candidate cards</li>
            </ul>
            <Tip>Email Templates must be created first before emails can be sent on status changes.</Tip>
          </div>
        </Section>

        {/* ═══ Leave Management ═══ */}
        <Section id="leave" icon={CalendarIcon} title="Leave Management">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Open-policy leave system — no leave types. Employees apply with dates and a reason; HR/admin approve or reject with notes.
            </p>
            <h3 className="text-sm font-semibold">Employee View (<NavLink href="/leaves">Leaves</NavLink>)</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Apply for leave with from/to dates and reason</li>
              <li>Business days calculated automatically (excludes weekends)</li>
              <li>View request status — pending, approved, rejected, cancelled</li>
              <li>Cancel a pending request</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Admin View (<NavLink href="/leaves/admin">Leave Approvals</NavLink>)</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>View all pending requests with employee name, dates, reason, and duration</li>
              <li>Approve or reject with an optional note</li>
              <li>Summary stats: pending count, approved this month, total days approved</li>
            </ul>
          </div>
        </Section>

        {/* ═══ Holiday Calendar ═══ */}
        <Section id="holidays" icon={CalendarIcon} title="Holiday Calendar">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              View national and company holidays across years. Pre-loaded with 59 holidays from 2022–2026.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Monthly calendar view with highlighted holiday dates</li>
              <li>List view showing all holidays for the selected year</li>
              <li>Admin can add custom holidays (name + date)</li>
              <li>Admin can delete holidays</li>
            </ul>
          </div>
        </Section>

        {/* ═══ Email Templates ═══ */}
        <Section id="email-templates" icon={MailIcon} title="Email Templates">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              HR manages reusable email templates for candidate stage transitions. Used when a candidate's status changes in the pipeline.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Create templates with name, subject, and body</li>
              <li>Use <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5">{"{{name}}"}</code> as a placeholder — replaced with the candidate's name on send</li>
              <li>Edit and delete templates</li>
              <li>Only admin/HR can manage templates</li>
            </ul>
            <Tip>Templates are selected from the Candidates page when sending stage-change emails. Create at least one template before moving candidates between statuses.</Tip>
          </div>
        </Section>

        {/* ═══ Performance Management ═══ */}
        <Section id="performance" icon={StarIcon} title="Performance Management">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Structured performance review cycles with self-assessment, manager review, goal tracking, and star ratings.
            </p>
            <h3 className="text-sm font-semibold">Workflow</h3>
            <div className="space-y-2">
              <Step number={1}>Admin creates a <strong>Review Cycle</strong> (e.g., "Q1 2025") with start and end dates</Step>
              <Step number={2}>Admin initialises reviews — one review is created per active employee</Step>
              <Step number={3}>Admin adds goals to each employee's review</Step>
              <Step number={4}>Employees submit <strong>self-review</strong> — rate themselves 1–5 stars and score each goal</Step>
              <Step number={5}>Manager/HR submits <strong>manager review</strong> — override rating, add comments, set final rating</Step>
            </div>
            <h3 className="text-sm font-semibold mt-3">Rating Scale</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>1 — Needs Improvement</li>
              <li>2 — Below Expectations</li>
              <li>3 — Meets Expectations</li>
              <li>4 — Exceeds Expectations</li>
              <li>5 — Outstanding</li>
            </ul>
          </div>
        </Section>

        {/* ═══ Employee Engagement ═══ */}
        <Section id="engagement" icon={SmileIcon} title="Employee Engagement">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Run anonymous (or named) surveys to gather honest team feedback. Admins see aggregated results; employees see only their own responses.
            </p>
            <h3 className="text-sm font-semibold">For Employees</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Browse active surveys with a "Submitted" badge on completed ones</li>
              <li>Answer rating questions with an emoji scale (😞 Strongly Disagree → 😄 Strongly Agree)</li>
              <li>Add optional comments to each rating question</li>
              <li>Responses can be updated after initial submission</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">For Admins / HR</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Create surveys with title, description, and anonymous toggle</li>
              <li>Add rating or open-text questions</li>
              <li>See aggregated results per question: average score, score distribution bars, and comments (non-anonymous only)</li>
              <li>See respondent count</li>
              <li>Close/reopen surveys, delete surveys</li>
            </ul>
            <Tip>Use anonymous surveys for sensitive check-ins like "Is anything about how this project is running frustrating you?" to get honest answers.</Tip>
          </div>
        </Section>

        {/* ═══ Capacity Check-in ═══ */}
        <Section id="capacity" icon={GaugeIcon} title="Capacity Check-in">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Weekly burnout-prevention tool. Employees rate their workload; admins see team-wide capacity with Basecamp todo counts and WIP limit warnings.
            </p>
            <h3 className="text-sm font-semibold">My Check-in (Employees)</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Rate your weekly load: 🟢 Very Light / 🟡 Light / 🟠 Moderate / 🔴 Heavy / ⛔ Overwhelmed</li>
              <li>Flag if anything is at risk of missing a deadline (yes/no toggle)</li>
              <li>Optional free-text notes for context</li>
              <li>Submitted once per week (Monday–Sunday); can be updated anytime that week</li>
              <li>View the last 8 weeks of history below the form</li>
              <li>"Friday reminder" badge appears automatically on Fridays</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Team Dashboard (Admin / HR)</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Overview stats: Checked In, At Risk, Over WIP</li>
              <li>Team list sorted: at-risk + over-WIP first, then heaviest load, then alpha</li>
              <li>Each row shows load badge, at-risk flag, and Basecamp open todo count</li>
              <li>Employees over the WIP limit show a red "⚠ Over WIP" badge</li>
              <li>WIP limit is configurable inline (default: 5 active tasks)</li>
              <li>Todo counts are pulled live from Basecamp — shows "–" if Basecamp is not connected</li>
            </ul>
          </div>
        </Section>

        <Section id="devices" icon={BarChart3Icon} title="Device Management">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Register, assign, and track company devices (laptops, phones, peripherals).
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Device list with table view, search, and filters (type, vendor, status)</li>
              <li>Click any row to open detail drawer with full device info</li>
              <li>Assign / Reassign / Return devices with searchable employee picker</li>
              <li>File complaints and track resolution</li>
              <li>Edit device info and specifications</li>
              <li>QR code auto-generated for each device (encodes serial, type, vendor, assignee)</li>
              <li>Bulk import from CSV with validation and preview</li>
              <li>Export filtered devices as CSV</li>
              <li>Manage vendors separately</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Device Statuses</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Available</strong> — ready to assign</li>
              <li><strong>Assigned</strong> — currently in use by an employee</li>
              <li><strong>In Repair</strong> — has open complaints</li>
              <li><strong>Retired</strong> — no longer in use</li>
            </ul>
          </div>
        </Section>

        <Section id="events" icon={CalendarIcon} title="Events">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create and manage company events with RSVP tracking.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Grid and table view toggle</li>
              <li>Filter by All, Upcoming, or Past events</li>
              <li>Click any event to open detail drawer with attendee list</li>
              <li>RSVP as "Going" (available for all users including event creators)</li>
              <li>Create events with title, description, location, start/end date</li>
              <li>Only admin, owner, and HR can create events</li>
              <li>Delete events (creator or admin only)</li>
            </ul>
          </div>
        </Section>

        <Section id="habits" icon={ShieldIcon} title="Daily Habits & Goals">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track daily habits and long-term goals with streaks, leaderboards, and weekly planning.
            </p>
            <h3 className="text-sm font-semibold">Daily Check-in</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Create habits with custom emoji, color, and description</li>
              <li>Check off habits daily with one click</li>
              <li>Track today's score, 7-day average, and streak</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Goals</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Set goals with target values and track progress percentage</li>
              <li>Active, completed, and paused statuses</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Other Modules</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Leaderboard</strong> — compare habit completion across users</li>
              <li><strong>Weekly Planner</strong> — grid view of habits across the week</li>
            </ul>
          </div>
        </Section>

        <Section id="hard-disk" icon={ShieldIcon} title="Hard Disk File Index">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Upload file listings from external hard drives and search across them. Useful for finding files across multiple backup drives.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Upload text files containing file paths (one per line)</li>
              <li>Search across all uploaded drives by file name or path</li>
              <li>File Manager with pagination, type filters, and drive selection</li>
              <li>Stats dashboard with file type breakdown</li>
            </ul>
          </div>
        </Section>

        {/* ═══ Software Renewals ═══ */}
        <Section id="software-renewals" icon={CalendarIcon} title="Software Renewals Calendar">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Track and manage software subscription renewals with calendar and list views.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Monthly calendar view with color-coded renewal dates</li>
              <li>List view with sortable table</li>
              <li>Dashboard summary — due in 7 days, overdue, monthly cost estimate</li>
              <li>Alerts for overdue and upcoming renewals</li>
              <li>Add/edit renewal with name, type, date, cost, vendor, notes</li>
              <li>Mark as completed/paid</li>
              <li>Filter by type, status, search by name/vendor</li>
              <li>CSV export</li>
            </ul>
            <Tip>Renewals auto-detect overdue status based on the current date.</Tip>
          </div>
        </Section>

        {/* ═══ Roadmap ═══ */}
        <Section id="roadmap" icon={ShieldIcon} title="Roadmap">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plan and track feature development with a Kanban board and list view. Shared across all users.
            </p>
            <h3 className="text-sm font-semibold">Features</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>4-column Kanban board — Planned, In Progress, Backlog, Done</li>
              <li>Smooth drag-and-drop with @dnd-kit</li>
              <li>List view with table layout</li>
              <li>Add items with title, description, status, priority</li>
              <li>Priority badges — Low, Medium, High</li>
              <li>Toggle between board and list views</li>
              <li>Right-side drawer for add/edit</li>
            </ul>
          </div>
        </Section>

        {/* ═══ PDF Export ═══ */}
        <Section id="pdf-export" icon={FileDownIcon} title="PDF Export">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Export your SEO analysis as a branded PDF report.
            </p>
            <h3 className="text-sm font-semibold">Two Export Options</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Export PDF</strong> — single-tool report with cover page, TOC, score overview, all checks, page details, and keywords</li>
              <li><strong>Full Report</strong> — multi-tool report combining SEO analysis, PageSpeed data, and crawl data into one document with section selection</li>
            </ul>
            <Tip>Configure your company name and logo in <NavLink href="/settings">Settings</NavLink> for branded reports.</Tip>
          </div>
        </Section>

        <Section id="serp-preview" icon={SearchIcon} title="SERP & Social Previews">
          <p className="text-sm text-muted-foreground leading-relaxed">
            After running an SEO analysis, scroll down to see how your page appears in Google search results, Facebook shares, and Twitter cards. Character limits are shown with color indicators (green = good, orange = short, red = too long). Missing fields are flagged with warnings and fix suggestions.
          </p>
        </Section>

        <Section id="recommendations" icon={ShieldIcon} title="SEO Recommendations">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              After analysis, the Recommendations panel shows prioritized fix suggestions for every failing check.
            </p>
            <h3 className="text-sm font-semibold">Priority Levels</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><span className="text-red-400 font-medium">Critical</span> — must fix (e.g., missing title, no HTTPS, mixed content)</li>
              <li><span className="text-orange-400 font-medium">Important</span> — should fix (e.g., description length, alt text, compression)</li>
              <li><span className="text-blue-400 font-medium">Suggestion</span> — nice to have (e.g., favicon, CDN, modern image formats)</li>
            </ul>
            <p className="text-sm text-muted-foreground mt-2">Click any recommendation to expand the "How to Fix" section with code snippets.</p>
          </div>
        </Section>

        {/* ═══ Admin ═══ */}
        <Section id="admin" icon={ShieldIcon} title="Admin & Roles">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Manage roles, assign them to employees, and control page-level access.
            </p>
            <h3 className="text-sm font-semibold">Role Management</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>System roles: owner, admin, hr, finance, user</li>
              <li>Create custom roles (owner only)</li>
              <li>Assign multiple roles to each employee</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Page Access Control</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Configure which pages each role can access</li>
              <li>Admin and owner always have full access</li>
              <li>Unconfigured pages remain accessible to everyone</li>
              <li>Access denied screen shown for restricted pages</li>
            </ul>
            <Tip>Only admin and owner roles can access the Admin page.</Tip>
          </div>
        </Section>

        {/* ═══ Settings ═══ */}
        <Section id="settings" icon={SettingsIcon} title="Settings & Preferences">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Configure app-wide preferences in <NavLink href="/settings">Settings</NavLink>.
            </p>
            <h3 className="text-sm font-semibold">Available Settings</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Connected Accounts</strong> — manage Google OAuth connection</li>
              <li><strong>Analysis Defaults</strong> — PageSpeed strategy, auto-save toggle</li>
              <li><strong>Monitoring & Alerts</strong> — email alerts, threshold, notification frequency</li>
              <li><strong>Display</strong> — default date range, results per page, crawler view</li>
              <li><strong>PDF Export</strong> — default sections, company name/logo for branding</li>
              <li><strong>Crawl Settings</strong> — max pages, crawl delay, external link checking</li>
              <li><strong>Danger Zone</strong> — delete all your data permanently</li>
            </ul>
          </div>
        </Section>

        <Section id="profile" icon={UserIcon} title="Profile & Account">
          <p className="text-sm text-muted-foreground leading-relaxed">
            View your account information, change your password, and sign out from <NavLink href="/profile">Profile</NavLink>. Shows your email, authentication provider, member since date, last sign-in, and user ID.
          </p>
        </Section>

        <Section id="keyboard" icon={KeyIcon} title="Keyboard Shortcuts">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="pb-3 pr-4 font-medium text-muted-foreground">Action</th>
                  <th className="pb-3 font-medium text-muted-foreground">Shortcut</th>
                </tr>
              </thead>
              <tbody className="text-muted-foreground">
                <tr className="border-b border-border/50"><td className="py-2 pr-4">Submit form / Analyze</td><td className="py-2"><kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">Enter</kbd></td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4">Add keyword</td><td className="py-2"><kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">Enter</kbd> in keyword field</td></tr>
                <tr className="border-b border-border/50"><td className="py-2 pr-4">Test robots.txt URL</td><td className="py-2"><kbd className="px-1.5 py-0.5 rounded bg-background border border-border text-xs font-mono">Enter</kbd> in test path field</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* ═══ FAQ ═══ */}
        <Section id="faq" icon={MailIcon} title="Frequently Asked Questions">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Do I need a Google account?</h3>
              <p className="text-sm text-muted-foreground mt-1">Only for Analytics, Search Console, and Keyword Tracker. All other tools work without it.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Is my data private?</h3>
              <p className="text-sm text-muted-foreground mt-1">Yes. All data is scoped to your account with Row Level Security. Only @madarth.com accounts can access the platform.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">What AI providers are supported?</h3>
              <p className="text-sm text-muted-foreground mt-1">OpenAI (GPT-4o Mini), Anthropic (Claude Sonnet), and Google (Gemini 2.0 Flash). You provide your own API key.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">How does monitoring work?</h3>
              <p className="text-sm text-muted-foreground mt-1">A cron job runs every 6 hours, re-analyzing each monitored URL. If the score drops by more than your threshold, an email alert is sent via Resend.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">Can I export reports?</h3>
              <p className="text-sm text-muted-foreground mt-1">Yes. The SEO Analyzer has both single-tool and full multi-tool PDF export. Sitemaps and llms.txt can be downloaded as files. QR codes export as PNG or SVG.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">How many pages does the crawler check?</h3>
              <p className="text-sm text-muted-foreground mt-1">Default is 50 pages (configurable up to 200 in Settings). External link checks are capped at 200 for the Broken Link Checker.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">What is llms.txt?</h3>
              <p className="text-sm text-muted-foreground mt-1">A standard file (like robots.txt for AI) that helps AI chatbots and search engines understand your site content. See <code className="text-xs bg-background border border-border rounded px-1.5 py-0.5">llmstxt.org</code> for the specification.</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold">What is IndexNow?</h3>
              <p className="text-sm text-muted-foreground mt-1">A protocol to instantly notify search engines (Bing, Yandex, Naver, Seznam) when your pages change, instead of waiting for them to crawl. Google does not support IndexNow.</p>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="rounded-lg border border-border bg-card p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Need more help? Check the source code or contact the admin.
          </p>
        </div>
      </div>
      </AccordionContext.Provider>
    </div>
  );
}
