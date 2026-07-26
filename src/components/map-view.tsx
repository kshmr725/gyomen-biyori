"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Coordinates, Shop } from "@/lib/types";

type Props = {
  center: Coordinates;
  selected?: Coordinates | null;
  shops?: Shop[];
  matchingShopIds?: Set<string> | string[];
  selectedShopId?: string | null;
  onSelect?: (coordinates: Coordinates) => void;
  onShopSelect?: (shop: Shop) => void;
  height?: number;
};

export function MapView({
  center,
  selected,
  shops = [],
  matchingShopIds,
  selectedShopId,
  onSelect,
  onShopSelect,
  height = 360,
}: Props) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const markerMapRef = useRef<Map<string, import("leaflet").Marker>>(new Map());
  const onSelectRef = useRef(onSelect);
  const onShopSelectRef = useRef(onShopSelect);
  const initialCenterRef = useRef(center);

  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);
  useEffect(() => { onShopSelectRef.current = onShopSelect; }, [onShopSelect]);

  const matchingSet = useMemo(() => {
    if (!matchingShopIds) return null;
    return matchingShopIds instanceof Set ? matchingShopIds : new Set(matchingShopIds);
  }, [matchingShopIds]);

  useEffect(() => {
    let active = true;
    let resizeObserver: ResizeObserver | null = null;

    async function setup() {
      if (!elementRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (!active || !elementRef.current) return;

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const map = L.map(elementRef.current, {
        zoomControl: false,
        attributionControl: true,
        zoomAnimation: !reducedMotion,
        fadeAnimation: false,
        markerZoomAnimation: false,
        inertia: true,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 120,
      }).setView([initialCenterRef.current.lat, initialCenterRef.current.lng], 14);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // Clean, low-noise CARTO Positron minimal light tiles
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 2,
        detectRetina: true,
      }).addTo(map);

      map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
        onSelectRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      resizeObserver = new ResizeObserver(() => window.requestAnimationFrame(() => map.invalidateSize({ pan: false })));
      resizeObserver.observe(elementRef.current);
    }

    const markerMap = markerMapRef.current;
    setup();
    return () => {
      active = false;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
      markerMap.clear();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    map.panTo([center.lat, center.lng], { animate: !reducedMotion, duration: reducedMotion ? 0 : 0.28 });
  }, [center.lat, center.lng]);

  useEffect(() => {
    let cancelled = false;

    async function redraw() {
      if (!mapRef.current || !layerRef.current) return;
      const L = await import("leaflet");
      if (cancelled || !layerRef.current) return;
      layerRef.current.clearLayers();
      markerMapRef.current.clear();

      // User location marker
      if (selected) {
        const originIcon = L.divIcon({
          className: "custom-map-icon user-origin-marker",
          html: '<div class="user-origin-dot"><div class="user-origin-pulse"></div></div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12],
        });
        L.marker([selected.lat, selected.lng], { icon: originIcon, keyboard: false }).addTo(layerRef.current);
      }

      // Shop markers
      for (const shop of shops) {
        const isSelected = selectedShopId === shop.id;
        const isMatching = matchingSet ? matchingSet.has(shop.id) : true;
        const markerIcon = L.divIcon({
          className: `custom-map-icon minimalist-shop-marker ${isSelected ? "is-selected" : ""} ${isMatching ? "is-matching" : "is-muted"}`,
          html: `<button aria-label="${shop.name}" class="minimalist-marker-dot"><span class="marker-inner-circle"></span></button>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([shop.lat, shop.lng], { icon: markerIcon, riseOnHover: true, keyboard: true });
        marker.bindTooltip(shop.name, { direction: "top", offset: [0, -12], className: "clean-map-tooltip" });
        
        const mrtWalkText = shop.mrtInfo ? ` · 捷運步行 ${shop.mrtInfo.walkMinutes} 分` : "";
        marker.bindPopup(
          `
          <div class="map-popup-card clean-popup-card">
            <div class="map-popup-header">
              <span className="map-popup-brand">${shop.brand} (${shop.area})</span>
              <h4 class="map-popup-title">${shop.name}</h4>
            </div>
            <p class="map-popup-meta">🚶 步行時間計算中${mrtWalkText}</p>
            <a href="/shops/${shop.slug}" class="map-popup-link">查看店家資訊 →</a>
          </div>
          `,
          { maxWidth: 240, autoPan: true, autoPanPadding: [20, 20], keepInView: true }
        );

        marker.on("click", () => {
          onShopSelectRef.current?.(shop);
          if (mapRef.current) {
            mapRef.current.panTo([shop.lat, shop.lng], { animate: true });
          }
        });

        marker.addTo(layerRef.current);
        markerMapRef.current.set(shop.id, marker);
      }
    }

    redraw();
    return () => { cancelled = true; };
  }, [selected, shops, matchingSet, selectedShopId]);

  // Synchronize active shop selection -> open popup & pan to marker
  useEffect(() => {
    if (!selectedShopId || !markerMapRef.current.has(selectedShopId)) return;
    const marker = markerMapRef.current.get(selectedShopId);
    if (marker && mapRef.current) {
      marker.openPopup();
      mapRef.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [selectedShopId]);

  return <div ref={elementRef} className="map-frame clean-map-frame" style={{ height }} aria-label="台北拉麵動態地圖" />;
}
