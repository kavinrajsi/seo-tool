import { createAdminClient } from "@/lib/supabase/admin";
import { getUserProjectRole, getAccessibleProjectIds } from "@/lib/projectAccess";

/**
 * Get Shopify shop domains filtered by project context.
 *
 * @param {string} userId - The authenticated user's ID
 * @param {string} projectId - "all" or a specific UUID
 * @returns {string[]} Array of shop_domain strings
 */
export async function getProjectShopDomains(userId, projectId) {
  const admin = createAdminClient();

  if (projectId && projectId !== "all") {
    const role = await getUserProjectRole(userId, projectId);
    if (!role) return [];

    const { data: connections } = await admin
      .from("shopify_connections")
      .select("shop_domain")
      .eq("project_id", projectId);

    return (connections || []).map((c) => c.shop_domain);
  }

  // All: user's own + accessible project data
  const accessibleIds = await getAccessibleProjectIds(userId);
  let query = admin
    .from("shopify_connections")
    .select("shop_domain");

  if (accessibleIds.length > 0) {
    query = query.or(
      `user_id.eq.${userId},project_id.in.(${accessibleIds.join(",")})`
    );
  } else {
    query = query.eq("user_id", userId);
  }

  const { data: connections } = await query;
  return (connections || []).map((c) => c.shop_domain);
}

/**
 * Get a single connection row from a connection table, filtered by project context.
 * Used for Instagram, GA, GSC, GBP connections (single-connection-per-user pattern).
 *
 * @param {string} userId - The authenticated user's ID
 * @param {string} projectId - "all" or a specific UUID
 * @param {string} tableName - e.g. "instagram_connections", "ga_connections"
 * @returns {object|null} The connection row or null
 */
export async function getProjectConnection(userId, projectId, tableName) {
  const admin = createAdminClient();

  if (projectId && projectId !== "all") {
    const role = await getUserProjectRole(userId, projectId);
    if (!role) return null;

    // Try project-specific connection first
    const { data: connection } = await admin
      .from(tableName)
      .select("*")
      .eq("project_id", projectId)
      .single();

    if (connection) return connection;

    // Fallback: user's connection assigned to this project
    const { data: userConn } = await admin
      .from(tableName)
      .select("*")
      .eq("user_id", userId)
      .eq("project_id", projectId)
      .single();

    return userConn || null;
  }

  // All: return the user's connection (no project filter)
  const { data: connection } = await admin
    .from(tableName)
    .select("*")
    .eq("user_id", userId)
    .single();
  return connection || null;
}
