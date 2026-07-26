-- ============================================================================
-- 魚麵日和 (GYOMEN BIYORI) — Data v2 Schema Migration
-- Version: 20260726144500
-- Tables: 17 Required Core Domain Tables
-- Features: RLS Policies, Timestamps Triggers, Enums, Foreign Keys
-- ============================================================================

-- 1. ENUMS
CREATE TYPE data_quality_enum AS ENUM ('verified', 'unverified');
CREATE TYPE broth_category_enum AS ENUM ('tonkotsu', 'tori_pai_tan', 'shoyu', 'shio', 'miso', 'niboshi', 'ebi', 'spicy', 'tsukemen', 'limited');
CREATE TYPE queue_level_enum AS ENUM ('none', 'under30', 'long');
CREATE TYPE change_type_enum AS ENUM ('price_change', 'hours_update', 'closure', 'info_fix', 'menu_update');

-- Helper trigger function for automatic updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 1. admin_profiles (管理者權限實體)
-- ----------------------------------------------------------------------------
CREATE TABLE admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'editor',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 2. sources (資料來源主表)
-- ----------------------------------------------------------------------------
CREATE TABLE sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- official_web, google_maps, facebook, instagram, threads, ptt, dcard, editor_visit
  trust_tier TEXT NOT NULL DEFAULT 'medium', -- tier1, tier2, tier3
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 3. stores (拉麵店家/品牌主表)
-- ----------------------------------------------------------------------------
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  area TEXT NOT NULL,
  description TEXT,
  base_price INTEGER NOT NULL DEFAULT 250,
  data_quality data_quality_enum NOT NULL DEFAULT 'unverified',
  checked_at TIMESTAMPTZ,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 4. branches (分店實體)
-- ----------------------------------------------------------------------------
CREATE TABLE branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  branch_name TEXT NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  phone TEXT,
  data_quality data_quality_enum NOT NULL DEFAULT 'unverified',
  checked_at TIMESTAMPTZ,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 5. opening_hours (營業時間實體)
-- ----------------------------------------------------------------------------
CREATE TABLE opening_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  is_break BOOLEAN NOT NULL DEFAULT FALSE,
  break_start_time TIME,
  break_end_time TIME,
  data_quality data_quality_enum NOT NULL DEFAULT 'unverified',
  checked_at TIMESTAMPTZ,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 6. nearby_transit (周邊捷運與交通實體)
-- ----------------------------------------------------------------------------
CREATE TABLE nearby_transit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  station_name TEXT NOT NULL,
  line_name TEXT,
  exit_name TEXT,
  walk_minutes INTEGER NOT NULL,
  data_quality data_quality_enum NOT NULL DEFAULT 'unverified',
  checked_at TIMESTAMPTZ,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 7. menus (菜單主表)
-- ----------------------------------------------------------------------------
CREATE TABLE menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '主打菜單',
  version TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  data_quality data_quality_enum NOT NULL DEFAULT 'unverified',
  checked_at TIMESTAMPTZ,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 8. dishes (單品餐點實體)
-- ----------------------------------------------------------------------------
CREATE TABLE dishes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  is_signature BOOLEAN NOT NULL DEFAULT FALSE,
  spiciness_level INTEGER NOT NULL DEFAULT 0,
  broth_category broth_category_enum,
  description TEXT,
  data_quality data_quality_enum NOT NULL DEFAULT 'unverified',
  checked_at TIMESTAMPTZ,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 9. photos (照片資源表)
-- ----------------------------------------------------------------------------
CREATE TABLE photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  caption TEXT,
  category TEXT NOT NULL DEFAULT 'dish', -- cover, dish, storefront, menu
  source_credit TEXT,
  data_quality data_quality_enum NOT NULL DEFAULT 'unverified',
  checked_at TIMESTAMPTZ,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 10. tags (特色標籤表)
-- ----------------------------------------------------------------------------
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'broth', -- broth, feature, service, scene
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 11. branch_tags (分店標籤關聯表)
-- ----------------------------------------------------------------------------
CREATE TABLE branch_tags (
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (branch_id, tag_id)
);

