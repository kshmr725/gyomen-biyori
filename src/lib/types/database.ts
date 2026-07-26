export type DataQuality = "verified" | "unverified";
export type VerificationStatus = "pending" | "source_checked" | "editor_confirmed" | "field_verified";
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

export interface DatabaseSource {
  id: string; // UUID
  name: string;
  category: string;
  source_url: string;
  trust_tier: string;
  notes: string | null;
  checked_at: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseStore {
  id: string; // UUID
  name: string;
  brand: string;
  slug: string;
  area: string;
  description: string | null;
  base_price: number;
  data_quality: DataQuality;
  verification_status: VerificationStatus;
  verified_by: string | null;
  verification_notes: string | null;
  checked_at: string | null;
  source_id: string | null; // UUID
  created_at: string;
  updated_at: string;
}

export interface DatabaseBranch {
  id: string; // UUID
  store_id: string; // UUID
  branch_name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string | null; // Valid phone number string or null only
  data_quality: DataQuality;
  verification_status: VerificationStatus;
  verified_by: string | null;
  checked_at: string | null;
  source_id: string | null; // UUID
  created_at: string;
  updated_at: string;
}

export interface DatabaseOpeningHour {
  id: string; // UUID
  branch_id: string; // UUID
  day_of_week: number;
  open_time: string; // HH:mm:ss
  close_time: string; // HH:mm:ss
  is_24_hours: boolean;
  is_break: boolean;
  break_start_time: string | null;
  break_end_time: string | null;
  data_quality: DataQuality;
  verification_status: VerificationStatus;
  checked_at: string | null;
  source_id: string | null; // UUID
  created_at: string;
  updated_at: string;
}

export interface DatabaseMenu {
  id: string; // UUID
  branch_id: string; // UUID
  title: string;
  version: string | null;
  is_active: boolean;
  data_quality: DataQuality;
  verification_status: VerificationStatus;
  checked_at: string | null;
  source_id: string | null; // UUID
  created_at: string;
  updated_at: string;
}

export interface DatabaseDish {
  id: string; // UUID
  menu_id: string; // UUID - references DatabaseMenu.id
  name: string;
  price: number;
  is_signature: boolean;
  spiciness_level: number;
  broth_category: BrothCategory | null;
  description: string | null;
  data_quality: DataQuality;
  verification_status: VerificationStatus;
  checked_at: string | null;
  source_id: string | null; // UUID
  created_at: string;
  updated_at: string;
}

export interface DatabasePhoto {
  id: string; // UUID
  store_id: string | null; // UUID
  branch_id: string | null; // UUID
  dish_id: string | null; // UUID
  url: string;
  caption: string | null;
  category: string;
  source_credit: string | null;
  data_quality: DataQuality;
  verification_status: VerificationStatus;
  checked_at: string | null;
  source_id: string | null; // UUID
  created_at: string;
  updated_at: string;
}

export interface DatabaseQueueRecord {
  id: string; // UUID
  branch_id: string; // UUID
  level: QueueLevel;
  peak_wait_minutes: number;
  off_peak_wait_minutes: number;
  queue_rules: string | null;
  data_quality: DataQuality;
  verification_status: VerificationStatus;
  checked_at: string | null;
  source_id: string | null; // UUID
  created_at: string;
  updated_at: string;
}

export interface DatabaseEditorialEntry {
  id: string; // UUID
  store_id: string; // UUID
  editor_name: string;
  editor_note: string;
  recommended_dish: string | null;
  gyomen_score_overall: number | null;
  gyomen_score_broth: number | null;
  gyomen_score_noodle: number | null;
  gyomen_score_chashu: number | null;
  gyomen_score_value: number | null;
  data_quality: DataQuality;
  verification_status: VerificationStatus;
  checked_at: string | null;
  source_id: string | null; // UUID
  created_at: string;
  updated_at: string;
}

export interface DatabaseAdminProfile {
  id: string; // UUID
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
  updated_at: string;
}
