import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);

function authenticated(request) {
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) return false;
  const auth = request.headers.get("authorization") || "";
  return auth.replace("Bearer ", "").trim() === apiKey;
}

function createServer() {
  const server = new McpServer({
    name: "madarth-platform",
    version: "1.0.0",
  });

  // ── Employees ─────────────────────────────────────────────────────────────

  server.tool(
    "get_employees",
    "List employees. Filter by status (active/inactive/all). Returns name, email, designation, department, joining date.",
    {
      status: z.enum(["active", "inactive", "all"]).optional().default("active"),
      department: z.string().optional().describe("Filter by department name"),
      limit: z.number().int().min(1).max(200).optional().default(50),
    },
    async ({ status, department, limit }) => {
      let query = supabase
        .from("employees")
        .select("id, first_name, last_name, work_email, designation, department, employee_status, date_of_joining, mobile_number")
        .order("date_of_joining", { ascending: false })
        .limit(limit);
      if (status !== "all") query = query.eq("employee_status", status);
      if (department) query = query.ilike("department", `%${department}%`);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "search_employees",
    "Search employees by name, email, designation, or department.",
    { query: z.string().describe("Search term") },
    async ({ query: q }) => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, work_email, designation, department, employee_status")
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,work_email.ilike.%${q}%,designation.ilike.%${q}%,department.ilike.%${q}%`)
        .limit(20);
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Leads ─────────────────────────────────────────────────────────────────

  server.tool(
    "get_leads",
    "List contact form submissions/leads. Filter by status: New, Contacted, Follow-up, Win, Closed, Rejected.",
    {
      status: z.enum(["New", "Contacted", "Follow-up", "Win", "Closed", "Rejected", "all"]).optional().default("all"),
      limit: z.number().int().min(1).max(200).optional().default(50),
    },
    async ({ status, limit }) => {
      let query = supabase
        .from("contact_submissions")
        .select("id, name, email, phone, company, subject, message, source, status, notes, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_lead",
    "Create a new contact form submission / lead entry.",
    {
      name: z.string().describe("Contact's full name"),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      company: z.string().optional(),
      subject: z.string().optional(),
      message: z.string().optional(),
      source: z.string().optional().default("mcp"),
      status: z.enum(["New", "Contacted", "Follow-up", "Win", "Closed", "Rejected"]).optional().default("New"),
    },
    async (fields) => {
      const { data, error } = await supabase.from("contact_submissions").insert(fields).select().single();
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: `Lead created:\n${JSON.stringify(data, null, 2)}` }] };
    }
  );

  server.tool(
    "update_lead_status",
    "Update the status of a contact form lead.",
    {
      id: z.string().uuid().describe("Lead ID"),
      status: z.enum(["New", "Contacted", "Follow-up", "Win", "Closed", "Rejected"]),
      notes: z.string().optional().describe("Optional internal notes to add"),
    },
    async ({ id, status, notes }) => {
      const updates = { status };
      if (notes !== undefined) updates.notes = notes;
      const { error } = await supabase.from("contact_submissions").update(updates).eq("id", id);
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: `Lead ${id} updated to status "${status}".` }] };
    }
  );

  // ── Candidates ────────────────────────────────────────────────────────────

  server.tool(
    "get_candidates",
    "List job candidates. Optionally filter by status.",
    {
      status: z.string().optional().describe("Filter by pipeline status (e.g. 'New', 'Interview', 'Hired')"),
      limit: z.number().int().min(1).max(200).optional().default(50),
    },
    async ({ status, limit }) => {
      let query = supabase
        .from("candidates")
        .select("id, first_name, last_name, email, position, job_role, status, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (status) query = query.eq("status", status);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── HR Announcements ──────────────────────────────────────────────────────

  server.tool(
    "get_announcements",
    "List HR announcements sorted by date descending.",
    { limit: z.number().int().min(1).max(100).optional().default(20) },
    async ({ limit }) => {
      const { data, error } = await supabase
        .from("hr_announcements")
        .select("id, title, description, date")
        .order("date", { ascending: false })
        .limit(limit);
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_announcement",
    "Post a new HR announcement.",
    {
      title: z.string().describe("Announcement title"),
      date: z.string().describe("Date in YYYY-MM-DD format"),
      description: z.string().optional(),
    },
    async (fields) => {
      const { data, error } = await supabase.from("hr_announcements").insert(fields).select().single();
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: `Announcement created:\n${JSON.stringify(data, null, 2)}` }] };
    }
  );

  // ── Devices ───────────────────────────────────────────────────────────────

  server.tool(
    "get_devices",
    "List registered devices. Optionally filter by type or assigned employee.",
    {
      type: z.string().optional().describe("Device type e.g. Laptop, Phone, Monitor"),
      assigned_to: z.string().optional().describe("Employee name filter"),
      limit: z.number().int().min(1).max(200).optional().default(50),
    },
    async ({ type, assigned_to, limit }) => {
      let query = supabase
        .from("devices")
        .select("id, device_name, device_type, serial_number, status, assigned_to, vendor, purchase_date")
        .order("purchase_date", { ascending: false })
        .limit(limit);
      if (type) query = query.ilike("device_type", `%${type}%`);
      if (assigned_to) query = query.ilike("assigned_to", `%${assigned_to}%`);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Leave Requests ────────────────────────────────────────────────────────

  server.tool(
    "get_leave_requests",
    "List leave requests. Filter by status (pending/approved/rejected/all).",
    {
      status: z.enum(["pending", "approved", "rejected", "all"]).optional().default("pending"),
      limit: z.number().int().min(1).max(100).optional().default(30),
    },
    async ({ status, limit }) => {
      let query = supabase
        .from("leave_requests")
        .select("id, employee_id, start_date, end_date, reason, status, created_at, employees(first_name, last_name, work_email)")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── SEO Analyses ──────────────────────────────────────────────────────────

  server.tool(
    "get_seo_analyses",
    "List recent SEO analyses with URL and score.",
    { limit: z.number().int().min(1).max(50).optional().default(10) },
    async ({ limit }) => {
      const { data, error } = await supabase
        .from("seo_analyses")
        .select("id, url, score, created_at")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) return { content: [{ type: "text", text: `Error: ${error.message}` }] };
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  // ── Dashboard Summary ─────────────────────────────────────────────────────

  server.tool(
    "get_dashboard_summary",
    "Get a high-level summary of counts across the platform: employees, leads, candidates, devices, announcements.",
    {},
    async () => {
      const [employees, leads, candidates, devices, announcements] = await Promise.all([
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("employee_status", "active"),
        supabase.from("contact_submissions").select("id, status", { count: "exact" }),
        supabase.from("candidates").select("id", { count: "exact", head: true }),
        supabase.from("devices").select("id", { count: "exact", head: true }),
        supabase.from("hr_announcements").select("id", { count: "exact", head: true }),
      ]);

      const leadsByStatus = {};
      (leads.data || []).forEach(l => {
        leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
      });

      const summary = {
        active_employees: employees.count,
        total_candidates: candidates.count,
        total_devices: devices.count,
        total_announcements: announcements.count,
        leads: {
          total: leads.count,
          by_status: leadsByStatus,
        },
      };
      return { content: [{ type: "text", text: JSON.stringify(summary, null, 2) }] };
    }
  );

  return server;
}

async function handle(request) {
  if (!authenticated(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized. Provide a valid Bearer token." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    // stateless — no sessionIdGenerator
  });

  const server = createServer();
  await server.connect(transport);
  return transport.handleRequest(request);
}

export async function GET(request)    { return handle(request); }
export async function POST(request)   { return handle(request); }
export async function DELETE(request) { return handle(request); }
