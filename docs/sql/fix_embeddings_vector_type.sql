-- Fix embeddings table schema to use proper vector type
-- This migration fixes the critical issue where embedding vectors were stored as TEXT instead of vector type

-- Step 1: Enable pgvector extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Step 2: Backup existing data (optional, for safety)
-- CREATE TABLE embeddings_backup AS SELECT * FROM embeddings;

-- Step 3: Drop the existing column and recreate with correct type
-- WARNING: This will delete all existing embeddings. 
-- If you need to preserve data, you would need to parse the text and convert it properly.
ALTER TABLE public.embeddings DROP COLUMN IF EXISTS embedding;
ALTER TABLE public.embeddings ADD COLUMN embedding vector(1536);

-- Step 4: Create or replace the match_documents RPC function
CREATE OR REPLACE FUNCTION public.match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.3,
    match_count int DEFAULT 5,
    filter_project_id uuid DEFAULT NULL
)
RETURNS TABLE (
    id bigint,
    project_id uuid,
    source_id uuid,
    source_type text,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.id,
        e.project_id,
        e.source_id,
        e.source_type,
        e.content,
        e.metadata,
        1 - (e.embedding <=> query_embedding) AS similarity
    FROM public.embeddings e
    WHERE 
        (filter_project_id IS NULL OR e.project_id = filter_project_id)
        AND 1 - (e.embedding <=> query_embedding) > match_threshold
    ORDER BY e.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Step 5: Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.match_documents TO anon, authenticated;

-- Note: After running this migration, you will need to re-upload all documents
-- to regenerate the embeddings with the correct data type.
