"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import styles from "./page.module.css";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function loadName() {
      if (!user) return;
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (data?.full_name) setFullName(data.full_name);
    }
    loadName();
  }, [user]);

  const displayName = fullName || user?.email?.split("@")[0] || "";

  return (
    <div className={styles.welcome}>
      <div className={styles.timeBlock}>
        <div className={styles.time}>{formatTime(now)}</div>
        <div className={styles.date}>{formatDate(now)}</div>
      </div>
      <h1 className={styles.greeting}>
        {getGreeting()}, {displayName}
      </h1>
    </div>
  );
}
