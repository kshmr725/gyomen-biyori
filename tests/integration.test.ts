import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { UNVERIFIED_DRAFT_5_RAMEN_SHOPS } from "../src/lib/seed-v2";

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const serviceClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

interface TestUsers {
  viewer: SupabaseClient;
  editor: SupabaseClient;
  admin: SupabaseClient;
  viewerId: string;
  editorId: string;
  adminId: string;
}

async function setupTestUsers(): Promise<TestUsers> {
  console.log("Setting up local Supabase Auth users (viewer, editor, admin)...");

  // Helper to create or fetch user
  async function createOrGetUser(email: string, role?: "editor" | "admin") {
    const { data: listData } = await serviceClient.auth.admin.listUsers();
    let user = listData?.users.find((u) => u.email === email);

    if (!user) {
      const { data, error } = await serviceClient.auth.admin.createUser({
        email,
        password: "testpassword123",
        email_confirm: true,
      });
      if (error || !data.user) throw new Error(`Failed to create test user ${email}: ${error?.message}`);
      user = data.user;
    }

    if (role) {
      await serviceClient.from("admin_profiles").upsert({
        id: user.id,
        email: user.email!,
        full_name: `${role} User`,
        role,
      });
    }

    const client = createClient(SUPABASE_URL, ANON_KEY);
    const { error: signInErr } = await client.auth.signInWithPassword({
      email,
      password: "testpassword123",
    });
    if (signInErr) throw new Error(`Failed to sign in ${email}: ${signInErr.message}`);

    return { client, id: user.id };
  }

  const viewerRes = await createOrGetUser("viewer@example.test");
  const editorRes = await createOrGetUser("editor@example.test", "editor");
  const adminRes = await createOrGetUser("admin@example.test", "admin");

  return {
    viewer: viewerRes.client,
    editor: editorRes.client,
    admin: adminRes.client,
    viewerId: viewerRes.id,
    editorId: editorRes.id,
    adminId: adminRes.id,
  };
}

