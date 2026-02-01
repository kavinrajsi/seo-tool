# SEO Analyzer

A free on-page SEO analysis tool built with Next.js 16. Paste any URL and get an instant audit across 33 SEO factors — from title tags and meta descriptions to AI search readiness and Google PageSpeed scores. Includes user accounts, a dashboard for saved reports, team collaboration, and export options.

## Features

- **33 SEO checks** covering on-page essentials, technical SEO, content quality, links, social/rich results, and AI-era optimization
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
- **User accounts** — register/login with email, Google, or GitHub OAuth (via Supabase)
- **Dashboard** — saved reports history with search, pagination, and delete
- **Auto-save** — logged-in users' analyses are automatically saved to their dashboard
- **Teams** — create teams, invite members by email, share reports
- **Usage tracking** — total, monthly, and daily analysis counts
- **Settings** — update profile name and change password
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
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google PageSpeed (optional — improves rate limits)
PAGESPEED_API_KEY=your-google-pagespeed-api-key
```

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
  lib/supabase/
    client.js                           # Browser Supabase client
    server.js                           # Server Supabase client
    admin.js                            # Service role client (bypasses RLS)
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
    (auth)/                             # Auth route group
      layout.js                         # Centered card layout
      login/page.js                     # Login (email + OAuth)
      register/page.js                  # Registration
      forgot-password/page.js           # Password reset
    auth/callback/route.js              # OAuth + email callback
    dashboard/
      layout.js                         # Sidebar layout
      page.js                           # Reports list
      components/
        DashboardNav.js                 # Sidebar navigation
        ReportsList.js                  # Reports table
      reports/[id]/page.js              # Report detail view
      teams/page.js                     # Teams list
      teams/[id]/page.js                # Team detail + invite
      usage/page.js                     # Usage statistics
      settings/page.js                  # Profile + password
    api/
      analyze/route.js                  # POST: run SEO analysis
      reports/route.js                  # POST/GET: save/list reports
      reports/[id]/route.js             # GET/DELETE: single report
      teams/route.js                    # POST/GET: create/list teams
      teams/[id]/invite/route.js        # POST: invite team member
      teams/[id]/members/[memberId]/route.js  # DELETE: remove member
      usage/route.js                    # GET: usage stats
      profile/route.js                  # PATCH: update profile
```
