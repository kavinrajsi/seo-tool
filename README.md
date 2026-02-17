# Firefly — Growth Platform

An all-in-one growth platform built with Next.js 16. Core SEO module audits any URL across 42 factors — from title tags and meta descriptions to AI search readiness and Google PageSpeed scores. Includes single URL analysis, bulk scan (up to 10 URLs), full site scan (all URLs from sitemaps), sitemap creator, sitemap visualizer, broken link checker, SEO score history, authority checker, domain monitor, URL shortener, content brief generator, llms.txt generator, QR code generator, bio link pages with custom domains, Shopify eCommerce dashboard with review monitoring and inventory alerts, Google Reviews via Places API, Instagram analytics, Google Analytics integration, Google Search Console integration, Google Calendar integration, multi-project organization, employee management with HR role, RecruitSmart recruitment pipeline, software renewal tracking, device asset management with catalog, inter-location product transfers, task management with kanban views, D2C calendar planner, content calendar with collaboration, user accounts with team collaboration and role-based permissions, notification sounds, pricing page, admin panel, and export options.

## Features

### SEO & Analysis
- **42 SEO checks** covering on-page essentials, technical SEO, content quality, links, social/rich results, AI-era optimization, and performance/code quality
- **Four scan modes** — Single URL, Bulk Scan (up to 10 URLs), Full Scan (entire site via sitemaps), and Sitemap Creator
- **Full Scan** — enter a domain, automatically discovers all URLs from sitemaps (handles sitemap index files recursively), then analyzes each one sequentially with cancel support
- **Sitemap Creator** — discover URLs via sitemap or crawl, configure changefreq/priority/lastmod per URL, generate and download `sitemap.xml`
- **Sitemap Visualizer** — tree and table views of XML sitemap structure with content type breakdown for WordPress and Shopify
- **Broken Link Checker** — two-step flow (fetch sitemap URLs, check each page), stats grid, results table, broken link drawer with status codes, CSV export, saved scan history
- **SEO Score History** — track score trends over time with visualizations, date range filtering, and URL comparison
- **Authority Checker** — public domain authority metrics (no account required)
- **Domain Monitor** — track domain health, SSL status, and uptime
- **URL Shortener** — create and manage short URLs with click tracking analytics
- **Content Brief Generator** — create SEO content briefs for writers
- **llms.txt Generator** — create `llms.txt` files to control AI crawler access
- **Google PageSpeed** — live Lighthouse scores (Performance, SEO, Accessibility, Best Practices)

### Core Platform
- **Landing page** explaining the problem, features, and how-it-works flow
- **Instant analysis** with progress bar and skeleton loading state
- **Severity-sorted results** — critical issues first, warnings next, passed checks collapsed
- **Overall score** (0-100) displayed as an animated SVG gauge
- **SERP preview** — editable preview across Desktop, Mobile, Twitter/X, Facebook, and LinkedIn
- **Keyword analysis** — single keywords plus 2/3/4-word phrase extraction with bar charts
- **Export** — download reports as PDF or Markdown
- **ChatGPT integration** — summarize reports via ChatGPT with one click
- **Share reports** — generate shareable public links for any saved report
- **Client-side caching** — analysis results cached for 24 hours to avoid redundant requests
- **Lead capture** — non-logged-in users provide name/email before viewing full reports

### User Accounts & Organization
- **User accounts** — register/login with email, Google, or GitHub OAuth (via Supabase)
- **Dashboard** — saved reports history with search, pagination, and delete
- **Auto-save** — logged-in users' analyses are automatically saved to their dashboard
- **Projects** — multi-project organization with color-coded project cards, project-level filtering across all features, and member management
- **Teams** — create teams, invite members by email, role-based permissions (owner/admin/editor/viewer)
- **Usage tracking** — total, monthly, and daily analysis counts
- **Settings** — update profile name, change password, notification sound preferences, Google Search Console connection, Shopify connection
- **Pricing page** — pricing plans and tiers

