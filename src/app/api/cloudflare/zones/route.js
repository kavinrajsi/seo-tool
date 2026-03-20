import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req) {
  try {
    const { apiToken } = await req.json();
    if (!apiToken) {
      return NextResponse.json({ error: "API token is required" }, { status: 400 });
    }

    // Verify token & get zones
    const res = await fetch("https://api.cloudflare.com/client/v4/zones?per_page=50&status=active", {
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await res.json();

    if (!data.success) {
      const msg = data.errors?.[0]?.message || "Invalid API token";
      return NextResponse.json({ error: msg }, { status: 401 });
    }

    const zones = data.result.map((z) => ({
      id: z.id,
      name: z.name,
      status: z.status,
      plan: z.plan?.name || "Free",
    }));

    return NextResponse.json({ zones });
  } catch (err) {
    console.error("Cloudflare zones error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch zones" }, { status: 500 });
  }
}
