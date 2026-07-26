-- Tighten checklist mutations for the CMS role/action matrix.

DROP POLICY "Verification checks editor insert" ON verification_checks;
DROP POLICY "Verification checks editor update" ON verification_checks;

CREATE POLICY "Verification checks editor insert"
ON verification_checks FOR INSERT
WITH CHECK (
  is_admin(auth.uid())
  AND (
    is_strict_admin(auth.uid())
    OR status = 'missing'
  )
);

CREATE POLICY "Verification checks editor update"
ON verification_checks FOR UPDATE
USING (is_admin(auth.uid()))
WITH CHECK (
  is_admin(auth.uid())
  AND (
    is_strict_admin(auth.uid())
    OR status NOT IN ('approved', 'rejected')
  )
);

CREATE OR REPLACE FUNCTION validate_verification_check()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  linked_source source_links%ROWTYPE;
  actor_id UUID := auth.uid();
BEGIN
  IF NOT verification_entity_belongs_to_store(NEW.entity_type, NEW.entity_id, NEW.store_id) THEN
    RAISE EXCEPTION 'verification check entity must belong to its store';
  END IF;

  IF actor_id IS NOT NULL AND NOT is_strict_admin(actor_id) THEN
    IF TG_OP = 'INSERT' AND NEW.status <> 'missing' THEN
      RAISE EXCEPTION 'editors must create verification checks in missing status';
    END IF;

    IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
      IF NOT (
        (OLD.status = 'missing' AND NEW.status = 'needs_review')
        OR (OLD.status = 'needs_review' AND NEW.status = 'source_confirmed')
      ) THEN
        RAISE EXCEPTION 'invalid editor verification check transition';
      END IF;
    END IF;

    IF NEW.status IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'only strict admins can approve or reject verification checks';
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NOT is_strict_admin(actor_id) THEN
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

  RETURN NEW;
END;
$$;
