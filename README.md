# SEO Analyzer

A free on-page SEO analysis tool built with Next.js 16. Paste any URL and get an instant audit across 42 SEO factors — from title tags and meta descriptions to AI search readiness and Google PageSpeed scores. Includes single URL analysis, bulk scan (up to 10 URLs), full site scan (all URLs from sitemaps), sitemap creator, QR code generator, Shopify eCommerce dashboard, Instagram analytics, D2C calendar planner, user accounts, team collaboration, and export options.

## Features

- **42 SEO checks** covering on-page essentials, technical SEO, content quality, links, social/rich results, AI-era optimization, and performance/code quality
- **Four scan modes** — Single URL, Bulk Scan (up to 10 URLs), Full Scan (entire site via sitemaps), and Sitemap Creator
- **Full Scan** — enter a domain, automatically discovers all URLs from sitemaps (handles sitemap index files recursively), then analyzes each one sequentially with cancel support
- **Sitemap Creator** — discover URLs via sitemap or crawl, configure changefreq/priority/lastmod per URL, generate and download `sitemap.xml`
- **Landing page** explaining the problem, features, and how-it-works flow
- **Instant analysis** with progress bar and skeleton loading state
- **Severity-sorted results** — critical issues first, warnings next, passed checks collapsed
- **Overall score** (0-100) displayed as an animated SVG gauge
- **SERP preview** — editable preview across Desktop, Mobile, Twitter/X, Facebook, and LinkedIn
- **Keyword analysis** — single keywords plus 2/3/4-word phrase extraction with bar charts
- **Image alt tips** listing images missing alt attributes
- **Link discovery** showing internal and external link URLs with anchor text
- **Export** — download reports as PDF or Markdown
- **ChatGPT integration** — summarize reports via ChatGPT with one click
- **Share reports** — generate shareable public links for any saved report
- **Client-side caching** — analysis results cached for 24 hours to avoid redundant requests
- **Lead capture** — non-logged-in users provide name/email before viewing full reports
- **User accounts** — register/login with email, Google, or GitHub OAuth (via Supabase)
- **Dashboard** — saved reports history with search, pagination, and delete
- **Auto-save** — logged-in users' analyses are automatically saved to their dashboard
- **Teams** — create teams, invite members by email, share reports
- **Usage tracking** — total, monthly, and daily analysis counts
- **QR Codes** — generate styled QR codes with custom colors/logos, short URL tracking, and scan analytics
- **eCommerce (Shopify)** — products, collections, orders, customers, carts, checkouts, webhook management with real-time sync
- **Instagram** — connect Instagram Business account, view profile overview, post analytics, and audience insights
- **D2C Calendar** — 2026 South India D2C monthly planner with sales events, content calendar, and social content scheduling
- **Google Search Console** — connect GSC account, view search performance data
- **Notification sounds** — configurable notification sounds on scan completion, admin toggle, user sound selection with preview
- **Admin panel** — user management, role assignment, feature toggles (page visibility, notification sounds), trash/restore
- **Settings** — update profile name, change password, notification sound preferences, GSC connection
- **Dark theme** — black/white/#8fff00 accent color scheme with dot-grid background
- **Google PageSpeed** — live Lighthouse scores (Performance, SEO, Accessibility, Best Practices)
- **Mobile-first** responsive design at 480px and 768px breakpoints

## SEO Checks

### Traditional SEO (28 checks)

| Check | What it analyzes |
|-------|-----------------|
| Title Tag | Length, keyword placement, truncation |
| Meta Description | Length, quality, presence |
| H1 Structure | Single H1, keyword usage |
| Heading Hierarchy | Proper H1-H6 nesting |
| Internal Links | Count, anchor text, link URLs |
| External Links | Count, nofollow usage, link URLs |
| Image Optimization | Alt text, formats, missing-alt image list |
| Schema Markup | JSON-LD structured data detection |
| Page Speed | Page size, load time analysis |
| Mobile Responsiveness | Viewport configuration |
| SSL/HTTPS | Secure connection verification |
| Open Graph | Social sharing meta tags |
| Twitter Cards | Twitter/X card meta tags |
| Canonical URL | Canonical tag configuration |
| Robots.txt | File presence, directives |
| Sitemap Detection | XML sitemap presence |
| URL Structure | Format, length, SEO-friendliness |
| Content Analysis | Word count, readability, keyword extraction, n-gram phrases |
| Accessibility | Alt text, lang, ARIA, form labels |
| Meta Robots | noindex/nofollow directives |
| Hreflang | International SEO setup |
| Favicon | Favicon and Apple touch icon |
| Lazy Loading | Image lazy loading implementation |
| Doctype | HTML5 DOCTYPE validation |
| Character Encoding | UTF-8 declaration |
| Keywords in URL | Keyword presence in URL path |
| Social Image Size | OG/Twitter image dimensions |
| Google PageSpeed | Live Lighthouse scores |

### Modern SEO (5 checks)

