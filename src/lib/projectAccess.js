import { createAdminClient } from "@/lib/supabase/admin";

export async function getProjectMembership(projectId, userId) {
  if (!projectId || !userId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("project_members")
    .select("role")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .single();

  return data?.role || null;
}
