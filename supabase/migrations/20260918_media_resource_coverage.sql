-- Stage 1 follow-up: index saved Resources articles and submissions.
-- Run as one migration transaction through the Supabase migration workflow.
-- No existing references are deleted; no physical media deletion is enabled.
-- This migration assumes 20260918_media_reference_index.sql is already applied.

ALTER TABLE public.media_asset_references
  DROP CONSTRAINT media_source_table_allowed;
ALTER TABLE public.media_asset_references
  ADD CONSTRAINT media_source_table_allowed CHECK (source_table IN (
    'bots','bot_versions','profiles','request_forms','creator_pages',
    'creator_page_sections','atlas_entries','atlas_worlds','atlas_lorebooks',
    'bio_projects','changelog_entries','hub_community_records',
    'hub_community_record_updates','hub_community_submissions',
    'hub_resource_entries','hub_resource_submissions'
  ));

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
    'hub_community_record_updates','hub_community_submissions',
    'hub_resource_entries','hub_resource_submissions'
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
  ELSIF TG_TABLE_NAME = 'hub_resource_entries' THEN
    v_owner := NULLIF(v_row->>'contributor_user_id','')::uuid;
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

-- Capture future direct SDK writes within their original database transaction.
DROP TRIGGER IF EXISTS media_index_references ON public.hub_resource_entries;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.hub_resource_entries
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();
DROP TRIGGER IF EXISTS media_index_references ON public.hub_resource_submissions;
CREATE TRIGGER media_index_references
  AFTER INSERT OR UPDATE OR DELETE ON public.hub_resource_submissions
  FOR EACH ROW EXECUTE FUNCTION public.media_track_row_references();

-- Backfill previously saved articles and pending submissions.
-- The media path matching approach is identical to the initial reference index.
INSERT INTO public.media_asset_references
 (media_id,source_table,source_id,source_owner_id,source_label,source_deleted)
SELECT a.id, 'hub_resource_entries', r.id, r.contributor_user_id,
       left(coalesce(nullif(r.title,''),'Untitled resource'),160), false
FROM public.hub_resource_entries r
JOIN public.media_assets a ON a.bucket = 'media-library'
 AND strpos(to_jsonb(r)::text,
 '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
 SET source_owner_id=EXCLUDED.source_owner_id,
     source_label=EXCLUDED.source_label,
     source_deleted=EXCLUDED.source_deleted,
     recorded_at=now();

INSERT INTO public.media_asset_references
 (media_id,source_table,source_id,source_owner_id,source_label,source_deleted)
SELECT a.id, 'hub_resource_submissions', r.id, r.user_id,
       left(coalesce(nullif(r.title,''),'Untitled resource submission'),160), false
FROM public.hub_resource_submissions r
JOIN public.media_assets a ON a.bucket = 'media-library'
 AND strpos(to_jsonb(r)::text,
 '/storage/v1/object/public/media-library/' || a.storage_path) > 0
ON CONFLICT (media_id,source_table,source_id) DO UPDATE
 SET source_owner_id=EXCLUDED.source_owner_id,
     source_label=EXCLUDED.source_label,
     source_deleted=EXCLUDED.source_deleted,
     recorded_at=now();
