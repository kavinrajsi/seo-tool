"use client"

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
import { ChevronRightIcon } from "lucide-react"

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
            <Collapsible key={item.title} defaultOpen={item.subItems.some((s) => pathname === s.url) || pathname === item.url}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  tooltip={item.title}
                  isActive={pathname === item.url}
                  render={<Link href={item.url} />}
                >
                  {item.icon}
                  <span>{item.title}</span>
                </SidebarMenuButton>
                <CollapsibleTrigger className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors cursor-pointer group-data-[collapsible=icon]:hidden">
                  <ChevronRightIcon className="h-3.5 w-3.5 transition-transform duration-200 [[data-panel-open]_&]:rotate-90" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {item.subItems.map((sub) => (
                      <SidebarMenuSubItem key={sub.title}>
                        <SidebarMenuSubButton isActive={pathname === sub.url} render={<Link href={sub.url} />}>
                          {sub.title}
                        </SidebarMenuSubButton>
                      </SidebarMenuSubItem>
                    ))}
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
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