### QR Codes & Bio Links
- **QR Codes** — generate styled QR codes with custom colors/logos, short URL tracking, and scan analytics
- **Bio Links** — link-in-bio page builder with display name, bio text, SVG avatars, theme presets (dark/light/gradient), button styles, link management with reordering, click tracking, custom domain support with DNS verification, live preview, and analytics

### eCommerce (Shopify Integration)
- **Shopify OAuth** — connect/disconnect Shopify stores with automatic webhook registration
- **Products** — browse product list with bulk sync, view details with variants and status
- **Reviews & Ratings** — review monitor with sentiment analysis, star ratings, status badges, auto-flagging, review analytics dashboard
- **Inventory Alerts** — stock threshold monitoring with notification triggers
- **Collections, Orders, Customers** — browse collections, order management with fulfillment, customer list, active carts, checkout tracking
- **Webhooks** — real-time sync handlers for products, orders, customers, checkouts, carts, collections
- **eCommerce Calendar** — 2026 South India D2C monthly planner with sales events, content calendar, and social content scheduling

### Google Reviews
- **Google Reviews** — import reviews by Place ID via Google Places API, sentiment analysis, status tracking, response composition, filter by status/sentiment/rating

### Integrations
- **Instagram** — connect Instagram Business account, view profile overview, post analytics, audience insights
- **Google Analytics** — connect GA4 account, select properties, traffic overview, top pages, traffic sources, daily metrics, device/country/landing page breakdowns
- **Google Search Console** — connect GSC account, view search performance data
- **Google Business Profile** — connect GBP account, list locations, import reviews with deduplication and sentiment analysis, reply to reviews
- **Google Calendar** — connect Google Calendar, sync events with content calendar

### HR & Operations
- **Employee Management** — comprehensive employee database with personal info, employment details, identification, contact, address (Google Places autocomplete), bulk CSV import, status tracking (Active/Inactive/On Leave/Terminated), employee calendar
- **RecruitSmart** — recruitment pipeline with candidate tracking (New → Screening → Interview → Offer → Hired/Rejected/On Hold), offer status tracking, email templates, three view modes (List, Card Grid, Kanban), CSV import/export
- **Software Renewals** — software license and renewal tracking with costs, renewal dates, status management, bulk CSV import
- **Device Management** — device asset tracking (laptops, mobiles, tablets, monitors, etc.) with serial numbers, asset tags, assignment to employees, assignment history, device issues tracking, device catalog with brand/model/pricing
- **Transfers** — inter-location product transfer management with multi-step status flow (Requested → Approved → Packing → Dispatched → Delivered), tabbed views, packing task management, delivery tracking
- **Tasks** — task management with three view modes (List, Card Grid, Kanban), status (To Do/In Progress/In Review/Done), priorities, categories, checklists, comments, due dates, assignees

### Calendars
- **Content Calendar** — content planning with sales events, social content scheduling, Google Calendar sync, and team collaboration
- **eCommerce Calendar** — 2026 South India D2C monthly planner
- **Employee Calendar** — employee-related calendar view

### Admin & Settings
- **Notification sounds** — configurable notification sounds on scan completion, admin toggle, user sound selection with preview
- **Admin panel** — user management, role assignment (admin/hr/user), user deletion, feature toggles (page visibility, notification sounds), trash/restore
- **Dark theme** — black/white/#8fff00 accent color scheme with dot-grid background
- **Mobile-first** responsive design at 480px and 768px breakpoints
- **Legal pages** — Privacy Policy and Terms of Service

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
- **QR Codes**: qrcode + qrcode.react
- **CSV Parsing**: PapaParse (bulk imports)
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

# Google Analytics tracking (optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Google OAuth (optional — shared across GA, GSC, GBP, GCal integrations)
GOOGLE_GA_CLIENT_ID=your-google-client-id
GOOGLE_GA_CLIENT_SECRET=your-google-client-secret
GOOGLE_GA_REDIRECT_URI=http://localhost:3000/api/analytics/callback
GOOGLE_GBP_REDIRECT_URI=http://localhost:3000/api/gbp/callback

