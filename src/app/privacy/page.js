import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import styles from "./page.module.css";

export const metadata = {
  title: "Privacy Policy - Rank Scan",
  description: "Privacy Policy for Rank Scan. Learn how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <main className={styles.container}>
        <h1 className={styles.heading}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: February 8, 2026</p>

        <section className={styles.section}>
          <h2 className={styles.subheading}>1. Introduction</h2>
          <p>
            Rank Scan (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) operates the Rank Scan web application (the &quot;Service&quot;), an all-in-one marketing platform including SEO analysis, eCommerce management, QR code generation, Instagram analytics, content calendar, and more. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>2. Information We Collect</h2>

          <h3 className={styles.subsubheading}>Account Information</h3>
          <p>When you create an account, we collect your name, email address, and password. If you sign in with Google or GitHub, we receive your name, email, and profile picture from those providers.</p>

          <h3 className={styles.subsubheading}>Analysis Data</h3>
          <p>When you run an SEO analysis, we collect the URL(s) you submit and store the analysis results. This data is associated with your account if you are logged in.</p>

          <h3 className={styles.subsubheading}>Usage Data</h3>
          <p>We automatically collect information about how you interact with the Service, including pages visited, features used, analysis counts, and timestamps.</p>

          <h3 className={styles.subsubheading}>Google Search Console Data</h3>
          <p>If you connect your Google Search Console account, we access search analytics (queries, clicks, impressions, CTR, position) and URL index status for the URLs you analyze. We store OAuth tokens to maintain your connection. You can disconnect at any time from Settings.</p>

          <h3 className={styles.subsubheading}>eCommerce / Shopify Data</h3>
          <p>If you connect your Shopify store, we access and store product data, collections, orders, customer information, cart data, checkout data, and webhook events. This data is synced to provide eCommerce management features within the dashboard.</p>

          <h3 className={styles.subsubheading}>QR Code &amp; Scan Data</h3>
          <p>When you create QR codes, we store the QR code content and configuration. When scan tracking is enabled, we collect scan events including device type (mobile, desktop, tablet), user agent string, HTTP referer, and timestamp. We do not collect personal information about the individuals who scan your QR codes.</p>

          <h3 className={styles.subsubheading}>Instagram Data</h3>
          <p>If you connect your Instagram account, we access your profile information, posts, and engagement analytics through the Meta/Instagram API. OAuth tokens are stored to maintain the connection. You can disconnect at any time from Settings.</p>

          <h3 className={styles.subsubheading}>Google Analytics Data</h3>
          <p>If you connect your Google Analytics account, we access traffic data including sessions, page views, bounce rates, and conversions. OAuth tokens are stored to maintain the connection and can be revoked at any time.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>3. How We Use Your Information</h2>
          <ul className={styles.list}>
            <li>To provide and maintain the Service including all platform features</li>
            <li>To display SEO analysis results and reports</li>
            <li>To save your reports and analysis history</li>
            <li>To enable team collaboration features</li>
            <li>To display Google Search Console and Google Analytics data alongside your reports</li>
            <li>To sync and display your Shopify store data for eCommerce management</li>
            <li>To track QR code scans and provide scan analytics</li>
            <li>To display Instagram profile and post analytics</li>
            <li>To manage your content calendar and scheduling</li>
            <li>To track usage for rate limiting and analytics</li>
            <li>To communicate with you about your account or the Service</li>
            <li>To improve and develop new features</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>4. Data Storage and Security</h2>
          <p>
            Your data is stored securely using Supabase, which provides encryption at rest and in transit. We use Row Level Security (RLS) policies to ensure users can only access their own data. OAuth tokens for Google Search Console are stored encrypted in our database.
          </p>
          <p>
            While we implement industry-standard security measures, no method of electronic storage is 100% secure. We cannot guarantee absolute security of your data.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>5. Third-Party Services</h2>
          <p>We use the following third-party services:</p>
          <ul className={styles.list}>
            <li><strong>Supabase</strong> — Authentication and database hosting</li>
            <li><strong>Google PageSpeed Insights API</strong> — Performance and Lighthouse score data</li>
            <li><strong>Google Search Console API</strong> — Search analytics and index status (only if you connect your account)</li>
            <li><strong>Google Analytics API</strong> — Traffic and conversion data (only if you connect your account)</li>
            <li><strong>Shopify API</strong> — eCommerce store data (only if you connect your store)</li>
            <li><strong>Instagram / Meta API</strong> — Social media analytics (only if you connect your account)</li>
            <li><strong>Google OAuth / GitHub OAuth</strong> — Optional third-party sign-in</li>
          </ul>
          <p>Each third-party service has its own privacy policy governing how they handle your data.</p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>6. Data Sharing</h2>
          <p>We do not sell, trade, or rent your personal information to third parties. We may share data in the following circumstances:</p>
          <ul className={styles.list}>
            <li><strong>Team members</strong> — Reports shared within your team are visible to other team members</li>
            <li><strong>Shared report links</strong> — If you share a report link, anyone with the link can view that report</li>
            <li><strong>QR code scans</strong> — Scan tracking data is associated with your QR codes but does not identify the individuals who scan them</li>
            <li><strong>Legal requirements</strong> — If required by law, regulation, or legal process</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>7. Your Rights</h2>
          <p>You have the right to:</p>
          <ul className={styles.list}>
            <li>Access your personal data through the Settings page</li>
            <li>Update your profile information at any time</li>
            <li>Delete your reports and QR codes from the dashboard</li>
            <li>Disconnect third-party integrations (Google Search Console, Google Analytics, Shopify, Instagram)</li>
            <li>Request deletion of your account and all associated data by contacting us</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>8. Cookies</h2>
          <p>
            We use essential cookies to manage authentication sessions. These cookies are necessary for the Service to function and cannot be opted out of. We do not use advertising or tracking cookies.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>9. Children&apos;s Privacy</h2>
          <p>
            Our Service is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes by updating the &quot;Last updated&quot; date at the top of this page. Your continued use of the Service after changes constitutes acceptance of the revised policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>11. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy, please contact us through the application.
          </p>
        </section>

        <div className={styles.footer}>
          <Link href="/" className={styles.footerLink}>Home</Link>
          <Link href="/terms" className={styles.footerLink}>Terms of Service</Link>
        </div>
      </main>
    </>
  );
}
