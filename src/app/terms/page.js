import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import styles from "./page.module.css";

export const metadata = {
  title: "Terms of Service - Rank Scan",
  description: "Terms of Service for Rank Scan. Read the terms governing your use of our service.",
};

export default function TermsOfServicePage() {
  return (
    <>
      <Navbar />
      <main className={styles.container}>
        <h1 className={styles.heading}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: February 5, 2026</p>

        <section className={styles.section}>
          <h2 className={styles.subheading}>1. Acceptance of Terms</h2>
          <p>
            By accessing or using Rank Scan (the &quot;Service&quot;), you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these Terms, do not use the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>2. Description of Service</h2>
          <p>
            Rank Scan is a web application that analyzes on-page SEO factors for URLs you provide. The Service includes single URL analysis, bulk scanning, full site scanning, saved reports, team collaboration, and optional Google Search Console integration.
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
          <h2 className={styles.subheading}>7. Team Features</h2>
          <p>
            When you create or join a team, reports shared with the team become visible to all team members. Team owners can invite and remove members. If you leave a team, you will no longer have access to that team&apos;s shared reports.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>8. Intellectual Property</h2>
          <p>
            The Service, including its design, code, features, and branding, is owned by Rank Scan and protected by intellectual property laws. You retain ownership of any data you submit (URLs, reports), but grant us a license to process and store it to provide the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>9. Shared Reports</h2>
          <p>
            When you share a report link, anyone with the link can view that report. You are responsible for who you share report links with. We are not responsible for how others use publicly shared report data.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>10. Limitation of Liability</h2>
          <p>
            The Service is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, secure, or error-free.
          </p>
          <p>
            To the maximum extent permitted by law, Rank Scan shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>11. Service Availability</h2>
          <p>
            We reserve the right to modify, suspend, or discontinue the Service at any time, with or without notice. We are not liable to you or any third party for any modification, suspension, or discontinuation of the Service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>12. Account Termination</h2>
          <p>
            We may suspend or terminate your account at our discretion if we believe you have violated these Terms. You may delete your account at any time. Upon termination, your data will be deleted in accordance with our <Link href="/privacy" style={{ color: "var(--color-accent)", fontWeight: 600 }}>Privacy Policy</Link>.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>13. Changes to These Terms</h2>
          <p>
            We may update these Terms from time to time. We will notify you of material changes by updating the &quot;Last updated&quot; date at the top of this page. Your continued use of the Service after changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.subheading}>14. Contact Us</h2>
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
