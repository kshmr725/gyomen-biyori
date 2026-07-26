import { execFileSync } from "node:child_process";
import { UNVERIFIED_DRAFT_5_RAMEN_SHOPS } from "../src/lib/seed-v2.ts";

function quoteIdentifier(identifier) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteValue(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replaceAll("'", "''")}'`;
}

function insertIfMissing(table, rows) {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  const values = rows
    .map((row) => `(${columns.map((column) => quoteValue(row[column])).join(", ")})`)
    .join(",\n");
  return `INSERT INTO public.${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES\n${values}\nON CONFLICT (id) DO NOTHING;`;
}

for (const entry of UNVERIFIED_DRAFT_5_RAMEN_SHOPS) {
  if (entry.store.data_quality !== "unverified" || entry.store.verification_status !== "pending") {
    throw new Error(`Refusing to seed ${entry.store.slug}: draft entries must remain unverified + pending.`);
  }
}

const statements = [
  insertIfMissing("sources", UNVERIFIED_DRAFT_5_RAMEN_SHOPS.map((entry) => entry.source)),
  insertIfMissing("stores", UNVERIFIED_DRAFT_5_RAMEN_SHOPS.map((entry) => entry.store)),
  insertIfMissing("branches", UNVERIFIED_DRAFT_5_RAMEN_SHOPS.map((entry) => entry.branch)),
  insertIfMissing("menus", UNVERIFIED_DRAFT_5_RAMEN_SHOPS.map((entry) => entry.menu)),
  insertIfMissing("opening_hours", UNVERIFIED_DRAFT_5_RAMEN_SHOPS.flatMap((entry) => entry.openingHours)),
  insertIfMissing("dishes", UNVERIFIED_DRAFT_5_RAMEN_SHOPS.flatMap((entry) => entry.dishes)),
];

for (const statement of statements) {
  if (!statement) continue;
  execFileSync("npx", ["supabase", "db", "query", "--local", statement], {
    stdio: "inherit",
  });
}

console.log(`Seeded ${UNVERIFIED_DRAFT_5_RAMEN_SHOPS.length} draft stores if missing; existing rows were left unchanged.`);
