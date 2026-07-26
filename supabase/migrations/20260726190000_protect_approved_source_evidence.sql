-- Approved verification evidence is immutable for editors. Source attachment
-- is performed atomically so a failed checklist update cannot leave an orphan.

CREATE OR REPLACE FUNCTION guard_approved_verification_source_link()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  actor_id UUID := auth.uid();
BEGIN
  IF EXISTS (
    SELECT 1
    FROM verification_checks
    WHERE source_link_id = OLD.id
      AND status = 'approved'
  )
  AND actor_id IS NOT NULL
  AND NOT is_strict_admin(actor_id) THEN
    RAISE EXCEPTION 'only strict admins can modify source evidence used by an approved verification check';
  END IF;

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

CREATE TRIGGER source_links_guard_approved_evidence
BEFORE UPDATE OR DELETE ON source_links
FOR EACH ROW EXECUTE FUNCTION guard_approved_verification_source_link();

CREATE OR REPLACE FUNCTION set_verification_check_source(
  p_store_id UUID,
  p_check_id UUID,
  p_source_id UUID,
  p_url TEXT,
  p_title TEXT DEFAULT NULL
)
RETURNS source_links
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  actor_id UUID := auth.uid();
  target_check verification_checks%ROWTYPE;
  saved_link source_links%ROWTYPE;
BEGIN
  IF actor_id IS NULL OR NOT is_admin(actor_id) THEN
    RAISE EXCEPTION 'editor or admin role required';
  END IF;

  IF p_url IS NULL OR btrim(p_url) = '' THEN
    RAISE EXCEPTION 'source URL is required';
  END IF;

  SELECT *
  INTO target_check
  FROM verification_checks
  WHERE id = p_check_id
    AND store_id = p_store_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'verification check not found';
  END IF;

  IF target_check.status = 'approved' AND NOT is_strict_admin(actor_id) THEN
    RAISE EXCEPTION 'only strict admins can replace approved source evidence';
  END IF;

  IF target_check.source_link_id IS NULL THEN
    INSERT INTO source_links (
      source_id,
      entity_type,
      entity_id,
      url,
      title,
      checked_by,
      checked_at
    )
    VALUES (
      p_source_id,
      target_check.entity_type,
      target_check.entity_id,
      btrim(p_url),
      NULLIF(btrim(p_title), ''),
      actor_id,
      NOW()
    )
    RETURNING * INTO saved_link;
  ELSE
    UPDATE source_links
    SET source_id = p_source_id,
        entity_type = target_check.entity_type,
        entity_id = target_check.entity_id,
        url = btrim(p_url),
        title = NULLIF(btrim(p_title), ''),
        checked_by = actor_id,
        checked_at = NOW()
    WHERE id = target_check.source_link_id
    RETURNING * INTO saved_link;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'source link not found';
    END IF;
  END IF;

  UPDATE verification_checks
  SET source_link_id = saved_link.id
  WHERE id = target_check.id;

  RETURN saved_link;
END;
$$;

REVOKE ALL ON FUNCTION set_verification_check_source(UUID, UUID, UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_verification_check_source(UUID, UUID, UUID, TEXT, TEXT) TO authenticated;
