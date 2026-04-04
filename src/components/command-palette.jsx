"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  SearchIcon,
  LayoutDashboardIcon,
  SearchCheckIcon,
  BarChart3Icon,
  QrCodeIcon,
  UsersIcon,
  MonitorIcon,
  ZapIcon,
  SettingsIcon,
  SparklesIcon,
  NewspaperIcon,
  ArrowRightIcon,
} from "lucide-react"

const PAGES = [
  { title: "Dashboard", url: "/dashboard", section: "Main", icon: LayoutDashboardIcon },
  { title: "SEO Analyzer", url: "/seo", section: "SEO Tools", icon: SearchCheckIcon },
  { title: "Site Crawler", url: "/seo-statistics", section: "SEO Tools", icon: SearchCheckIcon },
  { title: "Backlinks Checker", url: "/backlinks", section: "SEO Tools", icon: SearchCheckIcon },
  { title: "Keyword Tracker", url: "/keyword-tracker", section: "SEO Tools", icon: SearchCheckIcon },
  { title: "Broken Links", url: "/broken-links", section: "SEO Tools", icon: SearchCheckIcon },
  { title: "Validators", url: "/validators", section: "SEO Tools", icon: SearchCheckIcon },
  { title: "Sitemap Generator", url: "/sitemap-generator", section: "SEO Tools", icon: SearchCheckIcon },
  { title: "LLMs.txt Generator", url: "/llms-generator", section: "SEO Tools", icon: SearchCheckIcon },
  { title: "IndexNow", url: "/indexnow", section: "SEO Tools", icon: SearchCheckIcon },
  { title: "AI Assistant", url: "/ai-assistant", section: "AI Tools", icon: SparklesIcon },
  { title: "QR Code Generator", url: "/qr-generator", section: "QR Code", icon: QrCodeIcon },
  { title: "All QR Codes", url: "/qr-generator/all", section: "QR Code", icon: QrCodeIcon },
  { title: "QR Analytics", url: "/qr-generator/analytics", section: "QR Code", icon: QrCodeIcon },
  { title: "Site Speed & Performance", url: "/speed-monitor", section: "Analytics", icon: BarChart3Icon },
  { title: "Analytics", url: "/ga", section: "Analytics", icon: BarChart3Icon },
  { title: "Search Console", url: "/search-console", section: "Analytics", icon: BarChart3Icon },
  { title: "Cloudflare Analytics", url: "/cloudflare-analytics", section: "Analytics", icon: BarChart3Icon },
  { title: "Google Reviews", url: "/reviews", section: "Analytics", icon: BarChart3Icon },
  { title: "Influencer CRM", url: "/influencers", section: "Content & Social", icon: NewspaperIcon },
  { title: "Content Calendar", url: "/content-calendar", section: "Content & Social", icon: NewspaperIcon },
  { title: "Competitor Tracker", url: "/competitor-tracker", section: "Content & Social", icon: NewspaperIcon },
  { title: "News Consolidator", url: "/news", section: "Content & Social", icon: NewspaperIcon },
  { title: "All Devices", url: "/devices", section: "Devices", icon: MonitorIcon },
  { title: "Add Device", url: "/devices/add", section: "Devices", icon: MonitorIcon },
  { title: "Vendors", url: "/devices/vendors", section: "Devices", icon: MonitorIcon },
  { title: "Candidates", url: "/candidates", section: "HR", icon: UsersIcon },
  { title: "Contact Submissions", url: "/leads", section: "E-commerce", icon: UsersIcon },
  { title: "Employees", url: "/employees", section: "HR", icon: UsersIcon },
  { title: "Announcements", url: "/announcements", section: "HR", icon: UsersIcon },
  { title: "Register Employee", url: "/employees/register", section: "HR", icon: UsersIcon },
  { title: "Basecamp Activity", url: "/basecamp", section: "Basecamp", icon: ZapIcon },
  { title: "Basecamp Todos", url: "/basecamp/todos", section: "Basecamp", icon: ZapIcon },
  { title: "Basecamp Documents", url: "/basecamp/documents", section: "Basecamp", icon: ZapIcon },
  { title: "Basecamp Messages", url: "/basecamp/messages", section: "Basecamp", icon: ZapIcon },
  { title: "Basecamp People", url: "/basecamp/people", section: "Basecamp", icon: ZapIcon },
  { title: "Settings", url: "/settings", section: "Settings", icon: SettingsIcon },
  { title: "Team", url: "/team", section: "Settings", icon: SettingsIcon },
  { title: "Profile", url: "/profile", section: "Settings", icon: SettingsIcon },
  { title: "Roadmap", url: "/roadmap", section: "Settings", icon: SettingsIcon },
  { title: "Help & Docs", url: "/help", section: "Settings", icon: SettingsIcon },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const router = useRouter()

  const filtered = query.trim()
    ? PAGES.filter((p) =>
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.section.toLowerCase().includes(query.toLowerCase()) ||
        p.url.toLowerCase().includes(query.toLowerCase())
      )
    : PAGES

  // Group by section
  const grouped = {}
  for (const page of filtered) {
    if (!grouped[page.section]) grouped[page.section] = []
    grouped[page.section].push(page)
  }

  // Flat list for keyboard navigation
  const flatList = filtered

  const navigate = useCallback((url) => {
    setOpen(false)
    setQuery("")
    router.push(url)
  }, [router])

  // Keyboard listener for /
  useEffect(() => {
    function handleKeyDown(e) {
      // Open on / (when not typing in an input)
      if (e.key === "/" && !open) {
        const tag = e.target.tagName
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.target.isContentEditable) return
        e.preventDefault()
        setOpen(true)
        return
      }

      if (!open) return

      if (e.key === "Escape") {
        setOpen(false)
        setQuery("")
      } else if (e.key === "ArrowDown") {
        e.preventDefault()
        setSelectedIndex((i) => Math.min(i + 1, flatList.length - 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setSelectedIndex((i) => Math.max(i - 1, 0))
      } else if (e.key === "Enter") {
        e.preventDefault()
        if (flatList[selectedIndex]) navigate(flatList[selectedIndex].url)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, flatList, selectedIndex, navigate])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setSelectedIndex(0)
    }
  }, [open])

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
    el?.scrollIntoView({ block: "nearest" })
  }, [selectedIndex])

  if (!open) return null

  let itemIndex = 0

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 backdrop-blur-sm" onClick={() => { setOpen(false); setQuery(""); }} />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50">
        <div className="rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
          {/* Search input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
            <SearchIcon size={18} className="text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search pages..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <kbd className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded border border-border">ESC</kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[400px] overflow-y-auto py-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No pages found for "{query}"
              </div>
            ) : (
              Object.entries(grouped).map(([section, pages]) => (
                <div key={section}>
                  <p className="px-4 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{section}</p>
                  {pages.map((page) => {
                    const idx = itemIndex++
                    const Icon = page.icon
                    return (
                      <button
                        key={page.url}
                        data-index={idx}
                        onClick={() => navigate(page.url)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          selectedIndex === idx ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon size={16} className={selectedIndex === idx ? "text-primary" : ""} />
                        <span className="text-sm flex-1">{page.title}</span>
                        {selectedIndex === idx && <ArrowRightIcon size={14} className="text-primary" />}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-border text-[10px] text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1"><kbd className="bg-muted/50 px-1 py-0.5 rounded border border-border">↑↓</kbd> navigate</span>
              <span className="flex items-center gap-1"><kbd className="bg-muted/50 px-1 py-0.5 rounded border border-border">↵</kbd> open</span>
            </div>
            <span className="flex items-center gap-1"><kbd className="bg-muted/50 px-1 py-0.5 rounded border border-border">/</kbd> to search</span>
          </div>
        </div>
      </div>
    </>
  )
}