| Check | What it analyzes |
|-------|-----------------|
| Answer Engine Optimization (AEO) | FAQ schema, question headings, lists, tables for featured snippets |
| Generative Engine Optimization (GEO) | Author info, citations, data points, topic depth for AI engines |
| Programmatic SEO (pSEO) | Template patterns, pagination, URL structures, BreadcrumbList schema |
| AI Search Visibility | AI crawler access (GPTBot, ClaudeBot, PerplexityBot), robots.txt rules |
| Local SEO | LocalBusiness schema, NAP data, Google Maps, geo coordinates, opening hours |

### Performance & Code Quality (9 checks)

| Check | What it analyzes |
|-------|-----------------|
| Social Media Meta Tags | Open Graph + Twitter Card tag completeness |
| Deprecated HTML Tags | Usage of obsolete tags (font, center, marquee) |
| Google Analytics | GA4, Universal Analytics, and GTM detection |
| JS Error Test | Mixed content scripts, eval usage, empty script sources |
| Console Errors Test | Mixed content, duplicate IDs, broken resources |
| HTML Compression/GZIP | Server GZIP or Brotli compression |
| HTML Page Size | Document size impact on load performance |
| JS Execution Time | JavaScript execution, TBT, main thread work via Lighthouse |
| CDN Usage | Whether static resources are served via CDN |
| Modern Image Formats | WebP/AVIF usage for better compression |

## Tech Stack

