<?php
/**
 * ADD TWIBON API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/add-twibon.php
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

$allowedOrigins = [
    'https://galerifoto.mkverse.my.id',
    'https://galeri.mkverse.my.id',
    'https://api.mkverse.my.id',
    'http://localhost:3000',
    'http://localhost:5173',
];

$httpOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($httpOrigin)) {
    header("Access-Control-Allow-Origin: {$httpOrigin}");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan POST.',
        'data' => null
    ]);
    exit;
}

require_once __DIR__ . '/db.php';

// Auto-bootstrap table if not exists
try {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `twibons` (
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
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");
} catch (Throwable $e) {}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = $_POST;
}

$title = isset($data['title']) ? trim($data['title']) : '';
$rawSlug = !empty($data['slug']) ? trim($data['slug']) : $title;
$slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $rawSlug), '-'));
$description = isset($data['description']) ? trim($data['description']) : '';
$ratio = isset($data['ratio']) ? trim($data['ratio']) : '1:1';
if (!in_array($ratio, ['1:1', '4:3', '16:9', '9:16'])) {
    $ratio = '1:1';
}

$isActive = isset($data['is_active']) ? (int)$data['is_active'] : (isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : 1);

if (empty($title)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Judul kampanye Twibon wajib diisi.'
    ]);
    exit;
}

if (empty($slug)) {
    $slug = 'twibon-' . time();
}

// Cek duplikasi slug
$stmtSlug = $pdo->prepare("SELECT id FROM twibons WHERE slug = ? LIMIT 1");
$stmtSlug->execute([$slug]);
if ($stmtSlug->fetch()) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => "Slug '{$slug}' sudah digunakan oleh kampanye Twibon lain."
    ]);
    exit;
}

// Direktori penyimpanan file
$uploadDir = __DIR__ . '/../uploads/twibon/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

$uploadedDesignUrl = '';
$uploadedFilePath = '';

// 1. Cek upload file multipart
if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['file'];
    $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

    if ($ext !== 'png') {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Frame Twibon harus berupa berkas format PNG transparan (.png).'
        ]);
        exit;
    }

    $uniqueName = 'twibon_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.png';
    $dest = $uploadDir . $uniqueName;

    if (move_uploaded_file($file['tmp_name'], $dest)) {
        $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
        $host = $_SERVER['HTTP_HOST'];
        $uploadedDesignUrl = $protocol . $host . '/uploads/twibon/' . $uniqueName;
        $uploadedFilePath = $dest;
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Gagal memindahkan file PNG ke folder /uploads/twibon/.'
        ]);
        exit;
    }
} elseif (!empty($data['image_base64']) || (isset($data['design_url']) && strpos($data['design_url'], 'data:image/') === 0)) {
    // 2. Cek base64 data URI
    $dataUri = !empty($data['image_base64']) ? $data['image_base64'] : $data['design_url'];
    if (preg_match('/^data:image\/(\w+);base64,/', $dataUri)) {
        $dataUri = substr($dataUri, strpos($dataUri, ',') + 1);
        $decoded = base64_decode($dataUri);

        if ($decoded !== false) {
            $uniqueName = 'twibon_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.png';
            $dest = $uploadDir . $uniqueName;
            if (@file_put_contents($dest, $decoded)) {
                $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
                $host = $_SERVER['HTTP_HOST'];
                $uploadedDesignUrl = $protocol . $host . '/uploads/twibon/' . $uniqueName;
                $uploadedFilePath = $dest;
            }
        }
    }
}

$finalDesignUrl = $uploadedDesignUrl ?: (!empty($data['design_url']) ? trim($data['design_url']) : '');

if (empty($finalDesignUrl)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'File desain frame Twibon PNG transparan wajib diunggah.'
    ]);
    exit;
}

try {
    $sql = "INSERT INTO twibons (
                title,
                slug,
                description,
                ratio,
                design_url,
                is_active,
                use_count,
                created_at,
                updated_at
            ) VALUES (
                :title,
                :slug,
                :description,
                :ratio,
                :design_url,
                :is_active,
                0,
                NOW(),
                NOW()
            )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':title' => $title,
        ':slug' => $slug,
        ':description' => $description,
        ':ratio' => $ratio,
        ':design_url' => $finalDesignUrl,
        ':is_active' => $isActive,
    ]);

    $insertedId = (int)$pdo->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Kampanye Twibon berhasil ditambahkan.',
        'data' => [
            'id' => $insertedId,
            'title' => $title,
            'slug' => $slug,
            'description' => $description,
            'ratio' => $ratio,
            'design_url' => $finalDesignUrl,
            'designUrl' => $finalDesignUrl,
            'is_active' => $isActive,
            'isActive' => $isActive === 1,
            'use_count' => 0,
            'useCount' => 0,
            'created_at' => date('Y-m-d H:i:s'),
            'createdAt' => date('Y-m-d H:i:s'),
        ]
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    // Jika INSERT database gagal setelah file berhasil diupload:
    // - hapus file upload tersebut
    // - return success=false
    if (!empty($uploadedFilePath) && file_exists($uploadedFilePath)) {
        @unlink($uploadedFilePath);
    }

    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal menyimpan data Twibon ke database: ' . $e->getMessage(),
        'data' => null
    ]);
}
