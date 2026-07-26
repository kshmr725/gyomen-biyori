-- ============================================================================
-- Single-store verification workflow: field checklist, controlled transitions,
-- and strict-admin-only final promotion.
-- ============================================================================

CREATE TYPE verification_check_status_enum AS ENUM (
  'missing',
  'needs_review',
  'source_confirmed',
  'approved',
  'rejected'
);

ALTER TABLE source_links
  ADD COLUMN checked_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL;

CREATE TABLE verification_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  field_name TEXT NOT NULL CHECK (btrim(field_name) <> ''),
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  status verification_check_status_enum NOT NULL DEFAULT 'missing',
  source_link_id UUID REFERENCES source_links(id) ON DELETE RESTRICT,
  reviewed_by UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT verification_checks_entity_type_check
    CHECK (entity_type IN ('store', 'branch', 'menu', 'dish', 'opening_hours')),
  CONSTRAINT verification_checks_unique_field
    UNIQUE (store_id, entity_type, entity_id, field_name)
);

CREATE INDEX verification_checks_store_id_idx ON verification_checks(store_id);
CREATE INDEX verification_checks_store_status_idx ON verification_checks(store_id, status);

CREATE OR REPLACE FUNCTION verification_entity_belongs_to_store(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_store_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  CASE p_entity_type
    WHEN 'store' THEN
      RETURN p_entity_id = p_store_id;
    WHEN 'branch' THEN
      RETURN EXISTS (SELECT 1 FROM branches WHERE id = p_entity_id AND store_id = p_store_id);
    WHEN 'menu' THEN
      RETURN EXISTS (
        SELECT 1 FROM menus
        JOIN branches ON branches.id = menus.branch_id
        WHERE menus.id = p_entity_id AND branches.store_id = p_store_id
      );
    WHEN 'dish' THEN
      RETURN EXISTS (
        SELECT 1 FROM dishes
        JOIN menus ON menus.id = dishes.menu_id
        JOIN branches ON branches.id = menus.branch_id
        WHERE dishes.id = p_entity_id AND branches.store_id = p_store_id
      );
    WHEN 'opening_hours' THEN
      RETURN EXISTS (
        SELECT 1 FROM opening_hours
        JOIN branches ON branches.id = opening_hours.branch_id
        WHERE opening_hours.id = p_entity_id AND branches.store_id = p_store_id
      );
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION validate_verification_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  linked_source source_links%ROWTYPE;
BEGIN
  IF NOT verification_entity_belongs_to_store(NEW.entity_type, NEW.entity_id, NEW.store_id) THEN
    RAISE EXCEPTION 'verification check entity must belong to its store';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NOT is_strict_admin(auth.uid()) THEN
    RAISE EXCEPTION 'only strict admins can alter an approved verification check';
  END IF;

  IF NEW.status IN ('source_confirmed', 'approved') THEN
    IF NEW.source_link_id IS NULL THEN
      RAISE EXCEPTION 'source_confirmed and approved checks require a source link';
    END IF;

    SELECT * INTO linked_source FROM source_links WHERE id = NEW.source_link_id;
    IF NOT FOUND
      OR linked_source.entity_type <> NEW.entity_type
      OR linked_source.entity_id <> NEW.entity_id
      OR btrim(linked_source.url) = ''
      OR linked_source.checked_at IS NULL
      OR linked_source.checked_by IS NULL THEN
      RAISE EXCEPTION 'verification check requires a matching source link with url, checked_at, and checked_by';
    END IF;

    IF NEW.reviewed_by IS NULL OR NEW.reviewed_at IS NULL THEN
      RAISE EXCEPTION 'source_confirmed and approved checks require a reviewer and review timestamp';
    END IF;
  END IF;

  IF NEW.status = 'approved' AND NOT is_strict_admin(auth.uid()) THEN
    RAISE EXCEPTION 'only strict admins can approve verification checks';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER verification_checks_validate_before_write
BEFORE INSERT OR UPDATE ON verification_checks
FOR EACH ROW EXECUTE FUNCTION validate_verification_check();

CREATE TRIGGER verification_checks_set_updated_at
BEFORE UPDATE ON verification_checks
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE OR REPLACE FUNCTION guard_store_verification_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (
    NEW.data_quality IS DISTINCT FROM OLD.data_quality
    OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
    OR NEW.verified_by IS DISTINCT FROM OLD.verified_by
    OR NEW.checked_at IS DISTINCT FROM OLD.checked_at
  ) AND current_setting('app.verification_write', true) IS DISTINCT FROM 'on' THEN
    RAISE EXCEPTION 'store verification fields must be updated through the verification workflow';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER stores_guard_verification_columns
BEFORE UPDATE ON stores
FOR EACH ROW EXECUTE FUNCTION guard_store_verification_columns();

ALTER TABLE verification_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Verification checks internal select"
ON verification_checks FOR SELECT
USING (is_admin(auth.uid()));

CREATE POLICY "Verification checks editor insert"
ON verification_checks FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  AND (status <> 'approved' OR is_strict_admin(auth.uid()))
);

