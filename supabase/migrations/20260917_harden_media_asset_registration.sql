-- My Media hardening: the client may read its own library, but only the
-- verified server action (service-role) may register an asset.
-- Existing rows, URLs, objects and other bucket policies remain unchanged.
DROP POLICY IF EXISTS media_assets_insert_own ON public.media_assets;
REVOKE INSERT ON public.media_assets FROM authenticated;
