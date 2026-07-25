import Link from "next/link";
import type { Shop } from "@/lib/types";
import { queueLabel } from "@/lib/recommendation";
import { queueLevelAt } from "@/lib/hours";

export function ShopCard({ shop, walkingMinutes, reason, featured = false }: { shop: Shop; walkingMinutes: number; reason?: string; featured?: boolean }) {
  return <article className={`shop-card ${featured ? "featured" : ""}`}><div className="thumb image-placeholder"><span>{shop.area}</span></div><div className="shop-card-body"><div className="shop-card-top"><div><p className="eyebrow">{shop.brand}</p><h3>{shop.name}</h3></div><span className={`open-pill ${shop.openNow ? "open" : "closed"}`}>{shop.openNow ? "營業中" : "未營業"}</span></div><p>{reason ?? shop.description}</p><div className="tag-row"><span>{walkingMinutes > 0 ? `步行約 ${walkingMinutes} 分` : "步行時間待取得"}</span><span>NT${shop.basePrice}</span><span>{queueLabel(queueLevelAt(shop))}</span></div><Link className="text-link" href={`/shops/${shop.slug}`}>查看店家 →</Link></div></article>;
}
