"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapView } from "@/components/map-view";
import { ShopCard } from "@/components/shop-card";
import { shops } from "@/lib/seed";
import { recommendShops } from "@/lib/recommendation";
import type { BudgetChoice, Coordinates, NoveltyChoice, QueueChoice, RecommendationResult } from "@/lib/types";

const TAIPEI_CENTER = { lat: 25.0478, lng: 121.5170 };

type RouteState = { loading: boolean; error: string | null; source: "valhalla" | "ors" | "cache" | "demo" | null; minutes: Record<string, number> };

export function RecommendationWizard() {
  const [selected, setSelected] = useState<Coordinates | null>(null);
  const [center, setCenter] = useState<Coordinates>(TAIPEI_CENTER);
  const [step, setStep] = useState(0);
  const [walkMinutes, setWalkMinutes] = useState(15);
  const [budget, setBudget] = useState<BudgetChoice>("cheap");
  const [queue, setQueue] = useState<QueueChoice>("under30");
  const [novelty, setNovelty] = useState<NoveltyChoice>("new");
  const [route, setRoute] = useState<RouteState>({ loading: false, error: null, source: null, minutes: {} });
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [rerolled, setRerolled] = useState(false);
  const eatenIds = useMemo(() => new Set<string>(), []);

  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("gyomen:last-location");
      if (!saved) return;
      try {
        const parsed = JSON.parse(saved) as Coordinates;
        setCenter(parsed);
      } catch {
        window.localStorage.removeItem("gyomen:last-location");
      }
    }, 0);
    navigator.geolocation?.getCurrentPosition(({ coords }) => {
      const current = { lat: coords.latitude, lng: coords.longitude };
      setCenter(current);
      setSelected(current);
    });
    return () => window.clearTimeout(restoreTimer);
  }, []);

  const selectPoint = useCallback((point: Coordinates) => {
    setSelected(point); setCenter(point); setStep(1); setResult(null);
    window.localStorage.setItem("gyomen:last-location", JSON.stringify(point));
  }, []);

  async function calculate() {
    if (!selected) return;
    setRoute({ loading: true, error: null, source: null, minutes: {} });
    setResult(null); setRerolled(false);
    try {
      const response = await fetch("/api/walking-times", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ origin: selected, destinations: shops.map(({ id, lat, lng }) => ({ id, lat, lng })) }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message ?? "目前無法取得可信步行時間");
      const minutes = Object.fromEntries(payload.durations.map((item: { id: string; minutes: number }) => [item.id, item.minutes]));
      setRoute({ loading: false, error: null, source: payload.source as RouteState["source"], minutes });
      setResult(recommendShops(shops, minutes, { walkMinutes, budget, queue, novelty, eatenIds }));
      setStep(5);
    } catch (error) {
      setRoute({ loading: false, error: error instanceof Error ? error.message : "路線服務暫時無法使用", source: null, minutes: {} });
    }
  }

  function reroll() {
    if (!result || rerolled || result.alternatives.length === 0) return;
    const [next, ...rest] = result.alternatives;
    setResult({ ...result, selected: next, alternatives: result.selected ? [result.selected, ...rest] : rest });
    setRerolled(true);
  }

  return (
    <section className="wizard-grid">
      <div className="map-column">
        <MapView center={center} selected={selected} shops={shops} onSelect={selectPoint} />
        <div className="map-caption"><span>{selected ? "已選擇出發點" : "點地圖選擇出發位置"}</span><span>OSM 地圖資料</span></div>
      </div>
      <div className="wizard-panel paper-card">
        {step === 0 && <Step title="先選一個位置" kicker="STEP 01"><p>可以用目前定位，也可以直接點地圖。位置只儲存在這台裝置。</p><button className="button button-primary" onClick={() => selected && setStep(1)} disabled={!selected}>使用目前位置</button></Step>}
        {step === 1 && <Step title="願意走多久？" kicker="STEP 02"><ChoiceGroup values={[5,10,15,20]} selected={walkMinutes} onSelect={(v) => {setWalkMinutes(v); setStep(2);}} format={(v) => `${v} 分鐘`} /></Step>}
        {step === 2 && <Step title="今天的預算？" kicker="STEP 03"><ChoiceGroup values={["cheap","standard","unlimited"] as BudgetChoice[]} selected={budget} onSelect={(v) => {setBudget(v); setStep(3);}} format={(v) => v === "cheap" ? "平價 · ≤ NT$250" : v === "standard" ? "一般 · ≤ NT$350" : "不限"} /></Step>}
        {step === 3 && <Step title="最多願意排多久？" kicker="STEP 04"><ChoiceGroup values={["none","under30","unlimited"] as QueueChoice[]} selected={queue} onSelect={(v) => {setQueue(v); setStep(4);}} format={(v) => v === "none" ? "不用排" : v === "under30" ? "30 分鐘內" : "不限"} /></Step>}
        {step === 4 && <Step title="今天想吃新的嗎？" kicker="STEP 05"><ChoiceGroup values={["new","repeat"] as NoveltyChoice[]} selected={novelty} onSelect={setNovelty} format={(v) => v === "new" ? "想吃沒吃過的" : "吃過也可以"} /><button className="button button-primary full" onClick={calculate} disabled={route.loading}>{route.loading ? "正在算路線…" : "替我選一間"}</button></Step>}
        {route.error && <div className="empty-state"><h2>今天先別亂猜</h2><p>{route.error}</p><p>在沒有可信快取時，推薦會暫停；你仍可前往自由瀏覽。</p><Link className="button button-ghost" href="/explore">自由逛逛</Link></div>}
        {step === 5 && result && (result.selected ? <div><p className="eyebrow">TODAY&apos;S ONE BOWL</p><h2>今天就吃這間</h2>{route.source === "demo" && <p className="warning-note">目前為本機直線估算；正式環境不會使用此模式。</p>}<ShopCard shop={result.selected} walkingMinutes={route.minutes[result.selected.id]} reason={result.reason} featured /><div className="result-actions"><a className="button button-primary" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(result.selected.address)}`}>出發導航</a><button className="button button-ghost" disabled={rerolled || result.alternatives.length === 0} onClick={reroll}>{rerolled ? "已經換過一次" : "換一間"}</button></div></div> : <div className="empty-state"><h2>沒有完全符合的店</h2><p>我們沒有偷偷放寬條件。請自行增加步行時間、預算，或把排隊條件放寬。</p><button className="button button-primary" onClick={() => setStep(1)}>重新調整</button></div>)}
      </div>
    </section>
  );
}

function Step({ kicker, title, children }: { kicker: string; title: string; children: React.ReactNode }) { return <div className="step-card"><p className="eyebrow">{kicker}</p><h2>{title}</h2>{children}</div>; }
function ChoiceGroup<T extends string | number>({ values, selected, onSelect, format }: { values: T[]; selected: T; onSelect: (value: T) => void; format: (value: T) => string }) { return <div className="choice-grid">{values.map((value) => <button className={`choice ${selected === value ? "selected" : ""}`} key={value} onClick={() => onSelect(value)}>{format(value)}</button>)}</div>; }
