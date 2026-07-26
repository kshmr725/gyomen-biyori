export type DataQuality = "verified" | "unverified";
export type BrothCategory =
  | "tonkotsu"
  | "tori_pai_tan"
  | "shoyu"
  | "shio"
  | "miso"
  | "niboshi"
  | "ebi"
  | "spicy"
  | "tsukemen"
  | "limited";
export type QueueLevel = "none" | "under30" | "long";
export type ChangeType = "price_change" | "hours_update" | "closure" | "info_fix" | "menu_update";

export interface DatabaseStore {
  id: string;
  name: string;
  brand: string;
  slug: string;
  area: string;
  description: string | null;
  base_price: number;
  data_quality: DataQuality;
  checked_at: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseBranch {
  id: string;
  store_id: string;
  branch_name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  data_quality: DataQuality;
  checked_at: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseDish {
  id: string;
  menu_id: string;
  name: string;
  price: number;
  is_signature: boolean;
  spiciness_level: number;
  broth_category: BrothCategory | null;
  description: string | null;
  data_quality: DataQuality;
  checked_at: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseSource {
  id: string;
  name: string;
  category: string;
  trust_tier: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseOpeningHour {
  id: string;
  store_id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_break: boolean;
  break_start_time: string | null;
  break_end_time: string | null;
  data_quality: DataQuality;
  checked_at: string | null;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseEditorialEntry {
  id: string;
  store_id: string;
  editor_name: string;
  editor_note: string;
  recommended_dish: string | null;
  gyomen_score_overall: number | null;
  gyomen_score_broth: number | null;
  gyomen_score_noodle: number | null;
  gyomen_score_chashu: number | null;
  gyomen_score_value: number | null;
  data_quality: DataQuality;
  checked_at: string;
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseAdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}
