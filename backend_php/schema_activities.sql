-- ==========================================================
-- MIGRATION: SISTEM KEGIATAN GALERI EMKA (PHP + MySQL)
-- Database: mkversem_galeriemka
-- Server API: https://api.mkverse.my.id/api/
-- ==========================================================

-- 1. Buat Tabel `activities`
CREATE TABLE IF NOT EXISTS `activities` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(200) NOT NULL,
  `slug` VARCHAR(220) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `category_id` INT UNSIGNED NULL,
  `event_date` DATE NULL,
  `cover_url` VARCHAR(500) NULL,
  `is_published` TINYINT(1) NOT NULL DEFAULT 1,
  `display_order` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_activities_category` (`category_id`),
  INDEX `idx_activities_published` (`is_published`),
  INDEX `idx_activities_date` (`event_date`),
  INDEX `idx_activities_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tambah kolom `activity_id` pada tabel `photos` jika belum ada
-- Jalankan perintah ini di phpMyAdmin / MySQL CLI database mkversem_galeriemka:
ALTER TABLE `photos` 
  ADD COLUMN IF NOT EXISTS `activity_id` INT UNSIGNED NULL AFTER `category_id`,
  ADD INDEX IF NOT EXISTS `idx_photos_activity` (`activity_id`);
