import { execSync } from "child_process";
import { UNVERIFIED_DRAFT_5_RAMEN_SHOPS } from "../src/lib/seed-v2";

function executeSql(sql: string): string {
  const cleanSql = sql.replace(/\s+/g, " ").trim();
  const command = `docker exec -i supabase_db_gyomen-biyori_2 psql -U postgres -d postgres -t -A -c ${JSON.stringify(
    cleanSql
  )}`;
  const rawOutput = execSync(command, { encoding: "utf-8" }).trim();
  const lines = rawOutput.split("\n").map((l) => l.trim()).filter((l) => l.length > 0 && l !== "SET");
  return lines.length > 0 ? lines[lines.length - 1] : "";
}

function runRealPostgresIntegrationTests() {
  console.log("=== Running Real Local PostgreSQL RLS & Integration Test Suite ===");

  // 1. Insert 5 Seed Draft Shops via Admin Postgres Role
  console.log("1. Inserting 5 unverified seed shops via Postgres Admin...");
  for (const entry of UNVERIFIED_DRAFT_5_RAMEN_SHOPS) {
    const s = entry.store;
    const b = entry.branch;
    const src = entry.source;
    const m = entry.menu;
    const d = entry.dishes[0];

    const safeNotes = (src.notes || "").replace(/'/g, "''");
    const safeDesc = (s.description || "").replace(/'/g, "''");
    const safeDishDesc = (d.description || "").replace(/'/g, "''");

    executeSql(`
      INSERT INTO sources (id, name, category, source_url, trust_tier, notes)
      VALUES ('${src.id}', '${src.name}', '${src.category}', '${src.source_url}', '${src.trust_tier}', '${safeNotes}')
      ON CONFLICT (id) DO NOTHING;
    `);

    executeSql(`
      INSERT INTO stores (id, name, brand, slug, area, description, base_price, data_quality, verification_status, source_id)
      VALUES ('${s.id}', '${s.name}', '${s.brand}', '${s.slug}', '${s.area}', '${safeDesc}', ${s.base_price}, '${s.data_quality}', '${s.verification_status}', '${src.id}')
      ON CONFLICT (id) DO NOTHING;
    `);

    executeSql(`
      INSERT INTO branches (id, store_id, branch_name, address, latitude, longitude, phone, data_quality, verification_status, source_id)
      VALUES ('${b.id}', '${s.id}', '${b.branch_name}', '${b.address}', ${b.latitude}, ${b.longitude}, ${b.phone ? `'${b.phone}'` : "NULL"}, '${b.data_quality}', '${b.verification_status}', '${src.id}')
      ON CONFLICT (id) DO NOTHING;
    `);

    executeSql(`
      INSERT INTO menus (id, branch_id, title, version, is_active, data_quality, verification_status, source_id)
      VALUES ('${m.id}', '${b.id}', '${m.title}', '${m.version}', ${m.is_active}, '${m.data_quality}', '${m.verification_status}', '${src.id}')
      ON CONFLICT (id) DO NOTHING;
    `);

    executeSql(`
      INSERT INTO dishes (id, menu_id, name, price, is_signature, spiciness_level, broth_category, description, data_quality, verification_status, source_id)
      VALUES ('${d.id}', '${m.id}', '${d.name}', ${d.price}, ${d.is_signature}, ${d.spiciness_level}, '${d.broth_category}', '${safeDishDesc}', '${d.data_quality}', '${d.verification_status}', '${src.id}')
      ON CONFLICT (id) DO NOTHING;
    `);
  }
  console.log("✓ Successfully inserted 5 unverified draft shops into PostgreSQL container");

  // 2. Anonymous Role RLS Select Query Test
  console.log("2. Testing RLS: Anonymous role querying unverified stores...");
  const anonCountStr = executeSql(`
    SET ROLE anon;
    SELECT COUNT(*) FROM stores;
  `);
  const anonCount = parseInt(anonCountStr, 10);
  if (isNaN(anonCount) || anonCount !== 0) {
    throw new Error(`RLS Failure! Anonymous role queried ${anonCountStr} unverified stores (Expected 0).`);
  }
  console.log("✓ RLS Verified: Anonymous role SELECT returns 0 rows for unverified stores");

  // 3. Anonymous Role RLS Insert Query Test
  console.log("3. Testing RLS: Anonymous role INSERT attempt...");
  try {
    executeSql(`
      SET ROLE anon;
      INSERT INTO stores (id, name, brand, slug, area, base_price, data_quality, verification_status)
      VALUES ('f9999999-9999-4999-8999-999999999999', 'Hacker Shop', 'Hacker', 'hacker-shop', '中山區', 100, 'verified', 'field_verified');
    `);
    throw new Error("RLS Failure! Anonymous role successfully executed INSERT.");
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (!msg.includes("permission denied") && !msg.includes("new row violates row-level security policy")) {
      throw new Error(`Unexpected error on anonymous INSERT test: ${msg}`);
    }
    console.log("✓ RLS Verified: Anonymous role INSERT correctly denied by PostgreSQL RLS");
  }

  // 4. DB Constraint Verification: Photos Target Entity Check
  console.log("4. Testing DB Constraint: photos_target_entity_check...");
  try {
    executeSql(`
      INSERT INTO photos (id, url, store_id, branch_id, dish_id)
      VALUES ('c8888888-8888-4888-8888-888888888888', 'https://example.com/orphan.jpg', NULL, NULL, NULL);
    `);
    throw new Error("Constraint Failure! Photo with all target entity IDs null was inserted.");
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (!msg.includes("photos_target_entity_check")) {
      throw new Error(`Unexpected error on orphan photo constraint: ${msg}`);
    }
    console.log("✓ DB Constraint Verified: Orphan photo rejected by photos_target_entity_check");
  }

  // 5. DB Constraint Verification: Verified Consistency Check
  console.log("5. Testing DB Constraint: store_verified_consistency_check...");
  try {
    executeSql(`
      INSERT INTO stores (id, name, brand, slug, area, base_price, data_quality, verification_status)
      VALUES ('e7777777-7777-4777-8777-777777777777', 'Bad State Store', 'Bad', 'bad-state-store', '中山區', 200, 'verified', 'pending');
    `);
    throw new Error("Constraint Failure! Inconsistent store state was inserted.");
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (!msg.includes("store_verified_consistency_check")) {
      throw new Error(`Unexpected error on consistency check: ${msg}`);
    }
    console.log("✓ DB Constraint Verified: Inconsistent verified+pending state rejected by store_verified_consistency_check");
  }

  // 6. DB Constraint Verification: Source Links Entity Type Check
  console.log("6. Testing DB Constraint: source_links_entity_type_check...");
  try {
    executeSql(`
      INSERT INTO source_links (id, source_id, entity_type, entity_id, url)
      VALUES ('d6666666-6666-4666-8666-666666666666', '${UNVERIFIED_DRAFT_5_RAMEN_SHOPS[0].source.id}', 'invalid_type', '${UNVERIFIED_DRAFT_5_RAMEN_SHOPS[0].store.id}', 'https://example.com');
    `);
    throw new Error("Constraint Failure! Invalid source_link entity_type was inserted.");
  } catch (err: unknown) {
    const msg = (err as Error).message;
    if (!msg.includes("source_links_entity_type_check")) {
      throw new Error(`Unexpected error on entity_type check: ${msg}`);
    }
    console.log("✓ DB Constraint Verified: Invalid source link entity_type rejected by source_links_entity_type_check");
  }

  console.log("=== All Real PostgreSQL RLS & Integration Tests PASSED ===");
}

try {
  runRealPostgresIntegrationTests();
} catch (e) {
  console.error("Integration test failed:", e);
  process.exit(1);
}
