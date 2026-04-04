import { NextResponse } from "next/server";

// Direct registry RDAP endpoints — much faster than rdap.org proxy
const REGISTRY_RDAP = {
  com: "https://rdap.verisign.com/com/v1/domain/",
  net: "https://rdap.verisign.com/net/v1/domain/",
  org: "https://rdap.org/domain/",
  io:  "https://rdap.nic.io/domain/",
  dev: "https://rdap.nic.google/domain/",
  app: "https://rdap.nic.google/domain/",
  in:  "https://rdap.registry.in/domain/",
  co:  "https://rdap.nic.co/domain/",
};

function parseRDAP(data) {
  let expiryDate = null;
  let registrar = null;
  let createdDate = null;

  if (data.events) {
    for (const event of data.events) {
      if (event.eventAction === "expiration") expiryDate = event.eventDate?.split("T")[0];
      if (event.eventAction === "registration") createdDate = event.eventDate?.split("T")[0];
    }
  }

  if (data.entities) {
    for (const entity of data.entities) {
      if (entity.roles?.includes("registrar")) {
        registrar = entity.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3]
          || entity.handle || null;
      }
    }
  }

  return { expiryDate, createdDate, registrar };
}

async function tryFetch(url, timeout = 15000) {
  const res = await fetch(url, {
    headers: { Accept: "application/rdap+json" },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain")?.trim().toLowerCase();

  if (!domain) {
    return NextResponse.json({ error: "Missing domain parameter" }, { status: 400 });
  }

  const clean = domain.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  const tld = clean.split(".").pop();

  try {
    let data = null;

    // 1. Try direct registry RDAP (fast, ~1-3s)
    const directUrl = REGISTRY_RDAP[tld];
    if (directUrl) {
      try {
        data = await tryFetch(directUrl + clean, 10000);
      } catch {}
    }

    // 2. Fallback to rdap.org proxy (slower, ~5-15s)
    if (!data) {
      try {
        data = await tryFetch(`https://rdap.org/domain/${clean}`, 20000);
      } catch {}
    }

    if (!data) {
      return NextResponse.json({ error: "Domain not found. RDAP unavailable for this TLD — enter expiry date manually." }, { status: 404 });
    }

    const { expiryDate, createdDate, registrar } = parseRDAP(data);

    if (!expiryDate) {
      return NextResponse.json({ error: "RDAP returned no expiry date for this domain. Enter it manually." }, { status: 404 });
    }

    return NextResponse.json({
      domain: clean,
      expiry_date: expiryDate,
      created_date: createdDate,
      registrar,
    });
  } catch (err) {
    return NextResponse.json({ error: "WHOIS lookup failed. Enter expiry date manually." }, { status: 500 });
  }
}
