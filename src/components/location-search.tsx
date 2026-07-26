"use client";

import { useMemo, useState } from "react";
import type { Coordinates } from "@/lib/types";
import { LoveModal } from "@/components/love-modal";
import { useLanguage } from "@/lib/i18n";

const PRESET_LOCATIONS: Array<{ name: string; area: string; hint: string; coords: Coordinates }> = [
  { name: "台北車站", area: "中正區", hint: "車站、京站、北門一帶", coords: { lat: 25.0478, lng: 121.5170 } },
  { name: "中山站 / 南西商圈", area: "中山區", hint: "新光三越南西、赤峰街", coords: { lat: 25.0531, lng: 121.5205 } },
  { name: "忠孝新生 / 光華", area: "中正／大安", hint: "光華商場、三創生活", coords: { lat: 25.0424, lng: 121.5330 } },
  { name: "西門町 / 西門站", area: "萬華區", hint: "西門紅樓、電影街", coords: { lat: 25.0421, lng: 121.5083 } },
  { name: "信義區 / 台北 101", area: "信義區", hint: "市政府、信義商圈", coords: { lat: 25.0338, lng: 121.5645 } },
  { name: "公館 / 台灣大學", area: "大安／文山", hint: "台大、公館商圈", coords: { lat: 25.0135, lng: 121.5348 } },
  { name: "忠孝復興 / 東區", area: "大安區", hint: "SOGO、東區商圈", coords: { lat: 25.0416, lng: 121.5441 } },
  { name: "松江南京", area: "中山區", hint: "四平商圈、伊通街", coords: { lat: 25.0519, lng: 121.5332 } },
];

type SearchCandidate = {
  id: string;
  name: string;
  description: string;
  coords: Coordinates;
};

type LocationSearchProps = {
  onSelectLocation: (coords: Coordinates, name: string) => void;
  onUseGPS: () => void;
  currentSelectedName?: string;
};

export function LocationSearch({ onSelectLocation, onUseGPS, currentSelectedName }: LocationSearchProps) {
  const { t, lang } = useLanguage();
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<SearchCandidate[]>([]);
  const [showLoveModal, setShowLoveModal] = useState(false);

  const filteredPresets = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return PRESET_LOCATIONS;
    return PRESET_LOCATIONS.filter((loc) =>
      `${loc.name} ${loc.area} ${loc.hint}`.toLowerCase().includes(normalized)
    );
  }, [query]);

  function chooseLocation(coords: Coordinates, name: string) {
    onSelectLocation(coords, name);
    setCandidates([]);
    setErrorMessage(null);
  }

  async function handleCustomSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    const lowerQuery = query.trim().toLowerCase();
    if (["小魚", "520", "愛你", "小魚的拉麵地圖", "fish"].includes(lowerQuery)) {
      setShowLoveModal(true);
      return;
    }

    setSearching(true);
    setErrorMessage(null);
    setCandidates([]);

    const matchedPreset = PRESET_LOCATIONS.find((loc) =>
      `${loc.name} ${loc.area} ${loc.hint}`.toLowerCase().includes(lowerQuery)
    );

    if (matchedPreset) {
      setCandidates([
        {
          id: matchedPreset.name,
          name: matchedPreset.name,
          description: `${matchedPreset.area} · ${matchedPreset.hint}`,
          coords: matchedPreset.coords,
        },
      ]);
      setSearching(false);
      return;
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&countrycodes=tw&q=${encodeURIComponent(
          query.trim()
        )}`
      );
      const data = await res.json();
      if (!Array.isArray(data) || data.length === 0) {
        setErrorMessage(lang === "en" ? "No matching place found. Try a station or landmark." : "查無相關地點，請改用捷運站、商圈或知名地標搜尋。");
        return;
      }

      setCandidates(
        data.map((item: { place_id: number; display_name: string; lat: string; lon: string; name?: string }) => {
          const parts = item.display_name.split(",").map((part) => part.trim()).filter(Boolean);
          return {
            id: String(item.place_id),
            name: item.name || parts[0] || query.trim(),
            description: parts.slice(1, 4).join(" · "),
            coords: { lat: Number(item.lat), lng: Number(item.lon) },
          };
        })
      );
    } catch {
      setErrorMessage(lang === "en" ? "Place search is temporarily unavailable." : "地點搜尋暫時無法連線，請改用下方熱門地標。");
    } finally {
      setSearching(false);
    }
  }

  return (
    <>
      <div className="location-search-box">
        <div className="location-step-heading">
          <span className="location-step-number">1</span>
          <div>
            <strong>{lang === "en" ? "Choose your starting point" : "先選擇你的出發地點"}</strong>
            <p>{lang === "en" ? "Use GPS, search a station or choose a familiar landmark." : "使用定位、搜尋捷運站／地址，或直接選熟悉的地標。"}</p>
          </div>
        </div>

        <div className="gps-primary-row">
          <button type="button" className="button button-primary gps-primary-btn" onClick={onUseGPS}>
            {lang === "en" ? "Use my current location" : "使用我的目前位置"}
          </button>
          <span>{lang === "en" ? "Fastest" : "最快"}</span>
        </div>

        <form onSubmit={handleCustomSearch} className="search-input-group">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={lang === "en" ? "Station, landmark or address" : "輸入捷運站、地標或地址"}
            className="location-input"
            aria-label={t.searchPlaceholder}
          />
          <button type="submit" className="button button-ghost search-btn" disabled={searching}>
            {searching ? "…" : t.searchButton}
          </button>
        </form>

        {errorMessage && <p className="search-error">{errorMessage}</p>}

        {candidates.length > 0 && (
          <div className="location-candidates" aria-live="polite">
            <span className="preset-label">{lang === "en" ? "Confirm the correct place" : "請確認正確地點"}</span>
            {candidates.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                className="location-candidate"
                onClick={() => chooseLocation(candidate.coords, candidate.name)}
              >
                <span className="location-candidate-pin">📍</span>
                <span>
                  <strong>{candidate.name}</strong>
                  <small>{candidate.description}</small>
                </span>
                <span aria-hidden="true">→</span>
              </button>
            ))}
          </div>
        )}

        <div className="location-quick-presets">
          <span className="preset-label">{lang === "en" ? "Familiar landmarks" : "熟悉地標"}</span>
          <div className="landmark-grid">
            {filteredPresets.map((loc) => (
              <button
                key={loc.name}
                type="button"
                className={`landmark-card ${currentSelectedName === loc.name ? "selected" : ""}`}
                onClick={() => chooseLocation(loc.coords, loc.name)}
              >
                <strong>{loc.name}</strong>
                <span>{loc.area}</span>
                <small>{loc.hint}</small>
              </button>
            ))}
          </div>
        </div>
      </div>

      <LoveModal isOpen={showLoveModal} onClose={() => setShowLoveModal(false)} />
    </>
  );
}
