import type { QueueLevel, Shop, TimeRange, WeeklyHours } from "./types";

const TAIPEI_TIME_ZONE = "Asia/Taipei";

function parseClock(value: string): number {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function taipeiParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TAIPEI_TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const dayMap: Record<string, 0 | 1 | 2 | 3 | 4 | 5 | 6> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { day: dayMap[map.weekday], minutes: Number(map.hour) * 60 + Number(map.minute) };
}

function isWithin(minutes: number, range: TimeRange): boolean {
  const open = parseClock(range.open);
  const close = parseClock(range.close);
  if (open === 0 && close === 1440) return true;
  if (close > open) return minutes >= open && minutes < close;
  return minutes >= open;
}

export function isOpenAt(hours: WeeklyHours, date: Date = new Date()): boolean {
  const { day, minutes } = taipeiParts(date);
  const today = hours[day] ?? [];
  if (today.some((range) => isWithin(minutes, range))) return true;

  const previousDay = ((day + 6) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6;
  const previous = hours[previousDay] ?? [];
  return previous.some((range) => {
    const open = parseClock(range.open);
    const close = parseClock(range.close);
    return close <= open && minutes < close;
  });
}

export function queueLevelAt(shop: Shop, date: Date = new Date()): QueueLevel {
  const { day, minutes } = taipeiParts(date);
  const holiday = day === 0 || day === 6;
  if (minutes >= 11 * 60 && minutes < 14 * 60) return holiday ? shop.queue.holidayLunch : shop.queue.weekdayLunch;
  if (minutes >= 17 * 60 && minutes < 21 * 60) return holiday ? shop.queue.holidayDinner : shop.queue.weekdayDinner;
  return shop.queue.offPeak;
}
