"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { VerificationCheckStatus } from "@/lib/types/database";
import {
  promotionDisabledReason,
  reduceVerificationAction,
  type VerificationActionResult,
  type VerificationCheckView,
  type VerificationWorkbenchData,
} from "@/lib/verification/model";

const STATUS_LABELS: Record<VerificationCheckStatus, string> = {
  missing: "缺來源",
  needs_review: "待審核",
  source_confirmed: "已確認",
  approved: "已核准",
  rejected: "被退回",
};

function statusPresentation(check: VerificationCheckView) {
  return { className: check.status.replace("_", "-"), label: STATUS_LABELS[check.status] };
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function VerificationWorkbench({
  data,
  role,
  initialError,
}: {
  data: VerificationWorkbenchData;
  role: "editor" | "admin";
  initialError: string | null;
}) {
  const router = useRouter();
  const [actionResult, setActionResult] = useState<VerificationActionResult | null>(
    initialError ? { ok: false, error: initialError } : null,
  );
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const promotionReason = promotionDisabledReason(data, role);
  const actionEndpoint = `/admin/stores/${data.store.id}/verification/actions`;

  const requiredProgress = useMemo(() => {
    if (data.requiredTotal === 0) return 0;
    return Math.round((data.requiredApproved / data.requiredTotal) * 100);
  }, [data.requiredApproved, data.requiredTotal]);

  async function performAction(body: Record<string, unknown>, actionLabel: string) {
    setPendingAction(actionLabel);
    setActionResult(null);
    try {
      const response = await fetch(actionEndpoint, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      const next: VerificationActionResult =
        response.ok && payload.ok
          ? { ok: true, message: payload.message || "資料庫已更新" }
          : { ok: false, error: payload.error || `Request failed (${response.status})` };
      setActionResult((current) => reduceVerificationAction(current, next));
      if (next.ok) {
        router.refresh();
      }
      return next.ok;
    } catch (error) {
      setActionResult({
        ok: false,
        error: error instanceof Error ? error.message : "無法連線到 verification action",
      });
      return false;
    } finally {
      setPendingAction(null);
    }
  }

  async function createCheck(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const [entityType, entityId] = String(form.get("entity")).split(":");
    const succeeded = await performAction(
      {
        action: "create_check",
        entityType,
        entityId,
        fieldName: form.get("fieldName"),
        isRequired: form.get("isRequired") === "on",
        notes: form.get("notes"),
      },
      "create-check",
    );
    if (succeeded) event.currentTarget.reset();
  }

  async function attachSource(event: FormEvent<HTMLFormElement>, checkId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await performAction(
      {
        action: "attach_source",
        checkId,
        sourceId: form.get("sourceId"),
        url: form.get("url"),
        title: form.get("title"),
      },
      `source-${checkId}`,
    );
  }

  async function updateNotes(event: FormEvent<HTMLFormElement>, checkId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await performAction(
      { action: "update_check", checkId, notes: form.get("notes") },
      `notes-${checkId}`,
    );
  }

  const updateStatus = (checkId: string, status: VerificationCheckStatus) =>
    performAction({ action: "update_check", checkId, status }, `${status}-${checkId}`);

  return (
    <div className="verification-workbench">
      <section className="verification-hero">
        <div className="verification-title-block">
          <p className="eyebrow">SINGLE-STORE VERIFICATION · {role.toUpperCase()}</p>
          <h1>{data.store.name}</h1>
          <p>
            逐欄比對資料與來源，再由 admin 完成最終核准。頁面每次操作成功後都會重新讀取資料庫。
          </p>
        </div>

        <div className="verification-progress-card" aria-label="required checks progress">
          <div className="verification-progress-ring" style={{ "--progress": `${requiredProgress}%` } as React.CSSProperties}>
            <strong>{requiredProgress}%</strong>
            <span>required checks</span>
          </div>
          <div>
            <b>
              {data.requiredApproved} / {data.requiredTotal}
            </b>
            <span>已核准</span>
            <b>{data.unresolvedCount}</b>
            <span>unresolved</span>
          </div>
        </div>
      </section>

      <section className="verification-metrics" aria-label="store verification metadata">
        <article>
          <span>Data quality</span>
          <strong className={`quality-${data.store.data_quality}`}>{data.store.data_quality}</strong>
        </article>
        <article>
          <span>Verification status</span>
          <strong>{data.store.verification_status}</strong>
        </article>
        <article>
          <span>Checked at</span>
          <strong>{formatDate(data.store.checked_at)}</strong>
        </article>
        <article>
          <span>Verified by</span>
          <strong className="mono-value">{data.store.verified_by || "—"}</strong>
        </article>
      </section>

      {actionResult && (
        <div
          className={`verification-notice ${actionResult.ok ? "is-success" : "is-error"}`}
          role="alert"
        >
          <strong>{actionResult.ok ? "已重新讀取資料庫" : "操作未完成"}</strong>
          <span>{actionResult.ok ? actionResult.message : actionResult.error}</span>
        </div>
      )}

      <section className="verification-command-bar">
        <div>
          <p className="eyebrow">WORKFLOW CONTROL</p>
          <h2>{role === "admin" ? "Admin approval desk" : "Editor source desk"}</h2>
        </div>
        <div className="verification-command-actions">
          {data.store.verification_status === "pending" && (
            <button
              className="button button-ghost"
              disabled={Boolean(pendingAction)}
              onClick={() => performAction({ action: "submit_sources" }, "submit-sources")}
            >
              提交來源檢查
            </button>
          )}
          {role === "admin" && data.store.verification_status === "source_checked" && (
            <button
              className="button button-ghost"
              disabled={Boolean(pendingAction)}
              onClick={() => performAction({ action: "confirm_store" }, "confirm-store")}
            >
              確認 editor review
            </button>
          )}
          <div className="promotion-control">
            <button
              className="button button-primary"
              disabled={Boolean(pendingAction) || Boolean(promotionReason)}
              onClick={() => performAction({ action: "promote" }, "promote")}
            >
              Final promotion
            </button>
            {promotionReason && <small>{promotionReason}</small>}
          </div>
        </div>
      </section>

      <section className="verification-legend" aria-label="check status legend">
        <span className="check-status missing">缺來源</span>
        <span className="check-status source-incomplete">來源不完整</span>
        <span className="check-status needs-review">待審核</span>
        <span className="check-status source-confirmed">已確認</span>
        <span className="check-status approved">已核准</span>
        <span className="check-status rejected">被退回</span>
      </section>

      <section className="verification-checklist-section">
        <div className="verification-section-heading">
          <div>
            <p className="eyebrow">FIELD CHECKLIST</p>
            <h2>欄位與來源對照</h2>
          </div>
          <span>{data.checks.length} checks</span>
        </div>

        {data.checks.length === 0 ? (
          <div className="verification-empty">
            <strong>尚未建立 checklist</strong>
            <p>從下方新增第一個必查欄位；新項目一律由 missing 狀態開始。</p>
          </div>
        ) : (
          <div className="verification-table-wrap">
            <table className="verification-table">
              <thead>
                <tr>
                  <th>Entity / field</th>
                  <th>Current value</th>
                  <th>Requirement</th>
                  <th>Status</th>
                  <th>Source</th>
                  <th>Review</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.checks.map((check) => {
                  const status = statusPresentation(check);
                  return (
                    <tr key={check.id}>
                      <td>
                        <span className="entity-kicker">{check.entityType}</span>
                        <strong>{check.entityLabel}</strong>
                        <code>{check.entityId}</code>
                        <b className="field-name">{check.fieldName}</b>
                      </td>
                      <td className="current-value">{check.currentValue}</td>
                      <td>
                        <span className={`requirement-mark ${check.isRequired ? "required" : "optional"}`}>
                          {check.isRequired ? "required" : "optional"}
                        </span>
                      </td>
                      <td>
                        <span className={`check-status ${status.className}`}>{status.label}</span>
                      </td>
                      <td>
                        {check.sourceUrl ? (
                          <>
                            <a href={check.sourceUrl} target="_blank" rel="noreferrer" className="source-link">
                              {check.sourceUrl}
                            </a>
                            {!check.sourceComplete && (
                              <span className="check-status source-incomplete">來源不完整</span>
                            )}
                          </>
                        ) : (
                          <span className="check-status missing">缺來源</span>
                        )}
                      </td>
                      <td>
                        <strong>{check.reviewedBy || "—"}</strong>
                        <span>{formatDate(check.reviewedAt)}</span>
                        <p>{check.notes || "No notes"}</p>
                      </td>
                      <td>
                        <div className="check-action-stack">
                          {check.status === "missing" && (
                            <button
                              onClick={() => updateStatus(check.id, "needs_review")}
                              disabled={Boolean(pendingAction)}
                            >
                              標記待審核
                            </button>
                          )}
                          {check.status === "needs_review" && (
                            <button
                              onClick={() => updateStatus(check.id, "source_confirmed")}
                              disabled={Boolean(pendingAction) || !check.sourceComplete}
                            >
                              確認來源
                            </button>
                          )}
                          {role === "admin" && !["approved", "rejected"].includes(check.status) && (
                            <>
                              <button
                                className="approve"
                                onClick={() => updateStatus(check.id, "approved")}
                                disabled={Boolean(pendingAction) || !check.sourceComplete}
                              >
                                核准
                              </button>
                              <button
                                className="reject"
                                onClick={() => updateStatus(check.id, "rejected")}
                                disabled={Boolean(pendingAction)}
                              >
                                退回
                              </button>
                            </>
                          )}
                        </div>

                        <details className="check-editor">
                          <summary>來源與備註</summary>
                          <form onSubmit={(event) => attachSource(event, check.id)}>
                            <label>
                              Source record
                              <select name="sourceId" required defaultValue="">
                                <option value="" disabled>
                                  選擇來源
                                </option>
                                {data.sources.map((source) => (
                                  <option key={source.id} value={source.id}>
                                    {source.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              Source URL
                              <input
                                name="url"
                                type="url"
                                required
                                defaultValue={check.sourceUrl || ""}
                                placeholder="https://official.example/page"
                              />
                            </label>
                            <label>
                              Title
                              <input name="title" placeholder="官方門市資訊" />
                            </label>
                            <button disabled={Boolean(pendingAction)}>
                              {check.sourceLinkId ? "更換來源" : "補上來源"}
                            </button>
                          </form>
                          <form onSubmit={(event) => updateNotes(event, check.id)}>
                            <label>
                              Notes
                              <textarea name="notes" rows={3} defaultValue={check.notes || ""} />
                            </label>
                            <button disabled={Boolean(pendingAction)}>儲存 notes</button>
                          </form>
                        </details>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="verification-create-check">
        <div>
          <p className="eyebrow">ADD CHECK</p>
          <h2>建立欄位查證項目</h2>
          <p>選擇實體與欄位；伺服器會驗證 entity 確實屬於目前店家。</p>
        </div>
        <form onSubmit={createCheck}>
          <label>
            Entity
            <select name="entity" required defaultValue={`${data.entities[0]?.type}:${data.entities[0]?.id}`}>
              {data.entities.map((entity) => (
                <option key={`${entity.type}:${entity.id}`} value={`${entity.type}:${entity.id}`}>
                  {entity.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Field name
            <input name="fieldName" required placeholder="name / address / price" />
          </label>
          <label className="check-required-toggle">
            <input name="isRequired" type="checkbox" defaultChecked />
            Required
          </label>
          <label>
            Initial notes
            <textarea name="notes" rows={2} placeholder="查證範圍或缺漏說明" />
          </label>
          <button className="button button-primary" disabled={Boolean(pendingAction)}>
            建立 missing check
          </button>
        </form>
      </section>

      {role === "admin" && (
        <section className="verification-audit">
          <div className="verification-section-heading">
            <div>
              <p className="eyebrow">IMMUTABLE HISTORY</p>
              <h2>Audit log</h2>
            </div>
            <span>{data.auditLogs.length} events</span>
          </div>
          {data.auditLogs.length === 0 ? (
            <p className="verification-empty">尚無 workflow status 變更。</p>
          ) : (
            <ol>
              {data.auditLogs.map((log) => (
                <li key={log.id}>
                  <time>{formatDate(log.createdAt)}</time>
                  <strong>{log.summary}</strong>
                  <code>{log.changedBy || "system"}</code>
                  <details>
                    <summary>Before / after</summary>
                    <pre>{JSON.stringify({ before: log.beforeState, after: log.afterState }, null, 2)}</pre>
                  </details>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
    </div>
  );
}
