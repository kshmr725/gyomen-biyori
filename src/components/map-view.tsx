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

  const matchingSet = useMemo(() => {
    if (!matchingShopIds) return null;
    return matchingShopIds instanceof Set ? matchingShopIds : new Set(matchingShopIds);
  }, [matchingShopIds]);


  useEffect(() => {
    let active = true;
    async function setup() {
      if (!elementRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (!active || !elementRef.current) return;

      const map = L.map(elementRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([center.lat, center.lng], 14);

      L.control.zoom({ position: "bottomright" }).addTo(map);

      // CartoDB Voyager clean Google-Maps style tile layer
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 19,
        }
      ).addTo(map);

      map.on("click", (event: { latlng: { lat: number; lng: number } }) => {
        onSelect?.({ lat: event.latlng.lat, lng: event.latlng.lng });
      });

      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
    }
    setup();

    return () => {
      active = false;
      mapRef.current?.remove();
      mapRef.current = null;
    };
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

      // Render origin pin
      if (selected) {
        const originIcon = L.divIcon({
          className: "custom-map-icon origin-icon",
          html: `<div class="origin-pin-pulse"></div><div class="origin-pin-badge">📍 出發點</div>`,
          iconSize: [80, 40],
          iconAnchor: [40, 36],
        });
        L.marker([selected.lat, selected.lng], { icon: originIcon }).addTo(layerRef.current);
      }

      // Render shop pins
      for (const shop of shops) {
        const isSelected = selectedShopId === shop.id;
        const isMatching = matchingSet ? matchingSet.has(shop.id) : true;
        const statusClass = isSelected
          ? "is-selected"
          : isMatching
          ? "is-matching"
          : "is-muted";

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

        const marker = L.marker([shop.lat, shop.lng], { icon: shopIcon });

        const popupContent = `
          <div class="map-popup-card">
            <img src="${shop.coverImage}" alt="${shop.name}" class="map-popup-img" />
            <div class="map-popup-body">
              <div class="map-popup-brand">${shop.brand}</div>
              <h4 class="map-popup-title">${shop.name}</h4>
              <p class="map-popup-desc">${shop.description}</p>
              <div class="map-popup-meta">
                <span>⭐ ${shop.googleRating}</span>
                <span>NT$${shop.basePrice}起</span>
                <span class="${shop.openNow ? "open-text" : "closed-text"}">${
                  shop.openNow ? "營業中" : "未營業"
                }</span>
              </div>
              <a href="/shops/${shop.slug}" class="map-popup-link">查看店家細節與菜單 →</a>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, { maxWidth: 260 });
        marker.on("click", () => {
          onShopSelect?.(shop);
        });
        marker.addTo(layerRef.current);
      }
    }

    redraw();
  }, [selected, shops, matchingSet, selectedShopId, onShopSelect]);

  return <div ref={elementRef} className="map-frame" style={{ height }} aria-label="台北拉麵動態地圖" />;
}
