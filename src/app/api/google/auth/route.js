import { NextResponse } from "next/server";
import { getAuthUrl } from "@/lib/google";

export const maxDuration = 30;

export async function GET(req) {
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/google/callback`;
  const authUrl = getAuthUrl(redirectUri);
  return NextResponse.redirect(authUrl);
}
