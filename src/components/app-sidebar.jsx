"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
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
  CalendarDaysIcon,
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
  ShoppingCartIcon,
  ShieldIcon,
  HardDriveIcon,
  CheckSquare2Icon,
} from "lucide-react"

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "SEO & Analytics",
    url: "/seo",
    icon: <SearchIcon />,
    subItems: [
      { title: "SEO Analyzer", url: "/seo" },
      { title: "Site Crawler", url: "/seo-statistics" },
      { title: "Backlinks Checker", url: "/backlinks", badge: "dev" },
      { title: "Keyword Tracker", url: "/keyword-tracker" },
      { title: "Broken Links", url: "/broken-links" },
      { title: "Validators", url: "/validators" },
      { title: "Sitemap Generator", url: "/sitemap-generator" },
      { title: "Monitoring", url: "/monitoring", badge: "dev" },
      { title: "LLMs.txt Generator", url: "/llms-generator" },
      { title: "IndexNow", url: "/indexnow", badge: "dev" },
      { title: "Site Speed & Performance", url: "/speed-monitor" },
      { title: "Analytics", url: "/ga" },
      { title: "Search Console", url: "/search-console" },
      { title: "Cloudflare Analytics", url: "/cloudflare-analytics" },
      { title: "Google Reviews", url: "/reviews" },
      { title: "AI Assistant", url: "/ai-assistant" },
      { title: "Product Catalog", url: "/shopify/products" },
      { title: "Order Tracker", url: "/shopify/orders" },
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
    title: "Content & Social",
    url: "/instagram",
    icon: <NewspaperIcon />,
    subItems: [
      { title: "Influencer CRM", url: "/influencers" },
      { title: "IG Manager", url: "/instagram", badge: "dev" },
      { title: "Content Calendar", url: "/content-calendar", badge: "dev" },
      { title: "Competitor Tracker", url: "/competitor-tracker", badge: "dev" },
      { title: "News Consolidator", url: "/news", badge: "dev" },
    ],
  },
  {
    title: "Devices",
    url: "/devices",
    icon: <BarChart3Icon />,
    subItems: [
      { title: "All Devices", url: "/devices" },
      { title: "Add Device", url: "/devices/add" },
      { title: "Import Devices", url: "/devices/import" },
      { title: "Vendors", url: "/devices/vendors" },
    ],
  },
  {
    title: "HR",
    url: "/candidates",
    icon: <UsersIcon />,
    subItems: [
      { title: "Candidates", url: "/candidates" },
      { title: "Candidate Statuses", url: "/candidate-statuses" },
      { title: "Email Templates", url: "/email-templates" },
      { title: "Employees", url: "/employees" },
      { title: "Departments", url: "/departments" },
      { title: "Leave Management", url: "/leaves" },
      { title: "Leave Approvals", url: "/leaves/admin" },
      { title: "Holiday Calendar", url: "/holidays" },
    ],
  },
  {
    title: "Software Renewals",
    url: "/software-renewals",
    icon: <CalendarDaysIcon />,
  },
  {
    title: "Events",
    url: "/events",
    icon: <CalendarIcon />,
  },
  {
    title: "Basecamp",
    url: "/basecamp",
    icon: <ZapIcon />,
    subItems: [
      { title: "Activity", url: "/basecamp" },
      { title: "My Readings", url: "/basecamp/me" },
      { title: "Todos", url: "/basecamp/todos" },
      { title: "Documents", url: "/basecamp/documents" },
      { title: "Messages", url: "/basecamp/messages" },
      { title: "People", url: "/basecamp/people" },
    ],
  },
  {
    title: "Hard Disk",
    url: "/hard-disk",
    icon: <HardDriveIcon />,
    subItems: [
      { title: "Search", url: "/hard-disk" },
      { title: "File Manager", url: "/hard-disk/files" },
    ],
  },
  {
    title: "Habits",
    url: "/habits",
    icon: <CheckSquare2Icon />,
    subItems: [
      { title: "Daily Check-in",  url: "/habits" },
      { title: "Goals",           url: "/habits/goals" },
      { title: "Leaderboard",     url: "/habits/leaderboard" },
      { title: "Weekly Planner",  url: "/habits/planner" },
    ],
  },
  {
    title: "Admin",
    url: "/admin",
    icon: <ShieldIcon />,
    subItems: [
      { title: "Role Management", url: "/admin" },
      { title: "Email Log", url: "/email-log" },
    ],
  },
  {
    title: "Control Panel",
    url: "/settings",
    icon: <SettingsIcon />,
    subItems: [
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
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} label="Platform" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
