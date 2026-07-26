import { readFileSync } from "fs";
import { join } from "path";
import { UNVERIFIED_DRAFT_5_RAMEN_SHOPS } from "../src/lib/seed-v2";
import { SeedImporter } from "../src/lib/importer/seed-importer";

function runSchemaTests() {
  console.log("=== Running Data v2 Migration & Seed Integrity Tests ===");

  // 1. Read Migration File
  const migrationPath = join(process.cwd(), "supabase/migrations/20260726144500_data_v2_schema.sql");
  const sqlContent = readFileSync(migrationPath, "utf-8");

  if (!sqlContent || sqlContent.length < 500) {
    throw new Error("Migration file is missing or unexpectedly short.");
  }
  console.log("✓ Migration DDL SQL file verified (%d bytes)", sqlContent.length);

  // 2. Check 17 Core Tables DDL Presence
  const requiredTables = [
    "admin_profiles",
    "sources",
    "stores",
    "branches",
    "opening_hours",
    "nearby_transit",
    "menus",
    "dishes",
    "photos",
    "tags",
    "branch_tags",
    "payment_methods",
    "branch_payment_methods",
    "queue_records",
    "editorial_entries",
    "source_links",
    "update_logs",
  ];

  for (const table of requiredTables) {
    const pattern = new RegExp(`CREATE TABLE ${table}\\b`, "i");
    if (!pattern.test(sqlContent)) {
      throw new Error(`Migration missing DDL for required table: ${table}`);
    }
  }
  console.log("✓ All 17 required core domain tables present in DDL");

  // 3. Verify Foreign Keys & Constraints
  if (!sqlContent.includes("branch_id UUID NOT NULL REFERENCES branches(id)")) {
    throw new Error("FK check failed: opening_hours/menus/queue_records must reference branches(id)");
  }
  if (!sqlContent.includes("menu_id UUID NOT NULL REFERENCES menus(id)")) {
    throw new Error("FK check failed: dishes must reference menus(id)");
  }
  if (!sqlContent.includes("CONSTRAINT photos_target_entity_check")) {
    throw new Error("Constraint check failed: photos must have target entity check");
  }
  if (!sqlContent.includes("CONSTRAINT source_links_entity_type_check")) {
    throw new Error("Constraint check failed: source_links must validate entity_type");
  }
  if (!sqlContent.includes("CONSTRAINT store_verified_consistency_check")) {
    throw new Error("Constraint check failed: stores must check verified consistency");
  }
  console.log("✓ FK Relationships & DB constraints verified (photos entity check, source_links entity_type, verified consistency)");

  // 4. Verify RLS Policies Enabled
  for (const table of requiredTables) {
    const pattern = new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, "i");
    if (!pattern.test(sqlContent)) {
      throw new Error(`Migration missing RLS enable for table: ${table}`);
    }
  }
  console.log("✓ RLS enabled on all 17 tables");

  // 5. Verify Draft Stores Seed Integrity
  console.log("=== Validating 5 Initial Draft Ramen Shops ===");
  if (UNVERIFIED_DRAFT_5_RAMEN_SHOPS.length !== 5) {
    throw new Error(`Expected 5 draft shops, found ${UNVERIFIED_DRAFT_5_RAMEN_SHOPS.length}`);
  }

  for (const entry of UNVERIFIED_DRAFT_5_RAMEN_SHOPS) {
    const res = SeedImporter.validateEntry(entry);
    if (!res.valid) {
      throw new Error(`Draft shop validation failed for ${entry.store.name}: ${res.errors.join(", ")}`);
    }

    if (entry.store.data_quality !== "unverified" || entry.store.verification_status !== "pending") {
      throw new Error(`Draft store ${entry.store.name} must be data_quality="unverified" & verification_status="pending"`);
    }
  }
  console.log("✓ All 5 draft shops validated successfully (All set to unverified & pending)");
  console.log("=== All Migration & Seed Integrity Tests PASSED ===");
}

try {
  runSchemaTests();
} catch (e) {
  console.error("Test execution failed:", e);
  process.exit(1);
}
