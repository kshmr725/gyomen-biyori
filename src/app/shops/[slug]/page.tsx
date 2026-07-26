import Link from "next/link";
import { notFound } from "next/navigation";
import { shops } from "@/lib/seed";
import { queueLabel } from "@/lib/recommendation";
import { queueLevelAt } from "@/lib/hours";

function ScoreMeter({ label, score }: { label: string; score: number }) {
  const percentage = (score / 5) * 100;
  const stars = "★".repeat(Math.floor(score)) + (score % 1 >= 0.5 ? "½" : "");
  return (
    <div className="score-meter-row">
      <div className="score-meter-header">
        <span className="score-meter-label">{label}</span>
        <span className="score-meter-value">
          <span className="score-stars">{stars}</span> {score} / 5.0
        </span>
      </div>
      <div className="score-meter-bar-track">
        <div className="score-meter-bar-fill" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = shops.find((item) => item.slug === slug);
  if (!shop) notFound();
  const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(shop.address)}`;

  return (
    <main className="page-shell detail-page">
      <Link className="text-link back-link" href="/explore">
        ← 回到地圖與清單
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
            <span className="tag-chip gold">⭐ Google {shop.googleRating}</span>
            <span className="tag-chip green">💰 基本款 NT${shop.basePrice}</span>
            <span className={`tag-chip ${shop.openNow ? "open-chip" : "closed-chip"}`}>
              {shop.openNow ? "🟢 目前營業中" : "🔴 目前未營業"}
            </span>
            <span className="tag-chip muted">⏳ {queueLabel(queueLevelAt(shop))}</span>
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
        <div className="section-header-group">
          <h2>🍜 店家熱門拉麵與商品菜單</h2>
          <p className="section-subtitle">附餐點描述、風格標籤與價格資訊</p>
        </div>
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
          <div className="section-header-group">
            <h2>📸 店家實景與餐點寫真</h2>
            <p className="section-subtitle">門市外觀、內用氛圍與特色餐點近照</p>
          </div>
          <div className="photos-grid">
            {shop.photos.map((photoUrl, idx) => (
              <div key={idx} className="photo-card-wrapper">
                <img src={photoUrl} alt={`${shop.name} 照片 ${idx + 1}`} className="gallery-photo" />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="detail-grid">
        {/* 店家資訊卡 */}
        <article className="paper-card info-card">
          <h2>📍 店家資訊</h2>
          <div className="info-list">
            <div className="info-item">
              <span className="info-label">地址</span>
              <span className="info-value text-bold">{shop.address}</span>
            </div>
            <div className="info-item">
              <span className="info-label">營業時間</span>
              <span className="info-value">{shop.hoursSummary}</span>
            </div>
            <div className="info-item">
              <span className="info-label">代表性價格</span>
              <span className="info-value price-highlight">NT${shop.basePrice} 起</span>
            </div>
            <div className="info-item">
              <span className="info-label">資料核對日期</span>
              <span className="info-value date-tag">📅 {shop.verifiedAt}</span>
            </div>
          </div>
        </article>

        {/* 編輯評分卡 */}
        <article className="paper-card score-card">
          <h2>⭐ 編輯評分指標</h2>
          {shop.editorialStatus === "reviewed" ? (
            <div className="score-meters-container">
              <ScoreMeter label="湯頭 (Soup)" score={shop.adminScores.soup} />
              <ScoreMeter label="麵體 (Noodles)" score={shop.adminScores.noodles} />
              <ScoreMeter label="配料 (Toppings)" score={shop.adminScores.toppings} />
              <ScoreMeter label="整體完成度 (Completeness)" score={shop.adminScores.completeness} />
            </div>
          ) : (
            <p className="muted-notice">尚未由小魚或管理員完成實際試吃評分，因此演算法使用不偏袒任何店家的中性預設值。</p>
          )}
        </article>

        {/* 資料來源卡 */}
        <article className="paper-card source-card">
          <h2>📖 資料來源</h2>
          <p className="muted-notice">所有資訊皆經由人工核對或官方食記來源驗證（點擊可跳轉至真實來源）</p>
          <div className="source-chips-grid">
            {shop.dataSources.map((source, index) => {
              const isObj = typeof source === "object" && source !== null;
              const title = isObj ? (source.label || (source as { title?: string }).title || "官方資料來源") : source;
              const url = isObj ? source.url : `https://www.google.com/search?q=${encodeURIComponent(shop.name + " " + source)}`;
              return (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="source-chip source-chip-link"
                >
                  <span className="source-icon">🌐</span>
                  <span className="source-text">{title}</span>
                  <span className="external-link-arrow">↗</span>
                </a>
              );
            })}
          </div>
        </article>

        {/* 個人紀錄卡 */}
        <article className="paper-card action-card">
          <h2>📝 你的個人紀錄</h2>
          <p className="action-desc">登入 Google 帳號後，可自由收藏、標記已吃過、評分並記錄再訪意願。</p>
          <Link className="button button-primary full-btn" href="/profile">
            前往個人專屬頁面 →
          </Link>
        </article>
      </section>
    </main>
  );
}
