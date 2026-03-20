import { NextResponse } from "next/server";
import { analyzeUrl } from "@/lib/seo-analyzer";
import { logError } from "@/lib/logger";

export const maxDuration = 60;

export async function POST(request) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }
    const analysis = await analyzeUrl(url);
    return NextResponse.json(analysis);
  } catch (err) {
    logError("api/analyze", err);
    return NextResponse.json(
      { error: err.message || "Failed to analyze URL" },
      { status: 500 }
    );
  }
}
