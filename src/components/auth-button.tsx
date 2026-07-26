"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

export function AuthButton() {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (user) {
    return (
      <button className="nav-button" onClick={() => getSupabaseBrowserClient().auth.signOut()}>
        {t.logout}
      </button>
    );
  }

  return (
    <button
      className="nav-button"
      onClick={() => {
        const requestedNext = new URLSearchParams(window.location.search).get("next");
        const next =
          requestedNext?.startsWith("/") && !requestedNext.startsWith("//")
            ? requestedNext
            : "/profile";
        getSupabaseBrowserClient().auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
      }}
    >
      {t.loginGoogle}
    </button>
  );
}
