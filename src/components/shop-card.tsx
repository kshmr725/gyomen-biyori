"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Shop } from "@/lib/types";
import { queueLabel } from "@/lib/recommendation";
import { queueLevelAt } from "@/lib/hours";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase";
import { useLanguage } from "@/lib/i18n";

export function ShopCard({
  shop,
  walkingMinutes,
  reason,
  featured = false,
}: {
  shop: Shop;
  walkingMinutes: number;
  reason?: string;
  featured?: boolean;
}) {
  const { t, lang } = useLanguage();
  const [isFav, setIsFav] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = getSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        supabase
          .from("favorites")
          .select("*")
          .eq("user_id", data.user.id)
          .eq("shop_id", shop.id)
          .then(({ data: favData }) => {
            if (favData && favData.length > 0) setIsFav(true);
          });
      }
    });
  }, [shop.id]);

  async function toggleFavorite() {
    if (!isSupabaseConfigured() || !userId) return;
    const supabase = getSupabaseBrowserClient();
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", userId).eq("shop_id", shop.id);
      setIsFav(false);
    } else {
      await supabase.from("favorites").insert([{ user_id: userId, shop_id: shop.id }]);
      setIsFav(true);
    }
  }

  return (
    <article className={`shop-card ${featured ? "featured" : ""}`}>
      <div className="shop-card-media">
        <img src={shop.coverImage} alt={shop.name} className="shop-card-cover" />
        <span className="area-badge">{shop.area}</span>
        <span className="rating-badge">⭐ {shop.googleRating}</span>
        {userId && (
          <button
            className={`fav-card-btn ${isFav ? "is-fav" : ""}`}
            onClick={toggleFavorite}
            title={isFav ? t.favoritedBtn : t.favoriteBtn}
          >
            {isFav ? t.favoritedBtn : t.favoriteBtn}
          </button>
        )}
      </div>
      <div className="shop-card-body">
        <div className="shop-card-top">
          <div>
            <p className="eyebrow">{shop.brand}</p>
            <h3>{shop.name}</h3>
          </div>
          <span className={`open-pill ${shop.openNow ? "open" : "closed"}`}>
            {shop.openNow ? t.openNow : t.closed}
          </span>
        </div>
        <p className="shop-desc">{reason ?? shop.description}</p>

        {shop.menuItems && shop.menuItems.length > 0 && (
          <div className="dishes-preview">
            <span className="dishes-label">{t.signatureItem}</span>
            <div className="dish-chips">
              {shop.menuItems.slice(0, 2).map((item) => (
                <span key={item.id} className="dish-chip">
                  🍜 {item.name} (NT${item.price})
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="tag-row">
          {shop.mrtInfo && (
            <span className="tag-chip green">
              🚇 {shop.mrtInfo.station} {lang === "en" ? `${shop.mrtInfo.walkMinutes}m walk` : `步行 ${shop.mrtInfo.walkMinutes} 分`}
            </span>
          )}
          <span>
            {walkingMinutes > 0
              ? (lang === "en" ? `🚶 ${walkingMinutes}m walk` : `🚶 直線/步行 ${walkingMinutes} 分`)
              : (lang === "en" ? "🚶 Calculating walk time..." : "🚶 步行時間計算中")}
          </span>
          <span>💰 {t.basePrice}{shop.basePrice}</span>
          <span>⏳ {queueLabel(queueLevelAt(shop))}</span>
        </div>
        <Link className="button button-ghost view-detail-btn" href={`/shops/${shop.slug}`}>
          {t.viewMenuBtn}
        </Link>
      </div>
    </article>
  );
}
