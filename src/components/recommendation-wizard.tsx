"use client";

import { useCallback, useMemo, useRef, useState } from "react";
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

  const [selected, setSelected] = useState<Coordinates | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = window.localStorage.getItem("gyomen:last-location");
    if (!saved) return null;
    try {
      return JSON.parse(saved) as Coordinates;
    } catch {
      return null;
    }
  });

  const [selectedLocationName, setSelectedLocationName] = useState<string>(() => {
    if (selected) {
      return lang === "en" ? "Saved Location" : "上次選取地點";
    }
    return "";
  });

  const [center, setCenter] = useState<Coordinates>(() => selected ?? TAIPEI_CENTER);
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

  const advanceAfterLocation = useCallback((coords: Coordinates, name: string) => {
    setCenter(coords);
    setSelected(coords);
    setSelectedLocationName(name);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("gyomen:last-location", JSON.stringify(coords));
    }
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

  const calculateWithParams = useCallback(
    async (
      originCoords: Coordinates,
      mode: TravelMode,
      timeMins: number,
      budgetChoice: BudgetChoice,
      queueChoice: QueueChoice,
      noveltyChoice: NoveltyChoice,
    ) => {
      setRoute({ loading: true, error: null, source: null, minutes: {} });
      try {
        const response = await fetch("/api/walking-times", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            origin: originCoords,
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
          travelMode: mode,
          travelMinutes: timeMins,
          budget: budgetChoice,
          queue: queueChoice,
          novelty: noveltyChoice,
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
    },
    [eatenIds],
  );

  const calculate = useCallback(() => {
    if (!selected) return;
    calculateWithParams(selected, travelMode, travelMinutes, budget, queue, novelty);
  }, [budget, calculateWithParams, novelty, queue, selected, travelMinutes, travelMode]);

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
        {step < 6 && (
          <div className="progress-header">
            {step > 0 && (
              <button type="button" className="step-back-btn" onClick={() => setStep((s) => s - 1)}>
                ← {lang === "en" ? "Back" : "返回上一題"}
              </button>
            )}
            <span className="step-counter-pill">{step + 1} / 6</span>
          </div>
        )}

        {step === 0 && (
          <Step title={lang === "en" ? "Where are you starting from?" : "你現在從哪裡出發？"}>
            <LocationSearch
              onSelectLocation={advanceAfterLocation}
              onUseGPS={handleUseGPS}
              currentSelectedName={selectedLocationName}
            />
          </Step>
        )}

        {step === 1 && (
          <Step title={lang === "en" ? "How do you want to travel?" : "你想怎麼前往？"}>
            <SelectionSummary
              label={lang === "en" ? "Starting point" : "出發地點"}
              value={selectedLocationName || (lang === "en" ? "Selected Location" : "已選取地點")}
              onEdit={() => setStep(0)}
            />
            <ChoiceGroup
              values={["mrt", "walk", "any"] as TravelMode[]}
              selected={travelMode}
              onSelect={(value) => {
                setTravelMode(value);
                setStep(2);
              }}
              format={(value) => (value === "mrt" ? t.modeMrt : value === "walk" ? t.modeWalk : t.modeAny)}
            />
          </Step>
        )}

        {step === 2 && (
          <Step title={lang === "en" ? "Maximum travel time?" : "單程最多願意花多久？"}>
            <ChoiceGroup
              values={[10, 15, 20, 30]}
              selected={travelMinutes}
              onSelect={(value) => {
                setTravelMinutes(value);
                setStep(3);
              }}
              format={(value) => (lang === "en" ? `Within ${value} mins` : `${value} 分鐘內`)}
            />
          </Step>
        )}

        {step === 3 && (
          <Step title={lang === "en" ? "What is today’s budget?" : "今天一碗的預算？"}>
            <ChoiceGroup
              values={["cheap", "standard", "unlimited"] as BudgetChoice[]}
              selected={budget}
              onSelect={(value) => {
                setBudget(value);
                setStep(4);
              }}
              format={(value) => (value === "cheap" ? t.budgetCheap : value === "standard" ? t.budgetStandard : t.budgetUnlimited)}
            />
          </Step>
        )}

        {step === 4 && (
          <Step title={lang === "en" ? "How long will you queue?" : "最多願意排隊多久？"}>
            <ChoiceGroup
              values={["none", "under30", "unlimited"] as QueueChoice[]}
              selected={queue}
              onSelect={(value) => {
                setQueue(value);
                setStep(5);
              }}
              format={(value) => (value === "none" ? t.queueNone : value === "under30" ? t.queueUnder30 : t.queueUnlimited)}
            />
          </Step>
        )}

        {step === 5 && (
          <Step title={lang === "en" ? "Try somewhere new?" : "今天想試新店嗎？"}>
            <ChoiceGroup
              values={["new", "repeat"] as NoveltyChoice[]}
              selected={novelty}
              onSelect={(value) => {
                setNovelty(value);
                if (selected) {
                  calculateWithParams(selected, travelMode, travelMinutes, budget, queue, value);
                }
              }}
              format={(value) => (value === "new" ? t.noveltyNew : t.noveltyRepeat)}
            />
            <button
              type="button"
              className="button button-primary full ux-v3-submit"
              onClick={calculate}
              disabled={route.loading || !selected}
              style={{ marginTop: "16px" }}
            >
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
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setStep(0)}
              >
                {t.btnStartOver}
              </button>
              <Link className="button button-primary" href={`/shops/${candidateShops[currentSwipeIndex]?.slug}`}>
                {t.viewMenuBtn}
              </Link>
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
            height={360}
          />
          <div className="map-caption clean-map-caption">
            <span>📍 {selectedLocationName}</span>
            <span>{lang === "en" ? "Tap a marker for details" : "點選標記查看店家"}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="step-box ux-v3-step">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

function SelectionSummary({ label, value, onEdit }: { label: string; value: string; onEdit: () => void }) {
  return (
    <div className="selection-summary">
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <button type="button" onClick={onEdit}>修改</button>
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
    <div className="choice-buttons ux-v3-choices">
      {values.map((value) => (
        <button
          key={String(value)}
          type="button"
          className={`choice-btn ${selected === value ? "active" : ""}`}
          onClick={() => onSelect(value)}
        >
          {format(value)}
        </button>
      ))}
    </div>
  );
}
