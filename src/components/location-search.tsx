"use client";

import { useState } from "react";
import type { Coordinates } from "@/lib/types";

const PRESET_LOCATIONS: Array<{ name: string; area: string; coords: Coordinates }> = [
  { name: "台北車站", area: "中正區", coords: { lat: 25.0478, lng: 121.5170 } },
  { name: "中山站 / 南西商圈", area: "中山區", coords: { lat: 25.0531, lng: 121.5205 } },
  { name: "忠孝新生 / 光華", area: "中正/大安", coords: { lat: 25.0424, lng: 121.5330 } },
  { name: "西門町 / 西門站", area: "萬華區", coords: { lat: 25.0421, lng: 121.5083 } },
  { name: "信義區 / 台北101", area: "信義區", coords: { lat: 25.0338, lng: 121.5645 } },
  { name: "公館 / 台灣大學", area: "大安/文山", coords: { lat: 25.0135, lng: 121.5348 } },
  { name: "忠孝復興 / 東區", area: "大安區", coords: { lat: 25.0416, lng: 121.5441 } },
  { name: "松江南京", area: "中山區", coords: { lat: 25.0519, lng: 121.5332 } },
  { name: "板橋車站", area: "板橋區", coords: { lat: 25.0142, lng: 121.4638 } },
  { name: "頂溪 / 樂華", area: "永和區", coords: { lat: 25.0138, lng: 121.5155 } },
];

type LocationSearchProps = {
  onSelectLocation: (coords: Coordinates, name: string) => void;
  onUseGPS: () => void;
  currentSelectedName?: string;
};

export function LocationSearch({ onSelectLocation, onUseGPS, currentSelectedName }: LocationSearchProps) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredPresets = PRESET_LOCATIONS.filter(
    (loc) => loc.name.includes(query) || loc.area.includes(query)
  );

  async function handleCustomSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setErrorMessage(null);

    // First check preset match
    const matchedPreset = PRESET_LOCATIONS.find((loc) =>
      loc.name.toLowerCase().includes(query.trim().toLowerCase())
    );

    if (matchedPreset) {
      onSelectLocation(matchedPreset.coords, matchedPreset.name);
      setSearching(false);
      return;
    }

    // Geocoding query via Nominatim (OpenStreetMap)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=tw&q=${encodeURIComponent(
          query.trim()
        )}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const topResult = data[0];
        const coords = { lat: parseFloat(topResult.lat), lng: parseFloat(topResult.lon) };
        onSelectLocation(coords, topResult.display_name.split(",")[0]);
      } else {
        setErrorMessage("查無相關地點，請使用熱門地標或點擊地圖選擇。");
      }
    } catch {
      setErrorMessage("地點搜尋暫時無法連線，請點擊下熱門地點。");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="location-search-box">
      <form onSubmit={handleCustomSearch} className="search-input-group">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜尋捷運站、地標或地址 (例：中山站、西門町)"
          className="location-input"
        />
        <button type="submit" className="button button-primary search-btn" disabled={searching}>
          {searching ? "搜尋中…" : "搜尋地點"}
        </button>
      </form>

      {errorMessage && <p className="search-error">{errorMessage}</p>}

      <div className="location-quick-presets">
        <span className="preset-label">熱門捷運站與地標：</span>
        <div className="preset-chips">
          {filteredPresets.map((loc) => (
            <button
              key={loc.name}
              type="button"
              className={`preset-chip ${currentSelectedName === loc.name ? "selected" : ""}`}
              onClick={() => onSelectLocation(loc.coords, loc.name)}
            >
              📍 {loc.name}
            </button>
          ))}
        </div>
      </div>

      <div className="gps-fallback-row">
        <button type="button" className="button button-ghost gps-btn" onClick={onUseGPS}>
          📡 使用目前 GPS 自動定位
        </button>
      </div>
    </div>
  );
}
