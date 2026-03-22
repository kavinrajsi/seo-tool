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
  { id: "speed-monitor", label: "Site Speed & Outage" },
  { id: "keyword-tracker", label: "Keyword Tracker" },
  { id: "broken-links", label: "Broken Link Checker" },
  { id: "validators", label: "Validators" },
  { id: "sitemap-generator", label: "Sitemap Generator" },
  { id: "monitoring", label: "SEO Monitoring" },
  { id: "llms-generator", label: "LLMs.txt Generator" },
  { id: "indexnow", label: "IndexNow" },
  { id: "qr-generator", label: "QR Code Generator" },
  { id: "analytics", label: "Google Analytics" },
  { id: "pdf-export", label: "PDF Export" },
  { id: "serp-preview", label: "SERP & Social Previews" },
  { id: "recommendations", label: "SEO Recommendations" },
  { id: "projects", label: "Projects" },
  { id: "teams", label: "Teams & Collaboration" },
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
            className="w-full rounded-md border border-border bg-card pl-10 pr-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
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
              <Step number={5}>Invite your team in <NavLink href="/team">Team</NavLink> to collaborate on shared SEO data</Step>
            </div>
            <Tip>All your data is automatically saved. Switch between personal and team workspaces using the team switcher in the sidebar.</Tip>
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

        {/* ═══ Settings ═══ */}
        <Section id="projects" icon={FolderIcon} title="Projects">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Organize your websites into projects. Each project has a name, domain URL, and optional description. Projects are scoped to your personal workspace or active team. Create, edit, and delete projects from the <NavLink href="/projects">Projects</NavLink> page.
          </p>
        </Section>

        <Section id="teams" icon={UsersIcon} title="Teams & Collaboration">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Create teams to share SEO data with collaborators. All report data (analyses, crawls, monitoring, etc.) is scoped to either your personal workspace or the active team.
            </p>
            <h3 className="text-sm font-semibold">Roles</h3>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li><strong>Viewer</strong> — can view all team data (read-only)</li>
              <li><strong>Member</strong> — can view and create data</li>
              <li><strong>Admin</strong> — full access: manage members, change roles, edit team settings, delete team</li>
            </ul>
            <h3 className="text-sm font-semibold mt-3">Invitations</h3>
            <p className="text-sm text-muted-foreground">
              Admins can invite members by email. Invitations expire after 7 days. Recipients receive an email with an accept link (requires Resend API key).
            </p>
            <Tip>Switch between personal workspace and team using the team switcher at the top of the sidebar.</Tip>
          </div>
        </Section>

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
              <p className="text-sm text-muted-foreground mt-1">Yes. All data is scoped to your account with Row Level Security. Team data is only visible to team members.</p>
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
