# SEO Tool

An all-in-one internal platform for SEO analysis, HR management, device tracking, event coordination, and productivity — built for the Madarth team.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4, shadcn/ui, Lucide Icons
- **Database**: Supabase (PostgreSQL) + Neon Serverless (PostgreSQL)
- **Auth**: Supabase Auth (email/password + Google OAuth)
- **AI**: Vercel AI SDK with Anthropic, OpenAI, Google providers
- **Deployment**: Vercel (Pro plan)

## Features

### SEO & Analytics
- **SEO Analyzer** — 40+ on-page, technical, content, and security checks with scoring
- **Site Crawler** — BFS crawl up to 50 pages with status codes, sitemap coverage, and markup analysis
- **Keyword Tracker** — Track keyword positions over time via Google Search Console
- **Broken Link Checker** — Find dead links across internal and external URLs
- **Validators** — Robots.txt parser and sitemap XML validator
- **Sitemap Generator** — Generate XML sitemaps from crawl data
- **LLMs.txt Generator** — Auto-generate llms.txt for AI search engines
- **IndexNow** — Instant URL submission to Bing, Yandex, Naver, Seznam
- **Site Speed** — Google PageSpeed Insights integration with Core Web Vitals
- **Monitoring** — Automated 6-hour SEO checks with email alerts on score drops
- **Google Analytics** — GA4 traffic data, sessions, bounce rate, traffic sources
- **Search Console** — Top queries, pages, devices, and daily trends
- **Cloudflare Analytics** — Requests, bandwidth, CWV, TTFB, country traffic
- **Google Reviews** — Search and monitor business reviews with sentiment analysis
- **AI Assistant** — Chat with AI for SEO analysis, analytics queries, and recommendations
- **Product Catalog & Order Tracker** — Shopify integration

### QR Code
- **Generator** — 15 data types (URL, vCard, WiFi, etc.) with customizable styles
- **Library** — Save, manage, and track all generated QR codes
- **Analytics** — Scan tracking and usage stats

### HR Management
- **Candidates** — Track job applicants through the hiring pipeline
- **Employees** — Full employee records with inline editing (24 fields)
- **Departments** — Manage departments (admin/HR only), auto-populates in employee forms
- **Leave Management** — Open policy leave system with apply, cancel, and approval workflow
- **Leave Approvals** — Admin/HR review panel with approve/reject and notes

### Device Management
- **Device Registry** — Register devices with type-specific specifications (laptop, phone, peripheral)
- **Assign / Reassign / Return** — Searchable employee picker from database
- **QR Codes** — Auto-generated QR with serial, type, vendor, assignee encoded
- **Import / Export** — Bulk CSV import with validation and preview; filtered CSV export
- **Vendors** — Manage device vendors separately
- **Complaints** — File and resolve device complaints

### Events
- **Grid & Table Views** — Toggle between card grid and list table
- **RSVP** — Mark yourself as Going (creators and attendees)
- **Create Events** — Admin/HR/owner can create with title, description, location, dates
- **Detail Drawer** — View event details and attendee list

### Habits & Productivity
- **Daily Check-in** — Track daily habits with streaks, scores, and 7-day averages
- **Goal Tracking** — Set goals with target values and track progress percentage
- **Weekly Planner** — Grid view of habits across the week
- **Leaderboard** — Compare habit completion across users

### Basecamp Integration
- **Activity Feed** — Real-time webhook events from all Basecamp projects
- **Todos** — View and filter todo events by status
- **Documents & Files** — Browse Basecamp documents and uploads
- **Messages** — View messages and comments
- **People** — Sync and browse Basecamp team members

### Hard Disk File Index
- Upload file listings from external hard drives and search across them

### Software Renewals
- Track subscription renewals with calendar/list views, cost estimates, and alerts

### Admin
- **Role Management** — System roles (owner, admin, hr, finance, user) + custom roles
- **Page Access Control** — Configure which pages each role can access
- **Email Log** — View sent email history

### Other
- **Roadmap** — Kanban board with drag-and-drop for feature planning
- **Profile** — View account info, role badges, password management
- **Settings** — Connected accounts, API keys, export defaults, monitoring config

## Database Architecture

### Supabase (Primary)
Auth, employees, candidates, departments, devices, device_vendors, events, event_registrations, leave_requests, leave_types, leave_balances, roles, employee_roles, role_page_access, seo_analyses, speed_reports, ga_reports, qr_codes, qr_analytics, ai_conversations, projects, roadmap_items, software_renewals, influencers, shopify_products, shopify_orders, cloudflare_analytics, habits, habit_logs, goals, google_tokens, google_reviews

### Neon Serverless (Secondary)
hard_disk_files, hard_disk_uploads, basecamp_events, basecamp_people — moved to Neon to keep Supabase under the 0.5 GB free tier limit.

## Getting Started

### Prerequisites
- Node.js 22+
- npm
- Supabase project
- Neon database (provisioned via Vercel)

### Setup

```bash
# Install dependencies
npm install

# Pull environment variables from Vercel
vercel env pull

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
SUPABASE_SECRET_KEY=

# Neon (auto-provisioned via Vercel)
DATABASE_URL=
DATABASE_URL_UNPOOLED=

# Google OAuth & APIs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_SERVER_API_KEY=

# Basecamp OAuth
BASECAMP_CLIENT_ID=
BASECAMP_CLIENT_SECRET=

# Email (Resend)
RESEND_API_KEY=

# AI (for AI Assistant)
# Users add their own API keys via Settings page
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Start production server
npm run lint     # ESLint
```

## Deployment

Deployed on **Vercel** with:
- Cron jobs: SEO monitoring (every 6h), storage sync (every 12h)
- Long-running functions (60s timeout) for crawl, analyze, and speed test APIs
- Auto-deployments from `main` branch

## Auth

- Restricted to `@madarth.com` email addresses
- Email/password signup with confirmation
- Google OAuth sign-in
- Role-based access control with page-level permissions
