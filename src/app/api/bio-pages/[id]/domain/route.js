import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const DOMAIN_REGEX = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+\.[a-z]{2,}$/;

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

  return NextResponse.json(data);
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

  const appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN;
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

  const { admin } = auth;

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
