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

  return (
    <div className="explore-container">
      <div className="explore-search-bar paper-card" style={{ marginBottom: "16px" }}>
        <h3>🔍 搜尋地點 / 捷運站為中心點</h3>
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
          📋 店家清單 ({sorted.length})
        </button>
        <button
          className={`mobile-tab-btn ${mobileTab === "map" ? "active" : ""}`}
          onClick={() => setMobileTab("map")}
        >
          🗺️ 互動地圖
        </button>
      </div>

      <section className="explore-grid">
        {/* Map Container */}
        <div className={`map-wrapper ${mobileTab === "map" ? "show-mobile" : "hide-mobile"}`}>
          <MapView
            center={center}
            selected={center}
            shops={shops}
            selectedShopId={selectedShop?.id}
            onSelect={selectCenter}
            onShopSelect={(shop) => {
              setSelectedShop(shop);
              setCenter({ lat: shop.lat, lng: shop.lng });
              // Switch to list view on mobile when shop is clicked
              setMobileTab("list");
            }}
            height={440}
          />
        </div>

        {/* Shop List Container */}
        <div className={`shop-list ${mobileTab === "list" ? "show-mobile" : "hide-mobile"}`}>
          <div className="list-toolbar">
            <div>
              <strong>{shops.length} 間店家 (中心點：{selectedLocationName})</strong>
              <div className="microcopy">{routeStatus}</div>
            </div>
            <select value={sort} onChange={(event) => setSort(event.target.value as Sort)}>
              <option value="walk">步行/距離排序</option>
              <option value="score">綜合評分排序</option>
              <option value="queue">排隊時間排序</option>
            </select>
          </div>
          {selectedShop && (
            <div className="selected-banner">
              📍 地圖已選取：<strong>{selectedShop.name}</strong>
            </div>
          )}
          {sorted.map((shop) => (
            <ShopCard key={shop.id} shop={shop} walkingMinutes={minutes[shop.id] ?? 0} />
          ))}
        </div>
      </section>
    </div>
  );
}
