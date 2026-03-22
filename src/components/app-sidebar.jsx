"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { TeamSwitcher } from "@/components/team-switcher"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  LayoutDashboardIcon,
  SearchIcon,
  GlobeIcon,
  BarChart3Icon,
  InstagramIcon,
  CalendarIcon,
  SwordsIcon,
  NewspaperIcon,
  CloudIcon,
  LinkIcon,
  GaugeIcon,
  MapPinIcon,
  TrendingUpIcon,
  Unlink,
  ShieldCheckIcon,
  UsersIcon,
  BellIcon,
  FileTextIcon,
  UserIcon,
  SettingsIcon,
  SparklesIcon,
  BotIcon,
  ZapIcon,
  QrCodeIcon,
  BookOpenIcon,
  StarIcon,
} from "lucide-react"

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "SEO Tools",
    url: "/seo",
    icon: <SearchIcon />,
    subItems: [
      { title: "SEO Analyzer", url: "/seo" },
      { title: "Site Crawler", url: "/seo-statistics" },
      { title: "Backlinks Checker", url: "/backlinks" },
      { title: "Keyword Tracker", url: "/keyword-tracker" },
      { title: "Broken Links", url: "/broken-links" },
      { title: "Validators", url: "/validators" },
      { title: "Sitemap Generator", url: "/sitemap-generator" },
      { title: "Monitoring", url: "/monitoring" },
      { title: "LLMs.txt Generator", url: "/llms-generator" },
      { title: "IndexNow", url: "/indexnow" },
    ],
  },
  {
    title: "AI Tools",
    url: "/ai-content",
    icon: <SparklesIcon />,
    subItems: [
      { title: "SEO Assistant", url: "/ai-assistant" },
      { title: "AI Content Generator", url: "/ai-content" },
    ],
  },
  {
    title: "QR Code",
    url: "/qr-generator",
    icon: <QrCodeIcon />,
    subItems: [
      { title: "QR Code Generator", url: "/qr-generator" },
      { title: "All QR Codes", url: "/qr-generator/all" },
      { title: "QR Analytics", url: "/qr-generator/analytics" },
    ],
  },
  {
    title: "Analytics",
    url: "/speed-monitor",
    icon: <BarChart3Icon />,
    subItems: [
      { title: "Site Speed & Performance", url: "/speed-monitor" },
      { title: "Analytics", url: "/ga" },
      { title: "Search Console", url: "/search-console" },
      { title: "Cloudflare Analytics", url: "/cloudflare-analytics" },
      { title: "Google Reviews", url: "/reviews" },
    ],
  },
  {
    title: "Content & Social",
    url: "/instagram",
    icon: <NewspaperIcon />,
    subItems: [
      { title: "Instagram Manager", url: "/instagram" },
      { title: "Content Calendar", url: "/content-calendar" },
      { title: "Competitor Tracker", url: "/competitor-tracker" },
      { title: "News Consolidator", url: "/news" },
    ],
  },
  {
    title: "Basecamp",
    url: "/basecamp",
    icon: <ZapIcon />,
    subItems: [
      { title: "Activity", url: "/basecamp" },
      { title: "Todos", url: "/basecamp/todos" },
      { title: "Documents", url: "/basecamp/documents" },
      { title: "Messages", url: "/basecamp/messages" },
      { title: "People", url: "/basecamp/people" },
    ],
  },
  {
    title: "Settings",
    url: "/settings",
    icon: <SettingsIcon />,
    subItems: [
      { title: "Team", url: "/team" },
      { title: "Profile", url: "/profile" },
      { title: "Settings", url: "/settings" },
      { title: "Roadmap", url: "/roadmap" },
      { title: "Help & Docs", url: "/help" },
    ],
  },
]

export function AppSidebar({
  ...props
}) {
  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} label="Platform" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
