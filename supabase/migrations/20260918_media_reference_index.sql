-- Forgeworks / My Media: conservative, non-deleting reference index.
-- Apply only after reviewing on a development environment. No Storage objects
-- are deleted and no delete endpoint/policy is added.
-- Index captures URL-containing text/JSON for the enumerated public tables.
-- It cannot prove a public image is unused on the wider internet or in other tables.

CREATE TABLE IF NOT EXISTS public.media_asset_references (
  media_id uuid NOT NULL REFERENCES public.media_assets(id) ON DELETE RESTRICT,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  source_owner_id uuid,
  source_label text NOT NULL DEFAULT 'Untitled resource',
  source_deleted boolean NOT NULL DEFAULT false,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (media_id, source_table, source_id),
  CONSTRAINT media_source_table_allowed CHECK (source_table IN (
    'bots','bot_versions','profiles','request_forms','creator_pages',
    'creator_page_sections','atlas_entries','atlas_worlds','atlas_lorebooks',
    'bio_projects','changelog_entries','hub_community_records',
    'hub_community_record_updates','hub_community_submissions'
  ))
);
CREATE INDEX IF NOT EXISTS media_asset_references_owner_idx
  ON public.media_asset_references (source_owner_id, media_id);
ALTER TABLE public.media_asset_references ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.media_asset_references FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.media_asset_references TO service_role;
-- No user-facing policies: the authenticated server action verifies media
-- ownership first, then reads via its server-only service-role client.

CREATE OR REPLACE FUNCTION public.media_track_row_references()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_row jsonb;
  v_id uuid;
  v_owner uuid;
  v_deleted boolean;
  v_label text;
BEGIN
  IF TG_TABLE_SCHEMA <> 'public' OR TG_TABLE_NAME NOT IN (
    'bots','bot_versions','profiles','request_forms','creator_pages',
    'creator_page_sections','atlas_entries','atlas_worlds','atlas_lorebooks',
    'bio_projects','changelog_entries','hub_community_records',
    'hub_community_record_updates','hub_community_submissions'
  ) THEN
    RAISE EXCEPTION 'Unsupported media source table';
  END IF;

  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.media_asset_references
      WHERE source_table = TG_TABLE_NAME AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  v_row := to_jsonb(NEW);
  v_id := NEW.id;
  v_owner := NULLIF(v_row->>'user_id', '')::uuid;
  v_deleted := NULLIF(v_row->>'deleted_at', '') IS NOT NULL;
  v_label := COALESCE(NULLIF(v_row->>'name', ''),
    NULLIF(v_row->>'title',''), NULLIF(v_row->>'display_name',''),
    NULLIF(v_row->>'username',''), 'Untitled resource');

  IF TG_TABLE_NAME = 'profiles' THEN
    v_owner := v_id;
  ELSIF TG_TABLE_NAME = 'bot_versions' THEN
    SELECT b.user_id, b.deleted_at IS NOT NULL
      INTO v_owner, v_deleted FROM public.bots b
      WHERE b.id = (v_row->>'bot_id')::uuid;
    v_label := 'Bot version #' || COALESCE(v_row->>'version_number','?');
  ELSIF TG_TABLE_NAME = 'creator_page_sections' THEN
    SELECT page.user_id, page.deleted_at IS NOT NULL OR v_deleted
      INTO v_owner, v_deleted FROM public.creator_pages page
      WHERE page.id = (v_row->>'page_id')::uuid;
  ELSIF TG_TABLE_NAME = 'changelog_entries' THEN
    v_owner := NULLIF(v_row->>'created_by','')::uuid;
  ELSIF TG_TABLE_NAME IN ('hub_community_records','hub_community_record_updates') THEN
    v_owner := NULLIF(v_row->>'contributor_user_id','')::uuid;
  END IF;

  -- Keep historical/child display ownership and archive flags synchronized
  -- when their parent is updated. No historical URL is discarded here.
  IF TG_TABLE_NAME = 'bots' THEN
    UPDATE public.media_asset_references
       SET source_owner_id = v_owner, source_deleted = COALESCE(v_deleted,false)
     WHERE source_table = 'bot_versions'
       AND source_id IN (SELECT bv.id FROM public.bot_versions bv WHERE bv.bot_id = v_id);
  ELSIF TG_TABLE_NAME = 'creator_pages' THEN
    UPDATE public.media_asset_references
       SET source_owner_id = v_owner,
           source_deleted = COALESCE(v_deleted,false) OR EXISTS (
             SELECT 1 FROM public.creator_page_sections cps
             WHERE cps.id = source_id AND cps.deleted_at IS NOT NULL
           )
     WHERE source_table = 'creator_page_sections'
       AND source_id IN (SELECT cps.id FROM public.creator_page_sections cps WHERE cps.page_id = v_id);
  END IF;

  DELETE FROM public.media_asset_references
    WHERE source_table = TG_TABLE_NAME AND source_id = v_id;

  INSERT INTO public.media_asset_references (
    media_id,source_table,source_id,source_owner_id,source_label,source_deleted
  )
  SELECT a.id, TG_TABLE_NAME, v_id, v_owner, left(v_label, 160),
         COALESCE(v_deleted,false)
  FROM public.media_assets a
  WHERE a.bucket = 'media-library'
    AND strpos(v_row::text,
      '/storage/v1/object/public/media-library/' || a.storage_path) > 0
  ON CONFLICT (media_id,source_table,source_id) DO UPDATE
    SET source_owner_id = EXCLUDED.source_owner_id,
        source_label = EXCLUDED.source_label,
        source_deleted = EXCLUDED.source_deleted,
        recorded_at = now();
  RETURN NEW;
