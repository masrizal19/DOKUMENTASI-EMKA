-- We can drop all existing admin_save_activity functions first to clean up.
DROP FUNCTION IF EXISTS public.admin_save_activity(UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN);
DROP FUNCTION IF EXISTS public.admin_save_activity(UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT);

-- Then recreate it safely.
CREATE OR REPLACE FUNCTION admin_save_activity(
  p_id UUID,
  p_title TEXT,
  p_date DATE,
  p_category TEXT,
  p_description TEXT,
  p_cover_image TEXT,
  p_background_image TEXT,
  p_background_video TEXT,
  p_google_drive_url TEXT,
  p_published BOOLEAN,
  p_featured BOOLEAN,
  p_sort_order INTEGER,
  p_username TEXT,
  p_pin TEXT,
  p_background_video_start DOUBLE PRECISION DEFAULT 0,
  p_background_video_end DOUBLE PRECISION DEFAULT NULL,
  p_background_video_loop BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_valid BOOLEAN := false;
  v_slug TEXT;
  v_result activities%ROWTYPE;
BEGIN
  -- 1. Verify admin via PIN
  SELECT (pin_hash = crypt(p_pin, pin_hash)) INTO v_is_valid
  FROM admin_credentials
  WHERE LOWER(username) = LOWER(TRIM(p_username)) AND COALESCE(is_active, active, true) = true;

  IF NOT COALESCE(v_is_valid, false) THEN
    -- Try to fallback to Supabase Auth if PIN is not matching
    IF auth.uid() IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'Autentikasi admin gagal atau PIN salah (Unauthorized).');
    END IF;
  END IF;

  v_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g'));

  -- 2. Insert or Update
  IF p_id IS NULL THEN
    INSERT INTO activities (
      title, slug, date, category, description,
      cover_image, background_image, background_video, google_drive_url,
      published, featured, sort_order, created_at, updated_at,
      background_video_start, background_video_end, background_video_loop
    ) VALUES (
      p_title, v_slug, p_date, p_category, p_description,
      p_cover_image, p_background_image, p_background_video, p_google_drive_url,
      COALESCE(p_published, false), COALESCE(p_featured, false), COALESCE(p_sort_order, 0),
      NOW(), NOW(),
      COALESCE(p_background_video_start, 0), p_background_video_end, COALESCE(p_background_video_loop, true)
    )
    RETURNING * INTO v_result;
  ELSE
    UPDATE activities SET
      title = p_title,
      slug = v_slug,
      date = p_date,
      category = p_category,
      description = p_description,
      cover_image = p_cover_image,
      background_image = p_background_image,
      background_video = p_background_video,
      google_drive_url = p_google_drive_url,
      published = COALESCE(p_published, false),
      featured = COALESCE(p_featured, false),
      sort_order = COALESCE(p_sort_order, 0),
      background_video_start = COALESCE(p_background_video_start, 0),
      background_video_end = p_background_video_end,
      background_video_loop = COALESCE(p_background_video_loop, true),
      updated_at = NOW()
    WHERE id = p_id
    RETURNING * INTO v_result;

    IF NOT FOUND THEN
      INSERT INTO activities (
        id, title, slug, date, category, description,
        cover_image, background_image, background_video, google_drive_url,
        published, featured, sort_order, created_at, updated_at,
        background_video_start, background_video_end, background_video_loop
      ) VALUES (
        p_id, p_title, v_slug, p_date, p_category, p_description,
        p_cover_image, p_background_image, p_background_video, p_google_drive_url,
        COALESCE(p_published, false), COALESCE(p_featured, false), COALESCE(p_sort_order, 0),
        NOW(), NOW(),
        COALESCE(p_background_video_start, 0), p_background_video_end, COALESCE(p_background_video_loop, true)
      )
      RETURNING * INTO v_result;
    END IF;
  END IF;

  RETURN json_build_object('success', true, 'data', to_jsonb(v_result));
EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_save_activity(UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
