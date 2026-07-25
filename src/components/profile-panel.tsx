"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import Link from "next/link";
import { shops } from "@/lib/seed";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import type { Shop } from "@/lib/types";

type FavoriteItem = { shop_id: string; created_at: string };
type VisitItem = { id: string; shop_id: string; rating: number; would_revisit: boolean; visited_at: string };

export function ProfilePanel() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => isSupabaseConfigured());
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [visits, setVisits] = useState<VisitItem[]>([]);

  const [selectedShopId, setSelectedShopId] = useState<string>(shops[0].id);
  const [visitRating, setVisitRating] = useState<number>(5);
  const [wouldRevisit, setWouldRevisit] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const loadUserData = useCallback(async (userId: string) => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const [favRes, visRes] = await Promise.all([
        supabase.from("favorites").select("*").eq("user_id", userId),
        supabase.from("visits").select("*").eq("user_id", userId).order("visited_at", { ascending: false }),
      ]);

      if (favRes.data) setFavorites(favRes.data as FavoriteItem[]);
      if (visRes.data) setVisits(visRes.data as VisitItem[]);
    } catch (e) {
      console.error("Failed to fetch user data from Supabase:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        loadUserData(data.user.id);
      } else {
        setLoading(false);
      }
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setFavorites([]);
        setVisits([]);
        setLoading(false);
      }
    });

    return () => data.subscription.unsubscribe();
  }, [loadUserData]);

  async function handleAddVisit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const supabase = getSupabaseBrowserClient();
    try {
      const newVisit = {
        user_id: user.id,
        shop_id: selectedShopId,
        rating: visitRating,
        would_revisit: wouldRevisit,
        visited_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("visits").insert([newVisit]).select();
      if (error) throw error;
      if (data) {
        setVisits((prev) => [data[0] as VisitItem, ...prev]);
      }
    } catch (err) {
      console.error("Failed to save visit record:", err);
    } finally {
      setSubmitting(false);
    }
  }

  async function removeFavorite(shopId: string) {
    if (!user) return;
    const supabase = getSupabaseBrowserClient();
    try {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("shop_id", shopId);
      setFavorites((prev) => prev.filter((f) => f.shop_id !== shopId));
    } catch (e) {
      console.error("Failed to remove favorite:", e);
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="paper-card empty-state">
        <h2>帳號資料庫尚未連線</h2>
        <p>在 Vercel 設定環境變數 `NEXT_PUBLIC_SUPABASE_ANON_KEY` 後，即可使用 Google 登入與跨裝置私人紀錄。</p>
      </div>
    );
  }

  if (loading) {
    return <div className="paper-card empty-state"><p>正在載入你的專屬紀錄與雲端足跡…</p></div>;
  }

  if (!user) {
    return (
      <div className="paper-card empty-state">
        <h2>登入 Google 帳號，開啟跨裝置足跡同步</h2>
        <p>推薦引擎可免登入直接使用；登入 Google 後，可以在手機與電腦間同步你的收藏、吃過紀錄與私人評分。</p>
        <button
          className="button button-primary"
          onClick={() =>
            getSupabaseBrowserClient().auth.signInWithOAuth({
              provider: "google",
              options: { redirectTo: `${window.location.origin}/profile` },
            })
          }
        >
          🔑 使用 Google 帳號一鍵登入
        </button>
      </div>
    );
  }

  const favoriteShops = favorites
    .map((f) => shops.find((s) => s.id === f.shop_id))
    .filter((s): s is Shop => Boolean(s));

  return (
    <div className="profile-grid">
      {/* 帳號個人卡 */}
      <article className="paper-card">
        <p className="eyebrow">SIGNED IN VIA GOOGLE</p>
        <h2>{user.user_metadata?.full_name ?? user.email}</h2>
        <p className="microcopy">信箱：{user.email}</p>
        <p className="microcopy">你的收藏與試吃紀錄已加密同步於 Supabase 雲端資料庫。</p>
        <button
          className="button button-ghost"
          style={{ marginTop: "14px" }}
          onClick={() => getSupabaseBrowserClient().auth.signOut()}
        >
          登出帳號
        </button>
      </article>

      {/* 新增造訪紀錄卡 */}
      <article className="paper-card">
        <h2>📝 新增吃過紀錄</h2>
        <form onSubmit={handleAddVisit} className="info-list" style={{ borderTop: "none" }}>
          <div className="info-item">
            <span className="info-label">選擇拉麵店</span>
            <select
              value={selectedShopId}
              onChange={(e) => setSelectedShopId(e.target.value)}
              style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "6px" }}
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name} ({shop.area})
                </option>
              ))}
            </select>
          </div>

          <div className="info-item">
            <span className="info-label">我的給分</span>
            <select
              value={visitRating}
              onChange={(e) => setVisitRating(Number(e.target.value))}
              style={{ border: "1px solid var(--line)", borderRadius: "8px", padding: "6px" }}
            >
              <option value={5}>⭐⭐⭐⭐⭐ (5.0 極推)</option>
              <option value={4}>⭐⭐⭐⭐ (4.0 很好吃)</option>
              <option value={3}>⭐⭐⭐ (3.0 普通)</option>
              <option value={2}>⭐⭐ (2.0 待加強)</option>
              <option value={1}>⭐ (1.0 不合胃口)</option>
            </select>
          </div>

          <div className="info-item">
            <span className="info-label">再訪意願</span>
            <button
              type="button"
              className={`preset-chip ${wouldRevisit ? "selected" : ""}`}
              onClick={() => setWouldRevisit(!wouldRevisit)}
            >
              {wouldRevisit ? "👍 會想再訪" : "👎 不再考慮"}
            </button>
          </div>

          <button type="submit" className="button button-primary full-btn" disabled={submitting}>
            {submitting ? "正在儲存到雲端…" : "儲存吃過紀錄"}
          </button>
        </form>
      </article>

      {/* 收藏清單卡 */}
      <article className="paper-card">
        <h2>❤️ 我的收藏店家 ({favoriteShops.length})</h2>
        {favoriteShops.length === 0 ? (
          <p className="microcopy">尚未收藏店家。可瀏覽地圖或店家頁面點擊收藏。</p>
        ) : (
          <div className="info-list" style={{ borderTop: "none" }}>
            {favoriteShops.map((shop) => (
              <div key={shop.id} className="info-item">
                <div>
                  <Link href={`/shops/${shop.slug}`} style={{ fontWeight: 600 }}>
                    {shop.name}
                  </Link>
                  <div className="microcopy">{shop.area} · NT${shop.basePrice} 起</div>
                </div>
                <button
                  className="preset-chip"
                  onClick={() => removeFavorite(shop.id)}
                  title="移除收藏"
                >
                  ✕ 移除
                </button>
              </div>
            ))}
          </div>
        )}
      </article>

      {/*造訪紀錄列表 */}
      <article className="paper-card">
        <h2>🍜 最近吃過足跡 ({visits.length})</h2>
        {visits.length === 0 ? (
          <p className="microcopy">尚未建立紀錄。可以點擊上方表單建立第一筆試吃日誌！</p>
        ) : (
          <div className="info-list" style={{ borderTop: "none" }}>
            {visits.map((vis) => {
              const shop = shops.find((s) => s.id === vis.shop_id);
              return (
                <div key={vis.id} className="info-item">
                  <div>
                    <strong>{shop?.name ?? "未知店家"}</strong>
                    <div className="microcopy">
                      評分：{"⭐".repeat(vis.rating)} ({vis.rating}.0) · {vis.would_revisit ? "👍 願再訪" : "👎 不再訪"}
                    </div>
                  </div>
                  <span className="date-tag">{new Date(vis.visited_at).toLocaleDateString()}</span>
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
}
