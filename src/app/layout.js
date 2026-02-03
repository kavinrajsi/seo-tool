import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "./components/AuthProvider";
import WebVitals from "./components/WebVitals";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "SEO Analyzer - On-Page SEO Analysis Tool",
  description:
    "Analyze your website's on-page SEO factors including title tags, meta descriptions, heading structure, and more.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <WebVitals />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
