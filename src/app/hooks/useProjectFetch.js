"use client";

import { useCallback } from "react";
import { useProject } from "@/app/components/ProjectProvider";

export function useProjectFetch() {
  const { activeProjectId } = useProject();

  const projectFetch = useCallback(
    (url, options = {}) => {
      if (activeProjectId) {
        const separator = url.includes("?") ? "&" : "?";
        url = `${url}${separator}project_id=${activeProjectId}`;
      }
      return fetch(url, options);
    },
    [activeProjectId]
  );

  return { projectFetch, activeProjectId };
}
