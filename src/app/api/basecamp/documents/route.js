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
      return NextResponse.json({ documents: [] });
    }

    const allDocs = [];

    for (const project of projects) {
      const vaultDock = project.dock?.find((d) => d.name === "vault");
      if (!vaultDock?.url) continue;

      const vault = await bcFetch(vaultDock.url, access_token);
      if (!vault?.documents_url) continue;

      const documents = await bcFetchAll(vault.documents_url, access_token);

      for (const doc of documents) {
        allDocs.push({
          user_id: user.id,
          basecamp_id: doc.id,
          project_id: project.id,
          project_name: project.name,
          title: doc.title || "",
          content: doc.content || "",
          status: doc.status || "active",
          app_url: doc.app_url || "",
          created_at_basecamp: doc.created_at || null,
          updated_at_basecamp: doc.updated_at || null,
          synced_at: new Date().toISOString(),
        });
      }
    }

    for (let i = 0; i < allDocs.length; i += 50) {
      const chunk = allDocs.slice(i, i + 50);
      await supabase.from("basecamp_documents").upsert(chunk, { onConflict: "user_id,basecamp_id" });
    }

    const { data: stored } = await supabase
      .from("basecamp_documents")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at_basecamp", { ascending: false });

    return NextResponse.json({ documents: stored || [] });
  } catch (err) {
    logError("basecamp/documents", err);
    return NextResponse.json({ error: err.message || "Failed to sync documents" }, { status: 500 });
  }
}
