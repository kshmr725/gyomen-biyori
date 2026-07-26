"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/map-view";
import { ShopCard } from "@/components/shop-card";
import { LocationSearch } from "@/components/location-search";
import { shops } from "@/lib/seed";
import { adminScore, queueRank } from "@/lib/recommendation";
import { queueLevelAt } from "@/lib/hours";
import type { Coordinates, Shop } from "@/lib/types";
import { useLanguage } from "@/lib/i18n";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5170 };
type Sort = "walk" | "score" | "queue";
type MobileTab = "list" | "map";

export function ExploreView() {
  const { t, lang } = useLanguage();
  const [center, setCenter] = useState<Coordinates>(TAIPEI_CENTER);
  const [selectedLocationName, setSelectedLocationName] = useState<string>("");
  const [hasConfirmedLocation, setHasConfirmedLocation] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [sort, setSort] = useState<Sort>("walk");
  const [minutes, setMinutes] = useState<Record<string, number>>({});
  const [routeStatus, setRouteStatus] = useState("");
  const [mobileTab, setMobileTab] = useState<MobileTab>("list");
  const [gpsStatus, setGpsStatus] = useState<string | null>(null);

  const selectCenter = useCallback((point: Coordinates) => {
    setRouteStatus(lang === "en" ? "Updating walking routes from the adjusted map point…" : "正在依地圖微調位置更新步行路線…");
    setCenter(point);
    setSelectedLocationName(lang === "en" ? "Adjusted map point" : "地圖微調位置");
    setSelectedShop(null);
  }, [lang]);

  const handleUseGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsStatus(lang === "en" ? "Location is not supported by this browser." : "此瀏覽器不支援定位，請改用搜尋或地標。");
      return;
    }

    setGpsStatus(lang === "en" ? "Locating…" : "正在取得目前位置…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCenter({ lat: coords.latitude, lng: coords.longitude });
        setSelectedLocationName(lang === "en" ? "Current location" : "目前位置");
        setSelectedShop(null);
        setHasConfirmedLocation(true);
        setMobileTab("list");
        setRouteStatus(lang === "en" ? "Calculating walking routes from your current location…" : "正在依目前位置計算步行路線…");
        setGpsStatus(null);
      },
      () => {
        setGpsStatus(lang === "en" ? "Location permission was denied. Search a station or landmark instead." : "無法取得定位權限，請改用捷運站、地址或地標搜尋。");
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 }
    );
  }, [lang]);

  const handleSelectLocation = useCallback((coords: Coordinates, name: string) => {
    setRouteStatus(lang === "en" ? `Calculating walking routes from ${name}…` : `正在計算以「${name}」為中心的步行路線…`);
    setCenter(coords);
    setSelectedLocationName(name);
    setSelectedShop(null);
    setHasConfirmedLocation(true);
    setMobileTab("list");
    setGpsStatus(null);
  }, [lang]);

  useEffect(() => {
    if (!hasConfirmedLocation) return;

    const controller = new AbortController();
    fetch("/api/walking-times", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: center, destinations: shops.map(({ id, lat, lng }) => ({ id, lat, lng })) }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message ?? "步行路線暫時無法使用");
        const nextMinutes = Object.fromEntries(
          payload.durations.map((item: { id: string; minutes: number }) => [item.id, item.minutes])
        );
        setMinutes(nextMinutes);
        setRouteStatus(
          payload.source === "cache"
            ? (lang === "en" ? "Using a trusted route cache from the last 24 hours" : "使用 24 小時內可信路線快取")
            : (lang === "en" ? `Walking routes from ${selectedLocationName}` : `以「${selectedLocationName}」為中心的步行路線`)
        );
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMinutes({});
        setRouteStatus(error instanceof Error ? error.message : "步行路線暫時無法使用");
      });

    return () => controller.abort();
  }, [center, hasConfirmedLocation, lang, selectedLocationName]);

  const sorted = useMemo(() => {
    return [...shops].sort((a, b) => {
      if (sort === "walk") return (minutes[a.id] ?? Number.MAX_SAFE_INTEGER) - (minutes[b.id] ?? Number.MAX_SAFE_INTEGER);
      if (sort === "queue") return queueRank(queueLevelAt(a)) - queueRank(queueLevelAt(b));
      return adminScore(b.adminScores) - adminScore(a.adminScores);
    });
  }, [minutes, sort]);

  const handleShopSelectFromMap = useCallback((shop: Shop) => {
    setSelectedShop(shop);
    const isMobileMap = window.matchMedia("(max-width: 900px)").matches;
    if (isMobileMap) setMobileTab("list");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scrollToCard = () => {
      const cardEl = document.getElementById(`shop-card-${shop.id}`);
      if (!cardEl) return;
      cardEl.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: isMobileMap ? "start" : "center",
      });
    };

    window.requestAnimationFrame(() => window.requestAnimationFrame(scrollToCard));
  }, []);

  return (
    <div className="explore-container">
      <div className={`explore-search-bar paper-card ${hasConfirmedLocation ? "is-compact" : "is-onboarding"}`}>
        <h3>{hasConfirmedLocation ? (lang === "en" ? "Change starting point" : "更改出發地點") : t.searchHeading}</h3>
        <LocationSearch
          onSelectLocation={handleSelectLocation}
          onUseGPS={handleUseGPS}
          currentSelectedName={selectedLocationName}
        />
        {gpsStatus && <p className="search-status" aria-live="polite">{gpsStatus}</p>}
      </div>

      {!hasConfirmedLocation ? (
        <section className="map-onboarding-placeholder" aria-label={lang === "en" ? "Choose a starting point first" : "請先選擇出發地點"}>
          <div className="map-onboarding-illustration" aria-hidden="true">
            <span>🚇</span><span>📍</span><span>🍜</span>
          </div>
          <div>
            <p className="eyebrow">STEP 02</p>
            <h2>{lang === "en" ? "The ramen map appears after location confirmation" : "確認地點後，再顯示附近拉麵地圖"}</h2>
            <p>{lang === "en" ? "This keeps the map meaningful, reduces initial loading and gives every route a clear reference point." : "這樣地圖會有明確的參照中心，也能避免一進頁面就載入大量圖磚與路線資料。"}</p>
          </div>
        </section>
      ) : (
        <>
          <div className="confirmed-location-bar">
            <div>
              <span>{lang === "en" ? "Starting point" : "目前出發點"}</span>
              <strong>📍 {selectedLocationName}</strong>
            </div>
            <small>{lang === "en" ? "You may fine-tune the point directly on the map." : "可在地圖上點擊微調實際位置。"}</small>
          </div>

          <div className="mobile-view-toggle">
            <button className={`mobile-tab-btn ${mobileTab === "list" ? "active" : ""}`} onClick={() => setMobileTab("list")}>
              {t.mobileTabList} ({sorted.length})
            </button>
            <button className={`mobile-tab-btn ${mobileTab === "map" ? "active" : ""}`} onClick={() => setMobileTab("map")}>
              {t.mobileTabMap}
            </button>
          </div>

          <section className="explore-grid">
            <div className={`map-wrapper ${mobileTab === "map" ? "show-mobile" : "hide-mobile"}`}>
              <MapView
                center={center}
                selected={center}
                shops={shops}
                selectedShopId={selectedShop?.id}
                onSelect={selectCenter}
                onShopSelect={handleShopSelectFromMap}
                height={680}
              />
            </div>

            <div className={`shop-list ${mobileTab === "list" ? "show-mobile" : "hide-mobile"}`}>
              <div className="list-toolbar">
                <div>
                  <strong>{t.shopsCount.replace("{count}", String(shops.length)).replace("{center}", selectedLocationName)}</strong>
                  <div className="microcopy">{routeStatus}</div>
                </div>
                <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
                  <option value="walk">{t.sortWalk}</option>
                  <option value="score">{t.sortScore}</option>
                  <option value="queue">{t.sortQueue}</option>
                </select>
              </div>
              {selectedShop && (
                <div className="selected-banner">
                  {t.mapSelectedBanner} <strong>{selectedShop.name}</strong>
                </div>
              )}
              {sorted.map((shop) => (
                <div key={shop.id} id={`shop-card-${shop.id}`} className="shop-card-slot">
                  <ShopCard shop={shop} walkingMinutes={minutes[shop.id] ?? 0} isSelected={selectedShop?.id === shop.id} />
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
