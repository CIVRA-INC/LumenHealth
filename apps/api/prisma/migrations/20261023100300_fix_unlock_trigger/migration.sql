-- PL/pgSQL resolves every field in a boolean expression, so referencing OLD.status inside a
-- trigger shared by tables without a "status" column raised a confusing error instead of the
-- intended "documentation is locked" message. Nest the checks so they are evaluated lazily.
CREATE OR REPLACE FUNCTION enforce_encounter_unlocked() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  enc_status "EncounterStatus";
  enc_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    enc_id := OLD."encounterId";
  ELSE
    enc_id := NEW."encounterId";
  END IF;

  SELECT status INTO enc_status FROM encounters WHERE id = enc_id;

  IF enc_status IS DISTINCT FROM 'IN_PROGRESS' THEN
    -- The one permitted post-signature change: cancelling an active medication order.
    IF TG_TABLE_NAME = 'medication_orders' AND TG_OP = 'UPDATE' THEN
      IF OLD.status = 'ACTIVE' AND NEW.status = 'CANCELLED' THEN
        RETURN NEW;
      END IF;
    END IF;
    RAISE EXCEPTION 'Encounter % is %; its documentation is locked', enc_id, enc_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;
