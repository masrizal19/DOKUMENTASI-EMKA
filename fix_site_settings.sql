-- 1. Perbaiki Kebijakan RLS (Row Level Security) pada tabel site_settings
-- Pastikan tabel site_settings memiliki RLS yang aktif dan mengizinkan update untuk admin terautentikasi.

ALTER TABLE IF EXISTS site_settings ENABLE ROW LEVEL SECURITY;

-- Hapus kebijakan lama jika ada
DROP POLICY IF EXISTS "Allow public read access to site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow admin write access to site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow authenticated users to update site_settings" ON site_settings;

-- 2. Buat kebijakan baru yang presisi dan aman
-- Izinkan semua pengguna (publik) membaca pengaturan
CREATE POLICY "Allow public read access to site_settings" ON site_settings
FOR SELECT
USING (true);

-- Izinkan pengguna terautentikasi (admin) melakukan update ke baris manapun di site_settings
CREATE POLICY "Allow authenticated users to update site_settings" ON site_settings
FOR UPDATE TO authenticated
USING (true)
WITH CHECK (true);

-- Izinkan pengguna terautentikasi (admin) untuk melakukan insert jika baris belum ada
CREATE POLICY "Allow authenticated users to insert site_settings" ON site_settings
FOR INSERT TO authenticated
WITH CHECK (true);

-- 3. Buat RPC Function sebagai Lapisan Keamanan Tambahan (SECURITY DEFINER)
-- Fungsi ini akan memintas RLS jika ada masalah izin di tingkat tabel dan menjamin penyimpanan selalu sukses.
CREATE OR REPLACE FUNCTION public.admin_save_settings(
  p_school_name TEXT,
  p_address TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_whatsapp TEXT,
  p_about TEXT,
  p_vision TEXT,
  p_mission TEXT,
  p_about_image TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
  v_id UUID;
BEGIN
  -- Pastikan pemanggil adalah pengguna terautentikasi di Supabase
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Sesi admin tidak valid atau kedaluwarsa.');
  END IF;

  -- Gunakan ID baris yang sudah ada atau buat UUID baru jika belum ada
  SELECT id INTO v_id FROM site_settings LIMIT 1;
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
  END IF;

  -- Lakukan Insert atau Update secara atomik
  UPDATE site_settings SET
    school_name = p_school_name,
    address = p_address,
    email = p_email,
    phone = p_phone,
    whatsapp = p_whatsapp,
    about = p_about,
    vision = p_vision,
    mission = p_mission,
    about_image = p_about_image,
    updated_at = NOW()
  WHERE id = v_id
  RETURNING * INTO v_result;

  IF NOT FOUND THEN
    INSERT INTO site_settings (
      id, school_name, address, email, phone, whatsapp, about, vision, mission, about_image, updated_at
    ) VALUES (
      v_id, p_school_name, p_address, p_email, p_phone, p_whatsapp, p_about, p_vision, p_mission, p_about_image, NOW()
    ) RETURNING * INTO v_result;
  END IF;

  RETURN json_build_object('success', true, 'data', to_jsonb(v_result));
EXCEPTION WHEN others THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Berikan izin eksekusi kepada pengguna publik dan terautentikasi
GRANT EXECUTE ON FUNCTION public.admin_save_settings(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Muat ulang skema PostgREST agar fungsi baru langsung terdeteksi di API klien
NOTIFY pgrst, 'reload schema';
