"use client";

import { useEffect, useRef } from "react";
import type { Coordinates, Shop } from "@/lib/types";

type Props = {
  center: Coordinates;
  selected?: Coordinates | null;
  shops?: Shop[];
  onSelect?: (coordinates: Coordinates) => void;
  onShopSelect?: (shop: Shop) => void;
  height?: number;
};

export function MapView({ center, selected, shops = [], onSelect, onShopSelect, height = 480 }: Props) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);

  useEffect(() => {
    let active = true;
    async function setup() {
      if (!elementRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (!active || !elementRef.current) return;
      const map = L.map(elementRef.current, { zoomControl: false }).setView([center.lat, center.lng], 14);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (event: { latlng: { lat: number; lng: number } }) => onSelect?.({ lat: event.latlng.lat, lng: event.latlng.lng }));
      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
    }
    setup();
    return () => { active = false; mapRef.current?.remove(); mapRef.current = null; };
  }, [center.lat, center.lng, onSelect]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([center.lat, center.lng], mapRef.current.getZoom(), { animate: true });
  }, [center]);

  useEffect(() => {
    async function redraw() {
      if (!mapRef.current || !layerRef.current) return;
      const L = await import("leaflet");
      layerRef.current.clearLayers();
      if (selected) {
        L.circleMarker([selected.lat, selected.lng], { radius: 9, color: "#a23d2b", fillColor: "#f4d7b7", fillOpacity: 1, weight: 3 })
          .bindTooltip("從這裡出發", { direction: "top" }).addTo(layerRef.current);
      }
      for (const shop of shops) {
        const marker = L.circleMarker([shop.lat, shop.lng], { radius: 8, color: "#24372e", fillColor: shop.openNow ? "#f6efe3" : "#b7b1a8", fillOpacity: 1, weight: 2 });
        marker.bindTooltip(`${shop.name}${shop.openNow ? "" : "（未營業）"}`, { direction: "top" });
        marker.on("click", () => onShopSelect?.(shop));
        marker.addTo(layerRef.current);
      }
    }
    redraw();
  }, [selected, shops, onShopSelect]);

  return <div ref={elementRef} className="map-frame" style={{ height }} aria-label="台北拉麵地圖" />;
}
