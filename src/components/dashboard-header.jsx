"use client"

import { usePathname } from "next/navigation"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"

const titles = {
  "/dashboard": "Dashboard",
  "/seo": "SEO Analyzer",
  "/seo-statistics": "Site Crawler",
  "/ga": "Analytics",
  "/backlinks": "Backlinks Checker",
  "/speed-monitor": "Site Speed & Performance",
  "/instagram": "Instagram Manager",
  "/content-calendar": "Content Calendar",
  "/competitor-tracker": "Competitor Tracker",
  "/news": "News Consolidator",
  "/broken-links": "Broken Link Checker",
  "/local-seo": "Local SEO Manager",
  "/keyword-tracker": "Keyword Tracker",
  "/validators": "Validators",
  "/sitemap-generator": "Sitemap Generator",
  "/monitoring": "Monitoring",
  "/llms-generator": "LLMs.txt Generator",
  "/indexnow": "IndexNow",
  "/ai-assistant": "SEO Assistant",
  "/ai-content": "AI Content Generator",
  "/qr-generator": "QR Code Generator",
  "/qr-generator/all": "All QR Codes",
  "/qr-generator/analytics": "QR Analytics",
  "/cloudflare-analytics": "Cloudflare Analytics",
  "/reviews": "Google Reviews",
  "/basecamp": "Basecamp Activity",
  "/basecamp/todos": "Basecamp Todos",
  "/basecamp/documents": "Basecamp Documents",
  "/basecamp/messages": "Basecamp Messages",
  "/basecamp/people": "Basecamp People",
  "/settings": "Settings",
  "/team": "Team",
  "/profile": "Profile",
  "/roadmap": "Roadmap",
  "/help": "Help & Docs",
}

export function DashboardHeader() {
  const pathname = usePathname()
  const title = titles[pathname] || "Dashboard"

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-vertical:h-4 data-vertical:self-auto"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbPage>{title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </header>
  )
}
