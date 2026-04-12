import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";
import { logActivity } from "@/lib/activity-log";

export async function POST(req) {
  const { action, metadata = {} } = await req.json();

  const auth = await getUserFromRequest(req);

  await logActivity({
    userId: auth?.user?.id || metadata?.userId || null,
    userEmail: auth?.user?.email || metadata?.userEmail || null,
    action,
    metadata,
  });

  return NextResponse.json({ ok: true });
}
