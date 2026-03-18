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
} from "lucide-react"

const data = {
  teams: [
    {
      name: "SEO Tool",
      logo: <SearchIcon />,
      plan: "Dashboard",
    },
  ],
  seoTools: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: <LayoutDashboardIcon />,
    },
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
  localSeo: [
    {
      title: "Local SEO Manager",
      url: "/local-seo",
      icon: <MapPinIcon />,
    },
  ],
}

export function AppSidebar({
  ...props
}) {
  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={data.teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.seoTools} label="SEO Tools" />
        <NavMain items={data.contentSocial} label="Content & Social" />
        <NavMain items={data.localSeo} label="Local SEO" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