# Google Places API (optional — for address autocomplete and reviews import)
GOOGLE_PLACES_API_KEY=your-google-places-api-key
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
  proxy.js                                # Custom domain proxy for bio pages
  middleware.js                           # Route protection + auth token refresh
  lib/
    cache.js                              # Client-side analysis result caching (24h TTL)
    sentiment.js                          # Keyword-based sentiment analysis utility
    permissions.js                        # Role-based access control (teams + projects)
    bioThemes.js                          # Bio page theme presets and utilities
    projectAccess.js                      # Project-level access control
    projectConnections.js                 # Project-service connection utilities
    calendarData.js                       # Calendar configuration and data
    supabase/
      client.js                           # Browser Supabase client
      server.js                           # Server Supabase client
      admin.js                            # Service role client (bypasses RLS)
  app/
    layout.js                             # Root layout (Geist font, AuthProvider)
    globals.css                           # Design system (CSS custom properties)
    page.js                               # Landing page + SEO analyzer
    page.module.css
    authority-checker/page.js             # Public authority checker
    sitemap-creator/page.js               # Public sitemap creator
    bio/[slug]/
      page.js                             # Public bio link page (SSR)
      BioPageClient.js                    # Bio page client renderer
    pricing/page.js                       # Pricing page
    new-employee/page.js                  # Public employee onboarding
    s/[code]/route.js                     # Short URL redirect
    privacy/page.js                       # Privacy Policy
    terms/page.js                         # Terms of Service
    share/[id]/page.js                    # Public shared report view
    components/
      AuthProvider.js                     # Auth context + useAuth() hook
      ProjectProvider.js                  # Project context + useProject() hook
      Navbar.js                           # Top navigation bar
      AnalysisCard.js                     # Expandable result card
      OverallScoreGauge.js                # Semi-circle SVG score gauge
      ScoreGauge.js                       # Full-circle SVG gauge (PageSpeed)
      ScoreIndicator.js                   # Pass/Warning/Fail badge
      SerpPreview.js                      # Multi-tab SERP preview
      KeywordAnalysis.js                  # Keyword/phrase bar charts
      HeadingTree.js                      # Heading hierarchy tree
      LinkList.js                         # Expandable link list
      BulkScanForm.js                     # Bulk scan URL textarea input
      BulkScanResults.js                  # Scan results table (shared)
      BulkScanDetail.js                   # Expanded detail view
      FullScanForm.js                     # Full scan domain input
      BrokenLinkForm.js                   # Broken link checking form
      SitemapCreatorForm.js               # Sitemap creator form
      SitemapTree.js                      # Sitemap tree visualization
      GSCDataPanel.js                     # Google Search Console panel
    (auth)/                               # Auth route group
      layout.js                           # Centered card layout
      login/page.js                       # Login (email + OAuth)
      register/page.js                    # Registration
      forgot-password/page.js             # Password reset
    auth/callback/route.js                # OAuth + email callback
    hooks/
      useBulkScan.js                      # Bulk scan state management
      useFullScan.js                      # Full scan state management
      useBrokenLinkScan.js                # Broken link scan state
      useNotificationSound.js             # Notification sound playback
    dashboard/
      layout.js                           # Sidebar layout + ProjectProvider
      page.js                             # Reports list
      components/
        DashboardNav.js                   # Sidebar navigation
        navConfig.js                      # Navigation menu configuration
        ProjectSelector.js                # Project switcher dropdown
        ReportsList.js                    # Reports table
      reports/[id]/page.js                # Report detail view
      website/page.js                     # Website overview
      projects/
        page.js                           # Projects list + create
        [id]/page.js                      # Project detail + members
      seo/
        bulk-scan/page.js                 # Bulk scan page
        full-scan/page.js                 # Full site scan page
        sitemap-creator/page.js           # Sitemap creator page
        usage/page.js                     # Usage statistics
        score-history/page.js             # SEO score history
        broken-links/page.js             # Broken link checker
        sitemap-visualizer/page.js        # Sitemap visualizer
        domain-monitor/page.js            # Domain monitor
        url-shortener/page.js             # URL shortener
        content-briefs/page.js            # Content brief generator
        llms-txt/page.js                  # llms.txt generator
      teams/
        page.js                           # Teams list
        [id]/page.js                      # Team detail + invite + roles
      qr-codes/
        page.js                           # QR code generator
        all/page.js                       # All saved QR codes
        analytics/page.js                 # QR scan analytics
        StyledQRCode.js                   # Styled QR code component
      bio-links/page.js                   # Bio link page builder
      content-calendar/
        page.js                           # Content calendar
        collaboration/page.js             # Calendar collaboration
      tasks/page.js                       # Task management (list/card/kanban)
      employees/
        page.js                           # Employee management
        calendar/page.js                  # Employee calendar
      recruitsmart/page.js                # Recruitment pipeline
      software-renewals/page.js           # Software renewal tracking
      devices/
        page.js                           # Device management
        catalog/page.js                   # Device catalog & pricing
      transfers/
        page.js                           # Transfer management
        products/page.js                  # Transfer products
        locations/page.js                 # Transfer locations
        settings/page.js                  # Transfer settings
      reviews/page.js                     # Google Reviews
      ecommerce/
        page.js                           # eCommerce overview
        products/page.js                  # Product list
        products/[id]/page.js             # Product detail
        collections/page.js               # Collections
        orders/page.js                    # Orders
        customers/page.js                 # Customers
        carts/page.js                     # Active carts
        checkouts/page.js                 # Checkouts
        webhooks/page.js                  # Webhook management
        reviews/page.js                   # Review & rating monitor
        reviews/analytics/page.js         # Review analytics
        inventory-alerts/page.js          # Inventory alerts
        calendar/page.js                  # D2C calendar planner
      instagram/
        page.js                           # Instagram overview
        analytics/page.js                 # Instagram analytics
      analytics/
        page.js                           # Google Analytics overview
        analytics/page.js                 # Detailed GA analytics
      admin/
        page.js                           # Admin user management
        settings/page.js                  # Admin feature toggles
        trash/page.js                     # Trash / restore
      settings/page.js                    # User settings
      upcoming-features/page.js           # Upcoming features
    api/
      analyze/route.js                    # POST: run SEO analysis (42 checks)
      sitemap-urls/route.js               # POST: fetch + parse sitemap URLs
      sitemap-creator/crawl/route.js      # POST: crawl site for URLs
      sitemap-visualizer/
        route.js                          # GET/POST: sitemap visualizer data
        [id]/route.js                     # GET/DELETE: single record
        parse/route.js                    # POST: parse sitemap XML
      domain-monitor/
        route.js                          # GET/POST: domain monitors
        [id]/route.js                     # GET/PATCH/DELETE: manage monitor
        check/route.js                    # POST: run health check
      short-urls/
        route.js                          # GET/POST: short URLs
        [id]/route.js                     # GET/DELETE: manage short URL
      content-briefs/
        route.js                          # GET/POST: content briefs
        [id]/route.js                     # GET/PATCH/DELETE: manage brief
      llms-txt/
        route.js                          # GET/POST: llms.txt configs
        [id]/route.js                     # GET/PATCH/DELETE: manage config
      reports/
        route.js                          # POST/GET: save/list reports
        [id]/route.js                     # GET/DELETE: single report
        history/route.js                  # GET: report history + trends
      teams/
        route.js                          # POST/GET: create/list teams
        [id]/invite/route.js              # POST: invite member
        [id]/members/route.js             # GET: list members
        [id]/members/[memberId]/route.js  # DELETE: remove member
        [id]/members/[memberId]/role/route.js  # PATCH: change role
      projects/
        route.js                          # POST/GET: create/list projects
        [id]/route.js                     # GET/PATCH/DELETE: manage project
        [id]/members/route.js             # GET: project members
        [id]/members/[memberId]/route.js  # DELETE: remove member
      calendar-events/
        route.js                          # GET/POST: calendar events
        [id]/route.js                     # GET/PATCH/DELETE: manage event
        export/route.js                   # GET: export as ICS
      tasks/
        route.js                          # GET/POST: tasks
        [id]/route.js                     # GET/PATCH/DELETE: manage task
      usage/route.js                      # GET: usage stats
      usage-limit/route.js               # GET: usage limit check
      profile/route.js                    # PATCH: update profile
      leads/route.js                      # POST: save lead data
      sounds/route.js                     # GET: notification sounds
      settings/page-visibility/route.js   # GET: page visibility settings
      authority-check/route.js            # GET: authority check
      broken-links/
        check/route.js                    # POST: check for broken links
        scans/route.js                    # POST/GET: save/list scans
        scans/[id]/route.js               # GET/DELETE: single scan
      admin/
        settings/route.js                 # GET/PATCH: admin settings
        users/route.js                    # GET: list users
        users/[id]/route.js               # GET/PATCH/DELETE: manage user
        users/[id]/role/route.js          # PATCH: change role
        trash/route.js                    # GET: list trash
        trash/[id]/route.js               # POST: restore from trash
      qr-codes/
        route.js                          # POST/GET: create/list QR codes
        [id]/route.js                     # GET/DELETE: single QR code
        analytics/route.js               # GET: QR scan analytics
      qr/r/[shortCode]/route.js           # GET: QR redirect + tracking
      bio-pages/
        route.js                          # GET/POST: bio pages
        [id]/route.js                     # GET/PATCH/DELETE: manage page
        [id]/links/route.js               # GET/POST: bio links
        [id]/links/[linkId]/route.js      # PATCH/DELETE: manage link
        [id]/domain/route.js              # GET/POST/DELETE: custom domain
        click/route.js                    # POST: track link click
        view/route.js                     # POST: track page view
      employees/
        route.js                          # GET/POST: employees
        [id]/route.js                     # GET/PATCH/DELETE: manage employee
        bulk/route.js                     # POST: bulk CSV import
        import/route.js                   # POST: import employees
        email/route.js                    # POST: send email
        public/route.js                   # GET: public employee data
      recruitsmart/
        route.js                          # GET/POST: candidates
        [id]/route.js                     # GET/PATCH/DELETE: manage candidate
        email/route.js                    # POST: send email
        import/route.js                   # POST: CSV import
      software-renewals/
        route.js                          # GET/POST: renewals
        [id]/route.js                     # GET/PATCH/DELETE: manage renewal
        bulk/route.js                     # POST: bulk CSV import
      devices/
        route.js                          # GET/POST: devices
        [id]/route.js                     # GET/PATCH/DELETE: manage device
        [id]/assignments/route.js         # GET/POST: assignments
        [id]/issues/route.js              # GET/POST: issues
        [id]/issues/[issueId]/route.js    # PATCH: update issue
        catalog/route.js                  # GET/POST: device catalog
        catalog/[id]/route.js             # GET/PATCH/DELETE: catalog item
      transfers/
        route.js                          # GET/POST: transfers
        [id]/route.js                     # GET/PATCH/DELETE: manage transfer
        [id]/approve/route.js             # POST: approve/reject
        [id]/packing/route.js             # GET/PATCH: packing
        [id]/delivery/route.js            # GET/PATCH: delivery
        [id]/status/route.js              # PATCH: update status
        locations/route.js                # GET/POST: locations
        locations/[id]/route.js           # GET/PATCH/DELETE: location
        products/route.js                 # GET/POST: products
        products/[id]/route.js            # GET/PATCH/DELETE: product
        roles/route.js                    # GET/POST: roles
        roles/[id]/route.js               # GET/PATCH/DELETE: role
      ecommerce/
        products/route.js                 # GET: Shopify products
        products/[id]/route.js            # GET: single product
        products/sync/route.js            # POST: bulk sync
        orders/route.js                   # GET: orders
        orders/[id]/fulfillment/route.js  # POST: fulfill order
        customers/route.js               # GET: customers
        carts/route.js                    # GET: carts
        checkouts/route.js               # GET: checkouts
        collections/route.js             # GET: collections
        stats/route.js                    # GET: eCommerce stats
        reviews/route.js                 # GET/POST: reviews
        reviews/[id]/route.js            # GET/PATCH/DELETE: manage review
        reviews/analytics/route.js       # GET: review analytics
        inventory-alerts/route.js        # GET/POST: alerts
        inventory-alerts/[id]/route.js   # GET/PATCH/DELETE: manage alert
      webhooks/shopify/                   # Shopify webhook handlers
      shopify/
        connect/route.js                 # GET: initiate Shopify OAuth
        callback/route.js               # GET: Shopify callback
        disconnect/route.js             # POST: disconnect
        status/route.js                 # GET: connection status
      places/
        autocomplete/route.js            # GET: address autocomplete
        details/route.js                 # GET: place details
        reviews/route.js                 # GET: import Google reviews
      gsc/                               # Google Search Console OAuth + data
      analytics/                         # Google Analytics OAuth + data
      instagram/                         # Instagram OAuth + data
      gbp/                               # Google Business Profile OAuth + data
      gcal/                              # Google Calendar OAuth + sync
      cron/website-scan/route.js         # GET: automated website scan
