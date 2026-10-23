-- Immutable public snapshots for scripts and storyboards shared from Aura.
CREATE TABLE IF NOT EXISTS public.shared_content (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        NOT NULL,
  type       text        NOT NULL CHECK (type IN ('script', 'storyboard')),
  title      text        NOT NULL,
  data       jsonb       NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS shared_content_created_idx
  ON public.shared_content (created_at DESC);

ALTER TABLE public.shared_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view shared content"
  ON public.shared_content
  FOR SELECT
  USING (true);

CREATE POLICY "Users can create shared content"
  ON public.shared_content
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);