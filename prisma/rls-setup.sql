-- KOMPASSI - RLS Setup (safe to run on existing database)
-- Adds the app schema, tenant context functions, and RLS policies.
-- Run: psql $DATABASE_URL -f prisma/rls-setup.sql

-- ─── App Schema & Functions ─────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.set_tenant_id(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, true);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS TEXT AS $$
  SELECT nullif(current_setting('app.current_tenant_id', true), '');
$$ LANGUAGE SQL STABLE;

-- ─── Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "query_logs" ENABLE ROW LEVEL SECURITY;

-- ─── RLS Policies (drop first to allow re-running) ──────────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'users') THEN
    DROP POLICY tenant_isolation ON "users";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'documents') THEN
    DROP POLICY tenant_isolation ON "documents";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'chunks') THEN
    DROP POLICY tenant_isolation ON "chunks";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'tenant_isolation' AND tablename = 'query_logs') THEN
    DROP POLICY tenant_isolation ON "query_logs";
  END IF;
END $$;

CREATE POLICY tenant_isolation ON "users"
    FOR ALL
    USING ("tenantId" = app.current_tenant_id());

CREATE POLICY tenant_isolation ON "documents"
    FOR ALL
    USING ("tenantId" = app.current_tenant_id());

CREATE POLICY tenant_isolation ON "chunks"
    FOR ALL
    USING ("tenantId" = app.current_tenant_id());

CREATE POLICY tenant_isolation ON "query_logs"
    FOR ALL
    USING ("tenantId" = app.current_tenant_id());
