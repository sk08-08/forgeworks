-- Visit Bot: optional, owner-managed external destination. No historical snapshots changed.
-- Apply before deploying application code. Existing bots default to NULL.
ALTER TABLE public.bots
  ADD COLUMN IF NOT EXISTS external_url text;

ALTER TABLE public.bots
  DROP CONSTRAINT IF EXISTS bots_external_url_format_check;
ALTER TABLE public.bots
  ADD CONSTRAINT bots_external_url_format_check
  CHECK (
    external_url IS NULL OR (
      char_length(external_url) <= 2048
      AND external_url ~* '^https?://[^[:space:][:cntrl:]]+$'
    )
  );

COMMENT ON COLUMN public.bots.external_url IS
  'Optional owner-managed link to the bot on another platform; validated and normalized in server actions.';
