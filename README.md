# SEO Tool

An all-in-one internal platform for SEO analysis, HR management, device tracking, event coordination, and productivity — built for the Madarth team.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4, shadcn/ui, Lucide Icons
- **Database**: Supabase (PostgreSQL) + Neon Serverless (PostgreSQL)
- **Auth**: Supabase Auth (email/password + Google OAuth, restricted to @madarth.com)
- **AI**: Vercel AI SDK with Anthropic, OpenAI, Google providers
- **Deployment**: Vercel (Pro plan)

## Features

### SEO & Analytics
- **SEO Analyzer** — 40+ on-page, technical, content, security, and structured data checks with 0–100 scoring
- **Site Crawler** — BFS crawl up to 50 pages; HTTP status codes, sitemap coverage, depth, markup types
- **Backlinks Checker** — Referring domains, anchor text distribution, link quality
- **Keyword Tracker** — Track keyword positions over time via Google Search Console
- **Broken Link Checker** — Crawl up to 50 pages, check up to 200 external URLs
- **Validators** — Robots.txt parser (with URL tester) + sitemap XML validator
- **Sitemap Generator** — Generate XML sitemaps from crawl data; per-URL priority/changefreq/lastmod
- **LLMs.txt Generator** — Auto-generate llms.txt for AI search engines
- **IndexNow** — Instant URL submission to Bing, Yandex, Naver, Seznam
- **Site Speed** — Google PageSpeed Insights with Core Web Vitals (mobile/desktop)
- **SEO Monitoring** — Auto reanalysis every 6h with email alerts on score drops
- **Google Analytics** — GA4 traffic data, sessions, bounce rate, traffic sources, daily trends
- **Search Console** — Top queries, pages, devices, country breakdown, click/impression trends
- **Cloudflare Analytics** — Requests, bandwidth, CWV, TTFB, country traffic
- **Google Reviews** — Search and monitor business reviews with sentiment analysis
- **AI Assistant** — Chat-based SEO analysis, GA/GSC queries, recommendations, marketing skills

### QR Code
- **Generator** — 15+ data types (URL, vCard, WiFi, Email, SMS, Phone, WhatsApp, Event, Bitcoin, PayPal…) with customisable dot/corner styles, colours, logo, size
- **Library** — Save and manage all generated QR codes
- **Analytics** — Scan tracking and usage stats

### HR & HCM
- **Employees** — Full employee records (24 editable fields); active sorted by join date, inactive by exit date; inline editing; registration form with document uploads
- **Departments** — Managed by admin/HR; auto-populates in employee forms
- **Candidates** — Kanban pipeline with custom colour-coded statuses, email templates on stage change, resume uploads
- **Candidate Statuses** — HR creates custom pipeline stages with hex colours; reorder by drag or arrows
- **Email Templates** — HR manages `{{name}}` templates used for candidate stage-change emails
- **Leave Management** — Open-policy (no leave types); apply, cancel, approve/reject with notes; business-days calculation; overlap detection
- **Holiday Calendar** — 59 pre-loaded holidays 2022–2026; admin can add/delete; monthly calendar + list view
- **Performance Management** — Review cycles, per-employee goals, self-review (1–5 stars + self-scores), manager review with final rating
- **Employee Engagement** — Anonymous or named surveys; emoji-scale (1–5) + open-text questions; admin sees aggregated score distributions and comments; employees see submitted state
- **Capacity Check-in** — Weekly load rating (🟢–⛔) + at-risk flag per employee; admin team dashboard with configurable WIP limit (default 5); over-WIP warnings
- **Announcements** — HR/admin broadcast feed; post company-wide updates with date, title, and description; grouped by month; all employees can read

### Device Management
- **Registry** — Register devices (laptop, phone, peripheral, monitor, keyboard…) with type-specific specs
- **Assign / Reassign / Return** — Searchable employee picker; track who has what
- **QR Codes** — Auto-generated per device (encodes serial, type, vendor, assignee)
- **Import / Export** — Bulk CSV import with validation and preview; filtered CSV export
- **Vendors** — Manage vendors separately
- **Complaints** — File and resolve device complaints

