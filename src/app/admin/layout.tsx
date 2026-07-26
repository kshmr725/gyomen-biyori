"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { useLanguage } from "@/lib/i18n";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    async function checkAdminAuth() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        setIsAdmin(false);
        return;
      }
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setUserEmail(data.user.email ?? null);
          const { data: adminData } = await supabase
            .from("admin_profiles")
            .select("role")
            .eq("id", data.user.id);
          setIsAdmin(Boolean(adminData && adminData.length > 0));
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      }
    }
    checkAdminAuth();
  }, []);

  return (
    <div className="admin-shell page-shell">
      <header className="admin-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", paddingBottom: "16px", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
        <div>
          <span className="eyebrow">GYOMEN CMS CONTROL PLANE</span>
          <h1 style={{ margin: "4px 0 0 0", fontSize: "1.6rem" }}>
            {lang === "en" ? "Ramen Database CMS" : "魚麵日和 · 店家內容管理系統"}
          </h1>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <Link className="button button-ghost" href="/admin">
            📊 CMS Dashboard
          </Link>
          <Link className="button button-ghost" href="/admin/stores">
            🍜 {lang === "en" ? "Store Directory" : "店家總覽"}
          </Link>
          <Link className="button button-primary" href="/admin/stores/new">
            ➕ {lang === "en" ? "Add New Store" : "新增店家"}
          </Link>
          <AuthButton />
        </div>
      </header>

      {isAdmin === false && (
        <div className="paper-card" style={{ marginBottom: "24px", borderLeft: "4px solid #f59e0b", background: "#fffbebf5" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ margin: 0, color: "#92400e" }}>🔒 {lang === "en" ? "CMS Guest Mode & RLS Notice" : "CMS 訪客模式與權限提示"}</h3>
              <p className="microcopy" style={{ margin: "4px 0 0 0", color: "#b45309" }}>
                {userEmail
                  ? (lang === "en" ? `Signed in as ${userEmail}. Read access granted, admin role required for writes.` : `已登入：${userEmail}。唯讀權限中，寫入與異動需具備 admin 權限角色。`)
                  : (lang === "en" ? "Viewing CMS in Guest Mode. Please sign in with an Admin account for write access." : "目前為訪客檢視模式。管理員請點擊右上角登入授權。")}
              </p>
            </div>
            {!userEmail && <AuthButton />}
          </div>
        </div>
      )}

      <main className="admin-main-content">{children}</main>
    </div>
  );
}
