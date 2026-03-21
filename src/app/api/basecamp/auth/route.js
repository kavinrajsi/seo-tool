import { NextResponse } from "next/server";

export async function GET(req) {
  const clientId = process.env.BASECAMP_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json({ error: "BASECAMP_CLIENT_ID not configured" }, { status: 500 });
  }

  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/basecamp/callback`;

  const authUrl = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(authUrl);
}
