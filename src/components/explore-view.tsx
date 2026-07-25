"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapView } from "@/components/map-view";
import { ShopCard } from "@/components/shop-card";
import { shops } from "@/lib/seed";
import { adminScore, queueRank } from "@/lib/recommendation";
import { queueLevelAt } from "@/lib/hours";
import type { Coordinates, Shop } from "@/lib/types";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5170 };
type Sort = "walk" | "score" | "queue";

export function ExploreView() {
  const [center, setCenter] = useState<Coordinates>(TAIPEI_CENTER);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);
  const [sort, setSort] = useState<Sort>("walk");
  const [minutes, setMinutes] = useState<Record<string, number>>({});
  const [routeStatus, setRouteStatus] = useState("正在取得實際步行時間…");

  const selectCenter = useCallback((point: Coordinates) => {
    setRouteStatus("正在取得實際步行時間…");
    setCenter(point);
  }, []);

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      setRouteStatus("正在取得實際步行時間…");
      setCenter({ lat: coords.latitude, lng: coords.longitude });
    });
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/walking-times", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origin: center, destinations: shops.map(({ id, lat, lng }) => ({ id, lat, lng })) }),
      signal: controller.signal,
    }).then(async (response) => {
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "步行路線暫時無法使用");
      setMinutes(Object.fromEntries(payload.durations.map((item: { id: string; minutes: number }) => [item.id, item.minutes])));
      setRouteStatus(payload.source === "cache" ? "使用 24 小時內可信快取" : "使用實際步行路線");
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMinutes({});
      setRouteStatus(error instanceof Error ? error.message : "步行路線暫時無法使用");
    });
    return () => controller.abort();
  }, [center]);

  const sorted = useMemo(() => [...shops].sort((a,b) => {
    if (sort === "walk") return (minutes[a.id] ?? Number.MAX_SAFE_INTEGER) - (minutes[b.id] ?? Number.MAX_SAFE_INTEGER);
    if (sort === "queue") return queueRank(queueLevelAt(a)) - queueRank(queueLevelAt(b));
    return adminScore(b.adminScores)-adminScore(a.adminScores);
  }), [minutes, sort]);

  return <section className="explore-grid"><div><MapView center={center} selected={center} shops={shops} onSelect={selectCenter} onShopSelect={setSelectedShop} height={620} /></div><div className="shop-list"><div className="list-toolbar"><div><strong>{shops.length} 間已核對店家</strong><div className="microcopy">{routeStatus}</div></div><select value={sort} onChange={(event) => setSort(event.target.value as Sort)}><option value="walk">步行時間</option><option value="score">綜合分數</option><option value="queue">排隊時間</option></select></div>{selectedShop && <div className="selected-banner">地圖選擇：{selectedShop.name}</div>}{sorted.map((shop) => <ShopCard key={shop.id} shop={shop} walkingMinutes={minutes[shop.id] ?? 0} />)}</div></section>;
}
