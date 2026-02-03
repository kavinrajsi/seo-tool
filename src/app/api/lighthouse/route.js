import { runLighthouse } from "@/lib/lighthouse";

// Force Node.js runtime (required for Lighthouse)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { url, formFactor } = await request.json();

    if (!url) {
      return Response.json({ error: "URL is required" }, { status: 400 });
    }

    let normalizedUrl = url.trim();
    if (!/^https?:\/\//i.test(normalizedUrl)) {
      normalizedUrl = "https://" + normalizedUrl;
    }

    try {
      new URL(normalizedUrl);
    } catch {
      return Response.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Run Lighthouse with specified form factor (mobile or desktop)
    const lighthouseData = await runLighthouse(normalizedUrl, {
      formFactor: formFactor || 'mobile',
    });

    if (lighthouseData.error) {
      return Response.json(
        { error: `Lighthouse audit failed: ${lighthouseData.error}` },
        { status: 422 }
      );
    }

    return Response.json({
      url: normalizedUrl,
      formFactor: formFactor || 'mobile',
      analyzedAt: new Date().toISOString(),
      ...lighthouseData,
    });
  } catch (err) {
    console.error('Lighthouse API error:', err);
    return Response.json(
      { error: "An unexpected error occurred: " + err.message },
      { status: 500 }
    );
  }
}
