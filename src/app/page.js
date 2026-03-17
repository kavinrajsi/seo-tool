import Link from "next/link";
import styles from "./page.module.scss";

export default function Home() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>SEO Tool</div>
        <div className={styles.navLinks}>
          <Link href="/signin">Sign In</Link>
          <Link href="/signup" className={styles.navCta}>
            Get Started
          </Link>
        </div>
      </nav>

      <main className={styles.main}>
        <section className={styles.hero}>
          <span className={styles.badge}>All-in-one SEO platform</span>
          <h1>Analyze, crawl, and track your site&apos;s SEO performance</h1>
          <p>
            Run on-page SEO audits, crawl your site for technical issues, and
            connect Google Analytics &amp; Search Console — all from one
            dashboard.
          </p>
          <div className={styles.heroCtas}>
            <Link href="/signup" className={styles.ctaPrimary}>
              Start Free
            </Link>
            <Link href="/signin" className={styles.ctaSecondary}>
              Sign In
            </Link>
          </div>
        </section>

        <section className={styles.features}>
          <div className={styles.feature}>
            <div className={styles.featureIcon}>&#x1F50D;</div>
            <h3>SEO Analyzer</h3>
            <p>
              Check any URL for on-page SEO issues — title, meta tags, headings,
              images, Open Graph, llms.txt validation, and a weighted score out
              of 100.
            </p>
            <ul className={styles.featureList}>
              <li>17+ SEO checks with pass/fail</li>
              <li>llms.txt validation for AI search</li>
              <li>Open Graph &amp; Twitter Card audit</li>
              <li>History of all analyses stored</li>
            </ul>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>&#x1F4CA;</div>
            <h3>Site Crawler</h3>
            <p>
              Crawl up to 50 pages with BFS traversal. Get status codes, sitemap
              coverage, crawl depth, internal links, markup detection, and more.
            </p>
            <ul className={styles.featureList}>
              <li>HTTP status code breakdown</li>
              <li>Sitemap vs. crawled comparison</li>
              <li>Canonicalization &amp; hreflang audit</li>
              <li>Schema.org, OG, microformat detection</li>
            </ul>
          </div>

          <div className={styles.feature}>
            <div className={styles.featureIcon}>&#x1F4C8;</div>
            <h3>Google Analytics</h3>
            <p>
              Connect your Google account to pull GA4 and Search Console data.
              View traffic, top pages, queries, devices, countries, and daily
              trends.
            </p>
            <ul className={styles.featureList}>
              <li>GA4 users, sessions, page views</li>
              <li>Search Console queries &amp; CTR</li>
              <li>Traffic source &amp; device breakdown</li>
              <li>All reports saved to your dashboard</li>
            </ul>
          </div>
        </section>

        <section className={styles.techStack}>
          <h2>Built with</h2>
          <div className={styles.techItems}>
            <span>Next.js 16</span>
            <span>React 19</span>
            <span>Supabase</span>
            <span>Google APIs</span>
            <span>Cheerio</span>
          </div>
        </section>

        <section className={styles.ctaSection}>
          <h2>Start analyzing your site today</h2>
          <p>
            Create a free account and run your first SEO audit in under a
            minute.
          </p>
          <Link href="/signup" className={styles.ctaPrimary}>
            Create Account
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>SEO Tool</span>
        <div className={styles.footerLinks}>
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/seo">Analyzer</Link>
          <Link href="/seo-statistics">Crawler</Link>
          <Link href="/ga">Analytics</Link>
        </div>
      </footer>
    </div>
  );
}