CREATE POLICY "Verification checks editor update"
ON verification_checks FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (
  is_admin(auth.uid())
  AND (status <> 'approved' OR is_strict_admin(auth.uid()))
);

CREATE POLICY "Verification checks strict admin delete"
ON verification_checks FOR DELETE
USING (is_strict_admin(auth.uid()));

CREATE OR REPLACE FUNCTION set_store_verification_status(
  p_store_id UUID,
  p_next_status verification_status_enum,
  p_notes TEXT DEFAULT NULL
)
RETURNS stores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_store stores%ROWTYPE;
  updated_store stores%ROWTYPE;
  actor_id UUID := auth.uid();
BEGIN
  IF actor_id IS NULL OR NOT is_admin(actor_id) THEN
    RAISE EXCEPTION 'editor or admin role required';
  END IF;

  SELECT * INTO current_store FROM stores WHERE id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store not found';
  END IF;

  IF current_store.data_quality = 'verified' THEN
    RAISE EXCEPTION 'verified stores cannot re-enter the verification workflow';
  END IF;

  IF current_store.verification_status = 'pending' AND p_next_status = 'source_checked' THEN
    NULL;
  ELSIF current_store.verification_status = 'source_checked'
    AND p_next_status = 'editor_confirmed'
    AND is_strict_admin(actor_id) THEN
    NULL;
  ELSE
    RAISE EXCEPTION 'invalid verification status transition';
  END IF;

  PERFORM set_config('app.verification_write', 'on', true);
  UPDATE stores
  SET verification_status = p_next_status,
      verification_notes = COALESCE(p_notes, verification_notes)
  WHERE id = p_store_id
  RETURNING * INTO updated_store;

  INSERT INTO update_logs (changed_by, entity_type, entity_id, change_type, summary, before_state, after_state)
  VALUES (
    actor_id,
    'store',
    p_store_id,
    'info_fix',
    format('Verification status changed from %s to %s', current_store.verification_status, p_next_status),
    jsonb_build_object('verification_status', current_store.verification_status),
    jsonb_build_object('verification_status', updated_store.verification_status)
  );

  RETURN updated_store;
END;
$$;

CREATE OR REPLACE FUNCTION promote_store_verification(p_store_id UUID)
RETURNS stores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  current_store stores%ROWTYPE;
  updated_store stores%ROWTYPE;
  actor_id UUID := auth.uid();
BEGIN
  IF actor_id IS NULL OR NOT is_strict_admin(actor_id) THEN
    RAISE EXCEPTION 'strict admin role required for final verification approval';
  END IF;

  SELECT * INTO current_store FROM stores WHERE id = p_store_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'store not found';
  END IF;

  IF current_store.data_quality <> 'unverified' THEN
    RAISE EXCEPTION 'only unverified stores can be promoted';
  END IF;

  IF current_store.verification_status NOT IN ('editor_confirmed', 'field_verified') THEN
    RAISE EXCEPTION 'store must be editor_confirmed before final promotion';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM verification_checks
    WHERE store_id = p_store_id AND is_required
  ) THEN
    RAISE EXCEPTION 'at least one required verification check is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM verification_checks
    WHERE store_id = p_store_id
      AND status IN ('missing', 'needs_review', 'rejected')
  ) THEN
    RAISE EXCEPTION 'store has unresolved verification checks';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM verification_checks check_item
    LEFT JOIN source_links source_link ON source_link.id = check_item.source_link_id
    WHERE check_item.store_id = p_store_id
      AND check_item.is_required
      AND (
        check_item.status <> 'approved'
        OR source_link.id IS NULL
        OR btrim(source_link.url) = ''
        OR source_link.checked_at IS NULL
        OR source_link.checked_by IS NULL
        OR source_link.entity_type <> check_item.entity_type
        OR source_link.entity_id <> check_item.entity_id
      )
  ) THEN
    RAISE EXCEPTION 'all required checks need an approved, complete matching source link';
  END IF;

  PERFORM set_config('app.verification_write', 'on', true);
  UPDATE stores
  SET data_quality = 'verified',
      verified_by = actor_id::TEXT,
      checked_at = NOW()
  WHERE id = p_store_id
  RETURNING * INTO updated_store;

  INSERT INTO update_logs (changed_by, entity_type, entity_id, change_type, summary, before_state, after_state)
  VALUES (
    actor_id,
    'store',
    p_store_id,
    'info_fix',
    'Final verification approved and store promoted to verified',
    jsonb_build_object(
      'data_quality', current_store.data_quality,
      'verification_status', current_store.verification_status,
      'verified_by', current_store.verified_by,
      'checked_at', current_store.checked_at
    ),
    jsonb_build_object(
      'data_quality', updated_store.data_quality,
      'verification_status', updated_store.verification_status,
      'verified_by', updated_store.verified_by,
      'checked_at', updated_store.checked_at
    )
  );

  RETURN updated_store;
END;
$$;

REVOKE ALL ON FUNCTION set_store_verification_status(UUID, verification_status_enum, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION promote_store_verification(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_store_verification_status(UUID, verification_status_enum, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION promote_store_verification(UUID) TO authenticated;
