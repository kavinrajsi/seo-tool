import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import styles from "./page.module.css";

export const metadata = {
  title: "Terms of Service - Firefly",
  description: "Terms of Service for Firefly. Read the terms governing your use of our service.",
};

export default function TermsOfServicePage() {
  return (
    <>
      <Navbar />
      <main className={styles.container}>
        <h1 className={styles.heading}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: February 8, 2026</p>

        <section className={styles.section}>
          <h2 className={styles.subheading}>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Firefly (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>2. Description of Service</h2>
          <p>
            Firefly is an all-in-one marketing platform that includes: on-page SEO analysis (single URL, bulk scan, and full site scan), Shopify eCommerce management (products, collections, orders, customers, carts, checkouts, and webhooks), QR code generation with scan tracking and analytics, Instagram analytics integration, content calendar, sitemap creation, Google Search Console integration, Google Analytics integration, team collaboration, and saved reports.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>3. User Accounts</h2>
          <ul className={styles.list}>
            <li>You must provide accurate and complete information when creating an account</li>
            <li>You are responsible for maintaining the security of your account credentials</li>
            <li>You are responsible for all activity that occurs under your account</li>
            <li>You must notify us immediately if you suspect unauthorized access to your account</li>
            <li>You must be at least 13 years old to create an account</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>4. Acceptable Use</h2>
          <p>You agree not to use the Service to:</p>
          <ul className={styles.list}>
            <li>Scan URLs you are not authorized to analyze</li>
            <li>Overwhelm or disrupt the Service or its infrastructure</li>
            <li>Attempt to gain unauthorized access to other users&apos; data</li>
            <li>Use automated scripts or bots to abuse the Service beyond normal usage</li>
            <li>Violate any applicable laws or regulations</li>
            <li>Infringe on the intellectual property rights of others</li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>5. Analysis Results</h2>
          <p>
            SEO analysis results are provided for informational purposes only. While we strive for accuracy, we do not guarantee that results are complete, current, or error-free. SEO best practices evolve, and results should be used as guidance, not as definitive recommendations.
          </p>
          <p>
            You acknowledge that SEO scores and recommendations are based on automated analysis and may not account for all factors specific to your website or industry.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>6. Google Search Console Integration</h2>
          <p>
            If you choose to connect your Google Search Console account, you authorize us to access your search analytics and index status data through the Google Search Console API. This connection is optional and can be revoked at any time through your Settings page.
          </p>
          <p>
            Your use of Google Search Console data through our Service is also subject to Google&apos;s Terms of Service and Privacy Policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>7. eCommerce / Shopify Integration</h2>
          <p>
            If you connect your Shopify store, you authorize us to access your store data including products, collections, orders, customers, carts, and checkouts via the Shopify API. Webhook events from your store are processed and stored to keep data in sync. You are responsible for ensuring you have the authority to connect any store you integrate.
          </p>
          <p>
            Your use of Shopify data through our Service is also subject to Shopify&apos;s Terms of Service and API License Agreement.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>8. QR Code Features</h2>
          <p>
            The QR code generator allows you to create, save, and download QR codes. When scan tracking is enabled, QR codes redirect through our servers to count scans before forwarding to the destination URL. Scan data collected includes device type, user agent, and timestamp — no personal information about the person scanning is stored.
          </p>
          <p>
            You are responsible for the content linked within your QR codes and must ensure it complies with applicable laws.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>9. Instagram Integration</h2>
          <p>
            If you connect your Instagram account, you authorize us to access your Instagram profile data, posts, and analytics through the Instagram/Meta API. This connection is optional and can be revoked at any time. Your use of Instagram data is also subject to Meta&apos;s Terms of Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>10. Team Features</h2>
          <p>
            When you create or join a team, reports shared with the team become visible to all team members. Team owners can invite and remove members. If you leave a team, you will no longer have access to that team&apos;s shared reports.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>11. Intellectual Property</h2>
          <p>
            The Service, including its design, code, features, and branding, is owned by Firefly and protected by intellectual property laws. You retain ownership of any data you submit (URLs, reports), but grant us a license to process and store it to provide the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>12. Shared Reports</h2>
          <p>
            When you share a report link, anyone with the link can view that report. You are responsible for who you share report links with. We are not responsible for how others use publicly shared report data.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>13. Limitation of Liability</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, secure, or error-free.
          </p>
          <p>
            To the maximum extent permitted by law, Firefly shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>14. Service Availability</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue the Service at any time, with or without notice. We are not liable to you or any third party for any modification, suspension, or discontinuation of the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>15. Account Termination</h2>
          <p>
            We may suspend or terminate your account at our discretion if we believe you have violated these Terms. You may delete your account at any time. Upon termination, your data will be deleted in accordance with our <Link href="/privacy" style={{ color: "var(--color-accent)", fontWeight: 600 }}>Privacy Policy</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>16. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes by updating the &quot;Last updated&quot; date at the top of this page. Your continued use of the Service after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>17. Contact Us</h2>
          <p>
            If you have questions about these Terms, please contact us through the application.
          </p>
        </section>

        <div className={styles.footer}>
          <Link href="/" className={styles.footerLink}>Home</Link>
          <Link href="/privacy" className={styles.footerLink}>Privacy Policy</Link>
        </div>
      </main>
    </>
  );
}
