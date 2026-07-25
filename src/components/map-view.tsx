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
  height = 500,
}: Props) {
  const elementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const layerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const onSelectRef = useRef(onSelect);
  const onShopSelectRef = useRef(onShopSelect);
  const initialCenterRef = useRef(center);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    onShopSelectRef.current = onShopSelect;
  }, [onShopSelect]);

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
        inertiaDeceleration: 3200,
        inertiaMaxSpeed: 1100,
        easeLinearity: 0.25,
        wheelDebounceTime: 80,
        wheelPxPerZoomLevel: 100,
        zoomSnap: 0.5,
        zoomDelta: 0.5,
      }).setView([initialCenterRef.current.lat, initialCenterRef.current.lng], 14);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
          updateWhenZooming: false,
          updateWhenIdle: true,
          keepBuffer: 2,
          detectRetina: false,
        }
      ).addTo(map);

      map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
        onSelectRef.current?.({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);

      resizeObserver = new ResizeObserver(() => {
        window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
      });
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
    const target = { lat: center.lat, lng: center.lng };
    const current = map.getCenter();
    const movedEnough = Math.abs(current.lat - target.lat) + Math.abs(current.lng - target.lng) > 0.00008;

    if (!movedEnough) return;

    map.panTo([target.lat, target.lng], {
      animate: !reducedMotion,
      duration: reducedMotion ? 0 : 0.28,
      easeLinearity: 0.3,
      noMoveStart: true,
    });
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
          className: "custom-map-icon origin-icon",
          html: `<div class="origin-pin-pulse"></div><div class="origin-pin-badge">📍 出發點</div>`,
          iconSize: [80, 40],
          iconAnchor: [40, 36],
        });
        L.marker([selected.lat, selected.lng], { icon: originIcon, keyboard: false }).addTo(layerRef.current);
      }

      for (const shop of shops) {
        const isSelected = selectedShopId === shop.id;
        const isMatching = matchingSet ? matchingSet.has(shop.id) : true;
        const statusClass = isSelected ? "is-selected" : isMatching ? "is-matching" : "is-muted";

        const shopIcon = L.divIcon({
          className: `custom-map-icon shop-icon ${statusClass}`,
          html: `
            <div class="shop-pin-wrapper">
              <div class="shop-pin-badge">
                <span class="ramen-icon">🍜</span>
                <span class="shop-pin-name">${shop.name}</span>
                <span class="shop-pin-price">NT$${shop.basePrice}</span>
              </div>
              ${isSelected ? '<div class="shop-pin-pulse"></div>' : ""}
            </div>
          `,
          iconSize: [140, 40],
          iconAnchor: [70, 36],
        });

        const marker = L.marker([shop.lat, shop.lng], {
          icon: shopIcon,
          riseOnHover: true,
          keyboard: true,
        });

        const popupContent = `
          <div class="map-popup-card">
            <img src="${shop.coverImage}" alt="${shop.name}" class="map-popup-img" loading="lazy" decoding="async" />
            <div class="map-popup-body">
              <div class="map-popup-brand">${shop.brand}</div>
              <h4 class="map-popup-title">${shop.name}</h4>
              <p class="map-popup-desc">${shop.description}</p>
              <div class="map-popup-meta">
                <span>⭐ ${shop.googleRating}</span>
                <span>NT$${shop.basePrice}起</span>
                <span class="${shop.openNow ? "open-text" : "closed-text"}">${shop.openNow ? "營業中" : "未營業"}</span>
              </div>
              <a href="/shops/${shop.slug}" class="map-popup-link">查看店家細節與菜單 →</a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 260,
          autoPan: true,
          autoPanPadding: [24, 24],
          keepInView: true,
        });
        marker.on("click", () => onShopSelectRef.current?.(shop));
        marker.addTo(layerRef.current);
      }
    }

    redraw();
    return () => {
      cancelled = true;
    };
  }, [selected, shops, matchingSet, selectedShopId]);

  return <div ref={elementRef} className="map-frame" style={{ height }} aria-label="台北拉麵動態地圖" />;
}
