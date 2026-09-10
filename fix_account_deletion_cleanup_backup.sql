-- ============================================================================
-- Forgeworks
-- Account deletion cleanup
--
-- Fixes:
-- 1. Prevent collaboration removal notifications while an account is deleted.
-- 2. Ensure profile Storage assets are cleaned when a profile is deleted.
-- 3. Remove feedback and uploaded feedback images owned by deleted accounts.
-- 4. Keep self-service and administrative account deletion aligned.
-- ============================================================================


-- ============================================================================
-- 1. Do not notify a collaborator who no longer exists
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_collaborator_removed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bot_name TEXT;
BEGIN
  -- Only notify collaborators who had accepted the collaboration.
  IF OLD.status <> 'accepted' THEN
    RETURN OLD;
  END IF;

  -- During account deletion, bot_collaborators may be removed by CASCADE.
  -- If the target auth user no longer exists, a notification cannot be created.
  IF NOT EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = OLD.user_id
  ) THEN
    RETURN OLD;
  END IF;

  SELECT b.name
  INTO v_bot_name
  FROM public.bots b
  WHERE b.id = OLD.bot_id;

  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    link,
    metadata
  )
  VALUES (
    OLD.user_id,
    'collaborator_removed',
    'Collaboration ended',
    'You are no longer a collaborator on "'
      || COALESCE(v_bot_name, 'a bot')
      || '".',
    NULL,
    jsonb_build_object(
      'bot_id', OLD.bot_id,
      'collaborator_id', OLD.id
    )
  );

  RETURN OLD;
END;
$$;


-- ============================================================================
-- 2. Ensure profile Storage assets are deleted
-- ============================================================================

DROP TRIGGER IF EXISTS trg_cleanup_profile_storage_on_delete
ON public.profiles;

CREATE TRIGGER trg_cleanup_profile_storage_on_delete
AFTER DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_profile_storage_on_delete();


-- ============================================================================
-- 3. Helper for deleting images attached to feedback
-- ============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_feedback_storage_for_user(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feedback RECORD;
  v_image JSONB;
  v_url TEXT;
  v_path TEXT;
BEGIN
  FOR v_feedback IN
    SELECT metadata
    FROM public.feedback_submissions
    WHERE submitter_user_id = p_user_id
  LOOP
    FOR v_image IN
      SELECT value
      FROM jsonb_array_elements(
        COALESCE(v_feedback.metadata->'images', '[]'::jsonb)
      )
    LOOP
      v_url := NULLIF(v_image->>'url', '');

      IF v_url IS NULL THEN
        CONTINUE;
      END IF;

      v_path := public.storage_public_url_to_object_path(
        v_url,
        'feedback_images'
      );

      IF v_path IS NOT NULL THEN
        DELETE FROM storage.objects
        WHERE bucket_id = 'feedback_images'
          AND name = v_path;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- This is an internal privileged helper.
REVOKE ALL
ON FUNCTION public.cleanup_feedback_storage_for_user(uuid)
FROM PUBLIC;


-- ============================================================================
-- 4. Self-service account deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;


  -- --------------------------------------------------------------------------
  -- Feedback
  --
  -- Feedback may contain contact information and screenshots.
  -- Remove its Storage assets first, then the database records.
  -- --------------------------------------------------------------------------

  PERFORM public.cleanup_feedback_storage_for_user(v_user_id);

  DELETE FROM public.feedback_submissions
  WHERE submitter_user_id = v_user_id;


  -- --------------------------------------------------------------------------
  -- Historical/shared references that intentionally survive the account
  -- --------------------------------------------------------------------------

  UPDATE public.bot_change_requests
  SET reviewed_by = NULL
  WHERE reviewed_by = v_user_id;


  -- --------------------------------------------------------------------------
  -- Delete Auth identity
  --
  -- The current Forgeworks FK graph handles owned records with CASCADE
  -- and historical references with SET NULL.
  -- --------------------------------------------------------------------------

  DELETE FROM auth.users
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User account not found';
  END IF;
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.delete_user_account()
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.delete_user_account()
TO authenticated;


-- ============================================================================
-- 5. Administrative account deletion
-- ============================================================================

CREATE OR REPLACE FUNCTION public.delete_user_as_admin(
  target_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_caller_role text;
  v_caller_blocked boolean;
  v_target_role text;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated'
      USING ERRCODE = '42501';
  END IF;


  -- --------------------------------------------------------------------------
  -- Only an active Forgeworks Owner may permanently delete another account.
  -- --------------------------------------------------------------------------

  SELECT
    staff_role,
    is_blocked
  INTO
    v_caller_role,
    v_caller_blocked
  FROM public.profiles
  WHERE id = v_caller_id;

  IF v_caller_role IS DISTINCT FROM 'owner'
     OR COALESCE(v_caller_blocked, false) THEN
    RAISE EXCEPTION 'Owner access required'
      USING ERRCODE = '42501';
  END IF;


  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Target user is required';
  END IF;

  IF target_user_id = v_caller_id THEN
    RAISE EXCEPTION
      'Use delete_user_account() to delete your own account';
  END IF;


  -- --------------------------------------------------------------------------
  -- Never allow this RPC to remove another Owner account.
  -- --------------------------------------------------------------------------

  SELECT staff_role
  INTO v_target_role
  FROM public.profiles
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target user not found';
  END IF;

  IF v_target_role = 'owner' THEN
    RAISE EXCEPTION 'Owner accounts cannot be deleted here'
      USING ERRCODE = '42501';
  END IF;


  -- --------------------------------------------------------------------------
  -- Feedback
  -- --------------------------------------------------------------------------

  PERFORM public.cleanup_feedback_storage_for_user(target_user_id);

  DELETE FROM public.feedback_submissions
  WHERE submitter_user_id = target_user_id;


  -- --------------------------------------------------------------------------
  -- Historical/shared references
  -- --------------------------------------------------------------------------

  UPDATE public.bot_change_requests
  SET reviewed_by = NULL
  WHERE reviewed_by = target_user_id;


  -- --------------------------------------------------------------------------
  -- Delete Auth identity
  -- --------------------------------------------------------------------------

  DELETE FROM auth.users
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Target auth user not found';
  END IF;
END;
$$;

REVOKE EXECUTE
ON FUNCTION public.delete_user_as_admin(uuid)
FROM PUBLIC;

GRANT EXECUTE
ON FUNCTION public.delete_user_as_admin(uuid)
TO authenticated;