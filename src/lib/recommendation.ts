import { queueLevelAt } from "./hours";
import type { AdminScores, QueueChoice, QueueLevel, RecommendationPreferences, RecommendationResult, Shop } from "./types";

export function adminScore(scores: AdminScores): number {
  return scores.soup * 0.4 + scores.noodles * 0.25 + scores.toppings * 0.2 + scores.completeness * 0.15;
}
export function queueRank(level: QueueLevel): number { return ({ none:0, under30:1, over30:2, unknown:3 })[level]; }
export function queueLabel(level: QueueLevel): string { return ({ none:"通常不用排（依時段估算）", under30:"通常 30 分內（依時段估算）", over30:"通常超過 30 分（依時段估算）", unknown:"排隊資料不足（依時段估算）" })[level]; }
export function queueAllowed(level: QueueLevel, choice: QueueChoice): boolean {
  if (choice === "unlimited") return true;
  if (choice === "none") return level === "none";
  return level === "none" || level === "under30";
}
function budgetAllowed(price: number, choice: RecommendationPreferences["budget"]): boolean {
  return choice === "unlimited" || price <= (choice === "cheap" ? 250 : 350);
}
function normalizedWalkScore(minutes: number, max: number): number { return Math.max(0, 1 - minutes / Math.max(max,1)); }
function normalizedQueueScore(level: QueueLevel): number { return ({ none:1, under30:0.65, over30:0.25, unknown:0.1 })[level]; }

export function rankShops(shops: Shop[], routeMinutes: Record<string, number>, preferences: RecommendationPreferences, now = new Date()) {
  return shops
    .filter((shop) => shop.recommendationReady && shop.openNow)
    .filter((shop) => routeMinutes[shop.id] != null && routeMinutes[shop.id] <= preferences.walkMinutes)
    .filter((shop) => budgetAllowed(shop.basePrice, preferences.budget))
    .filter((shop) => queueAllowed(queueLevelAt(shop, now), preferences.queue))
    .filter((shop) => preferences.novelty === "repeat" || !preferences.eatenIds.has(shop.id))
    .map((shop) => {
      const queue = queueLevelAt(shop, now);
      const walk = normalizedWalkScore(routeMinutes[shop.id], preferences.walkMinutes);
      const queueScore = normalizedQueueScore(queue);
      const google = Math.max(0, Math.min(1, shop.googleRating / 5));
      const editor = Math.max(0, Math.min(1, adminScore(shop.adminScores) / 5));
      return { shop, score: walk * 0.5 + queueScore * 0.3 + google * 0.1 + editor * 0.1 };
    })
    .sort((a,b) => b.score-a.score);
}

export function recommendShops(shops: Shop[], routeMinutes: Record<string, number>, preferences: RecommendationPreferences, random: () => number = Math.random, now = new Date()): RecommendationResult {
  const ranked = rankShops(shops, routeMinutes, preferences, now);
  if (ranked.length === 0) return { selected:null, alternatives:[], ranked, reason:"沒有店家同時符合全部條件。" };
  const pool = ranked.slice(0,3).map((item) => item.shop);
  const index = pool.length === 1 ? 0 : Math.floor(random() * pool.length);
  const selected = pool[index];
  const alternatives = pool.filter((shop) => shop.id !== selected.id);
  const reason = `步行約 ${routeMinutes[selected.id]} 分鐘、價格符合、${queueLabel(queueLevelAt(selected, now))}，而且目前營業中。`;
  return { selected, alternatives, ranked, reason };
}
