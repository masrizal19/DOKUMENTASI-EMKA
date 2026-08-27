-- Fix RLS Policies for activities table
DROP POLICY IF EXISTS "Allow admin write access to activities" ON activities;
DROP POLICY IF EXISTS "Allow public read access to activities" ON activities;
DROP POLICY IF EXISTS "Enable read access for all users" ON activities;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON activities;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON activities;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON activities;
DROP POLICY IF EXISTS "Enable write access for all users" ON activities;

-- Ensure RLS is enabled
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to activities" ON activities
FOR SELECT
USING (true);

-- Allow authenticated users to write
CREATE POLICY "Allow authenticated users to insert activities" ON activities
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update activities" ON activities
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to delete activities" ON activities
FOR DELETE TO authenticated
USING (true);

-- Fix the admin_save_activity function to handle UUID generation and Auth correctly
CREATE OR REPLACE FUNCTION public.admin_save_activity(
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
) RETURNS jsonb AS $$
DECLARE
  v_is_valid BOOLEAN := false;
  v_slug TEXT;
  v_result activities%ROWTYPE;
  v_id UUID;
BEGIN
  -- 1. Verify admin (Fallback to Supabase Auth if PIN is not matching/provided)
  SELECT (pin_hash = crypt(p_pin, pin_hash)) INTO v_is_valid
  FROM admin_credentials
  WHERE LOWER(username) = LOWER(TRIM(p_username)) AND COALESCE(is_active, active, true) = true;

  IF NOT COALESCE(v_is_valid, false) THEN
    -- Check if called by an authenticated Supabase Auth user
    IF auth.uid() IS NULL THEN
      RETURN json_build_object('success', false, 'message', 'Unauthorized: Autentikasi admin gagal atau sesi tidak valid.');
    END IF;
  END IF;

  v_slug := lower(regexp_replace(p_title, '[^a-zA-Z0-9]+', '-', 'g'));
  
  -- Use provided ID or generate a new one
  v_id := COALESCE(p_id, gen_random_uuid());

  -- 2. Insert or Update
  IF p_id IS NULL THEN
    INSERT INTO activities (
      id, title, slug, date, category, description,
      cover_image, background_image, background_video, google_drive_url,
      published, featured, sort_order, created_at, updated_at,
      background_video_start, background_video_end, background_video_loop
    ) VALUES (
      v_id, p_title, v_slug, p_date, p_category, p_description,
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
      -- If UPDATE didn't find the row, INSERT it with the specific ID
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Ensure execute grants
GRANT EXECUTE ON FUNCTION public.admin_save_activity(UUID, TEXT, DATE, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, BOOLEAN, BOOLEAN, INTEGER, TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, BOOLEAN) TO anon, authenticated;

-- Ensure schema cache is reloaded so PostgREST picks up changes
NOTIFY pgrst, 'reload schema';
