"use client";

import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import { useLanguage } from "@/lib/i18n";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { lang } = useLanguage();

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
      <main className="admin-main-content">{children}</main>
    </div>
  );
}
