import { createAdminClient } from "@/lib/supabase/admin";
import BioPageClient from "./BioPageClient";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: page } = await admin
    .from("bio_pages")
    .select("display_name, bio_text, avatar_url")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  if (!page) {
    return { title: "Not Found" };
  }

  const title = `${page.display_name} | Firefly Bio`;
  const description = page.bio_text || `Check out ${page.display_name}'s links`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(page.avatar_url ? { images: [{ url: page.avatar_url }] } : {}),
    },
    twitter: {
      card: "summary",
      title,
      description,
      ...(page.avatar_url ? { images: [page.avatar_url] } : {}),
    },
  };
}

export default async function BioPage({ params }) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: page } = await admin
    .from("bio_pages")
    .select("*, bio_links(*)")
    .eq("slug", slug)
    .is("deleted_at", null)
    .single();

  if (!page) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Page Not Found</h1>
          <p style={{ color: "#888" }}>This bio page doesn&apos;t exist or has been removed.</p>
        </div>
      </div>
    );
  }

  // Filter active links and sort by position
  const activeLinks = (page.bio_links || [])
    .filter((l) => l.is_active)
    .sort((a, b) => a.position - b.position);

  return (
    <BioPageClient
      page={{
        id: page.id,
        displayName: page.display_name,
        bioText: page.bio_text,
        avatarUrl: page.avatar_url,
        theme: page.theme,
      }}
      links={activeLinks}
    />
  );
}
