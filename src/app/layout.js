import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
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
    <html lang="en" className={`dark ${ibmSans.variable} ${ibmMono.variable}`}>
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
