import type {
  DataQuality,
  VerificationCheckStatus,
  VerificationEntityType,
  VerificationStatus,
} from "@/lib/types/database";

export type VerificationStoreSummary = {
  id: string;
  name: string;
  data_quality: DataQuality;
  verification_status: VerificationStatus;
  checked_at: string | null;
  verified_by: string | null;
};

export type VerificationEntityOption = {
  id: string;
  type: VerificationEntityType;
  label: string;
};

export type VerificationSourceOption = {
  id: string;
  label: string;
  url: string;
};

export type VerificationCheckView = {
  id: string;
  entityType: VerificationEntityType;
  entityId: string;
  entityLabel: string;
  fieldName: string;
  currentValue: string;
  isRequired: boolean;
  status: VerificationCheckStatus;
  sourceLinkId: string | null;
  sourceUrl: string | null;
  sourceComplete: boolean;
  reviewedBy: string | null;
  reviewedAt: string | null;
  notes: string | null;
};

export type VerificationAuditLog = {
  id: string;
  summary: string;
  changedBy: string | null;
  createdAt: string;
  beforeState: unknown;
  afterState: unknown;
};

export type VerificationWorkbenchData = {
  store: VerificationStoreSummary;
  checks: VerificationCheckView[];
  entities: VerificationEntityOption[];
  sources: VerificationSourceOption[];
  auditLogs: VerificationAuditLog[];
  requiredApproved: number;
  requiredTotal: number;
  unresolvedCount: number;
};

export type VerificationActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export function promotionDisabledReason(
  data: VerificationWorkbenchData,
  role: "editor" | "admin",
): string | null {
  if (role !== "admin") return "只有 admin 可以執行最終核准";
  if (!["editor_confirmed", "field_verified"].includes(data.store.verification_status)) {
    return "店家必須先完成 editor_confirmed";
  }
  if (data.requiredTotal === 0) return "尚未建立 required checks";
  if (data.requiredApproved !== data.requiredTotal) return "仍有 required checks 尚未核准";
  if (data.unresolvedCount > 0) return "仍有未解決、待審核或被退回的 checks";
  if (data.checks.some((check) => check.isRequired && !check.sourceComplete)) {
    return "required checks 的來源資料尚不完整";
  }
  return null;
}

export function reduceVerificationAction(
  current: VerificationActionResult | null,
  next: VerificationActionResult,
): VerificationActionResult {
  if (!next.ok) return { ok: false, error: next.error };
  return next.message ? next : current ?? next;
}
