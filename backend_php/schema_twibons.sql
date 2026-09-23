-- ==========================================================
-- MIGRATION: SISTEM TWIBON GALERI EMKA (PHP + MySQL)
-- Database: mkversem_galeriemka
-- Server API: https://api.mkverse.my.id/api/
-- ==========================================================

-- 1. Buat Tabel `twibons` jika belum ada
CREATE TABLE IF NOT EXISTS `twibons` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `title` VARCHAR(255) NOT NULL,
  `slug` VARCHAR(255) NOT NULL UNIQUE,
  `description` TEXT NULL,
  `ratio` ENUM('1:1', '4:3', '16:9', '9:16') NOT NULL DEFAULT '1:1',
  `design_url` VARCHAR(500) NOT NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `use_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_twibons_slug` (`slug`),
  INDEX `idx_twibons_active` (`is_active`),
  INDEX `idx_twibons_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Jika tabel sudah ada dari versi sebelumnya, pastikan seluruh kolom lengkap
-- Tambahkan kolom yang mungkin belum ada:
-- ALTER TABLE `twibons` ADD COLUMN IF NOT EXISTS `ratio` ENUM('1:1', '4:3', '16:9', '9:16') NOT NULL DEFAULT '1:1' AFTER `description`;
-- ALTER TABLE `twibons` ADD COLUMN IF NOT EXISTS `use_count` INT UNSIGNED NOT NULL DEFAULT 0 AFTER `is_active`;