### Events
- **Grid & Table Views** — Toggle between card grid and list table
- **RSVP** — Mark yourself as Going; view attendee list
- **Create Events** — Admin/HR/owner can create with title, description, location, start/end date
- **Delete** — Creator or admin can delete

### Habits & Productivity
- **Daily Check-in** — Track habits with emoji + colour coding; streaks, today's score, 7-day average
- **Goals** — Set targets, track percentage progress; active/completed/paused statuses
- **Weekly Planner** — Grid view of habits across the week
- **Leaderboard** — Compare habit completion across the team

### Hard Disk File Index
- Upload text file listings from external hard drives and search across them
- File Manager with pagination, type filters, drive selection, and storage stats

### Content & Social
- **Influencer CRM** — Contact database and campaign tracking
- Instagram Manager, Content Calendar, Competitor Tracker, News Consolidator *(planned)*

### Leads & CRM
- **Contact Form Submissions** — Kanban + list views of all website form inquiries; 6-stage pipeline (New → Contacted → Follow-up → Win → Closed → Rejected); internal notes per lead; manual entry; CSV export

### Shopify Integration
- **Product Catalog** — Grid/list view; SKU, pricing, inventory, vendor, tags, status
- **Order Tracker** — Sync and view orders with fulfillment details

### Admin & Control Panel
- **Role Management** — System roles (owner, admin, hr, finance, user) + owner-created custom roles
- **Page Access Control** — Configure per-role page access; admin/owner always have full access
- **Roadmap** — Drag-and-drop Kanban (Planned / In Progress / Backlog / Done)
- **Profile** — Account info, role badges, password management
- **Settings** — Connected accounts (Google, Cloudflare, Shopify), API keys, PDF export config, monitoring config, crawl settings

---

## Database Architecture

### Supabase (Primary)
`employees`, `candidates`, `candidate_statuses`, `departments`, `email_templates`, `leave_requests`, `leave_types`, `leave_balances`, `holidays`, `hr_announcements`, `performance_reviews`, `performance_goals`, `review_cycles`, `engagement_surveys`, `engagement_questions`, `engagement_responses`, `capacity_checkins`, `capacity_settings`, `devices`, `device_vendors`, `device_complaints`, `events`, `event_registrations`, `roles`, `employee_roles`, `role_page_access`, `contact_submissions`, `seo_analyses`, `speed_reports`, `ga_reports`, `qr_codes`, `qr_analytics`, `ai_conversations`, `roadmap_items`, `influencers`, `shopify_products`, `shopify_orders`, `cloudflare_analytics`, `habits`, `habit_logs`, `goals`, `google_tokens`, `google_reviews`, `monitoring_urls`
### Neon Serverless (Secondary)
`hard_disk_files`, `hard_disk_uploads` — migrated from Supabase to keep the primary DB under the 0.5 GB free-tier limit.

---

## Getting Started

### Prerequisites
- Node.js 22+
- Supabase project
- Neon database (provisioned via Vercel integration)

### Setup

```bash
npm install
vercel env pull   # pulls .env.local from Vercel
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SECRET_KEY=

# Neon (auto-provisioned via Vercel)
DATABASE_URL=
DATABASE_URL_UNPOOLED=

# App URL (used by capacity check-in to call internal APIs)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Google OAuth & APIs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SERVER_API_KEY=

# Email (Resend — for SEO monitoring alerts)
RESEND_API_KEY=

# AI API keys are added per-user via the Settings page
```

## Scripts

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

## Deployment

Deployed on **Vercel** with:
- **Cron jobs**: SEO monitoring every 6h, storage sync every 12h
- **Function timeouts**: 60s for crawl, analyze, speed test, and capacity APIs
- **Auto-deploy**: pushes to `main` branch deploy automatically

## Auth

- Restricted to `@madarth.com` email addresses (enforced in the OAuth callback)
- Email/password signup with email confirmation
- Google OAuth sign-in
- Role-based access control with page-level permissions (admin/owner always bypass)
