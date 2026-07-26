"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataService } from "@/lib/services/data-service";
import type { DatabaseStore } from "@/lib/types/database";

export default function AdminDashboardPage() {
  const [stores, setStores] = useState<DatabaseStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DataService.getStores().then((data) => {
      setStores(data);
      setLoading(false);
    });
  }, []);

  const verifiedCount = stores.filter((s) => s.data_quality === "verified").length;
  const unverifiedCount = stores.filter((s) => s.data_quality === "unverified").length;

  return (
    <div className="admin-dashboard">
      <div className="stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "32px" }}>
        <div className="paper-card">
          <p className="eyebrow">TOTAL STORES IN SYSTEM</p>
          <h2 style={{ fontSize: "2rem", margin: "4px 0" }}>{loading ? "..." : stores.length}</h2>
          <p className="microcopy">包含全部已建檔與草稿店家</p>
        </div>

        <div className="paper-card" style={{ borderLeft: "4px solid #10b981" }}>
          <p className="eyebrow">VERIFIED (已查證店家)</p>
          <h2 style={{ fontSize: "2rem", margin: "4px 0", color: "#059669" }}>{loading ? "..." : verifiedCount}</h2>
          <p className="microcopy">由小魚/團隊親自核對 100% 可信</p>
        </div>

        <div className="paper-card" style={{ borderLeft: "4px solid #f59e0b" }}>
          <p className="eyebrow">UNVERIFIED (待比對草稿)</p>
          <h2 style={{ fontSize: "2rem", margin: "4px 0", color: "#d97706" }}>{loading ? "..." : unverifiedCount}</h2>
          <p className="microcopy">需補齊菜單、價格或營業時間</p>
        </div>
      </div>

      <div className="paper-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3>📌 快速動作與管理捷徑</h3>
          <Link className="button button-primary" href="/admin/stores/new">
            ➕ 新增全新店家
          </Link>
        </div>
        <p>歡迎使用魚麵日和內容管理系統。系統採用 Supabase Row Level Security (RLS) 保護權限，所有維護資料均包含 `checked_at` 與來源標籤追蹤。</p>
        <div style={{ marginTop: "16px" }}>
          <Link className="button button-ghost" href="/admin/stores">
            前往店家總覽列表 →
          </Link>
        </div>
      </div>
    </div>
  );
}
