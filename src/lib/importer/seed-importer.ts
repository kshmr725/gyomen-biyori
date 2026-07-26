import type { DataQuality } from "@/lib/types/database";

export type SeedStoreRecord = {
  name: string;
  brand: string;
  slug: string;
  area: string;
  description?: string;
  basePrice: number;
  dataQuality: DataQuality;
  sourceName: string;
  sourceUrl?: string;
};

export type ImportResult = {
  total: number;
  successCount: number;
  failedCount: number;
  errors: Array<{ slug: string; reason: string }>;
};

export class SeedImporter {
  /**
   * Validate seed store record against schema requirements
   */
  static validateRecord(record: SeedStoreRecord): { valid: boolean; reason?: string } {
    if (!record.name || record.name.trim().length === 0) {
      return { valid: false, reason: "Store name is required" };
    }
    if (!record.brand || record.brand.trim().length === 0) {
      return { valid: false, reason: "Store brand is required" };
    }
    if (!record.slug || !/^[a-z0-9-]+$/.test(record.slug)) {
      return { valid: false, reason: "Slug must be lowercase alphanumeric with hyphens" };
    }
    if (record.basePrice < 0) {
      return { valid: false, reason: "Base price must be a non-negative number" };
    }
    return { valid: true };
  }

  /**
   * Batch parse and dry-run import seed store records
   */
  static dryRun(records: SeedStoreRecord[]): ImportResult {
    const result: ImportResult = {
      total: records.length,
      successCount: 0,
      failedCount: 0,
      errors: [],
    };

    for (const record of records) {
      const validation = this.validateRecord(record);
      if (validation.valid) {
        result.successCount++;
      } else {
        result.failedCount++;
        result.errors.push({
          slug: record.slug || "unknown",
          reason: validation.reason || "Validation failed",
        });
      }
    }

    return result;
  }
}