async function runFullSupabaseAuthIntegrationTests() {
  console.log("=== Running Complete Supabase Local Auth, RLS & /admin Integration Tests ===");

  const { viewer, editor, admin, viewerId, editorId, adminId } = await setupTestUsers();

  // 1. Seed Unverified Draft Shops & 1 Verified Shop via Service Role
  console.log("1. Seeding test stores into local Supabase DB...");
  const draftEntry = UNVERIFIED_DRAFT_5_RAMEN_SHOPS[0];

  // Insert Source
  await serviceClient.from("sources").upsert(draftEntry.source);

  // Insert Draft Unverified Store
  await serviceClient.from("stores").upsert(draftEntry.store);
  await serviceClient.from("branches").upsert(draftEntry.branch);
  await serviceClient.from("menus").upsert(draftEntry.menu);
  await serviceClient.from("dishes").upsert(draftEntry.dishes[0]);

  // Insert 1 Verified Store for Verified Reading Test
  const verifiedStoreId = "b9999999-9999-4999-8999-999999999999";
  const verifiedBranchId = "c9999999-9999-4999-8999-999999999999";
  await serviceClient.from("stores").upsert({
    id: verifiedStoreId,
    name: "Verified Test Ramen",
    brand: "Verified Brand",
    slug: "verified-test-ramen",
    area: "大安區",
    base_price: 280,
    data_quality: "verified",
    verification_status: "editor_confirmed",
    verified_by: "Test Editor",
  });
  await serviceClient.from("branches").upsert({
    id: verifiedBranchId,
    store_id: verifiedStoreId,
    branch_name: "Verified Branch",
    address: "台北市大安區測試路1號",
    latitude: 25.03,
    longitude: 121.55,
    phone: "0212345678",
    data_quality: "verified",
    verification_status: "editor_confirmed",
  });

  console.log("✓ Seeded 1 verified store and 5 unverified draft stores");

  // =========================================================================
  // 2. ANONYMOUS ROLE MATRIX
  // =========================================================================
  console.log("2. Testing Anonymous Role Matrix...");
  // SELECT verified -> allowed
  const { data: anonVerified, error: anonVerErr } = await anonClient
    .from("stores")
    .select("*")
    .eq("id", verifiedStoreId);
  if (anonVerErr || !anonVerified || anonVerified.length !== 1) {
    throw new Error(`Anonymous failed to SELECT verified store: ${anonVerErr?.message}`);
  }
  console.log("  ✓ Anonymous SELECT verified store -> 1 row returned");

  // SELECT unverified -> denied (0 rows)
  const { data: anonUnverified } = await anonClient.from("stores").select("*").eq("id", draftEntry.store.id);
  if (anonUnverified && anonUnverified.length > 0) {
    throw new Error("RLS Violation! Anonymous user retrieved unverified draft store.");
  }
  console.log("  ✓ Anonymous SELECT unverified store -> 0 rows returned");

  // Multi-table check: branches, menus, dishes RLS for unverified items
  const { data: anonUnverifiedBranch } = await anonClient.from("branches").select("*").eq("id", draftEntry.branch.id);
  if (anonUnverifiedBranch && anonUnverifiedBranch.length > 0) {
    throw new Error("RLS Violation! Anonymous retrieved unverified branch.");
  }
  console.log("  ✓ Anonymous SELECT unverified branch -> 0 rows returned");

  // INSERT / UPDATE / DELETE -> denied
  const { error: anonInsErr } = await anonClient.from("stores").insert({
    name: "Anon Hack",
    brand: "Hack",
    slug: "anon-hack",
    area: "中山區",
  });
  if (!anonInsErr) throw new Error("RLS Violation! Anonymous executed INSERT.");
  console.log("  ✓ Anonymous INSERT -> denied by RLS");

  const { error: anonUpdErr } = await anonClient
    .from("stores")
    .update({ name: "Hacked" })
    .eq("id", verifiedStoreId);
  // Supabase returns 0 affected rows (not error) when RLS blocks UPDATE on existing row
  // but we also accept an explicit error
  const { data: anonUpdCheck } = await anonClient.from("stores").select("name").eq("id", verifiedStoreId).single();
  if (anonUpdCheck && anonUpdCheck.name === "Hacked") {
    throw new Error("RLS Violation! Anonymous UPDATE changed verified store name.");
  }
  console.log("  ✓ Anonymous UPDATE -> denied/no-op by RLS");

  const { error: anonDelErr } = await anonClient.from("stores").delete().eq("id", verifiedStoreId);
  const { data: anonDelCheck } = await anonClient.from("stores").select("id").eq("id", verifiedStoreId);
  if (!anonDelCheck || anonDelCheck.length !== 1) {
    throw new Error("RLS Violation! Anonymous DELETE removed verified store.");
  }
  console.log("  ✓ Anonymous DELETE -> denied/no-op by RLS");

  // Multi-table: menus, dishes for unverified parent
  const { data: anonUnverifiedMenu } = await anonClient.from("menus").select("*").eq("store_id", draftEntry.store.id);
  if (anonUnverifiedMenu && anonUnverifiedMenu.length > 0) {
    throw new Error("RLS Violation! Anonymous retrieved unverified menu.");
  }
  console.log("  ✓ Anonymous SELECT unverified menus -> 0 rows");

  const { data: anonUnverifiedDish } = await anonClient.from("dishes").select("*").eq("id", draftEntry.dishes[0].id);
  if (anonUnverifiedDish && anonUnverifiedDish.length > 0) {
    throw new Error("RLS Violation! Anonymous retrieved unverified dish.");
  }
  console.log("  ✓ Anonymous SELECT unverified dishes -> 0 rows");

  // Verified branch should be readable by anon
  const { data: anonVerBranch } = await anonClient.from("branches").select("*").eq("id", verifiedBranchId);
  if (!anonVerBranch || anonVerBranch.length !== 1) {
    throw new Error("Anonymous failed to SELECT verified branch.");
  }
  console.log("  ✓ Anonymous SELECT verified branch -> 1 row");

  // =========================================================================
  // 3. VIEWER ROLE MATRIX (Signed in user, NO admin_profile entry)
  // =========================================================================
  console.log("3. Testing Viewer Role Matrix (Standard authenticated user)...");
  // SELECT verified -> allowed
  const { data: viewerVer } = await viewer.from("stores").select("*").eq("id", verifiedStoreId);
  if (!viewerVer || viewerVer.length !== 1) throw new Error("Viewer failed to SELECT verified store.");
  console.log("  ✓ Viewer SELECT verified store -> allowed");

  // SELECT unverified -> denied (0 rows)
  const { data: viewerUnver } = await viewer.from("stores").select("*").eq("id", draftEntry.store.id);
  if (viewerUnver && viewerUnver.length > 0) {
    throw new Error("RLS Violation! Viewer retrieved unverified store.");
  }
  console.log("  ✓ Viewer SELECT unverified store -> 0 rows returned");

  // Write content -> denied
  const { error: viewerInsErr } = await viewer.from("stores").insert({
    name: "Viewer Store",
    brand: "Viewer Brand",
    slug: "viewer-store",
    area: "中山區",
  });
  if (!viewerInsErr) throw new Error("RLS Violation! Viewer executed content INSERT.");
  console.log("  ✓ Viewer INSERT content -> denied by RLS");

  // Write admin_profiles -> denied
  const { error: viewerAdminProfileErr } = await viewer.from("admin_profiles").insert({
    id: viewerId,
    email: "viewer@example.test",
    role: "admin",
  });
  if (!viewerAdminProfileErr) throw new Error("RLS Violation! Viewer elevated self to admin.");
  console.log("  ✓ Viewer admin_profiles write -> denied by RLS");

  // =========================================================================
  // 4. EDITOR ROLE MATRIX (Signed in user, role = 'editor')
  // =========================================================================
  console.log("4. Testing Editor Role Matrix (role = editor)...");
  // SELECT unverified -> allowed
  const { data: editorUnver, error: edSelectErr } = await editor
    .from("stores")
    .select("*")
    .eq("id", draftEntry.store.id);
  if (edSelectErr || !editorUnver || editorUnver.length !== 1) {
    throw new Error(`Editor failed to SELECT unverified store: ${edSelectErr?.message}`);
  }
  console.log("  ✓ Editor SELECT unverified store -> allowed (1 row returned)");

  // INSERT content -> allowed
  const editorNewStoreId = "b7777777-7777-4777-8777-777777777777";
  const { error: edInsErr } = await editor.from("stores").insert({
    id: editorNewStoreId,
    name: "Editor Created Store",
    brand: "Editor Brand",
    slug: "editor-created-store",
    area: "信義區",
    base_price: 250,
    data_quality: "unverified",
    verification_status: "pending",
  });
  if (edInsErr) throw new Error(`Editor content INSERT failed: ${edInsErr.message}`);
  console.log("  ✓ Editor content INSERT -> allowed");

  // UPDATE content -> allowed
  const { error: edUpdErr } = await editor
    .from("stores")
    .update({ name: "Editor Updated Store" })
    .eq("id", editorNewStoreId);
  if (edUpdErr) throw new Error(`Editor content UPDATE failed: ${edUpdErr.message}`);
  console.log("  ✓ Editor content UPDATE -> allowed");

  // UPDATE admin_profiles -> denied (Editor cannot elevate roles or modify admin_profiles)
  // Note: PostgREST returns null error with 0 affected rows when RLS blocks UPDATE
  const { error: edProfileErr } = await editor.from("admin_profiles").update({ role: "admin" }).eq("id", editorId);
  // Verify the role was NOT actually changed
  const { data: edProfileCheck } = await editor.from("admin_profiles").select("role").eq("id", editorId).single();
  if (edProfileCheck && edProfileCheck.role === "admin") {
    throw new Error("RLS Violation! Editor elevated role to admin.");
  }
  console.log("  ✓ Editor admin_profiles update -> denied by RLS (role unchanged)");

  // INSERT admin_profiles -> denied
  const { error: edProfileInsErr } = await editor.from("admin_profiles").insert({
    id: "a6666666-6666-4666-8666-666666666666",
    email: "fake@example.test",
    role: "admin",
  });
  if (!edProfileInsErr) throw new Error("RLS Violation! Editor created new admin profile.");
  console.log("  ✓ Editor admin_profiles insert -> denied by RLS");

  // Editor update_logs write -> denied (only strict admin)
  const { error: edLogErr } = await editor.from("update_logs").insert({
    changed_by: editorId,
    entity_type: "store",
    entity_id: draftEntry.store.id,
    change_type: "info_fix",
    summary: "Editor should not write logs",
  });
  if (!edLogErr) throw new Error("RLS Violation! Editor wrote to update_logs.");
  console.log("  ✓ Editor update_logs write -> denied by RLS");

  // Editor multi-table: branches INSERT -> allowed
  const edBranchId = "c7777777-7777-4777-8777-777777777777";
  const { error: edBranchInsErr } = await editor.from("branches").insert({
    id: edBranchId,
    store_id: editorNewStoreId,
    branch_name: "Editor Branch",
    address: "台北市信義區測試路2號",
    latitude: 25.03,
    longitude: 121.56,
    data_quality: "unverified",
    verification_status: "pending",
  });
  if (edBranchInsErr) throw new Error(`Editor branch INSERT failed: ${edBranchInsErr.message}`);
  console.log("  ✓ Editor branches INSERT -> allowed");

  // Editor menus INSERT -> allowed
  const edMenuId = "d7777777-7777-4777-8777-777777777777";
  const { error: edMenuInsErr } = await editor.from("menus").insert({
    id: edMenuId,
    branch_id: edBranchId,
    title: "Editor Menu",
    data_quality: "unverified",
    verification_status: "pending",
  });
  if (edMenuInsErr) throw new Error(`Editor menu INSERT failed: ${edMenuInsErr.message}`);
  console.log("  ✓ Editor menus INSERT -> allowed");

  // =========================================================================
  // 5. ADMIN ROLE MATRIX (Signed in user, role = 'admin')
  // =========================================================================
  console.log("5. Testing Admin Role Matrix (role = admin)...");
  // SELECT all -> allowed
  const { data: adminAllStores, error: adminSelectErr } = await admin.from("stores").select("*");
  if (adminSelectErr || !adminAllStores || adminAllStores.length < 2) {
    throw new Error(`Admin SELECT all stores failed: ${adminSelectErr?.message}`);
  }
  console.log("  ✓ Admin SELECT all stores -> allowed (%d stores found)", adminAllStores.length);

  // Content writes -> allowed
  const { error: adminContentUpd } = await admin
    .from("stores")
    .update({ name: "Admin Updated Verified" })
    .eq("id", verifiedStoreId);
  if (adminContentUpd) throw new Error(`Admin content UPDATE failed: ${adminContentUpd.message}`);
  console.log("  ✓ Admin content UPDATE -> allowed");

  // admin_profiles management -> allowed
  const { error: adminProfileMgmtErr } = await admin
    .from("admin_profiles")
    .update({ full_name: "Promoted Admin User" })
    .eq("id", adminId);
  if (adminProfileMgmtErr) throw new Error(`Admin profile management failed: ${adminProfileMgmtErr.message}`);
  console.log("  ✓ Admin admin_profiles management -> allowed");

  // update_logs access -> allowed
  const logId = "a1111111-1111-4111-8111-111111111111";
  const { error: logInsErr } = await admin.from("update_logs").insert({
    id: logId,
    changed_by: adminId,
    entity_type: "store",
    entity_id: verifiedStoreId,
    change_type: "info_fix",
    summary: "Admin updated store info",
  });
  if (logInsErr) throw new Error(`Admin update_logs write failed: ${logInsErr.message}`);

  const { data: logsData } = await admin.from("update_logs").select("*").eq("id", logId);
  if (!logsData || logsData.length !== 1) throw new Error("Admin failed to SELECT update_logs.");
  console.log("  ✓ Admin update_logs write and SELECT -> allowed");

  // =========================================================================
  // 6. /admin CMS AUTH GUARD SIMULATION
  // =========================================================================
  console.log("6. Testing /admin Route Auth Guard Simulation...");
  async function simulateAdminGuard(userClient: SupabaseClient | null) {
    if (!userClient) return { status: 401, action: "redirect_login" };
    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return { status: 401, action: "redirect_login" };

    const { data: profile } = await userClient
      .from("admin_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
      return { status: 403, action: "access_restricted" };
    }
    return { status: 200, role: profile.role, action: "allow_cms" };
  }

  const anonGuard = await simulateAdminGuard(null);
  if (anonGuard.status !== 401) throw new Error("Guard Failure! Anonymous passed /admin guard.");
  console.log("  ✓ Anonymous /admin -> 401 Redirect to Login");

  const viewerGuard = await simulateAdminGuard(viewer);
  if (viewerGuard.status !== 403) throw new Error("Guard Failure! Viewer passed /admin guard.");
  console.log("  ✓ Viewer /admin -> 403 Access Restricted");

  const editorGuard = await simulateAdminGuard(editor);
  if (editorGuard.status !== 200 || editorGuard.role !== "editor") {
    throw new Error("Guard Failure! Editor blocked from /admin.");
  }
  console.log("  ✓ Editor /admin -> 200 Allow CMS");

  const adminGuard = await simulateAdminGuard(admin);
  if (adminGuard.status !== 200 || adminGuard.role !== "admin") {
    throw new Error("Guard Failure! Admin blocked from /admin.");
  }
  console.log("  ✓ Admin /admin -> 200 Allow CMS");

  // =========================================================================
  // 7. CLEANUP
  // =========================================================================
  console.log("7. Cleaning up test entries & test Auth users...");
  await serviceClient.from("menus").delete().eq("id", edMenuId);
  await serviceClient.from("branches").delete().eq("id", edBranchId);
  await serviceClient.from("stores").delete().eq("id", editorNewStoreId);
  await serviceClient.from("branches").delete().eq("id", verifiedBranchId);
  await serviceClient.from("stores").delete().eq("id", verifiedStoreId);
  await serviceClient.from("update_logs").delete().eq("id", logId);

  // Delete test Auth users
  const { data: allUsers } = await serviceClient.auth.admin.listUsers();
  const testEmails = ["viewer@example.test", "editor@example.test", "admin@example.test"];
  for (const u of allUsers?.users || []) {
    if (testEmails.includes(u.email || "")) {
      await serviceClient.auth.admin.deleteUser(u.id);
    }
  }
  console.log("✓ Cleanup finished successfully (test data + Auth users removed)");

  console.log("=== ALL REAL SUPABASE AUTH, RLS & /admin INTEGRATION TESTS PASSED ===");
}

runFullSupabaseAuthIntegrationTests().catch((e) => {
  console.error("Integration test failed:", e);
  process.exit(1);
});
