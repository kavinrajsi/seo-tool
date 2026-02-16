import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+\.[a-z]{2,}$/;

const VERCEL_API_TOKEN = process.env.VERCEL_API_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID;

async function addVercelDomain(domain) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) return null;
  const query = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
  const res = await fetch(
    `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${query}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    }
  );
  return res.json();
}

async function removeVercelDomain(domain) {
  if (!VERCEL_API_TOKEN || !VERCEL_PROJECT_ID) return null;
  const query = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
  const res = await fetch(
    `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${domain}${query}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${VERCEL_API_TOKEN}` },
    }
  );
  if (res.status === 204) return { success: true };
  return res.json();
}

async function getAuthenticatedOwner(id) {
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) };
  }

  const { data: existing } = await admin
    .from("bio_pages")
    .select("id, user_id, slug, custom_domain, domain_verified")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (!existing) {
    return { error: NextResponse.json({ error: "Bio page not found" }, { status: 404 }) };
  }

  if (existing.user_id !== user.id) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { user, existing, admin };
}

// PATCH — Set or update custom domain
export async function PATCH(request, { params }) {
  const { id } = await params;
  const auth = await getAuthenticatedOwner(id);
  if (auth.error) return auth.error;

  const { admin, existing } = auth;
  const body = await request.json();
  const domain = body.domain?.trim().toLowerCase();

  if (!domain) {
    return NextResponse.json({ error: "Domain is required" }, { status: 400 });
  }

  if (!DOMAIN_REGEX.test(domain)) {
    return NextResponse.json({ error: "Invalid domain format. Use something like links.yourdomain.com" }, { status: 400 });
  }

  // Check uniqueness
  if (domain !== existing.custom_domain) {
    const { data: taken } = await admin
      .from("bio_pages")
      .select("id")
      .eq("custom_domain", domain)
      .is("deleted_at", null)
      .neq("id", id)
      .single();

    if (taken) {
      return NextResponse.json({ error: "This domain is already in use by another bio page" }, { status: 409 });
    }
  }

  // Remove old domain from Vercel if changing
  if (existing.custom_domain && existing.custom_domain !== domain) {
    await removeVercelDomain(existing.custom_domain).catch(() => {});
  }

  const { data, error } = await admin
    .from("bio_pages")
    .update({
      custom_domain: domain,
      domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("id, custom_domain, domain_verified")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Add new domain to Vercel
  const vercelResult = await addVercelDomain(domain).catch(() => null);

  return NextResponse.json({
    ...data,
    vercel: vercelResult?.error ? { error: vercelResult.error.message } : { added: true },
  });
}

// POST — Verify DNS via Cloudflare DNS-over-HTTPS
export async function POST(request, { params }) {
  const { id } = await params;
  const auth = await getAuthenticatedOwner(id);
  if (auth.error) return auth.error;

  const { admin, existing } = auth;

  if (!existing.custom_domain) {
    return NextResponse.json({ error: "No custom domain set" }, { status: 400 });
  }

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN
    || request.headers.get("host")?.split(":")[0];
  if (!appDomain) {
    return NextResponse.json({ error: "App domain not configured" }, { status: 500 });
  }

  try {
    const dnsRes = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(existing.custom_domain)}&type=CNAME`,
      { headers: { Accept: "application/dns-json" } }
    );

    if (!dnsRes.ok) {
      return NextResponse.json({ error: "DNS lookup failed" }, { status: 502 });
    }

    const dnsData = await dnsRes.json();
    const answers = dnsData.Answer || [];
    const cnameRecord = answers.find((a) => a.type === 5);

    if (!cnameRecord) {
      return NextResponse.json({
        verified: false,
        error: "No CNAME record found",
        expected: appDomain,
        found: null,
      });
    }

    // CNAME values often end with a trailing dot
    const cnameTarget = cnameRecord.data.replace(/\.$/, "").toLowerCase();
    const expectedTarget = appDomain.toLowerCase();

    if (cnameTarget !== expectedTarget) {
      return NextResponse.json({
        verified: false,
        error: "CNAME target does not match",
        expected: appDomain,
        found: cnameTarget,
      });
    }

    // DNS verified — update database
    const { error } = await admin
      .from("bio_pages")
      .update({
        domain_verified: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ verified: true, domain: existing.custom_domain });
  } catch (err) {
    return NextResponse.json({ error: "DNS verification failed: " + err.message }, { status: 500 });
  }
}

// DELETE — Remove custom domain
export async function DELETE(request, { params }) {
  const { id } = await params;
  const auth = await getAuthenticatedOwner(id);
  if (auth.error) return auth.error;

  const { admin, existing } = auth;

  // Remove domain from Vercel
  if (existing.custom_domain) {
    await removeVercelDomain(existing.custom_domain).catch(() => {});
  }

  const { error } = await admin
    .from("bio_pages")
    .update({
      custom_domain: null,
      domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
