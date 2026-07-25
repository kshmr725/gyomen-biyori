import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { estimateWalkingMinutes } from "@/lib/geo";
import type { Coordinates } from "@/lib/types";

type RequestBody = { origin: Coordinates; destinations: Array<Coordinates & { id: string }> };
type RouteSource = "cache" | "valhalla" | "ors" | "demo";
type MemoryEntry = { minutes: number; expiresAt: number };

const memoryCache = new Map<string, MemoryEntry>();
const MAX_DESTINATIONS = 25;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}

function validCoordinate(value: Coordinates): boolean {
  return Number.isFinite(value.lat) && Number.isFinite(value.lng) && Math.abs(value.lat) <= 90 && Math.abs(value.lng) <= 180;
}

async function queryValhalla(origin: Coordinates, destinations: Array<Coordinates & { id: string }>) {
  const base = (process.env.VALHALLA_BASE_URL || "https://valhalla1.openstreetmap.de").replace(/\/$/, "");
  const response = await fetch(`${base}/sources_to_targets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": process.env.ROUTING_CLIENT_ID || "gyomen-biyori",
    },
    body: JSON.stringify({
      sources: [{ lat: origin.lat, lon: origin.lng }],
      targets: destinations.map((destination) => ({ lat: destination.lat, lon: destination.lng })),
      costing: "pedestrian",
      units: "kilometers",
      verbose: false,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Valhalla ${response.status}`);
  const result = (await response.json()) as {
    sources_to_targets?: Array<Array<{ time: number | null }>> | { durations?: Array<Array<number | null>> };
    durations?: Array<Array<number | null>>;
  };
  const verboseRow = Array.isArray(result.sources_to_targets)
    ? result.sources_to_targets[0]?.map((entry) => entry.time)
    : undefined;
  const conciseRow = !Array.isArray(result.sources_to_targets)
    ? result.sources_to_targets?.durations?.[0]
    : undefined;
  const row = result.durations?.[0] ?? conciseRow ?? verboseRow ?? [];
  const durations: Record<string, number> = {};
  destinations.forEach((destination, index) => {
    const seconds = row[index];
    if (typeof seconds === "number" && Number.isFinite(seconds)) durations[destination.id] = Math.max(1, Math.round(seconds / 60));
  });
  return durations;
}

async function queryOrs(origin: Coordinates, destinations: Array<Coordinates & { id: string }>, apiKey: string) {
  const locations = [[origin.lng, origin.lat], ...destinations.map((destination) => [destination.lng, destination.lat])];
  const response = await fetch("https://api.openrouteservice.org/v2/matrix/foot-walking", {
    method: "POST",
    headers: { Authorization: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ locations, sources: [0], destinations: destinations.map((_, index) => index + 1), metrics: ["duration"] }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`ORS ${response.status}`);
  const result = (await response.json()) as { durations?: Array<Array<number | null>> };
  const row = result.durations?.[0] ?? [];
  const durations: Record<string, number> = {};
  destinations.forEach((destination, index) => {
    const seconds = row[index];
    if (typeof seconds === "number" && Number.isFinite(seconds)) durations[destination.id] = Math.max(1, Math.round(seconds / 60));
  });
  return durations;
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.origin || !validCoordinate(body.origin) || !Array.isArray(body.destinations) || body.destinations.length === 0 || body.destinations.length > MAX_DESTINATIONS || body.destinations.some((item) => !item.id || !validCoordinate(item))) {
    return NextResponse.json({ error: "Invalid route request" }, { status: 400 });
  }

  const cacheClient = getServiceClient();
  const roundedOrigin = `${body.origin.lat.toFixed(4)},${body.origin.lng.toFixed(4)}`;
  const now = Date.now();
  const cached: Record<string, number> = {};
  const keys = body.destinations.map((destination) => `${roundedOrigin}:${destination.id}`);

  for (const key of keys) {
    const entry = memoryCache.get(key);
    if (entry && entry.expiresAt > now) cached[key] = entry.minutes;
    else if (entry) memoryCache.delete(key);
  }

  if (cacheClient) {
    const { data } = await cacheClient.from("route_cache").select("cache_key,duration_minutes,expires_at").in("cache_key", keys);
    for (const row of data ?? []) {
      if (new Date(row.expires_at).getTime() > now) cached[row.cache_key] = row.duration_minutes;
    }
  }

  const missing = body.destinations.filter((destination) => cached[`${roundedOrigin}:${destination.id}`] == null);
  const localDemo = process.env.NEXT_PUBLIC_DEMO_MODE === "true" && process.env.NODE_ENV !== "production";
  const provider = process.env.ROUTING_PROVIDER === "ors" ? "ors" : "valhalla";
  let source: RouteSource = Object.keys(cached).length ? "cache" : provider;
  let liveDurations: Record<string, number> = {};

  if (missing.length > 0) {
    try {
      if (provider === "ors") {
        const apiKey = process.env.ORS_API_KEY;
        if (!apiKey) throw new Error("ORS_API_KEY is missing");
        liveDurations = await queryOrs(body.origin, missing, apiKey);
        source = "ors";
      } else {
        liveDurations = await queryValhalla(body.origin, missing);
        source = "valhalla";
      }
    } catch {
      if (localDemo) {
        for (const destination of missing) liveDurations[destination.id] = estimateWalkingMinutes(body.origin, destination);
        source = "demo";
      }
    }
  }

  if (Object.keys(liveDurations).length > 0) {
    const expiresAtMs = Date.now() + CACHE_TTL_MS;
    for (const [id, duration] of Object.entries(liveDurations)) {
      memoryCache.set(`${roundedOrigin}:${id}`, { minutes: duration, expiresAt: expiresAtMs });
    }
    if (cacheClient) {
      const expiresAt = new Date(expiresAtMs).toISOString();
      await cacheClient.from("route_cache").upsert(Object.entries(liveDurations).map(([id, duration]) => ({
        cache_key: `${roundedOrigin}:${id}`,
        shop_id: id,
        origin_lat: body.origin.lat,
        origin_lng: body.origin.lng,
        duration_minutes: duration,
        expires_at: expiresAt,
      })), { onConflict: "cache_key" });
    }
  }

  const durations = body.destinations.map((destination) => {
    const key = `${roundedOrigin}:${destination.id}`;
    return { id: destination.id, minutes: cached[key] ?? liveDurations[destination.id] ?? null };
  });
  if (durations.some((item) => item.minutes == null)) {
    return NextResponse.json({ error: "ROUTE_SERVICE_UNAVAILABLE", message: "目前沒有完整可信的步行路線資料，推薦功能已暫停。" }, { status: 503 });
  }
  return NextResponse.json({ source, durations }, { headers: { "Cache-Control": "private, max-age=300" } });
}
