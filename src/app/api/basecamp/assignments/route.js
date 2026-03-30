import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { data: config } = await supabase
      .from("basecamp_config")
      .select("account_id, access_token")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!config) {
      return NextResponse.json({ error: "Basecamp not configured" }, { status: 400 });
    }

    const { account_id, access_token } = config;
    const headers = {
      Authorization: `Bearer ${access_token}`,
      "User-Agent": "SEO Tool (tool.madarth.com)",
    };
    const base = `https://3.basecampapi.com/${account_id}`;

    // Step 1: Get all assignable people
    const peopleRes = await fetch(`${base}/reports/todos/assigned.json`, { headers });
    if (!peopleRes.ok) {
      return NextResponse.json({ error: "Failed to fetch assignable people" }, { status: peopleRes.status });
    }
    const people = await peopleRes.json();

    // Step 2: Fetch todos for each person in parallel
    const results = await Promise.all(
      people.map(async (person) => {
        try {
          const res = await fetch(
            `${base}/reports/todos/assigned/${person.id}.json?group_by=date`,
            { headers }
          );
          if (!res.ok) return null;
          const data = await res.json();
          return {
            person: {
              id: person.id,
              name: person.name,
              avatar_url: person.avatar_url || null,
              title: person.title || null,
            },
            todos: (data.todos || []).map((t) => ({
              id: t.id,
              content: t.title || t.content,
              due_on: t.due_on || null,
              completed: t.completed || false,
              project_name: t.bucket?.name || "",
              project_id: t.bucket?.id || null,
              app_url: t.app_url || "",
              starts_on: t.starts_on || null,
            })),
          };
        } catch {
          return null;
        }
      })
    );

    // Filter out nulls and people with no todos
    const assignments = results.filter((r) => r && r.todos.length > 0);

    return NextResponse.json({ assignments, total_people: assignments.length });
  } catch (err) {
    logError("basecamp/assignments", err);
    return NextResponse.json({ error: err.message || "Failed" }, { status: 500 });
  }
}