END;
$fn$;
REVOKE ALL ON FUNCTION public.media_track_row_references() FROM PUBLIC, anon, authenticated;

-- All writes, including direct browser SDK writes and SQL bot-history RPCs,
-- participate in the same transaction as their reference-index updates.
DROP TRIGGER IF EXISTS media_index_references ON public.bots;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.bots
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.bot_versions;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.bot_versions
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.profiles;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.request_forms;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.request_forms
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.creator_pages;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.creator_pages
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.creator_page_sections;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.creator_page_sections
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.atlas_entries;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.atlas_entries
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.atlas_worlds;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.atlas_worlds
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.atlas_lorebooks;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.atlas_lorebooks
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.bio_projects;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.bio_projects
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.changelog_entries;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.changelog_entries
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.hub_community_records;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.hub_community_records
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.hub_community_record_updates;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.hub_community_record_updates
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.hub_community_submissions;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.hub_community_submissions
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();

-- Initial backfill of already-persisted content. The migration runner must
-- execute this as a single transaction. The CREATE TRIGGER locks then serialize
-- concurrent writers against the backfill; do not run it as unrelated statements.
INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'bots', r.id, NULLIF(to_jsonb(r)->>'user_id','')::uuid,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.bots r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'bot_versions', r.id, (SELECT b.user_id FROM public.bots b WHERE b.id = r.bot_id),
       left('Bot version #' || r.version_number::text, 160), (COALESCE((SELECT b.deleted_at IS NOT NULL FROM public.bots b WHERE b.id = r.bot_id),false))
FROM public.bot_versions r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'profiles', r.id, r.id,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.profiles r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'request_forms', r.id, NULLIF(to_jsonb(r)->>'user_id','')::uuid,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.request_forms r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'creator_pages', r.id, NULLIF(to_jsonb(r)->>'user_id','')::uuid,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.creator_pages r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'creator_page_sections', r.id, (SELECT cp.user_id FROM public.creator_pages cp WHERE cp.id = r.page_id),
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), (COALESCE((SELECT cp.deleted_at IS NOT NULL FROM public.creator_pages cp WHERE cp.id = r.page_id),false) OR r.deleted_at IS NOT NULL)
FROM public.creator_page_sections r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'atlas_entries', r.id, NULLIF(to_jsonb(r)->>'user_id','')::uuid,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.atlas_entries r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'atlas_worlds', r.id, NULLIF(to_jsonb(r)->>'user_id','')::uuid,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.atlas_worlds r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'atlas_lorebooks', r.id, NULLIF(to_jsonb(r)->>'user_id','')::uuid,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.atlas_lorebooks r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'bio_projects', r.id, NULLIF(to_jsonb(r)->>'user_id','')::uuid,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.bio_projects r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'changelog_entries', r.id, r.created_by,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.changelog_entries r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'hub_community_records', r.id, r.contributor_user_id,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.hub_community_records r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'hub_community_record_updates', r.id, r.contributor_user_id,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.hub_community_record_updates r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

INSERT INTO public.media_asset_references
  (media_id, source_table, source_id, source_owner_id, source_label, source_deleted)
SELECT a.id, 'hub_community_submissions', r.id, NULLIF(to_jsonb(r)->>'user_id','')::uuid,
       left(COALESCE(NULLIF(to_jsonb(r)->>'name',''), NULLIF(to_jsonb(r)->>'title',''), NULLIF(to_jsonb(r)->>'display_name',''), NULLIF(to_jsonb(r)->>'username',''), 'Untitled resource'), 160), ((NULLIF(to_jsonb(r)->>'deleted_at','') IS NOT NULL))
FROM public.hub_community_submissions r
JOIN public.media_assets a ON a.bucket = 'media-library'
  AND strpos(to_jsonb(r)::text,
    '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
  SET source_owner_id = EXCLUDED.source_owner_id,
      source_label = EXCLUDED.source_label,
      source_deleted = EXCLUDED.source_deleted,
      recorded_at = now();

-- A zero-row result here is ONLY zero in the indexed tables, not a
-- deletion authorization. URLs copied to public/external sites remain usable.