- **Framework**: Next.js 16 (App Router, JavaScript, no TypeScript)
- **Styling**: CSS Modules with CSS custom properties (no Tailwind)
- **Auth & Database**: Supabase (PostgreSQL with Row Level Security)
- **HTML Parsing**: Cheerio (server-side)
- **PDF Export**: jsPDF + html2canvas (client-side, dynamically imported)
- **Fonts**: Geist Sans + Geist Mono (via next/font)

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project ([supabase.com](https://supabase.com) — free tier works)

### Installation

```bash
git clone <repo-url>
cd seo-tool
npm install
```

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE=your-publishable-key
SUPABASE_SECRET_KEY=your-secret-key

# Google PageSpeed (optional — improves rate limits)
PAGESPEED_API_KEY=your-google-pagespeed-api-key
```

### Database Setup

1. Go to your Supabase project's **SQL Editor**
2. Run the SQL from [`docs/database-schema.md`](docs/database-schema.md) to create all tables, triggers, indexes, and RLS policies
3. Enable auth providers in **Authentication > Providers**:
   - Email/Password (enabled by default)
   - Google OAuth
   - GitHub OAuth
4. Set the redirect URL to `http://localhost:3000/auth/callback` (and your production URL)

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Production Build

```bash
npm run build
npm start
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |

## Project Structure

```
src/
  middleware.js                          # Route protection + auth token refresh
  lib/
    cache.js                            # Client-side analysis result caching (24h TTL)
    supabase/
      client.js                         # Browser Supabase client
      server.js                         # Server Supabase client
      admin.js                          # Service role client (bypasses RLS)
  app/
    layout.js                           # Root layout (Geist font, AuthProvider)
    globals.css                         # Design system (CSS custom properties)
    page.js                             # Landing page + SEO analyzer
    page.module.css
    components/
      AuthProvider.js                   # Auth context + useAuth() hook
      Navbar.js                         # Top navigation bar
      AnalysisCard.js                   # Expandable result card
      OverallScoreGauge.js              # Semi-circle SVG score gauge
      ScoreGauge.js                     # Full-circle SVG gauge (PageSpeed)
      ScoreIndicator.js                 # Pass/Warning/Fail badge
      SerpPreview.js                    # Multi-tab SERP preview
      KeywordAnalysis.js                # Keyword/phrase bar charts
      HeadingTree.js                    # Heading hierarchy tree
      LinkList.js                       # Expandable link list
      BulkScanForm.js                   # Bulk scan URL textarea input
      BulkScanResults.js                # Scan results table (shared by bulk + full scan)
      BulkScanDetail.js                 # Expanded detail view for a scanned URL
      FullScanForm.js                   # Full scan domain input + sitemap fetch
      SitemapCreatorForm.js             # Sitemap creator form with URL config
      GSCDataPanel.js                   # Google Search Console data panel
      OfflineIndicator.js               # Offline status indicator
      ServiceWorkerRegister.js          # Service worker registration
    (auth)/                             # Auth route group
      layout.js                         # Centered card layout
      login/page.js                     # Login (email + OAuth)
      register/page.js                  # Registration
      forgot-password/page.js           # Password reset
    auth/callback/route.js              # OAuth + email callback
    share/[id]/page.js                  # Public shared report view
    hooks/
      useBulkScan.js                    # Bulk scan state + sequential analysis
      useFullScan.js                    # Full scan state + sitemap fetch + sequential analysis
      useNotificationSound.js           # Notification sound playback on scan completion
    dashboard/
      layout.js                         # Sidebar layout
      page.js                           # Reports list
      components/
        DashboardNav.js                 # Sidebar navigation with collapsible submenus
        ReportsList.js                  # Reports table
      reports/[id]/page.js              # Report detail view
      bulk-scan/page.js                 # Bulk scan page
      full-scan/page.js                 # Full site scan page
      sitemap-creator/page.js           # Sitemap creator page
      teams/page.js                     # Teams list
      teams/[id]/page.js                # Team detail + invite
      usage/page.js                     # Usage statistics
      settings/page.js                  # Profile, password, notification sound, GSC
      upcoming-features/page.js         # Upcoming features page
      qr-codes/
        page.js                         # QR code generator
        all/page.js                     # All saved QR codes
        analytics/page.js               # QR code scan analytics
        StyledQRCode.js                 # Styled QR code component
      ecommerce/
        page.js                         # eCommerce overview
        products/page.js                # Product list
        products/[id]/page.js           # Product detail
        collections/page.js             # Collections list
        orders/page.js                  # Orders list
        customers/page.js               # Customers list
        carts/page.js                   # Active carts
        checkouts/page.js               # Checkouts list
        webhooks/page.js                # Webhook management
        calendar/page.js                # D2C calendar planner
      instagram/
        page.js                         # Instagram overview
        analytics/page.js               # Instagram analytics
      admin/
        page.js                         # Admin user management
        settings/page.js                # Admin feature toggles + settings
        trash/page.js                   # Trash / restore deleted items
    api/
      analyze/route.js                  # POST: run SEO analysis (42 checks)
      sitemap-urls/route.js             # POST: fetch + parse sitemap URLs
      sitemap-creator/crawl/route.js    # POST: crawl site for URLs
      reports/route.js                  # POST/GET: save/list reports
      reports/[id]/route.js             # GET/DELETE: single report
      teams/route.js                    # POST/GET: create/list teams
      teams/[id]/invite/route.js        # POST: invite team member
      teams/[id]/members/[memberId]/route.js  # DELETE: remove member
      usage/route.js                    # GET: usage stats
      usage-limit/route.js              # GET: usage limit check
      profile/route.js                  # PATCH: update profile
      leads/route.js                    # POST: save lead capture data
      sounds/route.js                   # GET: list notification sounds
      settings/page-visibility/route.js # GET: page visibility settings
      authority-check/route.js          # GET: authority check
      admin/
        settings/route.js              # GET/PATCH: admin settings
        users/route.js                 # GET: list users
        users/[id]/route.js            # GET/PATCH/DELETE: manage user
        users/[id]/role/route.js       # PATCH: change user role
        trash/route.js                 # GET: list trash
        trash/[id]/route.js            # POST: restore from trash
      qr-codes/
        route.js                       # POST/GET: create/list QR codes
        [id]/route.js                  # GET/DELETE: single QR code
        analytics/route.js             # GET: QR scan analytics
      qr/r/[shortCode]/route.js        # GET: QR code redirect + tracking
      ecommerce/
        products/route.js             # GET: Shopify products
        products/[id]/route.js        # GET: single product
        orders/route.js               # GET: Shopify orders
        customers/route.js            # GET: Shopify customers
        carts/route.js                # GET: Shopify carts
        checkouts/route.js            # GET: Shopify checkouts
        collections/route.js          # GET: Shopify collections
        stats/route.js                # GET: eCommerce stats
      webhooks/shopify/
        products/route.js             # POST: product webhook handler
        orders/route.js               # POST: order webhook handler
        customers/route.js            # POST: customer webhook handler
        checkouts/route.js            # POST: checkout webhook handler
        carts/route.js                # POST: cart webhook handler
        collections/route.js          # POST: collection webhook handler
        logs/route.js                 # GET: webhook logs
        register/route.js             # POST: register webhooks
      gsc/
        connect/route.js              # GET: initiate GSC OAuth
        callback/route.js             # GET: GSC OAuth callback
        disconnect/route.js           # POST: disconnect GSC
        status/route.js               # GET: GSC connection status
        data/route.js                 # GET: GSC search data
      instagram/
        connect/route.js              # GET: initiate Instagram OAuth
        callback/route.js             # GET: Instagram OAuth callback
        disconnect/route.js           # POST: disconnect Instagram
        status/route.js               # GET: Instagram connection status
        profile/route.js              # GET: Instagram profile data
        posts/route.js                # GET: Instagram posts
        insights/route.js             # GET: Instagram audience insights
docs/
  database-schema.md                    # Full SQL schema + RLS policies
```

## Database

Supabase PostgreSQL with Row Level Security enabled on all tables. See [`docs/database-schema.md`](docs/database-schema.md) for the complete SQL schema.

**Tables:**

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (auto-created on signup via trigger) |
| `reports` | Saved SEO analysis results (full data stored as JSONB) |
| `teams` | Team/organization records |
| `team_members` | User-to-team membership with roles |
| `team_invitations` | Pending team invitations |
| `usage_logs` | Per-user analysis request tracking |
| `app_settings` | Admin feature toggles and configuration |
| `leads` | Lead capture data (name, email) for non-registered users |
| `qr_codes` | Generated QR codes with styling and tracking |
| `qr_scans` | QR code scan events for analytics |

## License

MIT
