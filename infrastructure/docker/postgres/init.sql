-- Runs once, when the local Postgres volume is first created.
--
-- Two database roles implement defense in depth for tenant isolation (see docs/adr/0004):
--   lumen      owns the schema; used for migrations and seeding (bypasses row-level security).
--   lumen_app  used by the running API; subject to row-level security policies.
--
-- The password below is a development placeholder. Production roles are provisioned separately.

CREATE ROLE lumen_app LOGIN PASSWORD 'lumen_app_dev_password'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

-- Separate database for automated integration tests.
CREATE DATABASE lumenhealth_test OWNER lumen;

-- Disposable database recreated on every end-to-end test run.
CREATE DATABASE lumenhealth_e2e OWNER lumen;
