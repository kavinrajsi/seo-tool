"use client"

import { useState, useEffect } from "react"
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
  "/keyword-tracker": "Keyword Tracker",
  "/validators": "Validators",
  "/sitemap-generator": "Sitemap Generator",
  "/monitoring": "Monitoring",
  "/llms-generator": "LLMs.txt Generator",
  "/indexnow": "IndexNow",
  "/ai-assistant": "AI Assistant",
  "/qr-generator": "QR Code Generator",
  "/qr-generator/all": "All QR Codes",
  "/qr-generator/analytics": "QR Analytics",
  "/search-console": "Search Console",
  "/cloudflare-analytics": "Cloudflare Analytics",
  "/reviews": "Google Reviews",
  "/devices": "Device Management",
  "/devices/add": "Add Device",
  "/devices/vendors": "Vendors",
  "/candidates": "Candidates",
  "/employees": "Employees",
  "/employees/register": "Register Employee",
  "/basecamp": "Basecamp Activity",
  "/basecamp/me": "My Readings",
  "/basecamp/todos": "Basecamp Todos",
  "/basecamp/documents": "Basecamp Documents",
  "/basecamp/messages": "Basecamp Messages",
  "/basecamp/people": "Basecamp People",
  "/beaver": "Beaver",
  "/settings": "Settings",
  "/team": "Team",
  "/profile": "Profile",
  "/roadmap": "Roadmap",
  "/help": "Help & Docs",
  "/hard-disk": "Hard Disk",
  "/hard-disk/files": "File Manager",
  "/habits": "Daily Habits",
  "/habits/goals": "Goal Tracking",
  "/habits/leaderboard": "Leaderboard",
  "/habits/planner": "Weekly Planner",
  "/events": "Events",
  "/software-renewals": "Software Renewals",
}

export function DashboardHeader() {
  const pathname = usePathname()
  const title = titles[pathname] || "Dashboard"
  const [time, setTime] = useState("")

  useEffect(() => {
    function tick() {
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
      <div className="flex flex-1 items-center gap-2 px-4">
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
        {time && (
          <span className="ml-auto font-mono text-sm tabular-nums text-muted-foreground pr-2">
            {time}
          </span>
        )}
      </div>
    </header>
  )
}
