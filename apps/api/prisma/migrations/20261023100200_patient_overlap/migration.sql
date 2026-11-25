-- A patient cannot hold two overlapping live appointments (double-booking).
ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_patient_overlap
  EXCLUDE USING gist (
    "patientId" WITH =,
    tstzrange("scheduledStart", "scheduledEnd", '[)') WITH &&
  ) WHERE (status IN ('SCHEDULED', 'CHECKED_IN', 'IN_CONSULTATION'));
