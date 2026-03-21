import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

async function bcFetch(url, token) {
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "User-Agent": "SEO Tool (tool.madarth.com)",
    },
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { data: tokenRow } = await supabase
      .from("basecamp_tokens")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!tokenRow) {
      return NextResponse.json({ error: "Basecamp not connected" }, { status: 403 });
    }

    const { access_token, account_id } = tokenRow;

    // Get all projects
    const projects = await bcFetch(
      `https://3.basecampapi.com/${account_id}/projects.json`,
      access_token
    );

    if (!projects) {
      return NextResponse.json({ error: "Failed to fetch projects" }, { status: 502 });
    }

    const allTodos = [];

    for (const project of projects) {
      // Find the todoset in the project dock
      const todosetDock = project.dock?.find((d) => d.name === "todoset");
      if (!todosetDock?.url) continue;

      // Get the todoset
      const todoset = await bcFetch(todosetDock.url, access_token);
      if (!todoset?.todolists_url) continue;

      // Get todolists
      const todolists = await bcFetch(todoset.todolists_url, access_token);
      if (!todolists) continue;

      for (const list of todolists) {
        if (!list.todos_url) continue;

        // Get todos from each list
        const todos = await bcFetch(list.todos_url, access_token);
        if (!todos) continue;

        for (const todo of todos) {
          allTodos.push({
            user_id: user.id,
            basecamp_id: todo.id,
            project_id: project.id,
            project_name: project.name,
            todolist_name: list.name,
            title: todo.content || todo.title || "",
            description: todo.description || "",
            status: todo.status || "active",
            completed: todo.completed || false,
            assignee_name: todo.assignees?.[0]?.name || null,
            due_on: todo.due_on || null,
            app_url: todo.app_url || "",
            comments_count: todo.comments_count || 0,
            created_at_basecamp: todo.created_at || null,
            updated_at_basecamp: todo.updated_at || null,
            synced_at: new Date().toISOString(),
          });
        }
      }
    }

    // Upsert all todos
    for (const todo of allTodos) {
      await supabase.from("basecamp_todos").upsert(todo, { onConflict: "user_id,basecamp_id" });
    }

    // Return stored todos
    const { data: stored } = await supabase
      .from("basecamp_todos")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at_basecamp", { ascending: false });

    return NextResponse.json({ todos: stored || [] });
  } catch (err) {
    logError("basecamp/todos", err);
    return NextResponse.json({ error: err.message || "Failed to sync todos" }, { status: 500 });
  }
}
