-- ============================================
-- Migration: Document Ingestion (upload + background jobs)
-- Additive feature. Does NOT touch chat tables.
-- Run this in the Supabase SQL Editor (or via the app's exec_sql path).
-- ============================================

-- 1. Documents table
--    file_hash is unique PER USER (enforced by a composite unique index),
--    which powers idempotent re-uploads.
CREATE TABLE IF NOT EXISTS documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       TEXT NOT NULL,
  filename      TEXT NOT NULL,
  file_hash     TEXT NOT NULL,
  size_bytes    BIGINT NOT NULL DEFAULT 0,
  page_count    INTEGER NOT NULL DEFAULT 0,
  chunk_count   INTEGER NOT NULL DEFAULT 0,
  storage_path  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency: the same file content (SHA-256) for the same user is one doc.
CREATE UNIQUE INDEX IF NOT EXISTS idx_documents_user_hash
  ON documents(user_id, file_hash);
CREATE INDEX IF NOT EXISTS idx_documents_user
  ON documents(user_id, created_at DESC);

-- 2. Jobs table
--    status: queued | validating | splitting | chunking | embedding | storing |
--            done | cancelled | failed
--    last_chunk_idx is the resume checkpoint (vectors already stored).
CREATE TABLE IF NOT EXISTS jobs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id    UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'queued',
  progress       NUMERIC NOT NULL DEFAULT 0,   -- 0..100
  total          INTEGER NOT NULL DEFAULT 0,   -- total chunks discovered
  last_chunk_idx INTEGER NOT NULL DEFAULT 0,   -- highest stored chunk index + 1
  cancel_flag    BOOLEAN NOT NULL DEFAULT FALSE,
  error_msg      TEXT,
  started_at     TIMESTAMPTZ,
  finished_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_jobs_document ON jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_updated ON jobs(updated_at DESC);

-- 3. Keep updated_at fresh
CREATE OR REPLACE FUNCTION update_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_jobs_updated_at ON jobs;
CREATE TRIGGER trigger_jobs_updated_at
  BEFORE UPDATE ON jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_jobs_updated_at();

-- 4. Row Level Security (service-role only, matching existing tables)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access documents" ON documents;
CREATE POLICY "Service role full access documents"
  ON documents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access jobs" ON jobs;
CREATE POLICY "Service role full access jobs"
  ON jobs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5. Storage bucket for the raw uploaded files
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('ingested-documents', 'ingested-documents', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- Service role can manage objects in this bucket (private bucket).
DROP POLICY IF EXISTS "Service role manages ingested-documents" ON storage.objects;
CREATE POLICY "Service role manages ingested-documents"
  ON storage.objects FOR ALL TO service_role
  USING (bucket_id = 'ingested-documents')
  WITH CHECK (bucket_id = 'ingested-documents');

-- Confirm
SELECT '✅ Document ingestion tables + storage bucket created successfully' AS result;
