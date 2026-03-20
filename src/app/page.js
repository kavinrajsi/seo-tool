import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-[#ededed] font-[family-name:var(--font-ibm-sans)]">
      <nav className="flex justify-between items-center max-w-[1100px] mx-auto py-5 px-8 max-[600px]:px-5 max-[600px]:py-4">
        <div className="text-base font-semibold tracking-[-0.3px]">SEO Tool</div>
        <div className="flex items-center gap-6 [&_a]:text-sm [&_a]:text-[#999] [&_a]:no-underline [&_a]:transition-colors [&_a]:duration-150 [&_a:hover]:text-[#ededed]">
          <Link href="/signin">Sign In</Link>
          <Link href="/signup" className="!py-2 !px-4 !rounded-lg !bg-[#ededed] !text-black !font-medium hover:!opacity-85 transition-opacity duration-150">
            Get Started
          </Link>
        </div>
      </nav>

      <main>
        <section className="max-w-[1100px] mx-auto px-8 pt-[100px] pb-20 text-center max-[600px]:px-5 max-[600px]:pt-[60px] max-[600px]:pb-12 [&>h1]:text-[52px] [&>h1]:font-bold [&>h1]:leading-[1.1] [&>h1]:tracking-[-2px] [&>h1]:max-w-[700px] [&>h1]:mx-auto [&>h1]:mb-5 [&>h1]:[text-wrap:balance] max-[800px]:[&>h1]:text-4xl max-[800px]:[&>h1]:tracking-[-1.5px] max-[600px]:[&>h1]:text-[28px] max-[600px]:[&>h1]:tracking-[-1px] [&>p]:text-lg [&>p]:leading-relaxed [&>p]:text-[#888] [&>p]:max-w-[560px] [&>p]:mx-auto [&>p]:mb-9 [&>p]:[text-wrap:balance] max-[800px]:[&>p]:text-base">
          <span className="inline-block text-xs font-medium text-[#999] uppercase tracking-[1px] py-1.5 px-3.5 rounded-[20px] border border-[#222] mb-6">All-in-one SEO platform</span>
          <h1>Analyze, crawl, and track your site&apos;s SEO performance</h1>
          <p>
            Run on-page SEO audits, crawl your site for technical issues, and
            connect Google Analytics &amp; Search Console — all from one
            dashboard.
          </p>
          <div className="flex gap-3 justify-center max-[600px]:flex-col max-[600px]:items-center">
            <Link href="/signup" className="inline-flex items-center h-11 px-6 rounded-lg bg-[#ededed] text-black text-sm font-medium no-underline font-[family-name:var(--font-ibm-sans)] transition-opacity duration-150 hover:opacity-85">
              Start Free
            </Link>
            <Link href="/signin" className="inline-flex items-center h-11 px-6 rounded-lg border border-[#2a2a2a] text-[#ededed] text-sm font-medium no-underline font-[family-name:var(--font-ibm-sans)] transition-colors duration-150 hover:border-[#ededed]">
              Sign In
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-3 gap-5 max-w-[1100px] mx-auto px-8 pb-20 max-[800px]:grid-cols-1 max-[600px]:px-5 max-[600px]:pb-12">
          <div className="p-7 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] transition-colors duration-200 hover:border-[#333] [&>h3]:text-[17px] [&>h3]:font-semibold [&>h3]:mb-2 [&>p]:text-sm [&>p]:text-[#888] [&>p]:leading-relaxed [&>p]:mb-4">
            <div className="text-[28px] w-12 h-12 flex items-center justify-center bg-[#141414] rounded-[10px] mb-4">&#x1F50D;</div>
            <h3>SEO Analyzer</h3>
            <p>
              Check any URL for on-page SEO issues — title, meta tags, headings,
              images, Open Graph, llms.txt validation, and a weighted score out
              of 100.
            </p>
            <ul className="list-none p-0 flex flex-col gap-2 [&_li]:text-[13px] [&_li]:text-[#666] [&_li]:pl-4 [&_li]:relative [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[7px] [&_li]:before:w-[5px] [&_li]:before:h-[5px] [&_li]:before:rounded-full [&_li]:before:bg-[#444]">
              <li>17+ SEO checks with pass/fail</li>
              <li>llms.txt validation for AI search</li>
              <li>Open Graph &amp; Twitter Card audit</li>
              <li>History of all analyses stored</li>
            </ul>
          </div>

          <div className="p-7 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] transition-colors duration-200 hover:border-[#333] [&>h3]:text-[17px] [&>h3]:font-semibold [&>h3]:mb-2 [&>p]:text-sm [&>p]:text-[#888] [&>p]:leading-relaxed [&>p]:mb-4">
            <div className="text-[28px] w-12 h-12 flex items-center justify-center bg-[#141414] rounded-[10px] mb-4">&#x1F4CA;</div>
            <h3>Site Crawler</h3>
            <p>
              Crawl up to 50 pages with BFS traversal. Get status codes, sitemap
              coverage, crawl depth, internal links, markup detection, and more.
            </p>
            <ul className="list-none p-0 flex flex-col gap-2 [&_li]:text-[13px] [&_li]:text-[#666] [&_li]:pl-4 [&_li]:relative [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[7px] [&_li]:before:w-[5px] [&_li]:before:h-[5px] [&_li]:before:rounded-full [&_li]:before:bg-[#444]">
              <li>HTTP status code breakdown</li>
              <li>Sitemap vs. crawled comparison</li>
              <li>Canonicalization &amp; hreflang audit</li>
              <li>Schema.org, OG, microformat detection</li>
            </ul>
          </div>

          <div className="p-7 rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] transition-colors duration-200 hover:border-[#333] [&>h3]:text-[17px] [&>h3]:font-semibold [&>h3]:mb-2 [&>p]:text-sm [&>p]:text-[#888] [&>p]:leading-relaxed [&>p]:mb-4">
            <div className="text-[28px] w-12 h-12 flex items-center justify-center bg-[#141414] rounded-[10px] mb-4">&#x1F4C8;</div>
            <h3>Google Analytics</h3>
            <p>
              Connect your Google account to pull GA4 and Search Console data.
              View traffic, top pages, queries, devices, countries, and daily
              trends.
            </p>
            <ul className="list-none p-0 flex flex-col gap-2 [&_li]:text-[13px] [&_li]:text-[#666] [&_li]:pl-4 [&_li]:relative [&_li]:before:content-[''] [&_li]:before:absolute [&_li]:before:left-0 [&_li]:before:top-[7px] [&_li]:before:w-[5px] [&_li]:before:h-[5px] [&_li]:before:rounded-full [&_li]:before:bg-[#444]">
              <li>GA4 users, sessions, page views</li>
              <li>Search Console queries &amp; CTR</li>
              <li>Traffic source &amp; device breakdown</li>
              <li>All reports saved to your dashboard</li>
            </ul>
          </div>
        </section>

        <section className="text-center py-[60px] px-8 border-t border-b border-[#111] max-w-[1100px] mx-auto [&>h2]:text-[13px] [&>h2]:font-medium [&>h2]:text-[#666] [&>h2]:uppercase [&>h2]:tracking-[1px] [&>h2]:mb-5">
          <h2>Built with</h2>
          <div className="flex justify-center gap-6 flex-wrap [&_span]:text-sm [&_span]:text-[#999] [&_span]:py-2 [&_span]:px-4 [&_span]:rounded-lg [&_span]:border [&_span]:border-[#1a1a1a] [&_span]:font-[family-name:var(--font-ibm-mono)]">
            <span>Next.js 16</span>
            <span>React 19</span>
            <span>Supabase</span>
            <span>Google APIs</span>
            <span>Cheerio</span>
          </div>
        </section>

        <section className="text-center py-20 px-8 max-w-[1100px] mx-auto [&>h2]:text-[32px] [&>h2]:font-bold [&>h2]:tracking-[-1px] [&>h2]:mb-3 [&>p]:text-base [&>p]:text-[#888] [&>p]:mb-7">
          <h2>Start analyzing your site today</h2>
          <p>
            Create a free account and run your first SEO audit in under a
            minute.
          </p>
          <Link href="/signup" className="inline-flex items-center h-11 px-6 rounded-lg bg-[#ededed] text-black text-sm font-medium no-underline font-[family-name:var(--font-ibm-sans)] transition-opacity duration-150 hover:opacity-85">
            Create Account
          </Link>
        </section>
      </main>

      <footer className="flex justify-between items-center max-w-[1100px] mx-auto px-8 py-6 border-t border-[#111] text-[13px] text-[#555] max-[600px]:flex-col max-[600px]:gap-3 max-[600px]:text-center max-[600px]:p-5">
        <span>&copy; {new Date().getFullYear()} SEO Tool</span>
        <div className="flex gap-5 [&_a]:text-[#555] [&_a]:no-underline [&_a]:transition-colors [&_a]:duration-150 [&_a:hover]:text-[#ededed]">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/seo">Analyzer</Link>
          <Link href="/seo-statistics">Crawler</Link>
          <Link href="/ga">Analytics</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
