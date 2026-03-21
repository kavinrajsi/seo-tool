"use client"

import * as React from "react"
import { useTeam } from "@/lib/team-context"
import { useProject } from "@/lib/project-context"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, PlusIcon, GlobeIcon, UsersIcon, UserIcon, FolderIcon } from "lucide-react"

export function TeamSwitcher() {
  const { isMobile } = useSidebar()
  const { activeTeam, userTeams, switchTeam } = useTeam()
  const { activeProject, projects, switchProject } = useProject()
  const router = useRouter()

  const workspaceName = activeTeam ? activeTeam.name : "Personal"
  const displayName = activeProject ? activeProject.name : workspaceName
  const displaySub = activeProject
    ? activeProject.domain.replace(/^https?:\/\//, "")
    : activeTeam
    ? `Team · ${activeTeam.role}`
    : "All projects"

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-open:bg-sidebar-accent data-open:text-sidebar-accent-foreground" />
            }>
            <div
              className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              {activeProject ? <GlobeIcon className="size-4" /> : activeTeam ? <UsersIcon className="size-4" /> : <FolderIcon className="size-4" />}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{displaySub}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}>

            {/* Workspace section */}
            <DropdownMenuGroup>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Workspace
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => { switchTeam(null); switchProject(null); }}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <UserIcon className="size-3.5" />
                </div>
                Personal
                {!activeTeam && !activeProject && (
                  <span className="ml-auto text-xs text-muted-foreground">Active</span>
                )}
              </DropdownMenuItem>
              {userTeams.map((team) => (
                <DropdownMenuItem
                  key={team.id}
                  onClick={() => { switchTeam(team.id); switchProject(null); }}
                  className="gap-2 p-2"
                >
                  <div className="flex size-6 items-center justify-center rounded-md border">
                    <UsersIcon className="size-3.5" />
                  </div>
                  {team.name}
                  {activeTeam?.id === team.id && !activeProject && (
                    <span className="ml-auto text-xs text-muted-foreground">Active</span>
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>

            {/* Projects section */}
            {projects.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    Projects
                  </DropdownMenuLabel>
                  {projects.map((project) => (
                    <DropdownMenuItem
                      key={project.id}
                      onClick={() => switchProject(project.id)}
                      className="gap-2 p-2"
                    >
                      <div className="flex size-6 items-center justify-center rounded-md border">
                        <GlobeIcon className="size-3.5" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate">{project.name}</span>
                        <span className="truncate text-xs text-muted-foreground">
                          {project.domain.replace(/^https?:\/\//, "")}
                        </span>
                      </div>
                      {activeProject?.id === project.id && (
                        <span className="ml-auto text-xs text-muted-foreground">Active</span>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => router.push("/team")}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Manage Teams
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="gap-2 p-2"
                onClick={() => router.push("/projects")}
              >
                <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                  <PlusIcon className="size-4" />
                </div>
                <div className="font-medium text-muted-foreground">
                  Manage Projects
                </div>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
