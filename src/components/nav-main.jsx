"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronRightIcon, ChevronDownIcon } from "lucide-react"

function CollapsibleNavItem({ item, pathname }) {
  const isChildActive = item.subItems.some(
    (s) => pathname === s.url || pathname.startsWith(s.url + "/")
  )
  const [open, setOpen] = useState(isChildActive)

  // Open the group when navigating to a child page
  useEffect(() => {
    if (isChildActive) setOpen(true)
  }, [isChildActive])

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/collapsible">
      <SidebarMenuItem>
        <CollapsibleTrigger render={
          <SidebarMenuButton tooltip={item.title} />
        }>
          {item.icon}
          <span>{item.title}</span>
          {open ? (
            <ChevronDownIcon className="ml-auto transition-transform duration-200" />
          ) : (
            <ChevronRightIcon className="ml-auto transition-transform duration-200" />
          )}
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {item.subItems.map((sub) => (
              <SidebarMenuSubItem key={sub.title}>
                <SidebarMenuSubButton
                  isActive={pathname === sub.url || pathname.startsWith(sub.url + "/")}
                  render={<Link href={sub.url} />}
                >
                  <span>{sub.title}</span>
                  {sub.badge === "dev" && (
                    <span className="ml-auto text-[9px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/20">dev</span>
                  )}
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function NavMain({
  items,
  label = "Platform",
}) {
  const pathname = usePathname()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map((item) =>
          item.subItems ? (
            <CollapsibleNavItem key={item.title} item={item} pathname={pathname} />
          ) : (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                tooltip={item.title}
                isActive={pathname === item.url}
                render={<Link href={item.url} />}
              >
                {item.icon}
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
