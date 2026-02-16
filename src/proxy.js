import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || "";

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".ico") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".xml") ||
    pathname.endsWith(".txt") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".woff") ||
    pathname.endsWith(".woff2") ||
    pathname.endsWith(".css") ||
    pathname.endsWith(".js")
  );
}

export async function proxy(request) {
  const { pathname } = request.nextUrl;

  // ── Custom domain detection ──
  const host = request.headers.get("host")?.split(":")[0] || "";
  const isCustomDomain = host && host !== APP_DOMAIN && host !== "localhost" && host !== "127.0.0.1";

  if (isCustomDomain) {
    // Skip static assets for custom domains
    if (isStaticAsset(pathname)) {
      return NextResponse.next();
    }

    // Let bio-pages API requests pass through (for view/click tracking)
    if (pathname.startsWith("/api/bio-pages/")) {
      return NextResponse.next();
    }

    // Look up bio page by custom domain
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: bioPage } = await admin
      .from("bio_pages")
      .select("slug")
      .eq("custom_domain", host)
      .eq("domain_verified", true)
      .is("deleted_at", null)
      .single();

    if (bioPage) {
      const url = request.nextUrl.clone();
      url.pathname = `/bio/${bioPage.slug}`;
      return NextResponse.rewrite(url);
    }

    // Domain not found — rewrite to not-found page
    const url = request.nextUrl.clone();
    url.pathname = "/bio/not-found";
    return NextResponse.rewrite(url);
  }

  // ── Normal app requests ──

  // Skip auth checks for static assets and public files
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Redirect logged-in users away from auth pages
  if ((pathname === "/login" || pathname === "/register" || pathname === "/forgot-password") && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: "/(.*)",
};
