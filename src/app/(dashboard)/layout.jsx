"use client"

import { AppSidebar } from "@/components/app-sidebar"
import { DashboardHeader } from "@/components/dashboard-header"
import { CommandPalette } from "@/components/command-palette"
import { PageAccessGuard } from "@/components/page-access-guard"
import { TeamProvider } from "@/lib/team-context"
import { ProjectProvider } from "@/lib/project-context"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardLayout({ children }) {
  return (
    <TeamProvider>
      <ProjectProvider>
        <SidebarProvider>
          <CommandPalette />
          <AppSidebar />
          <SidebarInset>
            <DashboardHeader />
            <div className="flex flex-1 flex-col p-4 pt-0 min-w-0 overflow-hidden">
              <PageAccessGuard>
                {children}
              </PageAccessGuard>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ProjectProvider>
    </TeamProvider>
  )
}
