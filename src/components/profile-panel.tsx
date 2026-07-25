"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { shops } from "@/lib/seed";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";

export function ProfilePanel() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { if (!isSupabaseConfigured()) return; getSupabaseBrowserClient().auth.getUser().then(({ data }: { data: { user: User | null } }) => setUser(data.user)); }, []);
  if (!isSupabaseConfigured()) return <div className="paper-card empty-state"><h2>帳號功能尚未啟用</h2><p>接上 Supabase 後，Google 登入與私人紀錄會啟用。資料表與 RLS 已在 migration 中準備好。</p></div>;
  if (!user) return <div className="paper-card empty-state"><h2>登入後才會留下足跡</h2><p>推薦本身不需要登入；只有收藏、吃過和評分需要。</p><button className="button button-primary" onClick={() => getSupabaseBrowserClient().auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.href } })}>使用 Google 登入</button></div>;
  return <div className="profile-grid"><article className="paper-card"><p className="eyebrow">SIGNED IN</p><h2>{user.user_metadata.full_name ?? user.email}</h2><p>你的個人評分不會公開。</p></article><article className="paper-card"><h2>收藏</h2><p>尚未收藏店家。</p></article><article className="paper-card"><h2>最近吃過</h2><p>尚未建立紀錄。可以先從 <strong>{shops[0].name}</strong> 開始。</p></article></div>;
}
