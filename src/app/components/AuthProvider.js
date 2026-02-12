"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  profile: null,
  isAdmin: false,
  isHr: false,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchProfile(userId) {
      const { data } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();
      setProfile(data);
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).then(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchProfile(s.user.id).then(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdmin = profile?.role === "admin";
  const isHr = profile?.role === "hr";

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, profile, isAdmin, isHr, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
