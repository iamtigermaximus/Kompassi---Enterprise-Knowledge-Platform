-- KOMPASSI - Initial Migration
-- Creates extensions, tables, indexes, and Row-Level Security policies.

-- ─── Extensions ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA extensions;

-- ─── Schema ─────────────────────────────────────────────────────────────────

-- CreateTable: tenants
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "apiKey" TEXT NOT NULL,
    "queriesPerDay" INTEGER NOT NULL DEFAULT 50,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
CREATE UNIQUE INDEX "tenants_apiKey_key" ON "tenants"("apiKey");

-- CreateTable: users
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable: documents
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable: chunks
CREATE TABLE "chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "embedding" extensions.vector(384),
    "chunkIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: query_logs
CREATE TABLE "query_logs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "sources" TEXT NOT NULL DEFAULT '[]',
    "tokensIn" INTEGER NOT NULL DEFAULT 0,
    "tokensOut" INTEGER NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "latency" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "query_logs_pkey" PRIMARY KEY ("id")
);

-- ─── Foreign Keys ───────────────────────────────────────────────────────────

ALTER TABLE "users" ADD CONSTRAINT "users_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "documents" ADD CONSTRAINT "documents_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chunks" ADD CONSTRAINT "chunks_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "chunks" ADD CONSTRAINT "chunks_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "query_logs" ADD CONSTRAINT "query_logs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── Indexes (performance) ──────────────────────────────────────────────────

-- Tenant lookups by apiKey are the most frequent query (every authenticated request)
CREATE INDEX "idx_tenants_apiKey" ON "tenants"("apiKey");

-- Queries filtered by tenantId are the backbone of multi-tenant isolation
CREATE INDEX "idx_users_tenantId" ON "users"("tenantId");
CREATE INDEX "idx_documents_tenantId" ON "documents"("tenantId");
CREATE INDEX "idx_chunks_tenantId" ON "chunks"("tenantId");
CREATE INDEX "idx_chunks_documentId" ON "chunks"("documentId");
CREATE INDEX "idx_query_logs_tenantId" ON "query_logs"("tenantId");
CREATE INDEX "idx_query_logs_timestamp" ON "query_logs"("tenantId", "timestamp" DESC);

-- Vector similarity search index (IVFFlat for 384-dim embeddings)
CREATE INDEX idx_chunks_embedding ON "chunks"
    USING ivfflat ("embedding" extensions.vector_cosine_ops)
    WITH (lists = 100);

-- ─── Row-Level Security ─────────────────────────────────────────────────────

-- Helper: set the current tenant context.
-- Call this at the start of each request after authenticating the API key.
-- Usage: SELECT app.set_tenant_id('ckXXXXX');
CREATE SCHEMA IF NOT EXISTS app;

CREATE OR REPLACE FUNCTION app.set_tenant_id(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_id, true);
END;
$$ LANGUAGE plpgsql;

-- Helper: get the current tenant context (NULL if not set).
CREATE OR REPLACE FUNCTION app.current_tenant_id()
RETURNS TEXT AS $$
  SELECT nullif(current_setting('app.current_tenant_id', true), '');
$$ LANGUAGE SQL STABLE;

-- ─── Enable RLS ─────────────────────────────────────────────────────────────

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chunks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "query_logs" ENABLE ROW LEVEL SECURITY;

-- Note: The "tenants" table intentionally has NO RLS.
-- Authentication middleware queries it by apiKey before setting the tenant context.

-- ─── RLS Policies ──────────────────────────────────────────────────────────

-- Users: members can only see users within their own tenant.
CREATE POLICY tenant_isolation ON "users"
    FOR ALL
    USING ("tenantId" = app.current_tenant_id());

-- Documents: documents are scoped to the current tenant.
CREATE POLICY tenant_isolation ON "documents"
    FOR ALL
    USING ("tenantId" = app.current_tenant_id());

-- Chunks: chunks are scoped to the current tenant.
CREATE POLICY tenant_isolation ON "chunks"
    FOR ALL
    USING ("tenantId" = app.current_tenant_id());

-- Query logs: logs are scoped to the current tenant.
CREATE POLICY tenant_isolation ON "query_logs"
    FOR ALL
    USING ("tenantId" = app.current_tenant_id());

-- ─── Prisma Migration Tracking ─────────────────────────────────────────────
-- This comment marks this migration as applied for Prisma's _prisma_migrations table.
