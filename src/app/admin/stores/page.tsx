"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DataService } from "@/lib/services/data-service";
import type { DatabaseStore } from "@/lib/types/database";

export default function AdminStoreListPage() {
  const [stores, setStores] = useState<DatabaseStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DataService.getStores().then((data) => {
      setStores(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="admin-stores-list">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2>🍜 店家總覽列表 ({stores.length})</h2>
        <Link className="button button-primary" href="/admin/stores/new">
          ➕ 新增店家
        </Link>
      </div>

      {loading ? (
        <div className="paper-card">載入資料中...</div>
      ) : stores.length === 0 ? (
        <div className="paper-card empty-state">
          <h3>目前資料庫尚無店家紀錄</h3>
          <p>請點擊右上方「新增店家」開始第一筆實體建檔。</p>
          <Link className="button button-primary" href="/admin/stores/new" style={{ marginTop: "12px" }}>
            建立首筆店家
          </Link>
        </div>
      ) : (
        <div className="paper-card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.08)" }}>
                <th style={{ padding: "12px 16px" }}>品牌 / 店名</th>
                <th style={{ padding: "12px 16px" }}>區域</th>
                <th style={{ padding: "12px 16px" }}>基本價格</th>
                <th style={{ padding: "12px 16px" }}>查證品質 (Data Quality)</th>
                <th style={{ padding: "12px 16px" }}>最後校對時間</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id} style={{ borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                  <td style={{ padding: "12px 16px" }}>
                    <strong>{store.brand}</strong> - {store.name}
                    <br />
                    <span className="microcopy" style={{ fontSize: "0.8rem", color: "#666" }}>
                      slug: {store.slug}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>{store.area}</td>
                  <td style={{ padding: "12px 16px" }}>NT${store.base_price}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span
                      style={{
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        background: store.data_quality === "verified" ? "#d1fae5" : "#fef3c7",
                        color: store.data_quality === "verified" ? "#065f46" : "#92400e",
                      }}
                    >
                      {store.data_quality === "verified" ? "✅ Verified" : "⚠️ Unverified"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.85rem" }}>
                    {store.checked_at ? new Date(store.checked_at).toLocaleDateString() : "未核對"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
