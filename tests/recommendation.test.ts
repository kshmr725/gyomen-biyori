import { recommendShops, queueAllowed } from "../src/lib/recommendation";
import { shops } from "../src/lib/seed";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(queueAllowed("under30", "none") === false, "under30 must not pass no-queue filter");
assert(queueAllowed("under30", "under30") === true, "under30 must pass under30 filter");
assert(queueAllowed("unknown", "unlimited") === true, "unknown may pass unlimited filter");

const testShops = shops.map((shop) => ({ ...shop, openNow: true }));
const routes = Object.fromEntries(testShops.map((shop, index) => [shop.id, 5 + index]));
const saturdayDinner = new Date("2026-07-25T11:00:00.000Z");
const result = recommendShops(testShops, routes, { walkMinutes: 20, budget: "unlimited", queue: "unlimited", novelty: "repeat", eatenIds: new Set() }, () => 0, saturdayDinner);
assert(Boolean(result.selected), "a matching shop should be selected");
assert(result.ranked.every((item) => item.shop.openNow), "closed shops must not be ranked");
assert(result.alternatives.length <= 2, "at most two alternatives are allowed");

const noResult = recommendShops(testShops, routes, { walkMinutes: 1, budget: "cheap", queue: "none", novelty: "new", eatenIds: new Set() }, () => 0, saturdayDinner);
assert(noResult.selected === null, "impossible filters must return no result");
console.log("recommendation tests passed");
