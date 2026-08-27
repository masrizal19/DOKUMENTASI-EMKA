-- Initial Database Schema for GALERI EMKA

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create Activities Table
CREATE TABLE IF NOT EXISTS activities (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    description TEXT NOT NULL,
    cover_image TEXT NOT NULL,
    background_video TEXT,
    google_drive_url TEXT,
    status TEXT NOT NULL DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Photos Table
CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY,
    activity_id TEXT REFERENCES activities(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Media Table
CREATE TABLE IF NOT EXISTS media (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Site Settings Table (Single-row design)
CREATE TABLE IF NOT EXISTS site_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    site_name TEXT NOT NULL DEFAULT 'GALERI EMKA',
    logo TEXT NOT NULL DEFAULT '',
    whatsapp TEXT NOT NULL DEFAULT '628123456789',
    accent_color TEXT NOT NULL DEFAULT '#f6c374',
    school_name TEXT NOT NULL DEFAULT 'SMK Multi Karya',
    address TEXT NOT NULL DEFAULT 'Jl. SMK Multi Karya No. 45',
    city TEXT NOT NULL DEFAULT 'Medan',
    province TEXT NOT NULL DEFAULT 'Sumatera Utara',
    country TEXT NOT NULL DEFAULT 'Indonesia',
    email TEXT NOT NULL DEFAULT 'info@multikarya.sch.id',
    phone TEXT NOT NULL DEFAULT '(061) 1234567',
    tata_usaha TEXT NOT NULL DEFAULT 'Senin - Sabtu',
    whatsapp_title TEXT NOT NULL DEFAULT 'Narahubung Cepat',
    whatsapp_description TEXT NOT NULL DEFAULT 'Hubungi admin secara langsung melalui WhatsApp.',
    about_title TEXT NOT NULL DEFAULT 'Mengabadikan Jejak, Mengukir Kenangan Sinematik',
    about_desc1 TEXT NOT NULL DEFAULT 'Galeri EMKA adalah wadah dokumentasi visual.',
    about_desc2 TEXT NOT NULL DEFAULT 'Kami tidak hanya mengambil foto.',
    about_photo TEXT NOT NULL DEFAULT '',
    vision_title TEXT NOT NULL DEFAULT 'Visi & Seni Visual',
    vision_content TEXT NOT NULL DEFAULT 'Menjadi pusat dokumentasi visual sekolah.',
    missions JSONB NOT NULL DEFAULT '[]'::jsonb,
    hero_label TEXT NOT NULL DEFAULT 'DOKUMENTASI SINEMATIK',
    hero_title TEXT NOT NULL DEFAULT 'GALERI EMKA',
    hero_description TEXT NOT NULL DEFAULT 'Elevating School Memories into Fine-Art Archives.',
    hero_image TEXT NOT NULL DEFAULT '',
    hero_video TEXT NOT NULL DEFAULT '',
    hero_source TEXT NOT NULL DEFAULT 'auto',
    hero_activity_id TEXT,
    sections JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT single_row CHECK (id = 'default')
);

-- Seed initial default settings if empty
INSERT INTO site_settings (id, site_name, whatsapp, accent_color, school_name, address, city, province, country, email, phone, tata_usaha, whatsapp_title, whatsapp_description, about_title, about_desc1, about_desc2, about_photo, vision_title, vision_content, missions, hero_label, hero_title, hero_description, hero_image, hero_video, hero_source, sections)
VALUES (
    'default',
    'GALERI EMKA',
    '628123456789',
    '#f6c374',
    'SMK Multi Karya',
    'Jl. SMK Multi Karya No. 45',
    'Medan',
    'Sumatera Utara',
    'Indonesia',
    'info@multikarya.sch.id',
    '(061) 1234567',
    'Senin - Sabtu',
    'Narahubung Cepat',
    'Hubungi admin secara langsung melalui WhatsApp.',
    'Mengabadikan Jejak, Mengukir Kenangan Sinematik',
    'Galeri EMKA adalah wadah dokumentasi visual yang berfokus pada keanggunan, estetika, dan cerita di balik setiap kegiatan sekolah. Kami percaya bahwa setiap kenangan layak disimpan dengan penghormatan tertinggi.',
    'Kami tidak hanya mengambil foto; kami mendokumentasikan emosi, antusiasme, dan khidmatnya setiap upacara, tawa ceria pada masa orientasi, karsa pada sabtu kreatif, dan harunya momen kelulusan.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDUIWUTpU9L6rWIPSvj7HHxKYp5MyIlSXwvEsqL-tW6v6GfCLvaaEffEXHfQ77mBbEYaZw1BF3EcDHw0lOCi5vW8MPkBpT22H3x8wdiXxzETSwxlrZB068547LOB_u9sqAfel2p41Lf2y-thR-6B9PHMWL6KgNu3a67v3J4MedZhF3Z_AbGLjnFAL4hHkRJf073lHOcFkWpyu4J-Tiw3LXR5B4Q-bVLUczAQy718Z_UqhyfJvg9M2AT',
    'Visi & Seni Visual',
    'Menjadi pusat dokumentasi visual sekolah yang informatif, modern, estetis, dan mudah diakses untuk seluruh civitas akademika dan masyarakat luas.',
    '["Mendokumentasikan seluruh kegiatan sekolah secara profesional.", "Menyediakan arsip visual yang terstruktur dan mudah diakses.", "Memudahkan siswa dan alumni mengakses dokumentasi kenangan mereka.", "Menampilkan karya, kreativitas, dan aktivitas berharga civitas akademika."]'::jsonb,
    'DOKUMENTASI SINEMATIK',
    'GALERI EMKA',
    'Elevating School Memories into Fine-Art Archives.',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDiwkKynY0e3IvvUAxEmtVZ2u6YZsowG5mH3l-zc6gcn5mgrMmkyLvOFh0ly7EMHYxMeLM6YbZfoIuD28BSAt6kQSyyS2xerZiM8e8Y2nBQ3wHh4h1KsBlXB1CgSdokMiaOQqGjzCv-N5FBMdWyescacStvofAlUq4Ssr_mwwCviBoNGNiEucMbgxtUSUcrOPn-gYMIpk7adM_Sr0Nzag2CcpWUo29jNQLnQAOhKxFYIJ1QHdbMV74X',
    'https://assets.mixkit.co/videos/preview/mixkit-national-flag-of-indonesia-waving-in-the-wind-41620-large.mp4',
    'auto',
    '[
        {"id": "hero", "section_name": "Hero Homepage", "enabled": true, "layout": "cinematic", "sort_order": 1, "item_limit": "all", "custom_label": "Hero"},
        {"id": "galeri", "section_name": "Arsip Galeri", "enabled": true, "layout": "cinematic", "sort_order": 2, "item_limit": 9, "custom_label": "Galeri Foto"},
        {"id": "kegiatan", "section_name": "Arsip Kegiatan", "enabled": true, "layout": "grid", "sort_order": 3, "item_limit": 3, "custom_label": "Arsip Kegiatan Pilihan", "sorting": "latest"},
        {"id": "foto-terbaru", "section_name": "Foto Terbaru", "enabled": true, "layout": "grid", "sort_order": 4, "item_limit": 6, "custom_label": "Momen Terkini", "sorting": "latest", "source": "all"},
        {"id": "tentang", "section_name": "Tentang Kami", "enabled": true, "layout": "editorial", "sort_order": 5, "item_limit": "all", "custom_label": "Tentang Kami"},
        {"id": "visi-misi", "section_name": "Visi & Misi", "enabled": true, "layout": "grid", "sort_order": 6, "item_limit": "all", "custom_label": "Visi & Misi"},
        {"id": "kontak", "section_name": "Informasi Kontak", "enabled": true, "layout": "grid", "sort_order": 7, "item_limit": "all", "custom_label": "Hubungi Kami"}
    ]'::jsonb
) ON CONFLICT (id) DO NOTHING;
