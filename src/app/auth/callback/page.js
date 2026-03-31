"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Suspense } from "react";

function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const [status, setStatus] = useState("Verifying your account…");

  useEffect(() => {
    async function check() {
      // Wait briefly for Supabase to process the OAuth tokens from the URL hash
      await new Promise((r) => setTimeout(r, 500));

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/signin");
        return;
      }

      if (!user.email?.toLowerCase().endsWith("@madarth.com")) {
        setStatus("Access denied. Signing out…");
        await supabase.auth.signOut();
        router.replace("/signin?error=domain");
        return;
      }

      router.replace(next);
    }

    check();
  }, [next, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
      <p className="text-sm text-[#999]">{status}</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <p className="text-sm text-[#999]">Loading…</p>
      </div>
    }>
      <Callback />
    </Suspense>
  );
}
