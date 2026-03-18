import Link from "next/link";
import styles from "../legal.module.scss";

export const metadata = {
  title: "Privacy Policy — SEO Tool",
  description:
    "Learn how SEO Tool collects, uses, and protects your personal data.",
};

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/" className={styles.navBrand}>
          SEO Tool
        </Link>
        <div className={styles.navLinks}>
          <Link href="/terms">Terms</Link>
          <Link href="/signin">Sign In</Link>
          <Link href="/signup" className={styles.navCta}>
            Get Started
          </Link>
        </div>
      </nav>

      <main className={styles.content}>
        <h1>Privacy Policy</h1>
        <p className={styles.lastUpdated}>Last updated: March 18, 2025</p>

        <p>
          SEO Tool (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates
          the SEO Tool web application. This Privacy Policy explains what
          information we collect, how we use it, and your choices regarding your
          data.
        </p>

        <h2>1. Information We Collect</h2>
        <p>
          <strong>Account information.</strong> When you sign up, we collect your
          email address and a hashed password. If you sign in with Google, we
          receive your name, email, and profile picture from Google.
        </p>
        <p>
          <strong>Google API data.</strong> If you connect Google Analytics,
          Search Console, or Google Business Profile, we request read-only
          access to your analytics and search data through OAuth. We store the
          OAuth tokens securely in our database so we can fetch reports on your
          behalf.
        </p>
        <p>
          <strong>SEO analysis data.</strong> URLs you analyze, crawl results,
          SEO scores, and related audit data are stored in your account so you
          can view history and track progress.
        </p>
        <p>
          <strong>Team data.</strong> If you create or join a team, we store
          team membership, roles, and team-scoped analysis results.
        </p>
        <p>
          <strong>Usage data.</strong> We collect basic usage data such as pages
          visited, features used, and device/browser information to improve the
          service.
        </p>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To provide and maintain the SEO Tool service</li>
          <li>To display your SEO analysis results, history, and reports</li>
          <li>
            To fetch analytics data from Google on your behalf using your
            authorized tokens
          </li>
          <li>To enable team collaboration and shared dashboards</li>
          <li>
            To send transactional emails (account verification, password resets,
            team invitations)
          </li>
          <li>To monitor and improve the performance of our service</li>
        </ul>

        <h2>3. Data Storage &amp; Security</h2>
        <p>
          Your data is stored in a Supabase-hosted PostgreSQL database with
          row-level security policies. OAuth tokens are stored securely and are
          only used to fetch data from Google APIs on your behalf.
        </p>
        <p>
          We use HTTPS for all data transmission. Authentication is handled
          through Supabase Auth with industry-standard JWT tokens.
        </p>

        <h2>4. Third-Party Services</h2>
        <p>We use the following third-party services to operate SEO Tool:</p>
        <ul>
          <li>
            <strong>Supabase</strong> — database hosting, authentication, and
            row-level security
          </li>
          <li>
            <strong>Google APIs</strong> — Analytics, Search Console, and
            Business Profile data (read-only access with your consent)
          </li>
          <li>
            <strong>Vercel</strong> — application hosting and deployment
          </li>
          <li>
            <strong>Resend</strong> — transactional email delivery
          </li>
        </ul>
        <p>
          Each of these services has their own privacy policy. We recommend
          reviewing them for details on how they handle data.
        </p>

        <h2>5. Google API Scopes</h2>
        <p>
          When you connect your Google account, we request the following
          read-only scopes:
        </p>
        <ul>
          <li>
            <strong>Google Analytics</strong> —{" "}
            <code>analytics.readonly</code> to view your GA4 traffic data
          </li>
          <li>
            <strong>Search Console</strong> —{" "}
            <code>webmasters.readonly</code> to view search performance data
          </li>
          <li>
            <strong>Business Profile</strong> —{" "}
            <code>business.manage</code> to read your Google Reviews
          </li>
        </ul>
        <p>
          You can revoke access at any time from your{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Account permissions
          </a>{" "}
          page.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          We retain your account data and analysis history for as long as your
          account is active. If you delete your account, we will remove your
          personal data and analysis history within 30 days. Anonymized,
          aggregated data may be retained for service improvement.
        </p>

        <h2>7. Your Rights</h2>
        <p>You have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your account and associated data</li>
          <li>
            Revoke Google API access at any time through your Google Account
          </li>
          <li>Export your SEO analysis data</li>
        </ul>

        <h2>8. Cookies</h2>
        <p>
          We use essential cookies and local storage for authentication session
          management (e.g., storing your JWT token and active team selection).
          We do not use third-party tracking cookies.
        </p>

        <h2>9. Children&apos;s Privacy</h2>
        <p>
          SEO Tool is not directed at children under 13. We do not knowingly
          collect personal information from children. If you believe a child has
          provided us with personal data, please contact us and we will delete
          it.
        </p>

        <h2>10. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify
          you of significant changes by posting the updated policy on this page
          with a revised &quot;Last updated&quot; date.
        </p>

        <h2>11. Contact</h2>
        <p>
          If you have questions about this Privacy Policy or your data, please
          contact us at{" "}
          <a href="mailto:support@seotool.com">support@seotool.com</a>.
        </p>
      </main>

      <footer className={styles.footer}>
        <span>&copy; {new Date().getFullYear()} SEO Tool</span>
        <div className={styles.footerLinks}>
          <Link href="/">Home</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
