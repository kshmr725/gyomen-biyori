"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapView } from "@/components/map-view";
import { LocationSearch } from "@/components/location-search";
import { RamenSwipeDeck } from "@/components/ramen-swipe-deck";
import { shops } from "@/lib/seed";
import { rankShops } from "@/lib/recommendation";
import type { BudgetChoice, Coordinates, NoveltyChoice, QueueChoice, Shop, TravelMode } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5170 };

type RouteState = {
  loading: boolean;
  error: string | null;
  source: "valhalla" | "ors" | "cache" | "demo" | null;
  minutes: Record<string, number>;
};

export function RecommendationWizard() {
  const { t, lang } = useLanguage();
  const [selected, setSelected] = useState<Coordinates | null>(null);
  const [selectedLocationName, setSelectedLocationName] = useState("台北車站");
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
  const resultRef = useRef<HTMLDivElement | null>(null);
  const eatenIds = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    const saved = window.localStorage.getItem("gyomen:last-location");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Coordinates;
      setCenter(parsed);
      setSelected(parsed);
    } catch {
      window.localStorage.removeItem("gyomen:last-location");
    }
  }, []);

  const advanceAfterLocation = useCallback((coords: Coordinates, name: string) => {
    setCenter(coords);
    setSelected(coords);
    setSelectedLocationName(name);
    window.localStorage.setItem("gyomen:last-location", JSON.stringify(coords));
    setStep(1);
  }, []);

  const handleUseGPS = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      advanceAfterLocation(
        { lat: coords.latitude, lng: coords.longitude },
        lang === "en" ? "GPS Current Location" : "GPS 目前定位",
      );
    });
  }, [advanceAfterLocation, lang]);

  const calculate = useCallback(async () => {
    if (!selected) return;
    setRoute({ loading: true, error: null, source: null, minutes: {} });
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
      if (!response.ok) throw new Error(payload.message ?? "路線服務暫時無法使用");

      const minutes = Object.fromEntries(
        payload.durations.map((item: { id: string; minutes: number }) => [item.id, item.minutes]),
      );
      setRoute({ loading: false, error: null, source: payload.source, minutes });

      const rankedResults = rankShops(shops, minutes, {
        travelMode,
        travelMinutes,
        budget,
        queue,
        novelty,
        eatenIds,
      });
      const topShops = rankedResults.slice(0, 3).map((result) => result.shop);
      setCandidateShops(topShops);
      setCurrentSwipeIndex(0);
      setActivePreviewShop(topShops[0] ?? null);
      setStep(6);
      window.setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    } catch (error: unknown) {
      setRoute({
        loading: false,
        error: error instanceof Error ? error.message : "估算路線時發生錯誤",
        source: null,
        minutes: {},
      });
    }
  }, [budget, eatenIds, novelty, queue, selected, travelMinutes, travelMode]);

  const matchingShopIds = useMemo(() => {
    const ranked = rankShops(shops, route.minutes, {
      travelMode,
      travelMinutes,
      budget,
      queue,
      novelty,
      eatenIds,
    });
    return new Set(ranked.map((item) => item.shop.id));
  }, [budget, eatenIds, novelty, queue, route.minutes, travelMinutes, travelMode]);

  return (
    <div className={`wizard-shell ux-v3-shell ${step === 6 ? "has-results" : "is-filtering"}`}>
      <div className="wizard-panel paper-card ux-v3-panel">
        <div className="flow-progress" aria-label={lang === "en" ? "Recommendation progress" : "推薦流程進度"}>
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <span key={index} className={index <= Math.min(step, 5) ? "active" : ""} />
          ))}
        </div>

        {step === 0 && (
          <Step title={lang === "en" ? "Where are you starting from?" : "你現在從哪裡出發？"} kicker="STEP 01">
            <p>{lang === "en" ? "Search an MRT station or landmark. Selecting a result continues automatically." : "搜尋捷運站或地標；選取後會自動進入篩選，不需要再確認一次。"}</p>
            <LocationSearch
              onSelectLocation={advanceAfterLocation}
              onUseGPS={handleUseGPS}
              currentSelectedName={selectedLocationName}
            />
          </Step>
        )}

        {step === 1 && (
          <Step title={lang === "en" ? "How do you want to travel?" : "你想怎麼前往？"} kicker="STEP 02">
            <SelectionSummary label={lang === "en" ? "Starting point" : "出發地點"} value={selectedLocationName} onEdit={() => setStep(0)} />
            <ChoiceGroup values={["mrt", "walk", "any"] as TravelMode[]} selected={travelMode} onSelect={(value) => { setTravelMode(value); setStep(2); }} format={(value) => value === "mrt" ? t.modeMrt : value === "walk" ? t.modeWalk : t.modeAny} />
          </Step>
        )}

        {step === 2 && (
          <Step title={lang === "en" ? "Maximum one-way time?" : "單程最多願意花多久？"} kicker="STEP 03">
            <ChoiceGroup values={[10, 15, 20, 30]} selected={travelMinutes} onSelect={(value) => { setTravelMinutes(value); setStep(3); }} format={(value) => lang === "en" ? `Within ${value} mins` : `${value} 分鐘內`} />
          </Step>
        )}

        {step === 3 && (
          <Step title={lang === "en" ? "What is today’s budget?" : "今天一碗的預算？"} kicker="STEP 04">
            <ChoiceGroup values={["cheap", "standard", "unlimited"] as BudgetChoice[]} selected={budget} onSelect={(value) => { setBudget(value); setStep(4); }} format={(value) => value === "cheap" ? t.budgetCheap : value === "standard" ? t.budgetStandard : t.budgetUnlimited} />
          </Step>
        )}

        {step === 4 && (
          <Step title={lang === "en" ? "How long will you queue?" : "最多願意排隊多久？"} kicker="STEP 05">
            <ChoiceGroup values={["none", "under30", "unlimited"] as QueueChoice[]} selected={queue} onSelect={(value) => { setQueue(value); setStep(5); }} format={(value) => value === "none" ? t.queueNone : value === "under30" ? t.queueUnder30 : t.queueUnlimited} />
          </Step>
        )}

        {step === 5 && (
          <Step title={lang === "en" ? "Try somewhere new?" : "今天想試新店嗎？"} kicker="STEP 06">
            <ChoiceGroup values={["new", "repeat"] as NoveltyChoice[]} selected={novelty} onSelect={setNovelty} format={(value) => value === "new" ? t.noveltyNew : t.noveltyRepeat} />
            <button className="button button-primary full ux-v3-submit" onClick={calculate} disabled={route.loading || !selected}>
              {route.loading ? (lang === "en" ? "Finding your bowl…" : "正在幫你找這一碗…") : t.btnPickOne}
            </button>
            {route.error && <p className="search-error">{route.error}</p>}
          </Step>
        )}

        {step === 6 && candidateShops.length > 0 && (
          <div className="recommendation-result" ref={resultRef}>
            <div className="deck-header">
              <span className="recommend-badge">{t.topRecommendationBadge}</span>
              <h3>{candidateShops[currentSwipeIndex]?.name}</h3>
            </div>
            <RamenSwipeDeck
              shops={candidateShops}
              routeMinutes={route.minutes}
              currentIndex={currentSwipeIndex}
              onIndexChange={(index) => {
                setCurrentSwipeIndex(index);
                setActivePreviewShop(candidateShops[index] ?? null);
              }}
              onResetFilters={() => setStep(0)}
              locationName={selectedLocationName}
            />
            <div className="wizard-actions-row">
              <button className="button button-ghost" onClick={() => setStep(0)}>{t.btnStartOver}</button>
              <Link className="button button-primary" href={`/shops/${candidateShops[currentSwipeIndex]?.slug}`}>{t.viewMenuBtn}</Link>
            </div>
          </div>
        )}
      </div>

      {step === 6 && (
        <div className="map-column ux-v3-map-column">
          <div className="map-heading">
            <div>
              <span className="step-kicker">MAP VIEW</span>
              <h2>{lang === "en" ? "Your nearby ramen map" : "符合條件的附近拉麵"}</h2>
            </div>
            <span className="map-count">{matchingShopIds.size} {lang === "en" ? "shops" : "間"}</span>
          </div>
          <MapView
            center={center}
            selected={selected}
            shops={shops}
            matchingShopIds={matchingShopIds}
            selectedShopId={activePreviewShop?.id}
            onShopSelect={setActivePreviewShop}
            height={540}
          />
          <div className="map-caption clean-map-caption">
            <span>{selectedLocationName}</span>
            <span>{lang === "en" ? "Tap a marker for details" : "點選標記查看店家"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ title, kicker, children }: { title: string; kicker: string; children: React.ReactNode }) {
  return <div className="step-box ux-v3-step"><span className="step-kicker">{kicker}</span><h2>{title}</h2>{children}</div>;
}

function SelectionSummary({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return <div className="selection-summary"><div><span>{label}</span><strong>{value}</strong></div><button onClick={onEdit}>修改</button></div>;
}

function ChoiceGroup<T extends string | number>({ values, selected, onSelect, format }: { values: T[]; selected: T; onSelect: (value: T) => void; format: (value: T) => string }) {
  return <div className="choice-buttons ux-v3-choices">{values.map((value) => <button key={String(value)} className={`choice-btn ${selected === value ? "active" : ""}`} onClick={() => onSelect(value)}>{format(value)}</button>)}</div>;
}
