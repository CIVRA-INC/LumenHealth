-- Database-level protections that Prisma's schema language cannot express.
-- See docs/development/database.md for the catalogue of raw-SQL objects.
-- Review `prisma migrate dev` output so none of these are accidentally dropped.

-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- ── Least-privilege grants for the application role ───────────────────────────
-- The API connects as lumen_app. It owns nothing and cannot bypass row-level security.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lumen_app') THEN
    GRANT USAGE ON SCHEMA public TO lumen_app;
    GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO lumen_app;
    -- Only rows that are legitimately removable (drafts, joins, sessions) may be deleted.
    GRANT DELETE ON sessions, membership_branches, emergency_contacts, diagnoses, medication_orders
      TO lumen_app;
    -- The audit trail is append-only.
    REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM lumen_app;
    -- Tables added by later migrations get the same baseline automatically.
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE ON TABLES TO lumen_app;
  ELSE
    RAISE NOTICE 'Role lumen_app not found: create it before starting the API (infrastructure/docker/postgres/init.sql).';
  END IF;
END
$$;

-- ── Row-level security (tenant isolation, defense in depth) ───────────────────
-- The API sets `app.current_org_id` with set_config(..., true) at the start of every
-- tenant-scoped transaction. With no context set, no tenant rows are visible.
CREATE FUNCTION app_current_org() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULLIF(current_setting('app.current_org_id', true), '')::uuid $$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'departments', 'patients', 'patient_identifiers', 'emergency_contacts', 'counters',
    'appointments', 'encounters', 'clinical_notes', 'vital_signs', 'diagnoses',
    'medication_orders', 'addenda'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_isolation ON %I USING ("organizationId" = app_current_org()) WITH CHECK ("organizationId" = app_current_org())',
      t
    );
  END LOOP;
END
$$;

ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read_own_org ON audit_events FOR SELECT
  USING ("organizationId" = app_current_org());
-- Events raised before an organisation context exists (e.g. failed sign-in) carry a NULL org.
CREATE POLICY audit_insert ON audit_events FOR INSERT
  WITH CHECK ("organizationId" IS NULL OR "organizationId" = app_current_org());

-- ── Append-only audit trail ───────────────────────────────────────────────────
CREATE FUNCTION audit_events_immutable() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only' USING ERRCODE = 'insufficient_privilege';
END
$$;

CREATE TRIGGER audit_events_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION audit_events_immutable();
CREATE TRIGGER audit_events_no_truncate
  BEFORE TRUNCATE ON audit_events
  FOR EACH STATEMENT EXECUTE FUNCTION audit_events_immutable();

-- ── Scheduling invariants ─────────────────────────────────────────────────────
ALTER TABLE appointments
  ADD CONSTRAINT appointments_time_order CHECK ("scheduledEnd" > "scheduledStart");

-- A clinician cannot hold two overlapping live appointments.
ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_clinician_overlap
  EXCLUDE USING gist (
    "clinicianId" WITH =,
    tstzrange("scheduledStart", "scheduledEnd", '[)') WITH &&
  ) WHERE ("clinicianId" IS NOT NULL AND status IN ('SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION'));

-- A patient can only be in one live visit at a time.
CREATE UNIQUE INDEX appointments_one_live_visit_per_patient
  ON appointments ("patientId") WHERE status IN ('CHECKED_IN', 'IN_CONSULTATION');

