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
      <Link className="text-link" href="/explore">← 回到地圖</Link>
      <section className="detail-hero">
        <div className="shop-image image-placeholder" role="img" aria-label={`${shop.name} 店家主圖待補`}><span>{shop.area}</span></div>
        <div>
          <p className="eyebrow">{shop.brand}</p>
          <h1>{shop.name}</h1>
          <p className="detail-copy">{shop.description}</p>
          <div className="tag-row"><span>基本款 NT${shop.basePrice}</span><span>{shop.openNow ? "目前營業中" : "目前未營業"}</span><span>{queueLabel(queueLevelAt(shop))}</span></div>
          <a className="button button-primary" href={navUrl} target="_blank" rel="noreferrer">開啟 Google Maps 導航</a>
        </div>
      </section>
      <section className="detail-grid">
        <article className="paper-card"><h2>店家資訊</h2><dl><dt>地址</dt><dd>{shop.address}</dd><dt>營業時間</dt><dd>{shop.hoursSummary}</dd><dt>代表性價格</dt><dd>NT${shop.basePrice}</dd><dt>資料核對</dt><dd>{shop.verifiedAt}</dd></dl></article>
        <article className="paper-card"><h2>編輯評分</h2>{shop.editorialStatus === "reviewed" ? <dl><dt>湯頭</dt><dd>{shop.adminScores.soup}/5</dd><dt>麵體</dt><dd>{shop.adminScores.noodles}/5</dd><dt>配料</dt><dd>{shop.adminScores.toppings}/5</dd><dt>整體完成度</dt><dd>{shop.adminScores.completeness}/5</dd></dl> : <p>尚未由小魚或管理員完成實際試吃評分，因此演算法使用不偏袒任何店家的中性值。</p>}</article>
        <article className="paper-card"><h2>資料來源</h2><ul>{shop.dataSources.map((source) => <li key={source}>{source}</li>)}</ul></article>
        <article className="paper-card"><h2>你的紀錄</h2><p>登入後可收藏、標記吃過、評 1–5 分並記錄是否願意再訪。</p><Link className="text-link" href="/profile">前往個人頁 →</Link></article>
      </section>
    </main>
  );
}
