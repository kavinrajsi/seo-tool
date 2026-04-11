"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  ShieldIcon,
  PlusIcon,
  Trash2Icon,
  LoaderIcon,
  UserIcon,
  CheckIcon,
  XIcon,
  SearchIcon,
  TagIcon,
  LayoutListIcon,
} from "lucide-react";

const SYSTEM_ROLES = ["owner", "admin", "hr", "finance", "user"];

const ALL_PAGES = [
  // Dashboard
  { path: "/dashboard",            label: "Dashboard",            group: "Dashboard" },
  // SEO
  { path: "/seo",                  label: "SEO Analyzer",         group: "SEO" },
  { path: "/seo-statistics",       label: "Site Crawler",         group: "SEO" },
  { path: "/keyword-tracker",      label: "Keyword Tracker",      group: "SEO" },
  { path: "/backlinks",            label: "Backlinks Checker",    group: "SEO" },
  { path: "/broken-links",         label: "Broken Links",         group: "SEO" },
  { path: "/validators",           label: "Validators",           group: "SEO" },
  { path: "/sitemap-generator",    label: "Sitemap Generator",    group: "SEO" },
  { path: "/llms-generator",       label: "LLMs.txt Generator",   group: "SEO" },
  { path: "/indexnow",             label: "IndexNow",             group: "SEO" },
  { path: "/speed-monitor",        label: "Site Speed",           group: "SEO" },
  { path: "/monitoring",           label: "Monitoring",           group: "SEO" },
  // SME
  { path: "/sme",                  label: "SME Explorer",         group: "SME" },
  { path: "/sme/contacts",         label: "SME Contacts",         group: "SME" },
  // Analytics
  { path: "/ga",                   label: "Google Analytics",     group: "Analytics" },
  { path: "/search-console",       label: "Search Console",       group: "Analytics" },
  { path: "/cloudflare-analytics", label: "Cloudflare Analytics", group: "Analytics" },
  { path: "/reviews",              label: "Google Reviews",       group: "Analytics" },
  // Content & Social
  { path: "/ai-assistant",         label: "AI Assistant",         group: "Content & Social" },
  { path: "/influencers",          label: "Influencer CRM",       group: "Content & Social" },
  { path: "/instagram",            label: "IG Manager",           group: "Content & Social" },
  { path: "/content-calendar",     label: "Content Calendar",     group: "Content & Social" },
  { path: "/competitor-tracker",   label: "Competitor Tracker",   group: "Content & Social" },
  { path: "/news",                 label: "News Consolidator",    group: "Content & Social" },
  { path: "/qr-generator",        label: "QR Code Generator",    group: "Content & Social" },
  // E-commerce
  { path: "/shopify/products",     label: "Product Catalog",      group: "E-commerce" },
  { path: "/shopify/orders",       label: "Order Tracker",        group: "E-commerce" },
  { path: "/leads",                label: "Contact Submissions",  group: "E-commerce" },
  // HR
  { path: "/employees",            label: "Employees",            group: "HR" },
  { path: "/departments",          label: "Departments",          group: "HR" },
  { path: "/org-chart",            label: "Org Chart",            group: "HR" },
  { path: "/candidates",           label: "Candidates",           group: "HR" },
  { path: "/candidate-statuses",   label: "Candidate Statuses",   group: "HR" },
  { path: "/email-templates",      label: "Email Templates",      group: "HR" },
  { path: "/onboarding",           label: "Onboarding",           group: "HR" },
  { path: "/announcements",        label: "Announcements",        group: "HR" },
  { path: "/performance",          label: "Performance",          group: "HR" },
  { path: "/engagement",           label: "Employee Engagement",  group: "HR" },
  { path: "/capacity",             label: "Capacity Check-in",    group: "HR" },
  { path: "/leaves",               label: "Leave Management",     group: "HR" },
  { path: "/leaves/admin",         label: "Leave Approvals",      group: "HR" },
  { path: "/hr-calendar",          label: "HR Calendar",          group: "HR" },
  // Projects
  { path: "/basecamp",             label: "Basecamp Activity",    group: "Projects" },
  { path: "/basecamp/me",          label: "My Readings",          group: "Projects" },
  { path: "/basecamp/todos",       label: "Basecamp Todos",       group: "Projects" },
  { path: "/basecamp/documents",   label: "Basecamp Documents",   group: "Projects" },
  { path: "/basecamp/messages",    label: "Basecamp Messages",    group: "Projects" },
  { path: "/basecamp/people",      label: "Basecamp People",      group: "Projects" },
  // Operations
  { path: "/devices",              label: "All Devices",          group: "Operations" },
  { path: "/devices/add",          label: "Add Device",           group: "Operations" },
  { path: "/software-renewals",    label: "Software Renewals",    group: "Operations" },
  { path: "/domain-renewals",      label: "Domain Renewals",      group: "Operations" },
  { path: "/events",               label: "Events",               group: "Operations" },
  { path: "/hard-disk",            label: "Hard Disk",            group: "Operations" },
  { path: "/hard-disk/files",      label: "File Manager",         group: "Operations" },
  // Habits
  { path: "/habits",               label: "Daily Habits",         group: "Habits" },
  { path: "/habits/goals",         label: "Goals",                group: "Habits" },
  { path: "/habits/leaderboard",   label: "Leaderboard",          group: "Habits" },
  { path: "/habits/planner",       label: "Weekly Planner",       group: "Habits" },
  // Admin
  { path: "/admin",                label: "Role Management",      group: "Admin" },
  // Control Panel
  { path: "/profile",              label: "Profile",              group: "Control Panel" },
  { path: "/settings",             label: "Settings",             group: "Control Panel" },
  { path: "/email-log",            label: "Email Log",            group: "Control Panel" },
  { path: "/roadmap",              label: "Roadmap",              group: "Control Panel" },
  { path: "/help",                 label: "Help & Docs",          group: "Control Panel" },
];

