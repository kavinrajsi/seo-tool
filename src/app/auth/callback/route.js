import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { logActivity } from "@/lib/activity-log";

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Enforce @madarth.com domain restriction
      const { data: { user } } = await supabase.auth.getUser();
      if (user && !user.email?.toLowerCase().endsWith("@madarth.com")) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/signin?error=domain`);
      }

      logActivity({
        userId: user?.id,
        userEmail: user?.email,
        action: "AUTH_CALLBACK",
        metadata: { provider: user?.app_metadata?.provider || "email", next },
      }).catch(() => {});

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // If code exchange fails, redirect to reset-password with error
  return NextResponse.redirect(`${origin}/reset-password?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`);
}
