"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapView } from "@/components/map-view";
import { LocationSearch } from "@/components/location-search";
import { RamenSwipeDeck } from "@/components/ramen-swipe-deck";
import { shops } from "@/lib/seed";
import { rankShops } from "@/lib/recommendation";
import type { BudgetChoice, Coordinates, NoveltyChoice, QueueChoice, Shop, TravelMode } from "@/lib/types";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5170 };

type RouteState = { loading: boolean; error: string | null; source: "valhalla" | "ors" | "cache" | "demo" | null; minutes: Record<string, number> };

export function RecommendationWizard() {
  const [selected, setSelected] = useState<Coordinates | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState<string>("台北車站");
  const [center, setCenter] = useState<Coordinates>(TAIPEI_CENTER);
  const [step, setStep] = useState(0);
  const [travelMode, setTravelMode] = useState<TravelMode>("mrt");
  const [travelMinutes, setTravelMinutes] = useState(20);
  const [budget, setBudget] = useState<BudgetChoice>("cheap");
  const [queue, setQueue] = useState<QueueChoice>("under30");
  const [novelty, setNovelty] = useState<NoveltyChoice>("new");
  const [route, setRoute] = useState<RouteState>({ loading: false, error: null, source: null, minutes: {} });
  const [candidateShops, setCandidateShops] = useState<Shop[]>([]);
  const [currentSwipeIndex, setCurrentSwipeIndex] = useState(0);
  const [activePreviewShop, setActivePreviewShop] = useState<Shop | null>(null);

  const eatenIds = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("gyomen:last-location");
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as Coordinates;
        setCenter(parsed);
        setSelected(parsed);
      } catch {
        window.localStorage.removeItem("gyomen:last-location");
      }
    }, 0);

    return () => window.clearTimeout(restoreTimer);
  }, []);

  const handleUseGPS = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const current = { lat: coords.latitude, lng: coords.longitude };
      setCenter(current);
      setSelected(current);
      setSelectedLocationName("GPS 目前定位");
      setStep(1);
    });
  }, []);

  const handleSelectLocation = useCallback((coords: Coordinates, name: string) => {
    setSelected(coords);
    setCenter(coords);
    setSelectedLocationName(name);
    setStep(1);
    setCandidateShops([]);
    window.localStorage.setItem("gyomen:last-location", JSON.stringify(coords));
  }, []);

  const selectPointFromMap = useCallback((point: Coordinates) => {
    setSelected(point);
    setCenter(point);
    setSelectedLocationName("地圖自訂點位");
    setStep(1);
    setCandidateShops([]);
    window.localStorage.setItem("gyomen:last-location", JSON.stringify(point));
  }, []);

  // Real-time matching shops computation for map marker highlighting
  const matchingShopIds = useMemo(() => {
    if (step === 0) return new Set(shops.map((s) => s.id));
    const preferences = { travelMode, travelMinutes, walkMinutes: travelMinutes, budget, queue, novelty, eatenIds };
    const effectiveMinutes = Object.keys(route.minutes).length > 0
      ? route.minutes
      : Object.fromEntries(shops.map((s) => [s.id, 10]));

    const ranked = rankShops(shops, effectiveMinutes, preferences);
    return new Set(ranked.map((item) => item.shop.id));
  }, [step, travelMode, travelMinutes, budget, queue, novelty, eatenIds, route.minutes]);

  async function calculate() {
    if (!selected) return;
    setRoute({ loading: true, error: null, source: null, minutes: {} });
    setCandidateShops([]);
    setCurrentSwipeIndex(0);

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

      const preferences = { travelMode, travelMinutes, walkMinutes: travelMinutes, budget, queue, novelty, eatenIds };
      const ranked = rankShops(shops, minutes, preferences);
      const matchedList = ranked.map((item) => item.shop);
      setCandidateShops(matchedList);

      if (matchedList.length > 0) {
        setCenter({ lat: matchedList[0].lat, lng: matchedList[0].lng });
      }
      setStep(6);
    } catch (error) {
      setRoute({
        loading: false,
        error: error instanceof Error ? error.message : "路線服務暫時無法使用",
        source: null,
        minutes: {},
      });
    }
  }

  const handleSwipeIndexChange = useCallback((newIndex: number) => {
    setCurrentSwipeIndex(newIndex);
    if (candidateShops[newIndex]) {
      setCenter({ lat: candidateShops[newIndex].lat, lng: candidateShops[newIndex].lng });
    }
  }, [candidateShops]);

  const selectedShopId = candidateShops[currentSwipeIndex]?.id;

  return (
    <section className="wizard-grid">
      <div className="map-column">
        <MapView
          center={center}
          selected={selected}
          shops={shops}
          matchingShopIds={matchingShopIds}
          selectedShopId={selectedShopId}
          onSelect={selectPointFromMap}
          onShopSelect={(shop) => setActivePreviewShop(shop)}
          height={540}
        />
        <div className="map-caption">
          <span>{selected ? `📍 中心點：${selectedLocationName}` : "👉 請輸入地點或點擊地圖"}</span>
          <span>符合條件店家：{matchingShopIds.size} 間</span>
        </div>
      </div>

      <div className="wizard-panel paper-card">
        {step === 0 && (
          <Step title="輸入預計地點或選取位置" kicker="STEP 01">
            <p>可直接輸入捷運站、地標名稱，或點選下方的熱門地標作為搜尋中心。</p>
            <LocationSearch
              onSelectLocation={handleSelectLocation}
              onUseGPS={handleUseGPS}
              currentSelectedName={selectedLocationName}
            />
            {selected && (
              <button
                className="button button-primary full-btn"
                style={{ marginTop: "16px" }}
                onClick={() => setStep(1)}
              >
                確認選取「{selectedLocationName}」，下一步 →
              </button>
            )}
          </Step>
        )}

        {step === 1 && (
          <Step title="偏好的交通方式？" kicker="STEP 02">
            <p>預設以「{selectedLocationName}」為中心計算周邊搭乘與步行路線：</p>
            <ChoiceGroup
              values={["mrt", "walk", "any"] as TravelMode[]}
              selected={travelMode}
              onSelect={(v) => {
                setTravelMode(v);
                setStep(2);
              }}
              format={(v) =>
                v === "mrt"
                  ? "🚇 捷運 ＋ 步行 (推薦台北最實用)"
                  : v === "walk"
                  ? "🚶 全程散步 (純步行)"
                  : "🛵 騎車 / 不限交通工具"
              }
            />
          </Step>
        )}

        {step === 2 && (
          <Step title="預估單程時間上限？" kicker="STEP 03">
            <ChoiceGroup
              values={[10, 15, 20, 30]}
              selected={travelMinutes}
              onSelect={(v) => {
                setTravelMinutes(v);
                setStep(3);
              }}
              format={(v) => `${v} 分鐘內可達`}
            />
          </Step>
        )}

        {step === 3 && (
          <Step title="今天的預算上限？" kicker="STEP 04">
            <ChoiceGroup
              values={["cheap", "standard", "unlimited"] as BudgetChoice[]}
              selected={budget}
              onSelect={(v) => {
                setBudget(v);
                setStep(4);
              }}
              format={(v) => (v === "cheap" ? "平價 · ≤ NT$250" : v === "standard" ? "一般 · ≤ NT$350" : "不限預算")}
            />
          </Step>
        )}

        {step === 4 && (
          <Step title="最多願意排隊多久？" kicker="STEP 05">
            <ChoiceGroup
              values={["none", "under30", "unlimited"] as QueueChoice[]}
              selected={queue}
              onSelect={(v) => {
                setQueue(v);
                setStep(5);
              }}
              format={(v) => (v === "none" ? "不用排隊" : v === "under30" ? "30 分鐘內" : "不限排隊時間")}
            />
          </Step>
        )}

        {step === 5 && (
          <Step title="今天想嘗試新店家嗎？" kicker="STEP 06">
            <ChoiceGroup
              values={["new", "repeat"] as NoveltyChoice[]}
              selected={novelty}
              onSelect={setNovelty}
              format={(v) => (v === "new" ? "想吃沒吃過的" : "吃過也可以")}
            />
            <button className="button button-primary full" onClick={calculate} disabled={route.loading}>
              {route.loading ? "正在計算路線與交通時間…" : `替我選一間 (符合：${matchingShopIds.size}間)`}
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

        {step === 6 && (
          <RamenSwipeDeck
            shops={candidateShops}
            routeMinutes={route.minutes}
            currentIndex={currentSwipeIndex}
            onIndexChange={handleSwipeIndexChange}
            onResetFilters={() => setStep(0)}
            locationName={selectedLocationName}
          />
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
