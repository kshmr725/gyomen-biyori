import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { VerificationEntityType } from "@/lib/types/database";
import type {
  VerificationCheckView,
  VerificationEntityOption,
  VerificationWorkbenchData,
} from "@/lib/verification/model";

type LooseRecord = Record<string, unknown> & { id: string };

function valueToText(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function entityCurrentValue(entity: LooseRecord | undefined, fieldName: string): string {
  if (!entity) return "Entity unavailable";
  if (fieldName === "coordinates") {
    return `${valueToText(entity.latitude)}, ${valueToText(entity.longitude)}`;
  }
  if (fieldName === "opening_hours") {
    return `${valueToText(entity.open_time)}–${valueToText(entity.close_time)}`;
  }
  return valueToText(entity[fieldName]);
}

export async function readVerificationWorkbench(
  client: SupabaseClient,
  storeId: string,
  role: "editor" | "admin",
): Promise<VerificationWorkbenchData | null> {
  const { data: store, error: storeError } = await client
    .from("stores")
    .select("id, name, data_quality, verification_status, checked_at, verified_by")
    .eq("id", storeId)
    .maybeSingle();

  if (storeError || !store) return null;

  const { data: branches = [] } = await client.from("branches").select("*").eq("store_id", storeId);
  const branchIds = branches?.map((branch) => branch.id) ?? [];
  const [{ data: menus = [] }, { data: hours = [] }] = branchIds.length
    ? await Promise.all([
        client.from("menus").select("*").in("branch_id", branchIds),
        client.from("opening_hours").select("*").in("branch_id", branchIds),
      ])
    : [{ data: [] }, { data: [] }];
  const menuIds = menus?.map((menu) => menu.id) ?? [];
  const { data: dishes = [] } = menuIds.length
    ? await client.from("dishes").select("*").in("menu_id", menuIds)
    : { data: [] };

  const [{ data: checks = [] }, { data: sources = [] }] = await Promise.all([
    client.from("verification_checks").select("*").eq("store_id", storeId).order("created_at"),
    client.from("sources").select("id, name, source_url").order("name"),
  ]);

  const sourceLinkIds = (checks ?? [])
    .map((check) => check.source_link_id)
    .filter((id): id is string => Boolean(id));
  const reviewerIds = (checks ?? [])
    .map((check) => check.reviewed_by)
    .filter((id): id is string => Boolean(id));
  const [{ data: sourceLinks = [] }, { data: reviewers = [] }] = await Promise.all([
    sourceLinkIds.length
      ? client.from("source_links").select("*").in("id", sourceLinkIds)
      : Promise.resolve({ data: [] }),
    reviewerIds.length
      ? client.from("admin_profiles").select("id, email, full_name").in("id", reviewerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const storeRecord = store as LooseRecord;
  const entityRecords = new Map<string, LooseRecord>([[`store:${store.id}`, storeRecord]]);
  const entities: VerificationEntityOption[] = [
    { id: store.id, type: "store", label: `Store · ${store.name}` },
  ];

  for (const branch of branches ?? []) {
    entityRecords.set(`branch:${branch.id}`, branch as LooseRecord);
    entities.push({ id: branch.id, type: "branch", label: `Branch · ${branch.branch_name}` });
  }
  for (const menu of menus ?? []) {
    entityRecords.set(`menu:${menu.id}`, menu as LooseRecord);
    entities.push({ id: menu.id, type: "menu", label: `Menu · ${menu.title}` });
  }
  for (const dish of dishes ?? []) {
    entityRecords.set(`dish:${dish.id}`, dish as LooseRecord);
    entities.push({ id: dish.id, type: "dish", label: `Dish · ${dish.name}` });
  }
  for (const hour of hours ?? []) {
    entityRecords.set(`opening_hours:${hour.id}`, hour as LooseRecord);
    entities.push({
      id: hour.id,
      type: "opening_hours",
      label: `Hours · weekday ${hour.day_of_week}`,
    });
  }

  const entityLabels = new Map(entities.map((entity) => [`${entity.type}:${entity.id}`, entity.label]));
  const sourceLinkMap = new Map((sourceLinks ?? []).map((sourceLink) => [sourceLink.id, sourceLink]));
  const reviewerMap = new Map(
    (reviewers ?? []).map((reviewer) => [
      reviewer.id,
      reviewer.full_name || reviewer.email || reviewer.id,
    ]),
  );

  const checkViews: VerificationCheckView[] = (checks ?? []).map((check) => {
    const entityType = check.entity_type as VerificationEntityType;
    const entityKey = `${entityType}:${check.entity_id}`;
    const sourceLink = check.source_link_id ? sourceLinkMap.get(check.source_link_id) : null;
    return {
      id: check.id,
      entityType,
      entityId: check.entity_id,
      entityLabel: entityLabels.get(entityKey) ?? check.entity_id,
      fieldName: check.field_name,
      currentValue: entityCurrentValue(entityRecords.get(entityKey), check.field_name),
      isRequired: check.is_required,
      status: check.status,
      sourceLinkId: check.source_link_id,
      sourceUrl: sourceLink?.url ?? null,
      sourceComplete: Boolean(sourceLink?.url && sourceLink.checked_at && sourceLink.checked_by),
      reviewedBy: check.reviewed_by
        ? reviewerMap.get(check.reviewed_by) ?? check.reviewed_by
        : null,
      reviewedAt: check.reviewed_at,
      notes: check.notes,
    };
  });

  const requiredChecks = checkViews.filter((check) => check.isRequired);
  const unresolvedCount = checkViews.filter(
    (check) => check.status !== "approved" || (check.isRequired && !check.sourceComplete),
  ).length;
  const { data: auditLogs = [] } =
    role === "admin"
      ? await client
          .from("update_logs")
          .select("*")
          .eq("entity_id", storeId)
          .order("created_at", { ascending: false })
      : { data: [] };

  return {
    store: {
      id: store.id,
      name: store.name,
      data_quality: store.data_quality,
      verification_status: store.verification_status,
      checked_at: store.checked_at,
      verified_by: store.verified_by,
    },
    checks: checkViews,
    entities,
    sources: (sources ?? []).map((source) => ({
      id: source.id,
      label: source.name,
      url: source.source_url,
    })),
    auditLogs: (auditLogs ?? []).map((log) => ({
      id: log.id,
      summary: log.summary,
      changedBy: log.changed_by,
      createdAt: log.created_at,
      beforeState: log.before_state,
      afterState: log.after_state,
    })),
    requiredApproved: requiredChecks.filter((check) => check.status === "approved").length,
    requiredTotal: requiredChecks.length,
    unresolvedCount,
  };
}
