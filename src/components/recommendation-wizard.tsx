"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapView } from "@/components/map-view";
import { ShopCard } from "@/components/shop-card";
import { shops } from "@/lib/seed";
import { rankShops, recommendShops } from "@/lib/recommendation";
import type { BudgetChoice, Coordinates, NoveltyChoice, QueueChoice, RecommendationResult, Shop } from "@/lib/types";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5170 };

type RouteState = { loading: boolean; error: string | null; source: "valhalla" | "ors" | "cache" | "demo" | null; minutes: Record<string, number> };

export function RecommendationWizard() {
  const [selected, setSelected] = useState<Coordinates | null>(null);
  const [center, setCenter] = useState<Coordinates>(TAIPEI_CENTER);
  const [step, setStep] = useState(0);
  const [walkMinutes, setWalkMinutes] = useState(15);
  const [budget, setBudget] = useState<BudgetChoice>("cheap");
  const [queue, setQueue] = useState<QueueChoice>("under30");
  const [novelty, setNovelty] = useState<NoveltyChoice>("new");
  const [route, setRoute] = useState<RouteState>({ loading: false, error: null, source: null, minutes: {} });
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [rerolled, setRerolled] = useState(false);
  const [activePreviewShop, setActivePreviewShop] = useState<Shop | null>(null);

  const eatenIds = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("gyomen:last-location");
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as Coordinates;
        setCenter(parsed);
      } catch {
        window.localStorage.removeItem("gyomen:last-location");
      }
    }, 0);
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const current = { lat: coords.latitude, lng: coords.longitude };
      setCenter(current);
      setSelected(current);
    });
    return () => window.clearTimeout(restoreTimer);
  }, []);

  const selectPoint = useCallback((point: Coordinates) => {
    setSelected(point);
    setCenter(point);
    setStep(1);
    setResult(null);
    window.localStorage.setItem("gyomen:last-location", JSON.stringify(point));
  }, []);

  // Real-time matching shops computation for map marker highlighting
  const matchingShopIds = useMemo(() => {
    if (step === 0) return new Set(shops.map((s) => s.id));
    const preferences = { walkMinutes, budget, queue, novelty, eatenIds };
    // If route minutes exist, use them, otherwise use fallback route estimation
    const effectiveMinutes = Object.keys(route.minutes).length > 0
      ? route.minutes
      : Object.fromEntries(shops.map((s) => [s.id, 10]));

    const ranked = rankShops(shops, effectiveMinutes, preferences);
    return new Set(ranked.map((item) => item.shop.id));
  }, [step, walkMinutes, budget, queue, novelty, eatenIds, route.minutes]);

  async function calculate() {
    if (!selected) return;
    setRoute({ loading: true, error: null, source: null, minutes: {} });
    setResult(null);
    setRerolled(false);
    try {
      const response = await fetch("/api/walking-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: selected,
          destinations: shops.map(({ id, lat, lng }) => ({ id, lat, lng })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "目前無法取得可信步行時間");
      const minutes = Object.fromEntries(
        payload.durations.map((item: { id: string; minutes: number }) => [item.id, item.minutes])
      );
      setRoute({ loading: false, error: null, source: payload.source as RouteState["source"], minutes });

      const recResult = recommendShops(shops, minutes, { walkMinutes, budget, queue, novelty, eatenIds });
      setResult(recResult);
      if (recResult.selected) {
        setCenter({ lat: recResult.selected.lat, lng: recResult.selected.lng });
      }
      setStep(5);
    } catch (error) {
      setRoute({
        loading: false,
        error: error instanceof Error ? error.message : "路線服務暫時無法使用",
        source: null,
        minutes: {},
      });
    }
  }

  function reroll() {
    if (!result || rerolled || result.alternatives.length === 0) return;
    const [next, ...rest] = result.alternatives;
    setResult({ ...result, selected: next, alternatives: result.selected ? [result.selected, ...rest] : rest });
    if (next) {
      setCenter({ lat: next.lat, lng: next.lng });
    }
    setRerolled(true);
  }

  return (
    <section className="wizard-grid">
      <div className="map-column">
        <MapView
          center={center}
          selected={selected}
          shops={shops}
          matchingShopIds={matchingShopIds}
          selectedShopId={result?.selected?.id}
          onSelect={selectPoint}
          onShopSelect={(shop) => setActivePreviewShop(shop)}
          height={520}
        />
        <div className="map-caption">
          <span>{selected ? "📍 已設定出發位置" : "👉 點擊地圖設定出發位置"}</span>
          <span>符合條件店家：{matchingShopIds.size} 間</span>
        </div>
      </div>
      <div className="wizard-panel paper-card">
        {step === 0 && (
          <Step title="先選擇一個出發位置" kicker="STEP 01">
            <p>可以用目前 GPS 定位，也可以直接在地圖上點擊。位置資訊僅儲存在本機。</p>
            <button
              className="button button-primary full"
              onClick={() => selected && setStep(1)}
              disabled={!selected}
            >
              {selected ? "確認出發位置，開始選擇" : "請在地圖點選出發位置"}
            </button>
          </Step>
        )}
        {step === 1 && (
          <Step title="願意走多久？" kicker="STEP 02">
            <ChoiceGroup
              values={[5, 10, 15, 20]}
              selected={walkMinutes}
              onSelect={(v) => {
                setWalkMinutes(v);
                setStep(2);
              }}
              format={(v) => `${v} 分鐘內`}
            />
          </Step>
        )}
        {step === 2 && (
          <Step title="今天的預算上限？" kicker="STEP 03">
            <ChoiceGroup
              values={["cheap", "standard", "unlimited"] as BudgetChoice[]}
              selected={budget}
              onSelect={(v) => {
                setBudget(v);
                setStep(3);
              }}
              format={(v) => (v === "cheap" ? "平價 · ≤ NT$250" : v === "standard" ? "一般 · ≤ NT$350" : "不限預算")}
            />
          </Step>
        )}
        {step === 3 && (
          <Step title="最多願意排隊多久？" kicker="STEP 04">
            <ChoiceGroup
              values={["none", "under30", "unlimited"] as QueueChoice[]}
              selected={queue}
              onSelect={(v) => {
                setQueue(v);
                setStep(4);
              }}
              format={(v) => (v === "none" ? "不用排隊" : v === "under30" ? "30 分鐘內" : "不限排隊時間")}
            />
          </Step>
        )}
        {step === 4 && (
          <Step title="今天想嘗試新店家嗎？" kicker="STEP 05">
            <ChoiceGroup
              values={["new", "repeat"] as NoveltyChoice[]}
              selected={novelty}
              onSelect={setNovelty}
              format={(v) => (v === "new" ? "想吃沒吃過的" : "吃過也可以")}
            />
            <button className="button button-primary full" onClick={calculate} disabled={route.loading}>
              {route.loading ? "正在計算最佳步行路線…" : `替我選一間 (符合：${matchingShopIds.size}間)`}
            </button>
          </Step>
        )}

        {route.error && (
          <div className="empty-state">
            <h2>路線服務提醒</h2>
            <p>{route.error}</p>
            <p>在沒有可信快取時，推薦會暫停；你仍可前往自由瀏覽。</p>
            <Link className="button button-ghost" href="/explore">
              自由逛逛
            </Link>
          </div>
        )}

        {step === 5 && result && (
          result.selected ? (
            <div>
              <p className="eyebrow">TODAY&apos;S RECOMMENDED BOWL</p>
              <h2>今天就吃這間！</h2>
              {route.source === "demo" && (
                <p className="warning-note">目前為本機估算；正式環境會使用實際步行路線。</p>
              )}
              <ShopCard
                shop={result.selected}
                walkingMinutes={route.minutes[result.selected.id]}
                reason={result.reason}
                featured
              />
              <div className="result-actions">
                <a
                  className="button button-primary"
                  target="_blank"
                  rel="noreferrer"
                  href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(result.selected.address)}`}
                >
                  📍 開啟 Google Maps 導航
                </a>
                <button
                  className="button button-ghost"
                  disabled={rerolled || result.alternatives.length === 0}
                  onClick={reroll}
                >
                  {rerolled ? "已更換過一次" : "🔄 換一間"}
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h2>沒有完全符合條件的店家</h2>
              <p>我們堅持誠實原則，不會暗中放寬你的條件。請嘗試放寬步行時間、預算或排隊時間限制。</p>
              <button className="button button-primary" onClick={() => setStep(1)}>
                重新設定篩選條件
              </button>
            </div>
          )
        )}
      </div>

      {activePreviewShop && (
        <div className="shop-modal-overlay" onClick={() => setActivePreviewShop(null)}>
          <div className="shop-modal-content paper-card" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close-btn" onClick={() => setActivePreviewShop(null)}>✕</button>
            <h3>{activePreviewShop.name} — 熱門商品菜單圖片</h3>
            <div className="menu-grid">
              {activePreviewShop.menuItems.map((item) => (
                <div key={item.id} className="menu-card">
                  <img src={item.photo} alt={item.name} className="menu-card-img" />
                  <div className="menu-card-info">
                    <h4>{item.name} {item.isSignature && <span className="sig-badge">招牌</span>}</h4>
                    <p className="menu-desc">{item.description}</p>
                    <span className="menu-price">NT${item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Step({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) {
  return (
    <div className="step-card">
      <p className="eyebrow">{kicker}</p>
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function ChoiceGroup<T extends string | number>({
  values,
  selected,
  onSelect,
  format,
}: {
  values: T[];
  selected: T;
  onSelect: (value: T) => void;
  format: (value: T) => string;
}) {
  return (
    <div className="choice-grid">
      {values.map((value) => (
        <button
          className={`choice ${selected === value ? "selected" : ""}`}
          key={value}
          onClick={() => onSelect(value)}
        >
          {format(value)}
        </button>
      ))}
    </div>
  );
}