-- ----------------------------------------------------------------------------
-- 12. payment_methods (支付方式定義表)
-- ----------------------------------------------------------------------------
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- cash, credit_card, line_pay, jkopay, apple_pay
  name TEXT NOT NULL,
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 13. branch_payment_methods (分店支付方式關聯表)
-- ----------------------------------------------------------------------------
CREATE TABLE branch_payment_methods (
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  PRIMARY KEY (branch_id, payment_method_id)
);

-- ----------------------------------------------------------------------------
-- 14. queue_records (排隊預估紀錄表)
-- ----------------------------------------------------------------------------
CREATE TABLE queue_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  level queue_level_enum NOT NULL DEFAULT 'under30',
  peak_wait_minutes INTEGER NOT NULL DEFAULT 30,
  off_peak_wait_minutes INTEGER NOT NULL DEFAULT 10,
  queue_rules TEXT,
  data_quality data_quality_enum NOT NULL DEFAULT 'unverified',
  checked_at TIMESTAMPTZ,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 15. editorial_entries (編輯短評與特色評分實體)
-- ----------------------------------------------------------------------------
CREATE TABLE editorial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  editor_name TEXT NOT NULL DEFAULT '小魚與編輯團隊',
  editor_note TEXT NOT NULL,
  recommended_dish TEXT,
  gyomen_score_overall NUMERIC(3, 1) CHECK (gyomen_score_overall BETWEEN 0.0 AND 5.0),
  gyomen_score_broth NUMERIC(3, 1),
  gyomen_score_noodle NUMERIC(3, 1),
  gyomen_score_chashu NUMERIC(3, 1),
  gyomen_score_value NUMERIC(3, 1),
  data_quality data_quality_enum NOT NULL DEFAULT 'verified',
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 16. source_links (資料來源連結明細表)
-- ----------------------------------------------------------------------------
CREATE TABLE source_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- 17. update_logs (資料變更歷程日誌)
-- ----------------------------------------------------------------------------
CREATE TABLE update_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  change_type change_type_enum NOT NULL,
  summary TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE opening_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE nearby_transit ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE branch_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE editorial_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Is Admin User
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = user_id AND role IN ('admin', 'editor')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Public READ Policies for Content Tables
CREATE POLICY "Public stores select" ON stores FOR SELECT USING (true);
CREATE POLICY "Public branches select" ON branches FOR SELECT USING (true);
CREATE POLICY "Public opening_hours select" ON opening_hours FOR SELECT USING (true);
CREATE POLICY "Public nearby_transit select" ON nearby_transit FOR SELECT USING (true);
CREATE POLICY "Public menus select" ON menus FOR SELECT USING (true);
CREATE POLICY "Public dishes select" ON dishes FOR SELECT USING (true);
CREATE POLICY "Public photos select" ON photos FOR SELECT USING (true);
CREATE POLICY "Public tags select" ON tags FOR SELECT USING (true);
CREATE POLICY "Public branch_tags select" ON branch_tags FOR SELECT USING (true);
CREATE POLICY "Public payment_methods select" ON payment_methods FOR SELECT USING (true);
CREATE POLICY "Public branch_payment_methods select" ON branch_payment_methods FOR SELECT USING (true);
CREATE POLICY "Public queue_records select" ON queue_records FOR SELECT USING (true);
CREATE POLICY "Public editorial_entries select" ON editorial_entries FOR SELECT USING (true);
CREATE POLICY "Public sources select" ON sources FOR SELECT USING (true);
CREATE POLICY "Public source_links select" ON source_links FOR SELECT USING (true);

-- Admin ALL (INSERT, UPDATE, DELETE) Policies
CREATE POLICY "Admin stores write" ON stores FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin branches write" ON branches FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin opening_hours write" ON opening_hours FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin nearby_transit write" ON nearby_transit FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin menus write" ON menus FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin dishes write" ON dishes FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin photos write" ON photos FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin tags write" ON tags FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin branch_tags write" ON branch_tags FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin payment_methods write" ON payment_methods FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin branch_payment_methods write" ON branch_payment_methods FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin queue_records write" ON queue_records FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin editorial_entries write" ON editorial_entries FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin sources write" ON sources FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin source_links write" ON source_links FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin update_logs write" ON update_logs FOR ALL USING (is_admin(auth.uid()));
CREATE POLICY "Admin profiles select" ON admin_profiles FOR SELECT USING (auth.uid() = id OR is_admin(auth.uid()));
