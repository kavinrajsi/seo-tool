import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import fs from "fs";
import path from "path";

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".ogg", ".m4a"];

export async function GET() {
  // Read sound files from public/sound/
  const soundDir = path.join(process.cwd(), "public", "sound");
  let files = [];

  try {
    const entries = fs.readdirSync(soundDir);
    files = entries.filter((f) => {
      const ext = path.extname(f).toLowerCase();
      return AUDIO_EXTENSIONS.includes(ext);
    });
  } catch {
    // Directory doesn't exist or can't be read
  }

  const sounds = files.map((filename) => {
    const name = path.basename(filename, path.extname(filename)).replace(/[_-]/g, " ");
    return {
      filename,
      name,
      url: `/sound/${filename}`,
    };
  });

  // Check global enabled status
  let globalEnabled = true;
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", "notification_sounds_enabled")
      .single();
    if (data) {
      globalEnabled = data.value === "true";
    }
  } catch {
    // Default to enabled
  }

  return NextResponse.json({ sounds, globalEnabled });
}