export default function AdminRoles() {
  const [roles, setRoles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [employeeRoles, setEmployeeRoles] = useState({}); // { employee_id: [role_id, ...] }
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // New role form
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");
  const [addingRole, setAddingRole] = useState(false);
  const [roleError, setRoleError] = useState("");

  // Page access
  const [pageAccess, setPageAccess] = useState({}); // { role_id: ["/path", ...] }
  const [savingAccess, setSavingAccess] = useState(null); // "role_id-path" being saved

  // Employee search
  const [search, setSearch] = useState("");

  // Saving states
  const [savingFor, setSavingFor] = useState(null); // employee_id being saved

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if current user is admin/owner
      const { data: me } = await supabase
        .from("employees")
        .select("id, role")
        .eq("work_email", user.email)
        .maybeSingle();

      if (!me || (me.role !== "admin" && me.role !== "owner")) {
        setLoading(false);
        return;
      }
      setIsAdmin(true);

      // Check if owner via employee_roles
      const { data: ownerCheck } = await supabase
        .from("employee_roles")
        .select("role_id, roles(name)")
        .eq("employee_id", me.id);
      if (ownerCheck?.some((er) => er.roles?.name === "owner")) {
        setIsOwner(true);
      }

      // Load roles
      const { data: rolesData } = await supabase
        .from("roles")
        .select("*")
        .order("is_system", { ascending: false })
        .order("name");
      if (rolesData) setRoles(rolesData);

      // Load all employees
      const { data: emps } = await supabase
        .from("employees")
        .select("id, first_name, last_name, work_email, employee_status")
        .order("first_name");
      if (emps) setEmployees(emps);

      // Load all employee_roles
      const { data: erData } = await supabase
        .from("employee_roles")
        .select("employee_id, role_id");
      if (erData) {
        const map = {};
        erData.forEach((er) => {
          if (!map[er.employee_id]) map[er.employee_id] = [];
          map[er.employee_id].push(er.role_id);
        });
        setEmployeeRoles(map);
      }

      // Load page access
      const { data: paData } = await supabase
        .from("role_page_access")
        .select("role_id, page_path");
      if (paData) {
        const map = {};
        paData.forEach((pa) => {
          if (!map[pa.role_id]) map[pa.role_id] = [];
          map[pa.role_id].push(pa.page_path);
        });
        setPageAccess(map);
      }

      setLoading(false);
    }
    load();
  }, []);

  async function handleAddRole() {
    if (!newRoleName.trim()) {
      setRoleError("Role name is required.");
      return;
    }
    const name = newRoleName.trim().toLowerCase().replace(/\s+/g, "_");
    if (roles.some((r) => r.name === name)) {
      setRoleError("Role already exists.");
      return;
    }

    setAddingRole(true);
    setRoleError("");

    const { data, error } = await supabase
      .from("roles")
      .insert({ name, description: newRoleDesc.trim() || null, is_system: false })
      .select()
      .single();

    if (error) {
      setRoleError(error.message);
    } else {
      setRoles((prev) => [...prev, data]);
      setNewRoleName("");
      setNewRoleDesc("");
    }
    setAddingRole(false);
  }

  async function handleDeleteRole(id, name) {
    if (!confirm(`Delete role "${name}"? It will be removed from all employees.`)) return;
    await supabase.from("roles").delete().eq("id", id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
    // Remove from employee roles state
    setEmployeeRoles((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((empId) => {
        updated[empId] = updated[empId].filter((rid) => rid !== id);
      });
      return updated;
    });
  }

  async function toggleRole(employeeId, roleId) {
    setSavingFor(employeeId);
    const current = employeeRoles[employeeId] || [];
    const hasRole = current.includes(roleId);

    if (hasRole) {
      await supabase
        .from("employee_roles")
        .delete()
        .eq("employee_id", employeeId)
        .eq("role_id", roleId);
      setEmployeeRoles((prev) => ({
        ...prev,
        [employeeId]: (prev[employeeId] || []).filter((rid) => rid !== roleId),
      }));
    } else {
      await supabase
        .from("employee_roles")
        .insert({ employee_id: employeeId, role_id: roleId });
      setEmployeeRoles((prev) => ({
        ...prev,
        [employeeId]: [...(prev[employeeId] || []), roleId],
      }));
    }
    setSavingFor(null);
  }

  async function togglePageAccess(roleId, page) {
    const key = `${roleId}-${page.path}`;
    setSavingAccess(key);
    const current = pageAccess[roleId] || [];
    const hasAccess = current.includes(page.path);

    if (hasAccess) {
      await supabase
        .from("role_page_access")
        .delete()
        .eq("role_id", roleId)
        .eq("page_path", page.path);
      setPageAccess((prev) => ({
        ...prev,
        [roleId]: (prev[roleId] || []).filter((p) => p !== page.path),
      }));
    } else {
      await supabase
        .from("role_page_access")
        .insert({ role_id: roleId, page_path: page.path, page_label: page.label });
      setPageAccess((prev) => ({
        ...prev,
        [roleId]: [...(prev[roleId] || []), page.path],
      }));
    }
    setSavingAccess(null);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <LoaderIcon size={20} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-1 items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">You do not have admin access.</p>
      </div>
    );
  }

  const filteredEmployees = employees.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      e.first_name?.toLowerCase().includes(q) ||
      e.last_name?.toLowerCase().includes(q) ||
      e.work_email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <ShieldIcon size={24} className="text-primary" />
          Role Management
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage roles and assign them to employees. Each employee can have multiple roles.</p>
      </div>

      {/* Roles Section */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <TagIcon size={16} className="text-muted-foreground" /> Available Roles
        </h2>

        <div className="rounded-lg border border-border overflow-hidden mb-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left px-4 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Role</th>
                <th className="text-left px-4 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium">Description</th>
                <th className="text-center px-4 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium w-20">Type</th>
                {isOwner && <th className="text-center px-4 py-2.5 text-[11px] text-muted-foreground uppercase tracking-wider font-medium w-16"></th>}
              </tr>
            </thead>
            <tbody>
              {roles.map((r, i) => (
                <tr key={r.id} className={`${i < roles.length - 1 ? "border-b border-border/50" : ""} hover:bg-muted/20 transition-colors`}>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{r.description || "—"}</td>
                  <td className="px-4 py-3 text-center">
                    {r.is_system ? (
                      <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">system</span>
                    ) : (
                      <span className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded font-medium">custom</span>
                    )}
                  </td>
                  {isOwner && (
                    <td className="px-4 py-3 text-center">
                      {!r.is_system && (
                        <button
                          onClick={() => handleDeleteRole(r.id, r.name)}
                          className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                        >
                          <Trash2Icon size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add new role - owner only */}
        {isOwner && <div className="border-t border-border pt-4">
          <p className="text-xs text-muted-foreground mb-2">Create a custom role</p>
          {roleError && <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400 mb-2">{roleError}</div>}
          <div className="flex gap-2">
            <input
              value={newRoleName}
              onChange={(e) => setNewRoleName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
              placeholder="Role name (e.g. marketing)"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <input
              value={newRoleDesc}
              onChange={(e) => setNewRoleDesc(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddRole()}
              placeholder="Description (optional)"
              className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
            />
            <button
              onClick={handleAddRole}
              disabled={!newRoleName.trim() || addingRole}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <PlusIcon size={14} /> {addingRole ? "Adding..." : "Add"}
            </button>
          </div>
        </div>}
      </div>

      {/* Employee Role Assignment */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <UserIcon size={16} className="text-muted-foreground" /> Assign Roles to Employees
        </h2>

        <div className="relative mb-4">
          <SearchIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employees..."
            className="w-full rounded-md border border-border bg-background pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/60"
          />
        </div>

        <div className="space-y-1 max-h-[600px] overflow-y-auto">
          {/* Header */}
          <div className="grid items-center gap-4 px-4 py-2 text-[11px] text-muted-foreground uppercase tracking-wider sticky top-0 bg-card z-10 border-b border-border" style={{ gridTemplateColumns: "1fr repeat(" + roles.length + ", 60px)" }}>
            <span>Employee</span>
            {roles.map((r) => (
              <span key={r.id} className="text-center truncate" title={r.name}>{r.name}</span>
            ))}
          </div>

          {filteredEmployees.map((emp) => {
            const empRoles = employeeRoles[emp.id] || [];
            return (
              <div
                key={emp.id}
                className="grid items-center gap-4 px-4 py-3 rounded-lg hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                style={{ gridTemplateColumns: "1fr repeat(" + roles.length + ", 60px)" }}
              >
                <div>
                  <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                  <p className="text-[11px] text-muted-foreground">{emp.work_email}</p>
                </div>
                {roles.map((r) => {
                  const hasRole = empRoles.includes(r.id);
                  return (
                    <div key={r.id} className="flex justify-center">
                      {isOwner ? (
                        <button
                          onClick={() => toggleRole(emp.id, r.id)}
                          disabled={savingFor === emp.id}
                          className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                            hasRole
                              ? "bg-primary text-primary-foreground"
                              : "border border-border hover:border-muted-foreground text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {savingFor === emp.id ? (
                            <LoaderIcon size={12} className="animate-spin" />
                          ) : hasRole ? (
                            <CheckIcon size={14} />
                          ) : null}
                        </button>
                      ) : (
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${
                          hasRole ? "bg-primary/20 text-primary" : "text-muted-foreground/30"
                        }`}>
                          {hasRole ? <CheckIcon size={14} /> : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}

          {filteredEmployees.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No employees found.</p>
          )}
        </div>
      </div>

      {/* Page Access per Role */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <LayoutListIcon size={16} className="text-muted-foreground" /> Page Access by Role
        </h2>
        <p className="text-xs text-muted-foreground mb-4">Control which pages each role can access. Click to toggle access.</p>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <div className="min-w-[600px] space-y-1">
            {/* Header */}
            <div className="grid items-center gap-2 px-4 py-2 text-[11px] text-muted-foreground uppercase tracking-wider sticky top-0 bg-card z-10 border-b border-border" style={{ gridTemplateColumns: "140px repeat(" + roles.length + ", 1fr)" }}>
              <span>Page</span>
              {roles.map((r) => (
                <span key={r.id} className="text-center truncate" title={r.name}>{r.name}</span>
              ))}
            </div>

            {ALL_PAGES.map((page, idx) => (
              <div key={page.path}>
                {(idx === 0 || ALL_PAGES[idx - 1].group !== page.group) && (
                  <div className="px-4 pt-4 pb-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{page.group}</div>
                )}
              <div
                className="grid items-center gap-2 px-4 py-2 rounded-lg hover:bg-muted/20 transition-colors border-b border-border/30 last:border-0"
                style={{ gridTemplateColumns: "140px repeat(" + roles.length + ", 1fr)" }}
              >
                <div>
                  <p className="text-sm font-medium">{page.label}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{page.path}</p>
                </div>
                {roles.map((r) => {
                  const hasAccess = (pageAccess[r.id] || []).includes(page.path);
                  const key = `${r.id}-${page.path}`;
                  return (
                    <div key={r.id} className="flex justify-center">
                      {isOwner ? (
                        <button
                          onClick={() => togglePageAccess(r.id, page)}
                          disabled={savingAccess === key}
                          className={`h-7 w-7 rounded-md flex items-center justify-center transition-colors ${
                            hasAccess
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "border border-border hover:border-muted-foreground text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {savingAccess === key ? (
                            <LoaderIcon size={12} className="animate-spin" />
                          ) : hasAccess ? (
                            <CheckIcon size={14} />
                          ) : null}
                        </button>
                      ) : (
                        <div className={`h-7 w-7 rounded-md flex items-center justify-center ${
                          hasAccess ? "bg-green-500/10 text-green-400" : "text-muted-foreground/30"
                        }`}>
                          {hasAccess ? <CheckIcon size={14} /> : null}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
