"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataService } from "@/lib/services/data-service";
import type { DataQuality } from "@/lib/types/database";

export default function AdminNewStorePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [slug, setSlug] = useState("");
  const [area, setArea] = useState("中山區");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState(280);
  const [dataQuality, setDataQuality] = useState<DataQuality>("verified");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    const res = await DataService.createStore({
      name,
      brand,
      slug,
      area,
      description,
      basePrice,
      dataQuality,
    });

    setSubmitting(false);

    if (res.success) {
      router.push("/admin/stores");
    } else {
      setErrorMessage(res.error || "儲存失敗，請檢查欄位或 Supabase 連線");
    }
  }

  return (
    <div className="admin-new-store" style={{ maxWidth: "680px", margin: "0 auto" }}>
      <h2 style={{ marginBottom: "16px" }}>➕ 新增店家實體建檔</h2>

      {errorMessage && (
        <div style={{ background: "#fee2e2", color: "#b91c1c", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px" }}>
          ⚠️ {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="paper-card" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>品牌名稱 (Brand Name)</label>
          <input
            type="text"
            required
            placeholder="例：勝王"
            value={brand}
            onChange={(e) => {
              setBrand(e.target.value);
              if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
            }}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>店家完整名稱 (Store Name)</label>
          <input
            type="text"
            required
            placeholder="例：勝王拉麵 中山本店"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>URL Slug (網址簡稱)</label>
          <input
            type="text"
            required
            placeholder="例：katsuou-ramen"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>行政區 / 商圈 (Area)</label>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
          >
            <option value="中山區">中山區</option>
            <option value="大安區">大安區</option>
            <option value="信義區">信義區</option>
            <option value="中正區">中正區</option>
            <option value="松山區">松山區</option>
            <option value="萬華區">萬華區</option>
            <option value="大同區">大同區</option>
            <option value="新北市">新北市</option>
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>基本款價格 NT$ (Base Price)</label>
          <input
            type="number"
            required
            min={0}
            value={basePrice}
            onChange={(e) => setBasePrice(Number(e.target.value))}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>資料品質標記 (Data Quality)</label>
          <select
            value={dataQuality}
            onChange={(e) => setDataQuality(e.target.value as DataQuality)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
          >
            <option value="verified">✅ Verified (已完成人工/官方驗證，會寫入 checked_at 時間戳)</option>
            <option value="unverified">⚠️ Unverified (社群草稿/待校對資料)</option>
          </select>
        </div>

        <div>
          <label style={{ fontWeight: 600, display: "block", marginBottom: "4px" }}>店家描述 (Description)</label>
          <textarea
            rows={3}
            placeholder="請輸入特色描述..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #ccc" }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
          <button type="submit" className="button button-primary" disabled={submitting}>
            {submitting ? "建檔中..." : "💾 儲存並建立實體"}
          </button>
          <button type="button" className="button button-ghost" onClick={() => router.back()}>
            取消
          </button>
        </div>
      </form>
    </div>
  );
}
