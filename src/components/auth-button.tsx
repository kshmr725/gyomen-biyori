"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

export function AuthButton() {
  const { t } = useLanguage();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {});
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (user) {
    return (
      <button
        className="nav-button"
        onClick={() => {
          const supabase = getSupabaseBrowserClient();
          supabase?.auth.signOut().catch(() => {});
        }}
      >
        {t.logout}
      </button>
    );
  }

  return (
    <button
      className="nav-button"
      onClick={() => {
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: { redirectTo: `${window.location.origin}/profile` },
          }).catch(() => {});
        }
      }}
    >
      {t.loginGoogle}
    </button>
  );
}
