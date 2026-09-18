-- My Media: authorize individual uploads without granting general Storage INSERT.
-- Apply only after deploying the matching Server Actions + MediaPicker.
CREATE TABLE IF NOT EXISTS public.media_upload_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  content_type text NOT NULL CHECK (content_type IN ('image/png','image/jpeg','image/webp','image/avif')),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes'),
  CONSTRAINT media_upload_reservations_owner_hash UNIQUE(user_id,sha256)
);
CREATE INDEX IF NOT EXISTS media_upload_reservations_user_active_idx
 ON public.media_upload_reservations(user_id,expires_at);
ALTER TABLE public.media_upload_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_upload_reservations FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.media_upload_reservations TO service_role;

-- The server supplies authenticated user ID; only service-role may execute this function.
-- Per-user advisory lock serializes reservations and registrations.
CREATE OR REPLACE FUNCTION public.reserve_media_upload(
 p_user_id uuid, p_sha256 text, p_content_type text, p_byte_size integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_id uuid; v_existing public.media_upload_reservations%ROWTYPE;
        v_registered integer; v_pending integer; v_recent integer;
BEGIN
 IF p_user_id IS NULL OR p_sha256 !~ '^[a-f0-9]{64}$' OR
    p_content_type NOT IN ('image/png','image/jpeg','image/webp','image/avif') OR
    p_byte_size IS NULL OR p_byte_size < 1 OR p_byte_size > 5242880 THEN
   RAISE EXCEPTION 'Invalid upload request';
 END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text,0));
 IF EXISTS (SELECT 1 FROM public.media_assets WHERE user_id=p_user_id AND sha256=p_sha256) THEN
   RAISE EXCEPTION 'Image already registered. Refresh the library.';
 END IF;
 SELECT count(*) INTO v_registered FROM public.media_assets WHERE user_id=p_user_id;
 IF v_registered >= 100 THEN RAISE EXCEPTION 'Library limit reached (100 images).'; END IF;
 SELECT * INTO v_existing FROM public.media_upload_reservations
  WHERE user_id=p_user_id AND sha256=p_sha256;
 IF FOUND AND v_existing.expires_at > now() THEN
   IF v_existing.byte_size <> p_byte_size OR v_existing.content_type <> p_content_type THEN
      RAISE EXCEPTION 'An upload with this hash is already pending.';
   END IF;
   RETURN v_existing.id;
 END IF;
 SELECT count(*) INTO v_pending FROM public.media_upload_reservations
   WHERE user_id=p_user_id AND expires_at > now();
 IF v_registered+v_pending >= 100 OR v_pending >= 10 THEN
   RAISE EXCEPTION 'Too many pending uploads or library capacity reached. Retry later.';
 END IF;
 SELECT count(*) INTO v_recent FROM public.media_upload_reservations
   WHERE user_id=p_user_id AND created_at > now()-interval '1 hour';
 IF v_recent >= 30 THEN RAISE EXCEPTION 'Upload rate limit reached. Retry later.'; END IF;
 INSERT INTO public.media_upload_reservations(user_id,sha256,content_type,byte_size)
 VALUES(p_user_id,p_sha256,p_content_type,p_byte_size)
 ON CONFLICT (user_id,sha256) DO UPDATE
   SET id=gen_random_uuid(),content_type=excluded.content_type,byte_size=excluded.byte_size,
       created_at=now(),expires_at=now()+interval '15 minutes'
 RETURNING id INTO v_id;
 RETURN v_id;
END; $$;
REVOKE ALL ON FUNCTION public.reserve_media_upload(uuid,text,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_media_upload(uuid,text,text,integer) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_media_asset_quota()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_count integer;
BEGIN
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(NEW.user_id::text,0));
 SELECT count(*) INTO v_count FROM public.media_assets WHERE user_id=NEW.user_id;
 IF v_count>=100 THEN RAISE EXCEPTION 'Library limit reached (100 images).'; END IF;
 RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS enforce_media_asset_quota_insert ON public.media_assets;
CREATE TRIGGER enforce_media_asset_quota_insert BEFORE INSERT ON public.media_assets
 FOR EACH ROW EXECUTE FUNCTION public.enforce_media_asset_quota();

-- Ensure metadata can only be inserted through the verified service-role action.
DROP POLICY IF EXISTS media_assets_insert_own ON public.media_assets;
REVOKE INSERT ON public.media_assets FROM authenticated;

-- Restrict direct Storage uploads: signed upload tokens issued by trusted server
-- continue to work without allowing arbitrary authenticated Storage INSERT.
DROP POLICY IF EXISTS media_library_upload_own ON storage.objects;
-- Keep public reads; keep no general UPDATE/DELETE permissions or policies.
