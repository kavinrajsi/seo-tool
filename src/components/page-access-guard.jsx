"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldIcon } from "lucide-react";

export function PageAccessGuard({ children }) {
  const pathname = usePathname();
  const [status, setStatus] = useState("loading"); // loading | allowed | denied
  const [checkedPath, setCheckedPath] = useState(null);

  useEffect(() => {
    if (checkedPath === pathname) return;
    setStatus("loading");
    checkAccess();
  }, [pathname]);

  async function checkAccess() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setStatus("allowed"); setCheckedPath(pathname); return; }

      // Get employee record
      const { data: emp } = await supabase
        .from("employees")
        .select("id, role")
        .eq("work_email", user.email)
        .maybeSingle();

      // No employee record = allow (not in system yet)
      if (!emp) { setStatus("allowed"); setCheckedPath(pathname); return; }

      // Admin/owner always have full access
      if (emp.role === "admin" || emp.role === "owner") {
        setStatus("allowed"); setCheckedPath(pathname); return;
      }

      // Get user's role IDs
      const { data: userRoles } = await supabase
        .from("employee_roles")
        .select("role_id, roles(name)")
        .eq("employee_id", emp.id);

      // Check if user has admin/owner role via employee_roles
      if (userRoles?.some((r) => r.roles?.name === "admin" || r.roles?.name === "owner")) {
        setStatus("allowed"); setCheckedPath(pathname); return;
      }

      // No roles assigned = allow (not configured yet)
      if (!userRoles?.length) { setStatus("allowed"); setCheckedPath(pathname); return; }

      const roleIds = userRoles.map((r) => r.role_id);

      // Get all page access rules for user's roles
      const { data: accessRules } = await supabase
        .from("role_page_access")
        .select("page_path")
        .in("role_id", roleIds);

      // If no access rules exist for these roles, allow (not configured)
      if (!accessRules?.length) { setStatus("allowed"); setCheckedPath(pathname); return; }

      // Check if current path matches any allowed page
      const allowedPaths = accessRules.map((r) => r.page_path);

      // Check if ANY role has access rules configured in the system
      const { count: totalRules } = await supabase
        .from("role_page_access")
        .select("id", { count: "exact", head: true });

      // If no rules configured at all, skip enforcement
      if (!totalRules) { setStatus("allowed"); setCheckedPath(pathname); return; }

      // Check if the current page path is configured for ANY role
      const { count: pageRuleCount } = await supabase
        .from("role_page_access")
        .select("id", { count: "exact", head: true })
        .filter("page_path", "eq", getBasePath(pathname));

      // If this page has no access rules for any role, allow everyone (unconfigured page)
      if (!pageRuleCount) { setStatus("allowed"); setCheckedPath(pathname); return; }

      // Check if user's roles grant access to this page
      const basePath = getBasePath(pathname);
      const hasAccess = allowedPaths.some((p) => basePath === p || pathname.startsWith(p + "/"));

      setStatus(hasAccess ? "allowed" : "denied");
      setCheckedPath(pathname);
    } catch {
      // On error, allow access (fail open)
      setStatus("allowed");
      setCheckedPath(pathname);
    }
  }

  if (status === "loading") {
    return <div className="flex flex-1 items-center justify-center py-16 text-muted-foreground">Loading...</div>;
  }

  if (status === "denied") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-16 gap-3">
        <div className="h-14 w-14 rounded-full bg-red-500/10 flex items-center justify-center">
          <ShieldIcon size={24} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-sm text-muted-foreground text-center max-w-md">
          You don't have permission to access this page. Contact your admin to request access.
        </p>
      </div>
    );
  }

  return children;
}

function getBasePath(pathname) {
  // Match the first segment: /devices, /admin, etc.
  // For paths like /devices/123/edit, return /devices
  const match = pathname.match(/^(\/[^/]+)/);
  return match ? match[1] : pathname;
}
