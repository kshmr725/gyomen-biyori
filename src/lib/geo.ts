import type { Coordinates } from "./types";

export function haversineMeters(a: Coordinates, b: Coordinates): number {
  const radius = 6371000;
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const value = Math.sin(dLat/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

export function estimateWalkingMinutes(a: Coordinates, b: Coordinates): number {
  // Explicit demo estimate only: route detour factor 1.22, walking speed 78 m/min.
  return Math.max(1, Math.round((haversineMeters(a,b) * 1.22) / 78));
}
