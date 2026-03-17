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
} from "lucide-react"

const data = {
  teams: [
    {
      name: "SEO Tool",
      logo: <SearchIcon />,
      plan: "Dashboard",
    },
  ],
  navMain: [
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
      title: "Google Analytics",
      url: "/ga",
      icon: <BarChart3Icon />,
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
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
