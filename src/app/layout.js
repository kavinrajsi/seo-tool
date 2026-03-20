import Script from "next/script";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConsentBanner } from "@/components/consent-banner";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata = {
  title: "SEO Tool — Analyze, Crawl & Track Your Site",
  description:
    "Run on-page SEO audits, crawl your site for technical issues, and connect Google Analytics & Search Console from one dashboard.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${ibmSans.variable} ${ibmMono.variable}`} suppressHydrationWarning>
      <head>
        {/* Consent Mode v2 defaults — must run BEFORE gtag loads */}
        <Script id="consent-defaults" strategy="beforeInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}

            // Check if user already consented
            var consent = (typeof document !== 'undefined') ? document.cookie.match(/cookie_consent=([^;]+)/) : null;
            var granted = consent && consent[1] === 'granted';

            gtag('consent', 'default', {
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied',
              'analytics_storage': granted ? 'granted' : 'denied',
              'functionality_storage': 'granted',
              'personalization_storage': 'denied',
              'security_storage': 'granted',
              'wait_for_update': 500,
            });
          `}
        </Script>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-H55K6VHY30"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-H55K6VHY30');
          `}
        </Script>
      </head>
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <ConsentBanner />
      </body>
    </html>
  );
}
