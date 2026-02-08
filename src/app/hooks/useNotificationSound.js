"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

export default function useNotificationSound() {
  const { user } = useAuth();
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [soundFile, setSoundFile] = useState("walmart_notification.mp3");
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    async function load() {
      // Fetch global enabled status
      try {
        const res = await fetch("/api/sounds");
        if (res.ok) {
          const json = await res.json();
          setGlobalEnabled(json.globalEnabled);
        }
      } catch {
        // Default to enabled
      }

      // Fetch user's sound preference
      if (user) {
        try {
          const supabase = createClient();
          const { data } = await supabase
            .from("profiles")
            .select("notification_sound")
            .eq("id", user.id)
            .single();
          if (data && data.notification_sound !== null && data.notification_sound !== undefined) {
            setSoundFile(data.notification_sound);
          }
        } catch {
          // Use default
        }
      }
    }

    load();
  }, [user]);

  const playSound = useCallback(() => {
    if (!globalEnabled) return;
    if (!soundFile) return;

    try {
      const audio = new Audio(`/sound/${soundFile}`);
      audio.play().catch(() => {
        // Autoplay blocked — ignore silently
      });
    } catch {
      // Ignore errors
    }
  }, [globalEnabled, soundFile]);

  return { playSound };
}
