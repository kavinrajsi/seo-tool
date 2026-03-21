import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logError } from "@/lib/logger";
import { bcFetch, bcFetchAll } from "@/lib/basecamp";

export const maxDuration = 60;

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

    const projects = await bcFetchAll(
      `https://3.basecampapi.com/${account_id}/projects.json`,
      access_token
    );

    if (!projects.length) {
      return NextResponse.json({ todos: [] });
    }

    const allTodos = [];

    for (const project of projects) {
      const todosetDock = project.dock?.find((d) => d.name === "todoset");
      if (!todosetDock?.url) continue;

      const todoset = await bcFetch(todosetDock.url, access_token);
      if (!todoset?.todolists_url) continue;

      const todolists = await bcFetchAll(todoset.todolists_url, access_token);

      for (const list of todolists) {
        if (!list.todos_url) continue;

        const todos = await bcFetchAll(list.todos_url, access_token);

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

    for (const todo of allTodos) {
      await supabase.from("basecamp_todos").upsert(todo, { onConflict: "user_id,basecamp_id" });
    }

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
