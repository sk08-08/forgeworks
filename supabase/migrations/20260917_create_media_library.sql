-- My Media v1. Additive: existing buckets/URLs are unchanged.
-- Public files are intentional: Creator Pages and published bios must display them.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media-library', 'media-library', true, 5242880,
        ARRAY['image/png','image/jpeg','image/webp','image/avif'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bucket text NOT NULL DEFAULT 'media-library' CHECK (bucket = 'media-library'),
  storage_path text NOT NULL UNIQUE,
  sha256 text NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  original_name text NOT NULL CHECK (char_length(original_name) BETWEEN 1 AND 255),
  content_type text NOT NULL CHECK (content_type IN ('image/png','image/jpeg','image/webp','image/avif')),
  byte_size integer NOT NULL CHECK (byte_size BETWEEN 1 AND 5242880),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT media_assets_owner_path CHECK (split_part(storage_path, '/', 1) = user_id::text),
  CONSTRAINT media_assets_user_hash_unique UNIQUE (user_id, sha256)
);

CREATE INDEX IF NOT EXISTS media_assets_user_recent_idx ON public.media_assets (user_id, created_at DESC);
ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "media_assets_select_own" ON public.media_assets
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY "media_assets_insert_own" ON public.media_assets
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
-- No UPDATE/DELETE in v1: removing a block reference must never break a different page.
REVOKE ALL ON public.media_assets FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.media_assets TO authenticated;

-- Existing legacy storage policies and buckets are untouched.
CREATE POLICY "media_library_public_read" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'media-library');
CREATE POLICY "media_library_upload_own" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (
    bucket_id = 'media-library' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
-- Deliberately no client UPDATE or DELETE policies for media-library.
