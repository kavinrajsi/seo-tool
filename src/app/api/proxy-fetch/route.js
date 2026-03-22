import { NextResponse } from "next/server";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "SEO Tool (tool.madarth.com)" },
      redirect: "follow",
    });

    if (!res.ok) {
      return new NextResponse(null, { status: res.status });
    }

    const text = await res.text();
    return new NextResponse(text, {
      headers: { "Content-Type": "text/plain" },
    });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
}
