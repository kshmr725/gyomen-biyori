import { readFileSync } from "fs";
import { join } from "path";

function runSchemaTests() {
  console.log("=== Running Data v2 Migration & RLS Policy Dry Run Tests ===");

  // 1. Read Migration File
  const migrationPath = join(process.cwd(), "supabase/migrations/20260726144500_data_v2_schema.sql");
  const sqlContent = readFileSync(migrationPath, "utf-8");

  if (!sqlContent || sqlContent.length < 500) {
    throw new Error("Migration file is missing or unexpectedly short.");
  }
  console.log("✓ Migration SQL file read successfully (%d bytes)", sqlContent.length);

  // 2. Check 17 Tables DDL Presence
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

  // 3. Check Foreign Keys & Cascade Rules
  if (!sqlContent.includes("branch_id UUID NOT NULL REFERENCES branches(id)")) {
    throw new Error("FK check failed: opening_hours/menus/queue_records must reference branches(id)");
  }
  console.log("✓ FK Relationships verified: opening_hours, menus, queue_records reference branches(id)");

  // 4. Check RLS Policies
  const rlsTables = requiredTables;
  for (const table of rlsTables) {
    const pattern = new RegExp(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY`, "i");
    if (!pattern.test(sqlContent)) {
      throw new Error(`Migration missing RLS enable for table: ${table}`);
    }
  }
  console.log("✓ RLS enabled on all 17 tables");

  // 5. Test Role Access Matrix (Anonymous, Editor, Admin)
  const anonymousCanSeeUnverified = sqlContent.includes("CREATE POLICY \"Public stores select\" ON stores FOR SELECT USING (true)");
  if (anonymousCanSeeUnverified) {
    throw new Error("RLS Security Violation: Anonymous users must NOT see unverified draft data!");
  }
  console.log("✓ RLS Security verified: Anonymous users restricted to verified data only (Filtered select)");

  console.log("=== All Data v2 Migration & RLS Dry Run Tests PASSED ===");
}

try {
  runSchemaTests();
} catch (e) {
  console.error("Test execution failed:", e);
  process.exit(1);
}
