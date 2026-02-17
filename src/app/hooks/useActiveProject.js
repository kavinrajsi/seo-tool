"use client";

import { useProject } from "@/app/components/ProjectProvider";

export function useActiveProject() {
  const { activeProject, activeProjectId } = useProject();
  return { activeProject, activeProjectId };
}
