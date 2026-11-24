-- Indexes that keep the paginated, sortable, searchable lists fast as the registry grows.

-- Ordering by registration date and date of birth (default registry sorts).
CREATE INDEX "patients_organizationId_createdAt_idx" ON "patients"("organizationId", "createdAt");
CREATE INDEX "patients_organizationId_dateOfBirth_idx" ON "patients"("organizationId", "dateOfBirth");

-- Encounter lists are filtered by branch and ordered by start time.
CREATE INDEX "encounters_organizationId_branchId_startedAt_idx" ON "encounters"("organizationId", "branchId", "startedAt");

-- Substring search ("contains", case-insensitive) on name, MRN and phone. Trigram GIN indexes let
-- PostgreSQL use an index for ILIKE '%text%' instead of scanning every patient in the table.
-- Raw SQL: Prisma's schema language cannot express these (see docs/development/database.md).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX patients_given_name_trgm ON patients USING gin ("givenName" gin_trgm_ops);
CREATE INDEX patients_family_name_trgm ON patients USING gin ("familyName" gin_trgm_ops);
CREATE INDEX patients_mrn_trgm ON patients USING gin (mrn gin_trgm_ops);
CREATE INDEX patients_phone_trgm ON patients USING gin (phone gin_trgm_ops);
