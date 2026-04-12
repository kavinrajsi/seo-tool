import { createClient } from "@supabase/supabase-js";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function logActivity({
  userId = null,
  userEmail = null,
  action,
  tableName = null,
  recordId = null,
  oldData = null,
  newData = null,
  metadata = {},
}) {
  try {
    await getServiceClient().from("activity_logs").insert({
      user_id: userId,
      user_email: userEmail,
      action,
      table_name: tableName,
      record_id: recordId,
      old_data: oldData,
      new_data: newData,
      metadata,
    });
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}
