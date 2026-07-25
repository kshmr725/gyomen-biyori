"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapView } from "@/components/map-view";
import { LocationSearch } from "@/components/location-search";
import { RamenSwipeDeck } from "@/components/ramen-swipe-deck";
import { shops } from "@/lib/seed";
import { rankShops } from "@/lib/recommendation";
import type { BudgetChoice, Coordinates, NoveltyChoice, QueueChoice, Shop, TravelMode } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5170 };

type RouteState = { loading: boolean; error: string | null; source: "valhalla" | "ors" | "cache" | "demo" | null; minutes: Record<string, number> };

export function RecommendationWizard() {
  const { t, lang } = useLanguage();
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
      const point = { lat: coords.latitude, lng: coords.longitude };
      setCenter(point);
      setSelected(point);
      setSelectedLocationName(lang === "en" ? "GPS Current Location" : "GPS 目前定位");
    });
  }, [lang]);

  const handleSelectLocation = useCallback((coords: Coordinates, name: string) => {
    setCenter(coords);
    setSelected(coords);
    setSelectedLocationName(name);
  }, []);

  const calculate = useCallback(async () => {
    setRoute({ loading: true, error: null, source: null, minutes: {} });
    try {
      const response = await fetch("/api/walking-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: selected ?? center,
          destinations: shops.map(({ id, lat, lng }) => ({ id, lat, lng })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message ?? (lang === "en" ? "Service unavailable" : "路線服務暫時無法使用"));
      }

      const map = Object.fromEntries(payload.durations.map((item: { id: string; minutes: number }) => [item.id, item.minutes]));
      setRoute({ loading: false, error: null, source: payload.source, minutes: map });

      const rankedResults = rankShops(shops, map, {
        travelMode,
        travelMinutes,
        budget,
        queue,
        novelty,
        eatenIds,
      });

      const topShops = rankedResults.slice(0, 3).map((r) => r.shop);
      setCandidateShops(topShops);
      setCurrentSwipeIndex(0);
      setActivePreviewShop(topShops[0] ?? null);
      setStep(6);
    } catch (error: unknown) {
      setRoute({
        loading: false,
        error: error instanceof Error ? error.message : (lang === "en" ? "Failed to calculate routes" : "估算路線時發生錯誤"),
        source: null,
        minutes: {},
      });
    }
  }, [budget, center, eatenIds, lang, novelty, queue, selected, travelMinutes, travelMode]);

  const matchingShopIds = useMemo(() => {
    const list = rankShops(shops, route.minutes, {
      travelMode,
      travelMinutes,
      budget,
      queue,
      novelty,
      eatenIds,
    });
    return new Set(list.map((item) => item.shop.id));
  }, [budget, eatenIds, novelty, queue, route.minutes, travelMinutes, travelMode]);

  return (
    <div className="wizard-shell">
      <div className="wizard-panel paper-card">
        {step === 0 && (
          <Step title={lang === "en" ? "1. Select Location" : "1. 選擇所在地點"} kicker="STEP 01">
            <p>{lang === "en" ? "Enter MRT station, landmark, or select popular preset below:" : "可直接輸入捷運站、地標名稱，或點選下方的熱門地標作為搜尋中心。"}</p>
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
                {lang === "en" ? `Confirm "${selectedLocationName}" → Next` : `確認選取「${selectedLocationName}」，下一步 →`}
              </button>
            )}
          </Step>
        )}

        {step === 1 && (
          <Step title={lang === "en" ? "2. Preferred Transit Mode?" : "2. 偏好的交通方式？"} kicker="STEP 02">
            <p>{lang === "en" ? `Calculating routes centered at "${selectedLocationName}":` : `預設以「${selectedLocationName}」為中心計算周邊搭乘與步行路線：`}</p>
            <ChoiceGroup
              values={["mrt", "walk", "any"] as TravelMode[]}
              selected={travelMode}
              onSelect={(v) => {
                setTravelMode(v);
                setStep(2);
              }}
              format={(v) =>
                v === "mrt" ? t.modeMrt : v === "walk" ? t.modeWalk : t.modeAny
              }
            />
          </Step>
        )}

        {step === 2 && (
          <Step title={lang === "en" ? "3. Max Travel Time?" : "3. 預估單程時間上限？"} kicker="STEP 03">
            <ChoiceGroup
              values={[10, 15, 20, 30]}
              selected={travelMinutes}
              onSelect={(v) => {
                setTravelMinutes(v);
                setStep(3);
              }}
              format={(v) => lang === "en" ? `Within ${v} mins` : `${v} 分鐘內可達`}
            />
          </Step>
        )}

        {step === 3 && (
          <Step title={lang === "en" ? "4. Budget Limit?" : "4. 今天的預算上限？"} kicker="STEP 04">
            <ChoiceGroup
              values={["cheap", "standard", "unlimited"] as BudgetChoice[]}
              selected={budget}
              onSelect={(v) => {
                setBudget(v);
                setStep(4);
              }}
              format={(v) => (v === "cheap" ? t.budgetCheap : v === "standard" ? t.budgetStandard : t.budgetUnlimited)}
            />
          </Step>
        )}

        {step === 4 && (
          <Step title={lang === "en" ? "5. Max Queue Waiting Time?" : "5. 最多願意排隊多久？"} kicker="STEP 05">
            <ChoiceGroup
              values={["none", "under30", "unlimited"] as QueueChoice[]}
              selected={queue}
              onSelect={(v) => {
                setQueue(v);
                setStep(5);
              }}
              format={(v) => (v === "none" ? t.queueNone : v === "under30" ? t.queueUnder30 : t.queueUnlimited)}
            />
          </Step>
        )}

        {step === 5 && (
          <Step title={lang === "en" ? "6. Try New Shops First?" : "6. 今天想嘗試新店家嗎？"} kicker="STEP 06">
            <ChoiceGroup
              values={["new", "repeat"] as NoveltyChoice[]}
              selected={novelty}
              onSelect={setNovelty}
              format={(v) => (v === "new" ? t.noveltyNew : t.noveltyRepeat)}
            />
            <button className="button button-primary full" onClick={calculate} disabled={route.loading}>
              {route.loading ? (lang === "en" ? "Calculating travel routes..." : "正在計算路線與交通時間…") : `${t.btnPickOne} (${lang === "en" ? "Matching: " : "符合："}${matchingShopIds.size})`}
            </button>
          </Step>
        )}

        {step === 6 && candidateShops.length > 0 && (
          <div className="recommendation-result">
            <div className="deck-header">
              <span className="recommend-badge">{t.topRecommendationBadge}</span>
              <h3>{candidateShops[currentSwipeIndex]?.name}</h3>
            </div>
            <RamenSwipeDeck
              shops={candidateShops}
              routeMinutes={route.minutes}
              currentIndex={currentSwipeIndex}
              onIndexChange={(newIndex: number) => {
                setCurrentSwipeIndex(newIndex);
                setActivePreviewShop(candidateShops[newIndex] ?? null);
              }}
              onResetFilters={() => setStep(0)}
              locationName={selectedLocationName}
            />
            <div className="wizard-actions-row">
              <button className="button button-ghost" onClick={() => setStep(0)}>
                {t.btnStartOver}
              </button>
              <Link className="button button-primary" href={`/shops/${candidateShops[currentSwipeIndex]?.slug}`}>
                {t.viewMenuBtn}
              </Link>
            </div>
          </div>
        )}
      </div>

      <div className="map-column">
        <MapView
          center={center}
          selected={selected}
          shops={shops}
          selectedShopId={activePreviewShop?.id}
          onSelect={(coords) => handleSelectLocation(coords, lang === "en" ? "Map Selected Location" : "地圖點選位置")}
          onShopSelect={(shop) => setActivePreviewShop(shop)}
          height={540}
        />
        <div className="map-caption">
          <span>{selected ? `📍 ${lang === "en" ? "Center: " : "中心點："}${selectedLocationName}` : (lang === "en" ? "👉 Select location or click map" : "👉 請輸入地點或點擊地圖")}</span>
          <span>{lang === "en" ? `Matching: ${matchingShopIds.size} Shops` : `符合條件店家：${matchingShopIds.size} 間`}</span>
        </div>
      </div>
    </div>
  );
}

function Step({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return (
    <div className="step-box">
      <span className="step-kicker">{kicker}</span>
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
    <div className="choice-buttons">
      {values.map((v) => (
        <button
          key={String(v)}
          className={`choice-btn ${selected === v ? "active" : ""}`}
          onClick={() => onSelect(v)}
        >
          {format(v)}
        </button>
      ))}
    </div>
  );
}
