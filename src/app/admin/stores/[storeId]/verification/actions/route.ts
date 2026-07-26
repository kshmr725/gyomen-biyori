import { NextRequest, NextResponse } from "next/server";
import type { VerificationCheckStatus } from "@/lib/types/database";
import { getCmsAuth, type CmsActor } from "@/lib/auth/cms-auth";

type ActionBody = {
  action?: string;
  checkId?: string;
  entityType?: string;
  entityId?: string;
  fieldName?: string;
  isRequired?: boolean;
  notes?: string | null;
  status?: VerificationCheckStatus;
  sourceId?: string;
  url?: string;
  title?: string | null;
};

function errorResponse(
  request: NextRequest,
  storeId: string,
  message: string,
  status: number,
) {
  if (request.headers.get("accept")?.includes("text/html")) {
    const target = new URL(`/admin/stores/${storeId}/verification`, request.url);
    target.searchParams.set("error", `Final approval blocked · ${message}`);
    return NextResponse.redirect(target, 303);
  }
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function requireActionActor(request: NextRequest, storeId: string) {
  const auth = await getCmsAuth();
  if (auth.kind === "anonymous") {
    return { response: errorResponse(request, storeId, "Authentication required", 401) };
  }
  if (auth.kind === "viewer") {
    return { response: errorResponse(request, storeId, "CMS role required", 403) };
  }
  return { actor: auth.actor };
}

async function findStore(actor: CmsActor, storeId: string) {
  const { data } = await actor.client.from("stores").select("id").eq("id", storeId).maybeSingle();
  return data;
}

async function findCheck(actor: CmsActor, storeId: string, checkId: string) {
  const { data } = await actor.client
    .from("verification_checks")
    .select("*")
    .eq("id", checkId)
    .eq("store_id", storeId)
    .maybeSingle();
  return data;
}

async function freshStore(actor: CmsActor, storeId: string) {
  const { data, error } = await actor.client
    .from("stores")
    .select("id, name, data_quality, verification_status, checked_at, verified_by")
    .eq("id", storeId)
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ storeId: string }> },
) {
  const { storeId } = await params;
  const auth = await requireActionActor(request, storeId);
  if ("response" in auth) return auth.response;
  const actor = auth.actor;

  if (!(await findStore(actor, storeId))) {
    return errorResponse(request, storeId, "Store not found", 404);
  }

  let body: ActionBody;
  try {
    body = (await request.json()) as ActionBody;
  } catch {
    return errorResponse(request, storeId, "Invalid JSON body", 400);
  }

  try {
    if (body.action === "create_check") {
      if (!body.entityType || !body.entityId || !body.fieldName?.trim()) {
        return errorResponse(request, storeId, "Entity and field name are required", 400);
      }
      const { data, error } = await actor.client
        .from("verification_checks")
        .insert({
          store_id: storeId,
          entity_type: body.entityType,
          entity_id: body.entityId,
          field_name: body.fieldName.trim(),
          is_required: body.isRequired !== false,
          status: "missing",
          notes: body.notes?.trim() || null,
        })
        .select()
        .single();
      if (error) return errorResponse(request, storeId, error.message, 409);
      return NextResponse.json({ ok: true, check: data, message: "Checklist item created" });
    }

    if (body.action === "attach_source") {
      if (!body.checkId || !body.sourceId || !body.url) {
        return errorResponse(request, storeId, "Check, source, and URL are required", 400);
      }
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(body.url);
      } catch {
        return errorResponse(request, storeId, "Source URL must be valid", 400);
      }
      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        return errorResponse(request, storeId, "Source URL must use http or https", 400);
      }

      const check = await findCheck(actor, storeId, body.checkId);
      if (!check) return errorResponse(request, storeId, "Checklist item not found", 404);

      const sourcePayload = {
        source_id: body.sourceId,
        entity_type: check.entity_type,
        entity_id: check.entity_id,
        url: parsedUrl.toString(),
        title: body.title?.trim() || null,
        checked_by: actor.user.id,
        checked_at: new Date().toISOString(),
      };
      const sourceQuery = check.source_link_id
        ? actor.client
            .from("source_links")
            .update(sourcePayload)
            .eq("id", check.source_link_id)
            .select()
            .single()
        : actor.client.from("source_links").insert(sourcePayload).select().single();
      const { data: sourceLink, error: sourceError } = await sourceQuery;
      if (sourceError) return errorResponse(request, storeId, sourceError.message, 409);

      const { error: checkError } = await actor.client
        .from("verification_checks")
        .update({ source_link_id: sourceLink.id })
        .eq("id", check.id);
      if (checkError) return errorResponse(request, storeId, checkError.message, 409);

      return NextResponse.json({
        ok: true,
        sourceLink,
        message: check.source_link_id ? "Source link replaced" : "Source link attached",
      });
    }

    if (body.action === "update_check") {
      if (!body.checkId) return errorResponse(request, storeId, "Check ID is required", 400);
      const check = await findCheck(actor, storeId, body.checkId);
      if (!check) return errorResponse(request, storeId, "Checklist item not found", 404);

      if (body.status && actor.role === "editor") {
        const validEditorTransition =
          (check.status === "missing" && body.status === "needs_review") ||
          (check.status === "needs_review" && body.status === "source_confirmed");
        if (!validEditorTransition) {
          return errorResponse(request, storeId, "Editor status transition is not allowed", 403);
        }
      }
      if (
        body.status &&
        actor.role === "admin" &&
        !["needs_review", "source_confirmed", "approved", "rejected"].includes(body.status)
      ) {
        return errorResponse(request, storeId, "Admin status transition is not allowed", 400);
      }

      const update: Record<string, unknown> = {};
      if (body.notes !== undefined) update.notes = body.notes?.trim() || null;
      if (body.status) {
        update.status = body.status;
        update.reviewed_by = actor.user.id;
        update.reviewed_at = new Date().toISOString();
      }
      if (Object.keys(update).length === 0) {
        return errorResponse(request, storeId, "No checklist changes supplied", 400);
      }

      const { data, error } = await actor.client
        .from("verification_checks")
        .update(update)
        .eq("id", check.id)
        .select()
        .single();
      if (error) return errorResponse(request, storeId, error.message, 409);
      return NextResponse.json({ ok: true, check: data, message: "Checklist item updated" });
    }

    if (body.action === "submit_sources") {
      const { error } = await actor.client.rpc("set_store_verification_status", {
        p_store_id: storeId,
        p_next_status: "source_checked",
        p_notes: body.notes?.trim() || "Sources submitted from CMS",
      });
      if (error) return errorResponse(request, storeId, error.message, 409);
      return NextResponse.json({
        ok: true,
        store: await freshStore(actor, storeId),
        message: "Sources submitted for admin review",
      });
    }

    if (body.action === "confirm_store") {
      if (actor.role !== "admin") return errorResponse(request, storeId, "Admin role required", 403);
      const { error } = await actor.client.rpc("set_store_verification_status", {
        p_store_id: storeId,
        p_next_status: "editor_confirmed",
        p_notes: body.notes?.trim() || "Admin confirmed editor review",
      });
      if (error) return errorResponse(request, storeId, error.message, 409);
      return NextResponse.json({
        ok: true,
        store: await freshStore(actor, storeId),
        message: "Store review confirmed",
      });
    }

    if (body.action === "promote") {
      if (actor.role !== "admin") return errorResponse(request, storeId, "Admin role required", 403);
      const { error } = await actor.client.rpc("promote_store_verification", {
        p_store_id: storeId,
      });
      if (error) return errorResponse(request, storeId, error.message, 409);
      return NextResponse.json({
        ok: true,
        store: await freshStore(actor, storeId),
        reread: true,
        message: "Store promoted to verified",
      });
    }

    return errorResponse(request, storeId, "Unknown verification action", 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected verification error";
    return errorResponse(request, storeId, message, 500);
  }
}