docs/
  database-schema.md                      # Full SQL schema + RLS policies
  shopify-webhook-guide.md                # Shopify webhook setup guide
  shopify-webhook-schema.sql              # Shopify database schema
```

## Database

Supabase PostgreSQL with Row Level Security enabled on all tables. See [`docs/database-schema.md`](docs/database-schema.md) for the complete SQL schema.

**Tables:**

| Table | Purpose |
|-------|---------|
| `profiles` | User profile data (auto-created on signup, roles: admin/hr/user) |
| `reports` | Saved SEO analysis results (full data stored as JSONB) |
| `projects` | Multi-project organization records |
| `project_members` | User-to-project membership |
| `teams` | Team/organization records |
| `team_members` | User-to-team membership with roles (owner/admin/editor/viewer) |
| `team_invitations` | Pending team invitations |
| `usage_logs` | Per-user analysis request tracking |
| `app_settings` | Admin feature toggles and configuration |
| `leads` | Lead capture data for non-registered users |
| `qr_codes` | Generated QR codes with styling and tracking |
| `qr_scans` | QR code scan events for analytics |
| `bio_pages` | Bio link pages with themes and settings |
| `bio_links` | Individual links within bio pages |
| `short_urls` | Shortened URLs |
| `short_url_analytics` | Short URL click tracking |
| `ga_connections` | Google Analytics OAuth connections |
| `gsc_connections` | Google Search Console OAuth connections |
| `gcal_connections` | Google Calendar OAuth connections |
| `instagram_connections` | Instagram OAuth connections |
| `gbp_connections` | Google Business Profile OAuth connections |
| `shopify_connection` | Shopify OAuth connection |
| `product_reviews` | Product reviews with sentiment and status |
| `inventory_alerts` | Inventory alert rules with stock thresholds |
| `inventory_alert_logs` | Inventory alert trigger history |
| `broken_link_scans` | Saved broken link scan results |
| `domain_monitors` | Domain monitoring configurations |
| `sitemap_visualizer_data` | Saved sitemap visualizer data |
| `content_briefs` | SEO content briefs |
| `llms_txt_configs` | llms.txt file configurations |
| `calendar_events` | Calendar events for content/ecommerce calendars |
| `employees` | Employee records with personal/employment details |
| `recruitsmart_candidates` | Recruitment pipeline candidates |
| `software_renewals` | Software license renewal tracking |
| `devices` | Device asset records |
| `device_assignments` | Device assignment history |
| `device_issues` | Device issue tracking |
| `device_catalog` | Device catalog with brands/models/pricing |
| `transfers` | Inter-location transfer records |
| `transfer_items` | Transfer line items |
| `transfer_locations` | Transfer source/destination locations |
| `transfer_products` | Transfer product catalog |
| `transfer_packing` | Transfer packing task details |
| `transfer_delivery` | Transfer delivery tracking |
| `tasks` | Task records with status/priority/category |
| `task_checklists` | Task checklist items |
| `task_comments` | Task comments |
| `shopify_products` | Cached Shopify product data |
| `shopify_orders` | Cached Shopify order data |
| `shopify_customers` | Cached Shopify customer data |
| `shopify_carts` | Cached Shopify cart data |
| `shopify_checkouts` | Cached Shopify checkout data |
| `shopify_collections` | Cached Shopify collection data |
| `shopify_webhook_logs` | Shopify webhook event logs |

## License

MIT
