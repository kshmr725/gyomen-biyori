import type { UnverifiedDraftStoreEntry } from "@/lib/seed-v2";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const URL_REGEX = /^https?:\/\/.+/i;
const PHONE_REGEX = /^[0-9+() -]{7,20}$/;

export type ImporterValidationResult = {
  valid: boolean;
  errors: string[];
};

export class SeedImporter {
  /**
   * Strictly validate draft store record against UUID, FK, and URL requirements
   */
  static validateEntry(entry: UnverifiedDraftStoreEntry): ImporterValidationResult {
    const errors: string[] = [];

    // 1. UUID Validation
    if (!UUID_REGEX.test(entry.store.id)) errors.push(`Store ID is not a valid UUID: ${entry.store.id}`);
    if (!UUID_REGEX.test(entry.branch.id)) errors.push(`Branch ID is not a valid UUID: ${entry.branch.id}`);
    if (!UUID_REGEX.test(entry.menu.id)) errors.push(`Menu ID is not a valid UUID: ${entry.menu.id}`);
    if (!UUID_REGEX.test(entry.source.id)) errors.push(`Source ID is not a valid UUID: ${entry.source.id}`);

    // 2. FK Relationships Validation
    if (entry.branch.store_id !== entry.store.id) {
      errors.push(`Branch store_id (${entry.branch.store_id}) does not match Store ID (${entry.store.id})`);
    }
    if (entry.menu.branch_id !== entry.branch.id) {
      errors.push(`Menu branch_id (${entry.menu.branch_id}) does not match Branch ID (${entry.branch.id})`);
    }

    // 3. Source URL Validation
    if (!entry.source.source_url || !URL_REGEX.test(entry.source.source_url)) {
      errors.push(`Source URL must be a valid http(s) link: ${entry.source.source_url}`);
    }

    // 4. Phone Validation (Must be valid phone number format or null)
    if (entry.branch.phone !== null && !PHONE_REGEX.test(entry.branch.phone)) {
      errors.push(`Branch phone must be null or valid phone digits: ${entry.branch.phone}`);
    }

    // 5. Dishes FK & Menu validation
    for (const dish of entry.dishes) {
      if (!UUID_REGEX.test(dish.id)) errors.push(`Dish ID is not a valid UUID: ${dish.id}`);
      if (dish.menu_id !== entry.menu.id) {
        errors.push(`Dish menu_id (${dish.menu_id}) does not match Menu ID (${entry.menu.id})`);
      }
    }

    // 6. Data Quality & Status check (Must be unverified & pending initially)
    if (entry.store.data_quality !== "unverified" || entry.store.verification_status !== "pending") {
      errors.push(`Unverified draft store must have data_quality="unverified" and verification_status="pending"`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
