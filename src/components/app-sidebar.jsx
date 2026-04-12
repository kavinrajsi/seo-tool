"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
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
  QrCodeIcon,
  BookOpenIcon,
  StarIcon,
  ShoppingCartIcon,
  ShieldIcon,
  HardDriveIcon,
  CheckSquare2Icon,
  InboxIcon,
} from "lucide-react"

const navMain = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: <LayoutDashboardIcon />,
  },
  {
    title: "SEO",
    url: "/seo",
    icon: <SearchIcon />,
    subItems: [
      { title: "SEO Analyzer",       url: "/seo" },
      { title: "Site Crawler",       url: "/seo-statistics" },
      { title: "Keyword Tracker",    url: "/keyword-tracker" },
      { title: "Backlinks Checker",  url: "/backlinks",   badge: "dev" },
      { title: "Broken Links",       url: "/broken-links" },
      { title: "Validators",         url: "/validators" },
      { title: "Sitemap Generator",  url: "/sitemap-generator" },
      { title: "LLMs.txt Generator", url: "/llms-generator" },
      { title: "IndexNow",           url: "/indexnow",    badge: "dev" },
      { title: "Site Speed",         url: "/speed-monitor" },
      { title: "Monitoring",         url: "/monitoring",  badge: "dev" },
    ],
  },
  {
    title: "Analytics",
    url: "/ga",
    icon: <TrendingUpIcon />,
    subItems: [
      { title: "Google Analytics",     url: "/ga" },
      { title: "Search Console",       url: "/search-console" },
      { title: "Cloudflare Analytics", url: "/cloudflare-analytics" },
      { title: "Google Reviews",       url: "/reviews" },
    ],
  },
  {
    title: "SME",
    url: "/sme",
    icon: <MapPinIcon />,
    subItems: [
      { title: "SME Explorer", url: "/sme",          badge: "dev" },
      { title: "SME Contacts", url: "/sme/contacts", badge: "dev" },
    ],
  },
  {
    title: "Content & Social",
    url: "/instagram",
    icon: <NewspaperIcon />,
    subItems: [
      { title: "AI Assistant",       url: "/ai-assistant" },
      { title: "Influencer CRM",     url: "/influencers" },
      { title: "IG Manager",         url: "/instagram",         badge: "dev" },
      { title: "Content Calendar",   url: "/content-calendar",  badge: "dev" },
      { title: "Competitor Tracker", url: "/competitor-tracker", badge: "dev" },
      { title: "News Consolidator",  url: "/news",              badge: "dev" },
      { title: "QR Code Generator",  url: "/qr-generator" },
      { title: "All QR Codes",       url: "/qr-generator/all" },
      { title: "QR Analytics",       url: "/qr-generator/analytics" },
    ],
  },
  {
    title: "E-commerce",
    url: "/shopify/products",
    icon: <ShoppingCartIcon />,
    subItems: [
      { title: "Product Catalog", url: "/shopify/products" },
      { title: "Order Tracker",   url: "/shopify/orders" },
    ],
  },
  {
    title: "Leads",
    url: "/leads",
    icon: <InboxIcon />,
    subItems: [
      { title: "Contact Submissions", url: "/leads" },
    ],
  },
  {
    title: "HR",
    url: "/employees",
    icon: <UsersIcon />,
    subItems: [
      { title: "Employees",           url: "/employees" },
      { title: "Departments",         url: "/departments" },
      { title: "Org Chart",           url: "/org-chart" },
      { title: "Candidates",          url: "/candidates" },
      { title: "Candidate Statuses",  url: "/candidate-statuses" },
      { title: "Email Templates",     url: "/email-templates" },
      { title: "Onboarding",          url: "/onboarding" },
      { title: "Announcements",       url: "/announcements" },
      { title: "Performance",         url: "/performance" },
      { title: "Employee Engagement", url: "/engagement" },
      { title: "Capacity Check-in",   url: "/capacity" },
      { title: "Leave Management",    url: "/leaves" },
      { title: "Leave Approvals",     url: "/leaves/admin" },
      { title: "HR Calendar",         url: "/hr-calendar" },
    ],
  },
  {
    title: "Operations",
    url: "/devices",
    icon: <BarChart3Icon />,
    subItems: [
      { title: "All Devices",       url: "/devices" },
      { title: "Add Device",        url: "/devices/add" },
{ title: "Domain Renewals",  url: "/domain-renewals" },
      { title: "Events",            url: "/events" },
      { title: "Hard Disk",         url: "/hard-disk" },
      { title: "File Manager",      url: "/hard-disk/files" },
    ],
  },
  {
    title: "Habits",
    url: "/habits",
    icon: <CheckSquare2Icon />,
    subItems: [
      { title: "Daily Check-in", url: "/habits" },
      { title: "Goals",          url: "/habits/goals" },
      { title: "Leaderboard",    url: "/habits/leaderboard" },
      { title: "Weekly Planner", url: "/habits/planner" },
    ],
  },
  {
    title: "Admin",
    url: "/admin",
    icon: <ShieldIcon />,
    subItems: [
      { title: "Role Management", url: "/admin" },
    ],
  },
  {
    title: "Control Panel",
    url: "/settings",
    icon: <SettingsIcon />,
    subItems: [
      { title: "Profile",    url: "/profile" },
      { title: "Settings",   url: "/settings" },
      { title: "Email Log",  url: "/email-log" },
      { title: "Roadmap",    url: "/roadmap" },
      { title: "Help & Docs", url: "/help" },
    ],
  },
]

