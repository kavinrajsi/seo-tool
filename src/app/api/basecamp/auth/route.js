import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.BASECAMP_CLIENT_ID;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || "https://tool.madarth.com"}/api/basecamp/callback`;

  const url = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}`;

  return NextResponse.redirect(url);
}
