import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseWithAuth } from "@/lib/supabase";
import { logError } from "@/lib/logger";

export const maxDuration = 30;

export async function GET(req) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(`${url.origin}/settings?error=basecamp_auth_failed`);
  }

  try {
    // Get user from cookies
    const cookieClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      {
        cookies: {
          getAll() { return req.cookies.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await cookieClient.auth.getUser();
    if (!user) {
      return NextResponse.redirect(`${url.origin}/signin`);
    }

    const { data: { session } } = await cookieClient.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.redirect(`${url.origin}/signin`);
    }

    const supabase = getSupabaseWithAuth(session.access_token);

    // Exchange code for token
    const redirectUri = `${url.origin}/api/basecamp/callback`;
    const tokenRes = await fetch("https://launchpad.37signals.com/authorization/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "web_server",
        client_id: process.env.BASECAMP_CLIENT_ID,
        client_secret: process.env.BASECAMP_CLIENT_SECRET,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      logError("basecamp/callback/token", new Error(errText));
      return NextResponse.redirect(`${url.origin}/settings?error=basecamp_token_failed`);
    }

    const tokens = await tokenRes.json();

    // Get authorization info (account ID)
    const authInfoRes = await fetch("https://launchpad.37signals.com/authorization.json", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    let accountId = "";
    let accountName = "";

    if (authInfoRes.ok) {
      const authInfo = await authInfoRes.json();
      // Pick the first Basecamp 3 account
      const bc3Account = authInfo.accounts?.find((a) => a.product === "bc3") || authInfo.accounts?.[0];
      if (bc3Account) {
        accountId = String(bc3Account.id);
        accountName = bc3Account.name;
      }
    }

    // Save tokens
    const { error: dbError } = await supabase.from("basecamp_tokens").upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: tokens.expires_at ? new Date(tokens.expires_at * 1000).toISOString() : null,
      account_id: accountId,
      account_name: accountName,
    }, { onConflict: "user_id" });

    if (dbError) {
      logError("basecamp/callback/save", dbError);
      return NextResponse.redirect(`${url.origin}/settings?error=basecamp_save_failed`);
    }

    // Fetch and store projects
    if (accountId) {
      try {
        const projectsRes = await fetch(`https://3.basecampapi.com/${accountId}/projects.json`, {
          headers: {
            Authorization: `Bearer ${tokens.access_token}`,
            "User-Agent": "SEO Tool (tool.madarth.com)",
          },
        });

        if (projectsRes.ok) {
          const projects = await projectsRes.json();

          for (const p of projects) {
            await supabase.from("basecamp_projects").upsert({
              user_id: user.id,
              basecamp_id: p.id,
              name: p.name,
              description: p.description || "",
              status: p.status || "active",
              url: p.url || "",
              app_url: p.app_url || "",
              bookmark_url: p.bookmark_url || "",
              created_at_basecamp: p.created_at || null,
              updated_at_basecamp: p.updated_at || null,
              synced_at: new Date().toISOString(),
            }, { onConflict: "user_id,basecamp_id" });
          }
        }
      } catch (err) {
        logError("basecamp/callback/projects", err);
      }
    }

    return NextResponse.redirect(`${url.origin}/settings?connected=basecamp`);
  } catch (err) {
    logError("basecamp/callback", err);
    return NextResponse.redirect(`${url.origin}/settings?error=basecamp_failed`);
  }
}
