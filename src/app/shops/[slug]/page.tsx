import Link from "next/link";
import { notFound } from "next/navigation";
import { shops } from "@/lib/seed";
import { queueLabel } from "@/lib/recommendation";
import { queueLevelAt } from "@/lib/hours";

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = shops.find((item) => item.slug === slug);
  if (!shop) notFound();
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`;

  return (
    <main className="page-shell detail-page">
      <Link className="text-link back-link" href="/explore">
        ← 回到地圖與瀏覽
      </Link>
      <section className="detail-hero">
        <div className="shop-cover-wrapper">
          <img src={shop.coverImage} alt={shop.name} className="shop-cover-img" />
          <span className="area-pill">{shop.area}</span>
        </div>
        <div className="detail-hero-content">
          <p className="eyebrow">{shop.brand}</p>
          <h1>{shop.name}</h1>
          <p className="detail-copy">{shop.description}</p>
          <div className="tag-row">
            <span>⭐ Google {shop.googleRating}</span>
            <span>💰 基本款 NT${shop.basePrice}</span>
            <span className={shop.openNow ? "open-tag" : "closed-tag"}>
              {shop.openNow ? "🟢 目前營業中" : "🔴 目前未營業"}
            </span>
            <span>⏳ {queueLabel(queueLevelAt(shop))}</span>
          </div>
          <div className="hero-actions">
            <a className="button button-primary" href={navUrl} target="_blank" rel="noreferrer">
              📍 開啟 Google Maps 導航
            </a>
          </div>
        </div>
      </section>

      {/* Menu & Dish Gallery Section */}
      <section className="menu-gallery-section paper-card">
        <h2>🍜 店家熱門拉麵與商品菜單</h2>
        <p className="section-subtitle">點擊商品查看餐點描述、風格標籤與價格資訊</p>
        <div className="menu-items-grid">
          {shop.menuItems.map((item) => (
            <article key={item.id} className="menu-item-card">
              <div className="menu-item-photo-wrapper">
                <img src={item.photo} alt={item.name} className="menu-item-photo" />
                {item.isSignature && <span className="signature-badge">🔥 店家招牌</span>}
              </div>
              <div className="menu-item-details">
                <div className="menu-item-header">
                  <h3>{item.name}</h3>
                  <span className="menu-item-price">NT${item.price}</span>
                </div>
                <p className="menu-item-desc">{item.description}</p>
                <div className="dish-tags-row">
                  {item.tags.map((tag) => (
                    <span key={tag} className="dish-tag">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Store Photos Gallery */}
      {shop.photos && shop.photos.length > 0 && (
        <section className="photos-gallery-section paper-card">
          <h2>📸 店家實景與餐點寫真</h2>
          <div className="photos-grid">
            {shop.photos.map((photoUrl, idx) => (
              <img key={idx} src={photoUrl} alt={`${shop.name} 照片 ${idx + 1}`} className="gallery-photo" />
            ))}
          </div>
        </section>
      )}

      <section className="detail-grid">
        <article className="paper-card">
          <h2>店家資訊</h2>
          <dl>
            <dt>地址</dt>
            <dd>{shop.address}</dd>
            <dt>營業時間</dt>
            <dd>{shop.hoursSummary}</dd>
            <dt>代表性價格</dt>
            <dd>NT${shop.basePrice}</dd>
            <dt>資料核對日期</dt>
            <dd>{shop.verifiedAt}</dd>
          </dl>
        </article>
        <article className="paper-card">
          <h2>編輯評分</h2>
          {shop.editorialStatus === "reviewed" ? (
            <dl>
              <dt>湯頭</dt>
              <dd>{shop.adminScores.soup} / 5</dd>
              <dt>麵體</dt>
              <dd>{shop.adminScores.noodles} / 5</dd>
              <dt>配料</dt>
              <dd>{shop.adminScores.toppings} / 5</dd>
              <dt>整體完成度</dt>
              <dd>{shop.adminScores.completeness} / 5</dd>
            </dl>
          ) : (
            <p>尚未由小魚或管理員完成實際試吃評分，因此演算法使用不偏袒任何店家的中性值。</p>
          )}
        </article>
        <article className="paper-card">
          <h2>資料來源</h2>
          <ul>
            {shop.dataSources.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </article>
        <article className="paper-card">
          <h2>你的個人紀錄</h2>
          <p>登入後可收藏、標記吃過、評 1–5 分並記錄是否願意再訪。</p>
          <Link className="text-link" href="/profile">
            前往個人頁 →
          </Link>
        </article>
      </section>
    </main>
  );
}