CREATE FUNCTION enforce_appointment_transition() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF (OLD.status, NEW.status) IN (
    ('SCHEDULED', 'CHECKED_IN'), ('SCHEDULED', 'CANCELLED'), ('SCHEDULED', 'NO_SHOW'),
    ('CHECKED_IN', 'IN_CONSULTATION'), ('CHECKED_IN', 'CANCELLED'),
    ('IN_CONSULTATION', 'COMPLETED'), ('IN_CONSULTATION', 'CHECKED_IN')
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invalid appointment transition % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END
$$;

CREATE TRIGGER appointments_transition
  BEFORE UPDATE OF status ON appointments
  FOR EACH ROW EXECUTE FUNCTION enforce_appointment_transition();

-- ── Clinical invariants ───────────────────────────────────────────────────────
ALTER TABLE encounters
  ADD CONSTRAINT encounters_finalized_fields CHECK (
    status NOT IN ('FINALIZED', 'CLOSED') OR ("finalizedAt" IS NOT NULL AND "finalizedById" IS NOT NULL)
  ),
  ADD CONSTRAINT encounters_closed_fields CHECK (
    status <> 'CLOSED' OR ("closedAt" IS NOT NULL AND disposition IS NOT NULL)
  ),
  ADD CONSTRAINT encounters_void_fields CHECK (
    status <> 'ENTERED_IN_ERROR' OR ("voidReason" IS NOT NULL AND "voidedAt" IS NOT NULL)
  );

CREATE FUNCTION enforce_encounter_transition() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF (OLD.status, NEW.status) IN (
    ('IN_PROGRESS', 'FINALIZED'), ('IN_PROGRESS', 'ENTERED_IN_ERROR'), ('FINALIZED', 'CLOSED')
  ) THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Invalid encounter transition % -> %', OLD.status, NEW.status
    USING ERRCODE = 'check_violation';
END
$$;

CREATE TRIGGER encounters_transition
  BEFORE UPDATE OF status ON encounters
  FOR EACH ROW EXECUTE FUNCTION enforce_encounter_transition();

-- Documentation is only writable while the encounter is a draft. Once signed, corrections
-- are made through addenda (and medication orders may still be cancelled).
CREATE FUNCTION enforce_encounter_unlocked() RETURNS trigger
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
    IF TG_TABLE_NAME = 'medication_orders' AND TG_OP = 'UPDATE'
       AND OLD.status = 'ACTIVE' AND NEW.status = 'CANCELLED' THEN
      RETURN NEW;
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

CREATE TRIGGER clinical_notes_locked
  BEFORE INSERT OR UPDATE OR DELETE ON clinical_notes
  FOR EACH ROW EXECUTE FUNCTION enforce_encounter_unlocked();
CREATE TRIGGER vital_signs_locked
  BEFORE INSERT OR UPDATE OR DELETE ON vital_signs
  FOR EACH ROW EXECUTE FUNCTION enforce_encounter_unlocked();
CREATE TRIGGER diagnoses_locked
  BEFORE INSERT OR UPDATE OR DELETE ON diagnoses
  FOR EACH ROW EXECUTE FUNCTION enforce_encounter_unlocked();
CREATE TRIGGER medication_orders_locked
  BEFORE INSERT OR UPDATE OR DELETE ON medication_orders
  FOR EACH ROW EXECUTE FUNCTION enforce_encounter_unlocked();

-- Addenda only make sense on signed encounters, and may never change afterwards.
CREATE FUNCTION enforce_addendum_rules() RETURNS trigger
  LANGUAGE plpgsql
  AS $$
DECLARE
  enc_status "EncounterStatus";
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION 'addenda are append-only' USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT status INTO enc_status FROM encounters WHERE id = NEW."encounterId";
  IF enc_status NOT IN ('FINALIZED', 'CLOSED') THEN
    RAISE EXCEPTION 'Addenda can only be added to signed encounters (status %)', enc_status
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER addenda_rules
  BEFORE INSERT OR UPDATE OR DELETE ON addenda
  FOR EACH ROW EXECUTE FUNCTION enforce_addendum_rules();

CREATE UNIQUE INDEX diagnoses_one_primary_per_encounter
  ON diagnoses ("encounterId") WHERE type = 'PRIMARY';

ALTER TABLE vital_signs
  ADD CONSTRAINT vital_signs_plausible_ranges CHECK (
    ("temperatureC" IS NULL OR "temperatureC" BETWEEN 30 AND 45) AND
    ("heartRate" IS NULL OR "heartRate" BETWEEN 20 AND 300) AND
    ("respiratoryRate" IS NULL OR "respiratoryRate" BETWEEN 4 AND 80) AND
    ("systolicBp" IS NULL OR "systolicBp" BETWEEN 50 AND 300) AND
    ("diastolicBp" IS NULL OR "diastolicBp" BETWEEN 20 AND 200) AND
    (spo2 IS NULL OR spo2 BETWEEN 50 AND 100) AND
    ("weightKg" IS NULL OR "weightKg" BETWEEN 0.3 AND 500) AND
    ("heightCm" IS NULL OR "heightCm" BETWEEN 20 AND 280)
  ),
  ADD CONSTRAINT vital_signs_has_measurement CHECK (
    "temperatureC" IS NOT NULL OR "heartRate" IS NOT NULL OR "respiratoryRate" IS NOT NULL OR
    "systolicBp" IS NOT NULL OR "diastolicBp" IS NOT NULL OR spo2 IS NOT NULL OR
    "weightKg" IS NOT NULL OR "heightCm" IS NOT NULL
  );

ALTER TABLE patients
  ADD CONSTRAINT patients_plausible_dob CHECK ("dateOfBirth" >= DATE '1900-01-01');
