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

export function MapView({ center, selected, shops = [], matchingShopIds, selectedShopId, onSelect, onShopSelect, height = 500 }: Props) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
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
        attributionControl: false,
        zoomAnimation: !reducedMotion,
        fadeAnimation: false,
        markerZoomAnimation: false,
        inertia: true,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
        wheelPxPerZoomLevel: 120,
      }).setView([initialCenterRef.current.lat, initialCenterRef.current.lng], 14);

      L.control.zoom({ position: "bottomright" }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        updateWhenZooming: false,
        updateWhenIdle: true,
        keepBuffer: 2,
        detectRetina: true,
      }).addTo(map);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 19,
        pane: "shadowPane",
        opacity: 0.58,
      }).addTo(map);

      map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
        onSelectRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      resizeObserver = new ResizeObserver(() => window.requestAnimationFrame(() => map.invalidateSize({ pan: false })));
      resizeObserver.observe(elementRef.current);
    }

    setup();
    return () => {
      active = false;
      resizeObserver?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
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

      if (selected) {
        const originIcon = L.divIcon({
          className: "custom-map-icon origin-icon-clean",
          html: '<div class="origin-dot"><span></span></div>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });
        L.marker([selected.lat, selected.lng], { icon: originIcon, keyboard: false }).addTo(layerRef.current);
      }

      for (const shop of shops) {
        const isSelected = selectedShopId === shop.id;
        const isMatching = matchingSet ? matchingSet.has(shop.id) : true;
        const markerIcon = L.divIcon({
          className: `custom-map-icon clean-shop-marker ${isSelected ? "is-selected" : ""} ${isMatching ? "is-matching" : "is-muted"}`,
          html: `<button aria-label="${shop.name}" class="clean-marker-core"><span class="clean-marker-bowl">◡</span></button>`,
          iconSize: [36, 42],
          iconAnchor: [18, 38],
        });

        const marker = L.marker([shop.lat, shop.lng], { icon: markerIcon, riseOnHover: true, keyboard: true });
        marker.bindTooltip(shop.name, { direction: "top", offset: [0, -18], className: "clean-map-tooltip" });
        marker.bindPopup(`
          <div class="map-popup-card clean-popup-card">
            <img src="${shop.coverImage}" alt="${shop.name}" class="map-popup-img" loading="lazy" decoding="async" />
            <div class="map-popup-body">
              <div class="map-popup-brand">${shop.area}</div>
              <h4 class="map-popup-title">${shop.name}</h4>
              <div class="map-popup-meta"><span>★ ${shop.googleRating}</span><span>NT$${shop.basePrice} 起</span></div>
              <a href="/shops/${shop.slug}" class="map-popup-link">查看店家 →</a>
            </div>
          </div>
        `, { maxWidth: 260, autoPan: true, autoPanPadding: [24, 24], keepInView: true });
        marker.on("click", () => onShopSelectRef.current?.(shop));
        marker.addTo(layerRef.current);
      }
    }

    redraw();
    return () => { cancelled = true; };
  }, [selected, shops, matchingSet, selectedShopId]);

  return <div ref={elementRef} className="map-frame clean-map-frame" style={{ height }} aria-label="台北拉麵動態地圖" />;
}
