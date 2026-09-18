-- Visit Bot: up to ten owner-managed external destinations. No existing links to migrate.
-- Apply AFTER the prior 20260918_bot_external_url.sql migration if it was already applied.
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS external_links jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.bots
  DROP CONSTRAINT IF EXISTS bots_external_links_shape_check;
ALTER TABLE public.bots
  ADD CONSTRAINT bots_external_links_shape_check
  CHECK (jsonb_typeof(external_links) = 'array' AND jsonb_array_length(external_links) <= 10);
-- The single-URL feature was never populated. Remove it rather than retaining legacy state.
ALTER TABLE public.bots DROP CONSTRAINT IF EXISTS bots_external_url_format_check;
ALTER TABLE public.bots DROP COLUMN IF EXISTS external_url;
COMMENT ON COLUMN public.bots.external_links IS
  'Up to ten ordered, owner-managed external destinations; validated by server actions.';
