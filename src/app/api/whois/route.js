import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain")?.trim().toLowerCase();

  if (!domain) {
    return NextResponse.json({ error: "Missing domain parameter" }, { status: 400 });
  }

  // Clean domain (remove protocol, www, path)
  const clean = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

  try {
    // Try RDAP lookup — works for most TLDs
    const res = await fetch(`https://rdap.org/domain/${clean}`, {
      headers: { Accept: "application/rdap+json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Domain not found or RDAP unavailable" }, { status: 404 });
    }

    const data = await res.json();

    // Extract expiry date from RDAP events
    let expiryDate = null;
    let registrar = null;
    let createdDate = null;

    if (data.events) {
      for (const event of data.events) {
        if (event.eventAction === "expiration") {
          expiryDate = event.eventDate?.split("T")[0];
        }
        if (event.eventAction === "registration") {
          createdDate = event.eventDate?.split("T")[0];
        }
      }
    }

    // Extract registrar from entities
    if (data.entities) {
      for (const entity of data.entities) {
        if (entity.roles?.includes("registrar")) {
          registrar = entity.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3]
            || entity.handle
            || null;
        }
      }
    }

    return NextResponse.json({
      domain: clean,
      expiry_date: expiryDate,
      created_date: createdDate,
      registrar,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message || "WHOIS lookup failed" }, { status: 500 });
  }
}