function useAllowedPages() {
  const [allowedPages, setAllowedPages] = useState(null); // null = loading, [] = no restrictions

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setAllowedPages([]); return; }

        const { data: emp } = await supabase
          .from("employees")
          .select("id, role")
          .eq("work_email", user.email)
          .maybeSingle();

        // No employee record or admin/owner = show everything
        if (!emp || emp.role === "admin" || emp.role === "owner") {
          setAllowedPages([]); return;
        }

        const { data: userRoles } = await supabase
          .from("employee_roles")
          .select("role_id, roles(name)")
          .eq("employee_id", emp.id);

        // Admin/owner via employee_roles or no roles = show everything
        if (userRoles?.some((r) => r.roles?.name === "admin" || r.roles?.name === "owner")) {
          setAllowedPages([]); return;
        }
        if (!userRoles?.length) { setAllowedPages([]); return; }

        const roleIds = userRoles.map((r) => r.role_id);
        const { data: accessRules } = await supabase
          .from("role_page_access")
          .select("page_path")
          .in("role_id", roleIds);

        if (!accessRules?.length) { setAllowedPages([]); return; }
        setAllowedPages(accessRules.map((r) => r.page_path));
      } catch {
        setAllowedPages([]); // fail open
      }
    }
    load();
  }, []);

  return allowedPages;
}

function filterNavItems(items, allowedPages) {
  // null = still loading, [] = no restrictions (admin/owner)
  if (!allowedPages || allowedPages.length === 0) return items;

  return items
    .map((item) => {
      if (item.subItems) {
        const filtered = item.subItems.filter((sub) =>
          allowedPages.some((p) => sub.url === p || sub.url.startsWith(p + "/"))
        );
        if (filtered.length === 0) return null;
        return { ...item, subItems: filtered, url: filtered[0].url };
      }
      // Top-level item
      return allowedPages.includes(item.url) ? item : null;
    })
    .filter(Boolean);
}

export function AppSidebar({
  ...props
}) {
  const allowedPages = useAllowedPages();
  const filteredNav = allowedPages === null ? [] : filterNavItems(navMain, allowedPages);

  return (
    <Sidebar collapsible="icon" variant="inset" {...props}>
      <SidebarHeader>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={filteredNav} label="Platform" />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
