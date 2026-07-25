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
  const { t } = useLanguage();
  const [center, setCenter] = useState<Coordinates>(TAIPEI_CENTER);
  const [selectedLocationName, setSelectedLocationName] = useState<string>("台北車站");
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [sort, setSort] = useState<Sort>("walk");
  const [minutes, setMinutes] = useState<Record<string, number>>({});
  const [routeStatus, setRouteStatus] = useState("正在計算預計地點步行時間…");
  const [mobileTab, setMobileTab] = useState<MobileTab>("list");

  const selectCenter = useCallback((point: Coordinates) => {
    setRouteStatus("正在計算地點步行路線…");
    setCenter(point);
    setSelectedLocationName("地圖點選位置");
  }, []);

  const handleUseGPS = useCallback(() => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setRouteStatus("正在計算 GPS 目前定位步行路線…");
      setCenter({ lat: coords.latitude, lng: coords.longitude });
      setSelectedLocationName("GPS 目前定位");
    });
  }, []);

  const handleSelectLocation = useCallback((coords: Coordinates, name: string) => {
    setRouteStatus(`正在計算以「${name}」為中心的路線…`);
    setCenter(coords);
    setSelectedLocationName(name);
  }, []);

  useEffect(() => {
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
        setMinutes(Object.fromEntries(payload.durations.map((item: { id: string; minutes: number }) => [item.id, item.minutes])));
        setRouteStatus(payload.source === "cache" ? "使用 24 小時內可信快取" : `使用以「${selectedLocationName}」為中心的路線`);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setMinutes({});
        setRouteStatus(error instanceof Error ? error.message : "步行路線暫時無法使用");
      });
    return () => controller.abort();
  }, [center, selectedLocationName]);

  const sorted = useMemo(() => {
    return [...shops].sort((a, b) => {
      if (sort === "walk") return (minutes[a.id] ?? Number.MAX_SAFE_INTEGER) - (minutes[b.id] ?? Number.MAX_SAFE_INTEGER);
      if (sort === "queue") return queueRank(queueLevelAt(a)) - queueRank(queueLevelAt(b));
      return adminScore(b.adminScores) - adminScore(a.adminScores);
    });
  }, [minutes, sort]);

  const handleShopSelectFromMap = useCallback((shop: Shop) => {
    setSelectedShop(shop);
    setCenter({ lat: shop.lat, lng: shop.lng });
    setMobileTab("list");

    // Auto-scroll shop card to center of viewport smoothly!
    window.setTimeout(() => {
      const cardEl = document.getElementById(`shop-card-${shop.id}`);
      if (cardEl) {
        cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 60);
  }, []);

  return (
    <div className="explore-container">
      <div className="explore-search-bar paper-card">
        <h3>{t.searchHeading}</h3>
        <LocationSearch
          onSelectLocation={handleSelectLocation}
          onUseGPS={handleUseGPS}
          currentSelectedName={selectedLocationName}
        />
      </div>

      {/* Mobile Mode Switcher Segment (🗺️ 地圖 / 📋 店家清單) */}
      <div className="mobile-view-toggle">
        <button
          className={`mobile-tab-btn ${mobileTab === "list" ? "active" : ""}`}
          onClick={() => setMobileTab("list")}
        >
          {t.mobileTabList} ({sorted.length})
        </button>
        <button
          className={`mobile-tab-btn ${mobileTab === "map" ? "active" : ""}`}
          onClick={() => setMobileTab("map")}
        >
          {t.mobileTabMap}
        </button>
      </div>

      <section className="explore-grid">
        {/* Sticky Map Container on Desktop */}
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

        {/* Natural Unrestricted Shop List Container */}
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
            <div key={shop.id} id={`shop-card-${shop.id}`} style={{ scrollMarginTop: "100px" }}>
              <ShopCard
                shop={shop}
                walkingMinutes={minutes[shop.id] ?? 0}
                isSelected={selectedShop?.id === shop.id}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
