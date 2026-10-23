-- Migration: create content_items table
-- Run this in the Supabase SQL Editor:
--   https://supabase.com/dashboard/project/rjwcbvhcppfgmybarwkl/sql/new

CREATE TABLE IF NOT EXISTS public.content_items (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid        NOT NULL,
  thread_id   uuid,
  type        text        NOT NULL CHECK (type IN ('script', 'captions', 'storyboard')),
  title       text        NOT NULL,
  data        jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Index for fast per-user queries ordered by creation time
CREATE INDEX IF NOT EXISTS content_items_user_created_idx
  ON public.content_items (user_id, created_at DESC);

-- Row-Level Security: each user can only see and manage their own items
ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own content items"
  ON public.content_items
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
