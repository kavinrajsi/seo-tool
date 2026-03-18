"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { TeamProvider } from "@/lib/team-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardLayout({ children }) {
  return (
    <TeamProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <DashboardHeader />
          <div className="flex flex-1 flex-col p-4 pt-0">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TeamProvider>
  )
}
