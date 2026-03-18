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
  LinkIcon,
  GaugeIcon,
  MapPinIcon,
  TrendingUpIcon,
  Unlink,
  ShieldCheckIcon,
  UsersIcon,
  BellIcon,
  FileTextIcon,
  FolderIcon,
  UserIcon,
  SettingsIcon,
  SparklesIcon,
  BotIcon,
  ZapIcon,
  QrCodeIcon,
  BookOpenIcon,
} from "lucide-react"

const data = {
  dashboard: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
  ],
  seoTools: [
    {
      title: "SEO Analyzer",
      url: "/seo",
      icon: <SearchIcon />,
    },
    {
      title: "Site Crawler",
      url: "/seo-statistics",
      icon: <GlobeIcon />,
    },
    {
      title: "Backlinks Checker",
      url: "/backlinks",
      icon: <LinkIcon />,
    },
    {
      title: "Site Speed & Outage",
      url: "/speed-monitor",
      icon: <GaugeIcon />,
    },
    {
      title: "Local SEO Manager",
      url: "/local-seo",
      icon: <MapPinIcon />,
    },
    {
      title: "Keyword Tracker",
      url: "/keyword-tracker",
      icon: <TrendingUpIcon />,
    },
    {
      title: "Broken Links",
      url: "/broken-links",
      icon: <Unlink />,
    },
    {
      title: "Validators",
      url: "/validators",
      icon: <ShieldCheckIcon />,
    },
    {
      title: "Sitemap Generator",
      url: "/sitemap-generator",
      icon: <FileTextIcon />,
    },
    {
      title: "Monitoring",
      url: "/monitoring",
      icon: <BellIcon />,
    },
    {
      title: "LLMs.txt Generator",
      url: "/llms-generator",
      icon: <BotIcon />,
    },
    {
      title: "IndexNow",
      url: "/indexnow",
      icon: <ZapIcon />,
    },
  ],
  aiTools: [
    {
      title: "AI Content Generator",
      url: "/ai-content",
      icon: <SparklesIcon />,
    },
    {
      title: "QR Code Generator",
      url: "/qr-generator",
      icon: <QrCodeIcon />,
    },
  ],
  contentSocial: [
    {
      title: "Instagram Manager",
      url: "/instagram",
      icon: <InstagramIcon />,
    },
    {
      title: "Analytics",
      url: "/ga",
      icon: <BarChart3Icon />,
    },
    {
      title: "Content Calendar",
      url: "/content-calendar",
      icon: <CalendarIcon />,
    },
    {
      title: "Competitor Tracker",
      url: "/competitor-tracker",
      icon: <SwordsIcon />,
    },
    {
      title: "News Consolidator",
      url: "/news",
      icon: <NewspaperIcon />,
    },
  ],
  settings: [
    {
      title: "Projects",
      url: "/projects",
      icon: <FolderIcon />,
    },
    {
      title: "Team",
      url: "/team",
      icon: <UsersIcon />,
    },
    {
      title: "Profile",
      url: "/profile",
      icon: <UserIcon />,
    },
    {
      title: "Settings",
      url: "/settings",
      icon: <SettingsIcon />,
    },
    {
      title: "Help & Docs",
      url: "/help",
      icon: <BookOpenIcon />,
    },
  ],
}

export function AppSidebar({
  ...props
}) {
  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.dashboard} label="Overview" />
        <NavMain items={data.seoTools} label="SEO Tools" />
        <NavMain items={data.aiTools} label="AI Tools" />
        <NavMain items={data.contentSocial} label="Content & Social" />
        <NavMain items={data.settings} label="Settings" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
