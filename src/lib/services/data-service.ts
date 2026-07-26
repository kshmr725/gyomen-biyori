import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { DatabaseStore, DatabaseSource } from "@/lib/types/database";

export type CreateStoreInput = {
  name: string;
  brand: string;
  slug: string;
  area: string;
  description?: string;
  basePrice: number;
  sourceId?: string;
};

export class DataService {
  /**
   * Fetch stores list with fail-safe fallback
   */
  static async getStores(): Promise<DatabaseStore[]> {
    const client = getSupabaseBrowserClient();
    if (!client) return [];
    try {
      const { data, error } = await client.from("stores").select("*").order("created_at", { ascending: false });
      if (error || !data) return [];
      return data as DatabaseStore[];
    } catch {
      return [];
    }
  }

  /**
   * Fetch sources list with fail-safe fallback
   */
  static async getSources(): Promise<DatabaseSource[]> {
    const client = getSupabaseBrowserClient();
    if (!client) return [];
    try {
      const { data, error } = await client.from("sources").select("*").order("name", { ascending: true });
      if (error || !data) return [];
      return data as DatabaseSource[];
    } catch {
      return [];
    }
  }

  /**
   * Create a new Store entity (Admin service)
   */
  static async createStore(input: CreateStoreInput): Promise<{ success: boolean; id?: string; error?: string }> {
    const client = getSupabaseBrowserClient();
    if (!client) return { success: false, error: "Supabase client not configured" };

    try {
      const newRecord = {
        name: input.name,
        brand: input.brand,
        slug: input.slug,
        area: input.area,
        description: input.description ?? null,
        base_price: input.basePrice,
        // New records always enter the verification workflow as drafts. Final
        // verification is available only through the database RPC guard.
        data_quality: "unverified",
        verification_status: "pending",
        checked_at: null,
        source_id: input.sourceId ?? null,
      };

      const { data, error } = await client.from("stores").insert([newRecord]).select();
      if (error) return { success: false, error: error.message };
      if (!data || data.length === 0) return { success: false, error: "No data returned after insert" };

      return { success: true, id: (data[0] as DatabaseStore).id };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error during store creation";
      return { success: false, error: msg };
    }
  }
}
