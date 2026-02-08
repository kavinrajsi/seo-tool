"use client";

import { useState } from "react";
import Link from "next/link";
import Navbar from "@/app/components/Navbar";
import styles from "./page.module.css";

const CHECK_SVG = (
  <svg
    className={styles.checkIcon}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M13.3 4.3a1 1 0 0 1 0 1.4l-6 6a1 1 0 0 1-1.4 0l-3-3a1 1 0 1 1 1.4-1.4L6.6 9.6l5.3-5.3a1 1 0 0 1 1.4 0Z"
      fill="currentColor"
    />
  </svg>
);

const FREE_FEATURES = [
  "5 scans per month",
  "Single URL scan",
  "42 on-page SEO checks",
  "PDF & Markdown export",
  "ChatGPT summary",
  "Shareable report links",
  "Sitemap creator",
  "Authority checker",
];

const PRO_FEATURES = [
  "Everything in Free",
  "Unlimited scans",
  "Full Scan (unlimited URLs)",
  "Bulk Scan (up to 10 URLs)",
  "Broken Link Checker",
  "SEO Score History & Trends",
  "Teams & Collaboration",
  "QR Code Generator & Analytics",
  "Shopify eCommerce Dashboard",
  "Review & Inventory Alerts",
  "Instagram Analytics",
  "Google Analytics Integration",
  "Google Search Console Integration",
  "Content Calendar",
  "Admin Panel",
];

const TESTIMONIALS = [
  {
    quote: "Rank Scan helped us identify critical SEO issues we had no idea about. Our organic traffic increased by 40% in just two months.",
    name: "Priya S.",
    role: "Digital Marketing Manager",
  },
  {
    quote: "The bulk scan feature saves me hours every week. I can audit all my client sites in one go.",
    name: "Arjun M.",
    role: "Freelance SEO Consultant",
  },
  {
    quote: "Finally an SEO tool that doesn't cost a fortune. The free plan alone is incredibly powerful.",
    name: "Meera K.",
    role: "Startup Founder",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is the Free plan really free?",
    a: "Yes, completely free with no credit card required. You get 5 scans per month with all 42 SEO checks.",
  },
  {
    q: "What's included in the Pro plan?",
    a: "Everything in Free plus unlimited scans, bulk scan, full site scan, broken link checker, score history, team collaboration, eCommerce dashboard, and all integrations.",
  },
  {
    q: "Can I cancel my Pro subscription anytime?",
    a: "Yes, you can cancel anytime. Your account will revert to the Free plan at the end of the billing period.",
  },
  {
    q: "Do you offer a free trial of Pro?",
    a: "The Pro plan is coming soon. Sign up for Free now and you'll be notified when Pro launches.",
  },
  {
    q: "Is there a team or agency plan?",
    a: "The Pro plan includes team collaboration with role-based permissions. Custom enterprise plans will be available soon.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We will support UPI, credit/debit cards, and net banking when Pro launches.",
  },
];

export default function PricingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <>
      <Navbar />
      <main className={styles.container}>
        <h1 className={styles.heading}>Pricing</h1>
        <p className={styles.subtitle}>
          Start for free. Upgrade when you need more power.
        </p>

        <div className={styles.pricingGrid}>
          <div className={styles.card}>
            <div className={styles.planName}>Free</div>
            <div className={styles.price}>
              ₹0 <span>/ month</span>
            </div>
            <p className={styles.priceNote}>No credit card required</p>
            <ul className={styles.featureList}>
              {FREE_FEATURES.map((feature) => (
                <li key={feature} className={styles.featureItem}>
                  {CHECK_SVG}
                  {feature}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className={`${styles.ctaButton} ${styles.ctaPrimary}`}
            >
              Get Started
            </Link>
          </div>

          <div className={`${styles.card} ${styles.cardHighlight}`}>
            <span className={styles.badge}>Coming Soon</span>
            <div className={styles.planName}>Pro</div>
            <div className={styles.price}>
              ₹499 <span>/ month</span>
            </div>
            <p className={styles.priceNote}>For teams and power users</p>
            <ul className={styles.featureList}>
              {PRO_FEATURES.map((feature) => (
                <li key={feature} className={styles.featureItem}>
                  {CHECK_SVG}
                  {feature}
                </li>
              ))}
            </ul>
            <span className={`${styles.ctaButton} ${styles.ctaSecondary}`}>
              Coming Soon
            </span>
          </div>
        </div>

        {/* Testimonials */}
        <section className={styles.testimonialSection}>
          <h2 className={styles.sectionHeading}>
            What our users say
          </h2>
          <div className={styles.testimonialGrid}>
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className={styles.testimonialCard}>
                <div className={styles.stars}>{"★★★★★"}</div>
                <p className={styles.testimonialQuote}>{t.quote}</p>
                <p className={styles.testimonialAuthor}>{t.name}</p>
                <p className={styles.testimonialRole}>{t.role}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className={styles.faqSection}>
          <h2 className={styles.sectionHeading}>
            Pricing FAQ
          </h2>
          <div className={styles.faqList}>
            {FAQ_ITEMS.map((item, i) => (
              <div key={i} className={styles.faqItem}>
                <button
                  type="button"
                  className={styles.faqQuestion}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  aria-expanded={openFaq === i}
                >
                  {item.q}
                  <span className={`${styles.faqChevron} ${openFaq === i ? styles.faqChevronOpen : ""}`}>
                    &#8250;
                  </span>
                </button>
                {openFaq === i && (
                  <div className={styles.faqAnswer}>{item.a}</div>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className={styles.footer}>
          <Link href="/" className={styles.footerLink}>
            Home
          </Link>
          <Link href="/privacy" className={styles.footerLink}>
            Privacy
          </Link>
          <Link href="/terms" className={styles.footerLink}>
            Terms
          </Link>
        </div>
      </main>
    </>
  );
}
