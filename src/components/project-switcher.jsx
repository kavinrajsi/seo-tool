"use client"

import { useProject } from "@/lib/project-context"
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
import { ChevronsUpDownIcon, FolderIcon, GlobeIcon } from "lucide-react"

export function ProjectSwitcher() {
  const { isMobile } = useSidebar()
  const { activeProject, projects, switchProject } = useProject()

  const displayName = activeProject ? activeProject.name : "All Projects"
  const displayDomain = activeProject
    ? activeProject.domain.replace(/^https?:\/\//, "")
    : "No project filter"

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
              className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
              {activeProject ? <GlobeIcon className="size-4" /> : <FolderIcon className="size-4" />}
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">{displayDomain}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}>
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => switchProject(null)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-md border">
                  <FolderIcon className="size-3.5" />
                </div>
                All Projects
                {!activeProject && (
                  <span className="ml-auto text-xs text-muted-foreground">Active</span>
                )}
              </DropdownMenuItem>
            </DropdownMenuGroup>
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
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
