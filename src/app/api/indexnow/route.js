import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth-helper";

export const maxDuration = 30;

export async function POST(req) {
  try {
    const auth = await getUserFromRequest(req);
    if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { user, supabase } = auth;

    const { urls, apiKey, host } = await req.json();

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "urls array is required" }, { status: 400 });
    }

    if (!apiKey) {
      return NextResponse.json({ error: "IndexNow API key is required" }, { status: 400 });
    }

    if (urls.length > 10000) {
      return NextResponse.json({ error: "Maximum 10,000 URLs per submission" }, { status: 400 });
    }

    // Determine host from first URL if not provided
    const siteHost = host || new URL(urls[0]).hostname;

    // Submit to IndexNow API (Bing endpoint — also covers Yandex, Naver, Seznam)
    const res = await fetch("https://api.indexnow.org/indexnow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host: siteHost,
        key: apiKey,
        urlList: urls,
      }),
    });

    // IndexNow returns 200 for success, 202 for accepted
    if (res.status === 200 || res.status === 202) {
      return NextResponse.json({
        success: true,
        status: res.status,
        submitted: urls.length,
        host: siteHost,
      });
    }

    // Handle specific error codes
    const statusMessages = {
      400: "Bad request — check your URLs and API key format",
      403: "Forbidden — API key is not valid for this host",
      422: "Unprocessable — URLs don't belong to the specified host",
      429: "Too many requests — try again later",
    };

    const message = statusMessages[res.status] || `IndexNow returned HTTP ${res.status}`;
    return NextResponse.json({ error: message, status: res.status }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message || "IndexNow submission failed" }, { status: 500 });
  }
}
