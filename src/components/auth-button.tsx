"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

export function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isSupabaseConfigured()) return <span className="auth-note" title="公開找店功能可用；收藏與紀錄需設定 Supabase">免登入瀏覽</span>;
  if (user) return <button className="nav-button" onClick={() => getSupabaseBrowserClient().auth.signOut()}>登出</button>;
  return <button className="nav-button" onClick={() => getSupabaseBrowserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: `${window.location.origin}/profile` } })}>Google 登入</button>;
}
