import { getSupabase } from "@/lib/supabase";

// Serve a QR code's profile photo from the database
export async function GET(req, { params }) {
  const { id } = await params;
  const db = getSupabase();

  const { data: qr } = await db
    .rpc("get_qr_photo", { p_id: id });

  if (!qr?.photo) {
    return new Response("Not found", { status: 404 });
  }

  // photo is a data URI like "data:image/png;base64,..."
  const match = qr.photo.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    return new Response("Invalid format", { status: 400 });
  }

  const contentType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  return new Response(buffer, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
