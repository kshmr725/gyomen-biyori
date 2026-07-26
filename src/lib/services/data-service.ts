import { getSupabaseBrowserClient } from "@/lib/supabase";
import type { DatabaseStore, DatabaseSource, DataQuality } from "@/lib/types/database";

export type CreateStoreInput = {
  name: string;
  brand: string;
  slug: string;
  area: string;
  description?: string;
  basePrice: number;
  dataQuality: DataQuality;
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
        data_quality: input.dataQuality,
        checked_at: input.dataQuality === "verified" ? new Date().toISOString() : null,
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

  /**
   * Update Store data quality & verification timestamp
   */
  static async updateStoreQuality(storeId: string, quality: DataQuality): Promise<boolean> {
    const client = getSupabaseBrowserClient();
    if (!client) return false;

    try {
      const { error } = await client
        .from("stores")
        .update({
          data_quality: quality,
          checked_at: quality === "verified" ? new Date().toISOString() : null,
        })
        .eq("id", storeId);

      return !error;
    } catch {
      return false;
    }
  }
}
