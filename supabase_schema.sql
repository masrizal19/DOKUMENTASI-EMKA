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
