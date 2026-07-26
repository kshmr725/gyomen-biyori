import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { startNextTestServer } from "./next-test-server";

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
    } else {
      // A previous interrupted run must not leave the viewer with a CMS role.
      await serviceClient.from("admin_profiles").delete().eq("id", user.id);
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

  // Clean known fixtures first so the suite remains repeatable even after an
  // interrupted previous run. These IDs are test-only and do not overlap the
  // optional five-store draft seed.
  await serviceClient.from("verification_checks").delete().eq("store_id", "b8888888-8888-4888-8888-888888888888");
  await serviceClient.from("verification_checks").delete().eq("store_id", "b8222222-2222-4822-8822-222222222222");
  await serviceClient.from("source_links").delete().in("id", [
    "d8888888-8888-4888-8888-888888888888",
    "e8888888-8888-4888-8888-888888888888",
  ]);
  await serviceClient.from("dishes").delete().in("id", [
    "f9111111-1111-4911-8911-111111111111",
  ]);
  await serviceClient.from("menus").delete().in("id", [
    "d9111111-1111-4911-8911-111111111111",
    "d7777777-7777-4777-8777-777777777777",
  ]);
  await serviceClient.from("branches").delete().in("id", [
    "c9111111-1111-4911-8911-111111111111",
    "c7777777-7777-4777-8777-777777777777",
    "c9999999-9999-4999-8999-999999999999",
    "c8888888-8888-4888-8888-888888888888",
    "c8222222-2222-4822-8822-222222222222",
  ]);
  await serviceClient.from("stores").delete().in("id", [
    "b9111111-1111-4911-8911-111111111111",
    "b7777777-7777-4777-8777-777777777777",
    "b9999999-9999-4999-8999-999999999999",
    "b8888888-8888-4888-8888-888888888888",
    "b8222222-2222-4822-8822-222222222222",
  ]);
  await serviceClient.from("sources").delete().in("id", [
    "a9111111-1111-4911-8911-111111111111",
    "a8888888-8888-4888-8888-888888888888",
    "a8222222-2222-4822-8822-222222222222",
  ]);
  await serviceClient.from("update_logs").delete().in("entity_id", [
    "b8888888-8888-4888-8888-888888888888",
    "b9999999-9999-4999-8999-999999999999",
    "b8222222-2222-4822-8822-222222222222",
  ]);
  await serviceClient.from("update_logs").delete().eq("id", "a1111111-1111-4111-8111-111111111111");

  // 1. Create self-contained fixtures; this suite never depends on local seeds.
  console.log("1. Seeding test stores into local Supabase DB...");
  const draftEntry = {
    source: {
      id: "a9111111-1111-4911-8911-111111111111",
      name: "Integration draft source",
      category: "official_web",
      source_url: "https://example.test/integration-draft",
      trust_tier: "high",
    },
    store: {
      id: "b9111111-1111-4911-8911-111111111111",
      name: "Integration Draft Ramen",
      brand: "Integration Draft",
      slug: "integration-draft-ramen",
      area: "中山區",
      base_price: 300,
      data_quality: "unverified",
      verification_status: "pending",
    },
    branch: {
      id: "c9111111-1111-4911-8911-111111111111",
      store_id: "b9111111-1111-4911-8911-111111111111",
      branch_name: "Integration Draft Branch",
      address: "台北市中山區測試路 1 號",
      latitude: 25.05,
      longitude: 121.52,
      data_quality: "unverified",
      verification_status: "pending",
    },
    menu: {
      id: "d9111111-1111-4911-8911-111111111111",
      branch_id: "c9111111-1111-4911-8911-111111111111",
      title: "Integration Draft Menu",
      data_quality: "unverified",
      verification_status: "pending",
    },
    dishes: [
      {
        id: "f9111111-1111-4911-8911-111111111111",
        menu_id: "d9111111-1111-4911-8911-111111111111",
        name: "Integration Draft Dish",
        price: 300,
        data_quality: "unverified",
        verification_status: "pending",
      },
    ],
  };

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

  console.log("✓ Seeded 1 verified store and 1 unverified draft fixture");

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
  // 6. REAL NEXT.JS ROUTE GUARD + CMS ACTIONS
  // =========================================================================
  console.log("6. Testing the real Next.js verification route and server-side guard...");
  const routeSourceId = "a8222222-2222-4822-8822-222222222222";
  const routeStoreId = "b8222222-2222-4822-8822-222222222222";
  const routeBranchId = "c8222222-2222-4822-8822-222222222222";
  await serviceClient.from("sources").upsert({
    id: routeSourceId,
    name: "Route test official source",
    category: "official_web",
    source_url: "https://example.test/route-source",
    trust_tier: "high",
  });
  await serviceClient.from("stores").upsert({
    id: routeStoreId,
    name: "Route Guard Test Ramen",
    brand: "Route Guard Test",
    slug: "route-guard-test-ramen",
    area: "中山區",
    base_price: 290,
    data_quality: "unverified",
    verification_status: "pending",
  });
  await serviceClient.from("branches").upsert({
    id: routeBranchId,
    store_id: routeStoreId,
    branch_name: "Route Test Branch",
    address: "台北市中山區路由路 1 號",
    latitude: 25.05,
    longitude: 121.52,
    data_quality: "unverified",
    verification_status: "pending",
  });

  async function accessToken(client: SupabaseClient) {
    const {
      data: { session },
    } = await client.auth.getSession();
    if (!session?.access_token) throw new Error("Test user session has no access token.");
    return session.access_token;
  }

  const [viewerToken, editorToken, adminToken] = await Promise.all([
    accessToken(viewer),
    accessToken(editor),
    accessToken(admin),
  ]);
  const routePath = `/admin/stores/${routeStoreId}/verification`;
  const actionPath = `${routePath}/actions`;
  const nextServer = await startNextTestServer({ supabaseUrl: SUPABASE_URL, anonKey: ANON_KEY });
  let routeSourceLinkId: string | null = null;

  const roleHeaders = (token: string, accept = "application/json") => ({
    authorization: `Bearer ${token}`,
    accept,
    "content-type": "application/json",
  });
  const postAction = (token: string, body: Record<string, unknown>, accept = "application/json") =>
    fetch(`${nextServer.baseUrl}${actionPath}`, {
      method: "POST",
      headers: roleHeaders(token, accept),
      body: JSON.stringify(body),
      redirect: "manual",
    });

  try {
    const anonymousPage = await fetch(`${nextServer.baseUrl}${routePath}`, { redirect: "manual" });
    if (![307, 308].includes(anonymousPage.status)) {
      throw new Error(`Guard Failure! Anonymous verification route returned ${anonymousPage.status}, expected redirect.`);
    }

    const viewerPage = await fetch(`${nextServer.baseUrl}${routePath}`, {
      headers: roleHeaders(viewerToken),
      redirect: "manual",
    });
    if (viewerPage.status !== 403) {
      throw new Error(`Guard Failure! Viewer verification route returned ${viewerPage.status}, expected 403.`);
    }

    const editorPage = await fetch(`${nextServer.baseUrl}${routePath}`, { headers: roleHeaders(editorToken) });
    const editorHtml = await editorPage.text();
    if (
      editorPage.status !== 200 ||
      !editorHtml.includes("Route Guard Test Ramen") ||
      !editorHtml.includes("required checks") ||
      !editorHtml.includes("unresolved")
    ) {
      throw new Error(`Editor did not receive the real verification workbench (status ${editorPage.status}).`);
    }

    const adminPage = await fetch(`${nextServer.baseUrl}${routePath}`, { headers: roleHeaders(adminToken) });
    if (adminPage.status !== 200 || !(await adminPage.text()).includes("Admin approval")) {
      throw new Error(`Admin did not receive final-approval controls (status ${adminPage.status}).`);
    }

    const missingStorePage = await fetch(
      `${nextServer.baseUrl}/admin/stores/00000000-0000-4000-8000-000000000000/verification`,
      { headers: roleHeaders(editorToken), redirect: "manual" },
    );
    if (missingStorePage.status !== 404) {
      throw new Error(`Missing store route returned ${missingStorePage.status}, expected 404.`);
    }

    const createCheckResponse = await postAction(editorToken, {
      action: "create_check",
      entityType: "store",
      entityId: routeStoreId,
      fieldName: "name",
      isRequired: true,
      notes: "Verify the official store name",
    });
    const createCheckJson = (await createCheckResponse.json()) as { check?: { id?: string }; error?: string };
    const routeCheckId = createCheckJson.check?.id;
    if (createCheckResponse.status !== 200 || !routeCheckId) {
      throw new Error(`Editor could not create a checklist item: ${createCheckJson.error}`);
    }

    const needsReviewResponse = await postAction(editorToken, {
      action: "update_check",
      checkId: routeCheckId,
      status: "needs_review",
      notes: "Source located; detailed review pending",
    });
    if (needsReviewResponse.status !== 200) throw new Error("Editor could not move missing -> needs_review.");

    const attachSourceResponse = await postAction(editorToken, {
      action: "attach_source",
      checkId: routeCheckId,
      sourceId: routeSourceId,
      url: "https://example.test/route-source/store-name",
      title: "Official store profile",
    });
    const attachSourceJson = (await attachSourceResponse.json()) as {
      sourceLink?: { id?: string };
      error?: string;
    };
    routeSourceLinkId = attachSourceJson.sourceLink?.id ?? null;
    if (attachSourceResponse.status !== 200 || !routeSourceLinkId) {
      throw new Error(`Editor could not attach a source link: ${attachSourceJson.error}`);
    }

    const sourceConfirmedResponse = await postAction(editorToken, {
      action: "update_check",
      checkId: routeCheckId,
      status: "source_confirmed",
    });
    if (sourceConfirmedResponse.status !== 200) {
      throw new Error("Editor could not move needs_review -> source_confirmed.");
    }

    const submitResponse = await postAction(editorToken, { action: "submit_sources" });
    if (submitResponse.status !== 200) throw new Error("Editor could not submit pending -> source_checked.");

    const editorPromoteResponse = await postAction(editorToken, { action: "promote" });
    if (editorPromoteResponse.status !== 403) {
      throw new Error(`Editor final approval returned ${editorPromoteResponse.status}, expected 403.`);
    }

    const confirmResponse = await postAction(adminToken, { action: "confirm_store" });
    if (confirmResponse.status !== 200) throw new Error("Admin could not move source_checked -> editor_confirmed.");

    const incompletePromotionResponse = await postAction(adminToken, { action: "promote" }, "text/html");
    if (incompletePromotionResponse.status !== 303) {
      throw new Error(`Incomplete admin promotion returned ${incompletePromotionResponse.status}, expected 303.`);
    }
    const promotionErrorLocation = incompletePromotionResponse.headers.get("location");
    if (!promotionErrorLocation) throw new Error("Promotion error did not provide a workbench redirect.");
    const promotionErrorPage = await fetch(promotionErrorLocation, { headers: roleHeaders(adminToken) });
    if (promotionErrorPage.status !== 200 || !(await promotionErrorPage.text()).includes("Final approval blocked")) {
      throw new Error("Promotion RPC error was not displayed by the real verification page.");
    }

    const approveResponse = await postAction(adminToken, {
      action: "update_check",
      checkId: routeCheckId,
      status: "approved",
    });
    if (approveResponse.status !== 200) throw new Error("Admin could not approve the required check.");

    const { error: editorApprovedEvidenceUpdateError } = await editor
      .from("source_links")
      .update({ url: "https://example.test/editor-direct-approved-evidence-bypass" })
      .eq("id", routeSourceLinkId);
    const editorApprovedEvidenceRouteResponse = await postAction(editorToken, {
      action: "attach_source",
      checkId: routeCheckId,
      sourceId: routeSourceId,
      url: "https://example.test/editor-route-approved-evidence-bypass",
      title: "Editor replacement must be rejected",
    });
    if (!editorApprovedEvidenceUpdateError) {
      throw new Error("Editor directly modified source evidence used by an approved verification check.");
    }
    if (editorApprovedEvidenceRouteResponse.status !== 403) {
      throw new Error(
        `Editor replacement of approved evidence returned ${editorApprovedEvidenceRouteResponse.status}, expected 403.`,
      );
    }

    const { data: protectedEvidence } = await admin
      .from("source_links")
      .select("url")
      .eq("id", routeSourceLinkId)
      .single();
    if (protectedEvidence?.url !== "https://example.test/route-source/store-name") {
      throw new Error("Rejected editor mutations changed the approved source evidence.");
    }

    const { error: adminApprovedEvidenceUpdateError } = await admin
      .from("source_links")
      .update({ url: "https://example.test/admin-reviewed-approved-evidence" })
      .eq("id", routeSourceLinkId);
    if (adminApprovedEvidenceUpdateError) {
      throw new Error(`Strict admin could not update approved evidence: ${adminApprovedEvidenceUpdateError.message}`);
    }

    const promoteResponse = await postAction(adminToken, { action: "promote" });
    const promoteJson = (await promoteResponse.json()) as {
      store?: { data_quality?: string; verified_by?: string | null };
      reread?: boolean;
      error?: string;
    };
    if (
      promoteResponse.status !== 200 ||
      promoteJson.store?.data_quality !== "verified" ||
      promoteJson.store?.verified_by !== adminId ||
      promoteJson.reread !== true
    ) {
      throw new Error(`Successful promotion did not return freshly re-read DB state: ${promoteJson.error}`);
    }

    const promotedPage = await fetch(`${nextServer.baseUrl}${routePath}`, { headers: roleHeaders(adminToken) });
    const promotedHtml = await promotedPage.text();
    if (
      promotedPage.status !== 200 ||
      !promotedHtml.includes("verified") ||
      !promotedHtml.includes("Final verification approved")
    ) {
      throw new Error("Promoted workbench did not re-read store state and audit log from the database.");
    }
  } finally {
    await nextServer.stop();
  }
  console.log("  ✓ Real route guard, editor/admin actions, RPC errors, and post-promotion re-read verified");

  // =========================================================================
  // 7. VERIFICATION WORKFLOW — direct JWT/RLS contract, no pre-existing seed
  // =========================================================================
  console.log("7. Testing verification workflow with self-contained fixtures...");
  const verificationSourceId = "a8888888-8888-4888-8888-888888888888";
  const verificationStoreId = "b8888888-8888-4888-8888-888888888888";
  const verificationBranchId = "c8888888-8888-4888-8888-888888888888";
  const storeSourceLinkId = "d8888888-8888-4888-8888-888888888888";
  const branchSourceLinkId = "e8888888-8888-4888-8888-888888888888";

  await serviceClient.from("sources").upsert({
    id: verificationSourceId,
    name: "Verification test source",
    category: "official_web",
    source_url: "https://example.test/verification-source",
    trust_tier: "high",
  });
  await serviceClient.from("stores").upsert({
    id: verificationStoreId,
    name: "Verification Test Ramen",
    brand: "Verification Test Brand",
    slug: "verification-test-ramen",
    area: "大安區",
    base_price: 280,
    data_quality: "unverified",
    verification_status: "pending",
  });
  await serviceClient.from("branches").upsert({
    id: verificationBranchId,
    store_id: verificationStoreId,
    branch_name: "Verification Test Branch",
    address: "台北市大安區驗證路 1 號",
    latitude: 25.03,
    longitude: 121.55,
    data_quality: "unverified",
    verification_status: "pending",
  });

  // This insert intentionally expects the new checked_by column and is the
  // first feature assertion. Before the migration, the following checklist
  // insert fails because verification_checks does not exist.
  await serviceClient.from("source_links").upsert([
    {
      id: storeSourceLinkId,
      source_id: verificationSourceId,
      entity_type: "store",
      entity_id: verificationStoreId,
      url: "https://example.test/verification-source/store",
      checked_by: editorId,
    },
    {
      id: branchSourceLinkId,
      source_id: verificationSourceId,
      entity_type: "branch",
      entity_id: verificationBranchId,
      url: "https://example.test/verification-source/branch",
      checked_by: editorId,
    },
  ]);

  const { error: editorCheckInsertError } = await editor.from("verification_checks").insert({
    store_id: verificationStoreId,
    entity_type: "store",
    entity_id: verificationStoreId,
    field_name: "name",
    is_required: true,
    status: "missing",
  });
  if (editorCheckInsertError) {
    throw new Error(`Editor could not create a checklist item: ${editorCheckInsertError.message}`);
  }

  const { data: storeChecks } = await editor
    .from("verification_checks")
    .select("id")
    .eq("store_id", verificationStoreId)
    .eq("field_name", "name");
  const storeNameCheckId = storeChecks?.[0]?.id as string | undefined;
  if (!storeNameCheckId) throw new Error("Editor-created store checklist item was not returned.");

  const { data: anonChecks } = await anonClient.from("verification_checks").select("id").eq("store_id", verificationStoreId);
  if (anonChecks && anonChecks.length > 0) throw new Error("RLS Violation! Anonymous read verification checks.");

  const { data: viewerChecks } = await viewer.from("verification_checks").select("id").eq("store_id", verificationStoreId);
  if (viewerChecks && viewerChecks.length > 0) throw new Error("RLS Violation! Viewer read verification checks.");

  const { error: editorDirectQualityError } = await editor
    .from("stores")
    .update({ data_quality: "verified" })
    .eq("id", verificationStoreId);
  if (!editorDirectQualityError) throw new Error("Editor bypassed the promotion guard with a direct data_quality update.");

  const { error: editorDirectVerificationFieldsError } = await editor
    .from("stores")
    .update({
      verification_status: "editor_confirmed",
      verified_by: editorId,
      checked_at: new Date().toISOString(),
    })
    .eq("id", verificationStoreId);
  if (!editorDirectVerificationFieldsError) {
    throw new Error("Editor bypassed the workflow with direct verification_status, verified_by, or checked_at updates.");
  }

  const { error: editorSourceCheckedError } = await editor.rpc("set_store_verification_status", {
    p_store_id: verificationStoreId,
    p_next_status: "source_checked",
    p_notes: "Editor submitted sources",
  });
  if (editorSourceCheckedError) throw new Error(`Editor could not submit source review: ${editorSourceCheckedError.message}`);

  const { error: editorApproveError } = await editor
    .from("verification_checks")
    .update({
      status: "approved",
      source_link_id: storeSourceLinkId,
      reviewed_by: editorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", storeNameCheckId);
  if (!editorApproveError) throw new Error("Editor bypassed admin-only checklist approval.");

  const { error: editorSourceConfirmError } = await editor
    .from("verification_checks")
    .update({
      source_link_id: storeSourceLinkId,
      reviewed_by: editorId,
      reviewed_at: new Date().toISOString(),
      status: "needs_review",
    })
    .eq("id", storeNameCheckId);
  if (editorSourceConfirmError) {
    throw new Error(`Editor could not move a sourced checklist item to needs_review: ${editorSourceConfirmError.message}`);
  }

  const { error: editorStoreConfirmError } = await editor
    .from("verification_checks")
    .update({ status: "source_confirmed" })
    .eq("id", storeNameCheckId);
  if (editorStoreConfirmError) {
    throw new Error(`Editor could not confirm a sourced checklist item: ${editorStoreConfirmError.message}`);
  }

  const { data: branchCheck, error: branchCheckInsertError } = await editor
    .from("verification_checks")
    .insert({
      store_id: verificationStoreId,
      entity_type: "branch",
      entity_id: verificationBranchId,
      field_name: "address",
      is_required: true,
      status: "missing",
    })
    .select("id")
    .single();
  if (branchCheckInsertError) throw new Error(`Editor could not create a branch checklist item: ${branchCheckInsertError.message}`);

  const { error: branchNeedsReviewError } = await editor
    .from("verification_checks")
    .update({
      status: "needs_review",
      source_link_id: branchSourceLinkId,
      reviewed_by: editorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", branchCheck.id);
  if (branchNeedsReviewError) {
    throw new Error(`Editor could not move the branch check to needs_review: ${branchNeedsReviewError.message}`);
  }

  const { error: branchSourceConfirmError } = await editor
    .from("verification_checks")
    .update({ status: "source_confirmed" })
    .eq("id", branchCheck.id);
  if (branchSourceConfirmError) {
    throw new Error(`Editor could not confirm the sourced branch check: ${branchSourceConfirmError.message}`);
  }

  const { error: adminDirectQualityError } = await admin
    .from("stores")
    .update({ data_quality: "verified" })
    .eq("id", verificationStoreId);
  if (!adminDirectQualityError) throw new Error("Admin bypassed the promotion guard with a direct data_quality update.");

  const { error: editorPromoteError } = await editor.rpc("promote_store_verification", { p_store_id: verificationStoreId });
  if (!editorPromoteError) throw new Error("Editor bypassed strict-admin final promotion.");

  const { error: adminConfirmError } = await admin.rpc("set_store_verification_status", {
    p_store_id: verificationStoreId,
    p_next_status: "editor_confirmed",
    p_notes: "Admin reviewed the checklist",
  });
  if (adminConfirmError) throw new Error(`Admin could not confirm the verification review: ${adminConfirmError.message}`);

  const { error: incompletePromotionError } = await admin.rpc("promote_store_verification", { p_store_id: verificationStoreId });
  if (!incompletePromotionError) throw new Error("Promotion succeeded before all required checks were approved.");

  const { error: adminApproveError } = await admin
    .from("verification_checks")
    .update({ status: "approved", reviewed_by: adminId, reviewed_at: new Date().toISOString() })
    .eq("store_id", verificationStoreId);
  if (adminApproveError) throw new Error(`Admin could not approve required checks: ${adminApproveError.message}`);

  const { error: promotionError } = await admin.rpc("promote_store_verification", { p_store_id: verificationStoreId });
  if (promotionError) throw new Error(`Strict-admin promotion failed: ${promotionError.message}`);

  const { data: promotedStore } = await admin
    .from("stores")
    .select("data_quality, verification_status, verified_by, checked_at")
    .eq("id", verificationStoreId)
    .single();
  if (
    !promotedStore ||
    promotedStore.data_quality !== "verified" ||
    promotedStore.verification_status !== "editor_confirmed" ||
    promotedStore.verified_by !== adminId ||
    !promotedStore.checked_at
  ) {
    throw new Error("Promotion did not atomically set the verified store fields.");
  }

  const { data: promotionLogs } = await admin
    .from("update_logs")
    .select("before_state, after_state")
    .eq("entity_id", verificationStoreId);
  if (!promotionLogs || promotionLogs.length < 3) {
    throw new Error("Verification transitions and final promotion were not written to update_logs.");
  }
  console.log("  ✓ RLS, source checks, strict-admin promotion, and audit logging enforced");

  // =========================================================================
  // 8. CLEANUP
  // =========================================================================
  console.log("8. Cleaning up test entries & test Auth users...");
  await serviceClient.from("verification_checks").delete().eq("store_id", routeStoreId);
  if (routeSourceLinkId) await serviceClient.from("source_links").delete().eq("id", routeSourceLinkId);
  await serviceClient.from("branches").delete().eq("id", routeBranchId);
  await serviceClient.from("stores").delete().eq("id", routeStoreId);
  await serviceClient.from("sources").delete().eq("id", routeSourceId);
  await serviceClient.from("update_logs").delete().eq("entity_id", routeStoreId);
  await serviceClient.from("verification_checks").delete().eq("store_id", verificationStoreId);
  await serviceClient.from("source_links").delete().in("id", [storeSourceLinkId, branchSourceLinkId]);
  await serviceClient.from("branches").delete().eq("id", verificationBranchId);
  await serviceClient.from("stores").delete().eq("id", verificationStoreId);
  await serviceClient.from("sources").delete().eq("id", verificationSourceId);
  await serviceClient.from("dishes").delete().eq("id", draftEntry.dishes[0].id);
  await serviceClient.from("menus").delete().eq("id", draftEntry.menu.id);
  await serviceClient.from("branches").delete().eq("id", draftEntry.branch.id);
  await serviceClient.from("stores").delete().eq("id", draftEntry.store.id);
  await serviceClient.from("sources").delete().eq("id", draftEntry.source.id);
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
