import Script from "next/script";
import { Anek_Tamil, IBM_Plex_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConsentBanner } from "@/components/consent-banner";
import "./globals.css";

const anekTamil = Anek_Tamil({
  variable: "--font-sans",
  subsets: ["latin", "tamil"],
  weight: ["300", "400", "500", "600", "700"],
});

const anekTamilTitle = Anek_Tamil({
  variable: "--font-title",
  subsets: ["latin", "tamil"],
  weight: ["600", "700", "800"],
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
  verification: {
    google: "9cWEyCgCwMaqhj7hmu7rA5ApX4A7snjsspQ5UwyUaNQ",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${anekTamil.variable} ${anekTamilTitle.variable} ${ibmMono.variable}`} suppressHydrationWarning>
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
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}`}
            strategy="afterInteractive"
          />
        )}
        {process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID && (
          <Script id="google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID}');
            `}
          </Script>
        )}
      </head>
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
        <ConsentBanner />
      </body>
    </html>
  );
}
