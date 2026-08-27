-- SQL Schema for GALERI EMKA Supabase Integration
-- Paste this script directly into your Supabase SQL Editor (Dashboard > SQL Editor > New query).

-- 1. Create site_settings table
CREATE TABLE IF NOT EXISTS site_settings (
  id TEXT PRIMARY KEY DEFAULT 'default',
  school_name TEXT,
  address TEXT,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  about TEXT,
  vision TEXT,
  mission TEXT,
  raw_settings JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  date TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  google_drive_url TEXT,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create activity_media table
CREATE TABLE IF NOT EXISTS activity_media (
  id TEXT PRIMARY KEY,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  type TEXT DEFAULT 'image',
  url TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create latest_photos table
CREATE TABLE IF NOT EXISTS latest_photos (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  caption TEXT,
  activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE latest_photos ENABLE ROW LEVEL SECURITY;

-- 6. Create Public Read Access Policies (Allow anyone to view)
DROP POLICY IF EXISTS "Allow public read access to site_settings" ON site_settings;
CREATE POLICY "Allow public read access to site_settings" ON site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to activities" ON activities;
CREATE POLICY "Allow public read access to activities" ON activities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to activity_media" ON activity_media;
CREATE POLICY "Allow public read access to activity_media" ON activity_media FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to latest_photos" ON latest_photos;
CREATE POLICY "Allow public read access to latest_photos" ON latest_photos FOR SELECT USING (true);

-- 7. Create Admin Access Policies (Allow authenticated users full access)
DROP POLICY IF EXISTS "Allow admin write access to site_settings" ON site_settings;
CREATE POLICY "Allow admin write access to site_settings" ON site_settings FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write access to activities" ON activities;
CREATE POLICY "Allow admin write access to activities" ON activities FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write access to activity_media" ON activity_media;
CREATE POLICY "Allow admin write access to activity_media" ON activity_media FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin write access to latest_photos" ON latest_photos;
CREATE POLICY "Allow admin write access to latest_photos" ON latest_photos FOR ALL TO authenticated USING (true);

-- 8. Create admin_credentials table & verify_admin_login function
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  pin_hash TEXT NOT NULL,
  active BOOLEAN DEFAULT true NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on admin_credentials
ALTER TABLE admin_credentials ENABLE ROW LEVEL SECURITY;

-- Block public read/write access to credentials except through the RPC
DROP POLICY IF EXISTS "Deny all public access to admin_credentials" ON admin_credentials;
CREATE POLICY "Deny all public access to admin_credentials" ON admin_credentials FOR ALL TO public USING (false);

-- Insert default admin account if not exists: Username = 'ADMIN', PIN = '1902' (using blowfish crypt)
INSERT INTO admin_credentials (username, pin_hash, active, is_active)
VALUES ('ADMIN', crypt('1902', gen_salt('bf')), true, true)
ON CONFLICT (username) DO NOTHING;

-- Secure RPC to verify login credentials
CREATE OR REPLACE FUNCTION verify_admin_login(input_username TEXT, input_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN := false;
BEGIN
  SELECT (pin_hash = crypt(input_pin, pin_hash)) INTO is_valid
  FROM admin_credentials
  WHERE LOWER(username) = LOWER(input_username) AND active = true AND is_active = true;
  
  RETURN COALESCE(is_valid, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_admin_login(TEXT, TEXT) TO anon, authenticated;

-- Secure RPC to verify login credentials via PIN
CREATE OR REPLACE FUNCTION verify_admin_pin(p_username TEXT, p_pin TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_pin_hash TEXT;
BEGIN
  SELECT pin_hash INTO v_pin_hash
  FROM public.admin_credentials
  WHERE UPPER(username) = UPPER(TRIM(p_username))
    AND COALESCE(is_active, active, true) = true
  LIMIT 1;
  
  IF v_pin_hash IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN crypt(p_pin, v_pin_hash) = v_pin_hash;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.verify_admin_pin(TEXT, TEXT) TO anon, authenticated;

