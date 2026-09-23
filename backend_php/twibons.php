<?php
/**
 * TWIBONS API for Galeri EMKA
 * Endpoint: https://api.mkverse.my.id/api/twibons.php
 *
 * Supported Actions:
 *   GET /api/twibons.php                      -> List all twibons
 *   GET /api/twibons.php?active=1             -> List only active twibons (public)
 *   GET /api/twibons.php?slug={slug}          -> Get single twibon by slug (or 404)
 *   GET /api/twibons.php?id={id}              -> Get single twibon by ID (or 404)
 *   POST /api/twibons.php                     -> Create new twibon
 *   POST /api/twibons.php (with id & update)  -> Update twibon
 *   POST /api/twibons.php (with id & delete)  -> Delete twibon
 *   DELETE /api/twibons.php?id={id}           -> Delete twibon
 */

// 1. Matikan output HTML error agar response selalu JSON murni
error_reporting(E_ALL);
ini_set('display_errors', '0');

// 2. Dynamic CORS headers
$allowedOrigins = [
    'https://galerifoto.mkverse.my.id',
    'https://galeri.mkverse.my.id',
    'https://api.mkverse.my.id',
    'http://localhost:3000',
    'http://localhost:5173',
];

$httpOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($httpOrigin)) {
    if (in_array($httpOrigin, $allowedOrigins) ||
        preg_match('/^https:\/\/([a-z0-9-]+\.)*mkverse\.my\.id$/i', $httpOrigin) ||
        preg_match('/^https:\/\/([a-z0-9-]+\.)*run\.app$/i', $httpOrigin) ||
        preg_match('/^https?:\/\/localhost(:[0-9]+)?$/i', $httpOrigin) ||
        preg_match('/^https?:\/\/127\.0\.0\.1(:[0-9]+)?$/i', $httpOrigin)) {
        header("Access-Control-Allow-Origin: {$httpOrigin}");
    } else {
        header("Access-Control-Allow-Origin: {$httpOrigin}");
    }
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma');
header('Content-Type: application/json; charset=utf-8');

// 3. Cache prevention headers (Mandatory)
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// 4. Preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'CORS preflight OK'
    ]);
    exit;
}

require_once __DIR__ . '/db.php';

/**
 * Pastikan tabel twibons sudah ada di database (Auto-bootstrap jika belum ada)
 */
function ensureTwibonsTable(PDO $pdo) {
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
    } catch (Throwable $e) {
        // Abaikan jika tidak memiliki izin DDL, sistem tetap lanjut
    }
}

ensureTwibonsTable($pdo);

/**
 * Helper: Hapus file PNG lokal twibon jika berada di /uploads/twibon/
 */
function deleteTwibonFile($fileUrl) {
    if (empty($fileUrl)) return false;

    $parsed = parse_url($fileUrl);
    $path = $parsed['path'] ?? $fileUrl;

    if (strpos($path, '/uploads/twibon/') === false && strpos($path, 'uploads/twibon/') === false) {
        return false;
    }

    $filename = basename($path);
    if (empty($filename) || $filename === '.' || $filename === '..') {
        return false;
    }

    $possiblePaths = [
        __DIR__ . '/../uploads/twibon/' . $filename,
        __DIR__ . '/uploads/twibon/' . $filename,
        dirname(__DIR__) . '/uploads/twibon/' . $filename,
    ];

    foreach ($possiblePaths as $filePath) {
        if (file_exists($filePath) && is_file($filePath)) {
            @unlink($filePath);
            return true;
        }
    }
    return false;
}

/**
 * Helper: Normalisasi record Twibon ke output standar
 */
function formatTwibonRow(array $row) {
    return [
        'id' => (int)$row['id'],
        'title' => (string)($row['title'] ?? ''),
        'slug' => (string)($row['slug'] ?? ''),
        'description' => (string)($row['description'] ?? ''),
        'ratio' => in_array($row['ratio'] ?? '', ['1:1', '4:3', '16:9', '9:16']) ? $row['ratio'] : '1:1',
        'design_url' => (string)($row['design_url'] ?? $row['designUrl'] ?? ''),
        'designUrl' => (string)($row['design_url'] ?? $row['designUrl'] ?? ''),
        'is_active' => (int)($row['is_active'] ?? 1),
        'isActive' => ((int)($row['is_active'] ?? 1)) === 1,
        'use_count' => (int)($row['use_count'] ?? 0),
        'useCount' => (int)($row['use_count'] ?? 0),
        'created_at' => (string)($row['created_at'] ?? ''),
        'createdAt' => (string)($row['created_at'] ?? ''),
        'updated_at' => (string)($row['updated_at'] ?? ''),
        'updatedAt' => (string)($row['updated_at'] ?? ''),
    ];
}

$method = $_SERVER['REQUEST_METHOD'];

// =========================================================================
// 1. GET METHOD: List all, filter active, or get single detail by slug / id
// =========================================================================
if ($method === 'GET') {
    $slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
    $id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : 0;
    $activeOnly = isset($_GET['active']) && ($_GET['active'] === '1' || $_GET['active'] === 'true');
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';

    // A. GET DETAIL BY SLUG
    if (!empty($slug)) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM twibons WHERE slug = :slug LIMIT 1");
            $stmt->execute([':slug' => $slug]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$item) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Twibon tidak ditemukan atau sudah dihapus.',
                    'data' => null
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            }

            echo json_encode([
                'success' => true,
                'message' => 'Data Twibon berhasil diambil.',
                'data' => formatTwibonRow($item)
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal mengambil detail Twibon: ' . $e->getMessage(),
                'data' => null
            ]);
            exit;
        }
    }

    // B. GET DETAIL BY ID
    if ($id > 0) {
        try {
            $stmt = $pdo->prepare("SELECT * FROM twibons WHERE id = :id LIMIT 1");
            $stmt->execute([':id' => $id]);
            $item = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$item) {
                http_response_code(404);
                echo json_encode([
                    'success' => false,
                    'message' => 'Twibon tidak ditemukan atau sudah dihapus.',
                    'data' => null
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
                exit;
            }

            echo json_encode([
                'success' => true,
                'message' => 'Data Twibon berhasil diambil.',
                'data' => formatTwibonRow($item)
            ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal mengambil detail Twibon: ' . $e->getMessage(),
                'data' => null
            ]);
            exit;
        }
    }

    // C. GET LIST OF TWIBONS
    try {
        $sql = "SELECT * FROM twibons WHERE 1=1";
        $params = [];

        if ($activeOnly) {
            $sql .= " AND is_active = 1";
        }

        if (!empty($search)) {
            $sql .= " AND (title LIKE :search OR description LIKE :search)";
            $params[':search'] = "%{$search}%";
        }

        $sql .= " ORDER BY created_at DESC, id DESC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $list = array_map('formatTwibonRow', $rows);

        echo json_encode([
            'success' => true,
            'message' => 'Data Twibon berhasil diambil.',
            'count' => count($list),
            'data' => $list
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Gagal mengambil daftar Twibon: ' . $e->getMessage(),
            'data' => []
        ]);
        exit;
    }
}

// =========================================================================
// 2. DELETE METHOD: Delete record and PNG file from disk
// =========================================================================
if ($method === 'DELETE' || ($method === 'POST' && (isset($_POST['_method']) && strtoupper($_POST['_method']) === 'DELETE'))) {
    $rawInput = file_get_contents('php://input');
    $payload = json_decode($rawInput, true) ?: [];

    $id = isset($_GET['id']) ? (int)$_GET['id'] : (isset($payload['id']) ? (int)$payload['id'] : (isset($_POST['id']) ? (int)$_POST['id'] : 0));

    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID Twibon tidak valid.'
        ]);
        exit;
    }

    try {
        // Cek keberadaan Twibon
        $stmtCheck = $pdo->prepare("SELECT id, design_url, title FROM twibons WHERE id = :id LIMIT 1");
        $stmtCheck->execute([':id' => $id]);
        $twibon = $stmtCheck->fetch(PDO::FETCH_ASSOC);

        if (!$twibon) {
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Twibon tidak ditemukan atau sudah dihapus.'
            ]);
            exit;
        }

        $designUrl = $twibon['design_url'] ?? '';

        // Eksekusi DELETE dari database MySQL
        $stmtDel = $pdo->prepare("DELETE FROM twibons WHERE id = :id");
        $stmtDel->execute([':id' => $id]);

        // Verifikasi apakah record benar-benar terhapus (Requirement 6)
        $stmtVerify = $pdo->prepare("SELECT id FROM twibons WHERE id = :id LIMIT 1");
        $stmtVerify->execute([':id' => $id]);
        if ($stmtVerify->fetch()) {
            http_response_code(500);
            echo json_encode([
                'success' => false,
                'message' => 'Gagal menghapus Twibon dari database (Record masih ada).'
            ]);
            exit;
        }

        // Hapus file fisik PNG dari /uploads/twibon/ jika ada
        $fileDeleted = deleteTwibonFile($designUrl);

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Twibon berhasil dihapus.',
            'data' => [
                'id' => $id,
                'database_deleted' => true,
                'file_deleted' => $fileDeleted
            ]
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Terjadi kesalahan saat menghapus Twibon: ' . $e->getMessage()
        ]);
        exit;
    }
}

// =========================================================================
// 3. POST / PUT METHOD: Create, Update, or Increment Download Count
// =========================================================================
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$action = isset($payload['action']) ? trim($payload['action']) : (isset($_GET['action']) ? trim($_GET['action']) : '');

// Handle explicit DELETE via POST action=delete
if ($action === 'delete') {
    $id = isset($payload['id']) ? (int)$payload['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID Twibon tidak valid.']);
        exit;
    }

    $stmtCheck = $pdo->prepare("SELECT id, design_url FROM twibons WHERE id = :id LIMIT 1");
    $stmtCheck->execute([':id' => $id]);
    $twibon = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$twibon) {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Twibon tidak ditemukan atau sudah dihapus.']);
        exit;
    }

    $designUrl = $twibon['design_url'] ?? '';
    $stmtDel = $pdo->prepare("DELETE FROM twibons WHERE id = :id");
    $stmtDel->execute([':id' => $id]);

    $stmtVerify = $pdo->prepare("SELECT id FROM twibons WHERE id = :id LIMIT 1");
    $stmtVerify->execute([':id' => $id]);
    if ($stmtVerify->fetch()) {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Gagal menghapus Twibon dari database.']);
        exit;
    }

    $fileDeleted = deleteTwibonFile($designUrl);
    echo json_encode([
        'success' => true,
        'message' => 'Twibon berhasil dihapus.',
        'data' => ['id' => $id, 'database_deleted' => true, 'file_deleted' => $fileDeleted]
    ]);
    exit;
}

// Handle INCREMENT DOWNLOAD / USE COUNT
if ($action === 'increment_use' || isset($payload['increment_download'])) {
    $id = isset($payload['id']) ? (int)$payload['id'] : (isset($_GET['id']) ? (int)$_GET['id'] : 0);
    if ($id > 0) {
        try {
            $stmtInc = $pdo->prepare("UPDATE twibons SET use_count = use_count + 1 WHERE id = :id");
            $stmtInc->execute([':id' => $id]);

            $stmtGet = $pdo->prepare("SELECT use_count FROM twibons WHERE id = :id LIMIT 1");
            $stmtGet->execute([':id' => $id]);
            $count = (int)$stmtGet->fetchColumn();

            echo json_encode([
                'success' => true,
                'message' => 'Use count berhasil diperbarui.',
                'data' => ['id' => $id, 'use_count' => $count]
            ]);
            exit;
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => $e->getMessage()]);
            exit;
        }
    }
}

// Helper slug generator
function slugify($text) {
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $text), '-'));
    return !empty($slug) ? $slug : 'twibon-' . time();
}

$id = isset($payload['id']) && is_numeric($payload['id']) ? (int)$payload['id'] : 0;
$isUpdate = ($id > 0) || ($action === 'update') || (isset($_POST['_method']) && strtoupper($_POST['_method']) === 'PUT');

// Directory penyimpanan /uploads/twibon/
$uploadDir = __DIR__ . '/../uploads/twibon/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

// Upload file handling (PNG)
$uploadedDesignUrl = '';
$uploadedFilePath = '';

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
            'message' => 'Gagal memindahkan berkas PNG ke direktori /uploads/twibon/.'
        ]);
        exit;
    }
} elseif (!empty($payload['image_base64']) || (isset($payload['design_url']) && strpos($payload['design_url'], 'data:image/') === 0)) {
    // Handle base64 PNG upload
    $dataUri = !empty($payload['image_base64']) ? $payload['image_base64'] : $payload['design_url'];
    if (preg_match('/^data:image\/(\w+);base64,/', $dataUri, $type)) {
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

// =========================================================================
// 3A. UPDATE TWIBON
// =========================================================================
if ($isUpdate && $id > 0) {
    try {
        // Cek apakah data lama ada
        $stmtOld = $pdo->prepare("SELECT * FROM twibons WHERE id = :id LIMIT 1");
        $stmtOld->execute([':id' => $id]);
        $oldTwibon = $stmtOld->fetch(PDO::FETCH_ASSOC);

        if (!$oldTwibon) {
            if ($uploadedFilePath && file_exists($uploadedFilePath)) {
                @unlink($uploadedFilePath);
            }
            http_response_code(404);
            echo json_encode([
                'success' => false,
                'message' => 'Twibon tidak ditemukan atau sudah dihapus.'
            ]);
            exit;
        }

        $title = isset($payload['title']) ? trim($payload['title']) : $oldTwibon['title'];
        $rawSlug = isset($payload['slug']) ? trim($payload['slug']) : $oldTwibon['slug'];
        $slug = slugify($rawSlug);
        $description = isset($payload['description']) ? trim($payload['description']) : $oldTwibon['description'];

        $ratio = isset($payload['ratio']) ? trim($payload['ratio']) : $oldTwibon['ratio'];
        if (!in_array($ratio, ['1:1', '4:3', '16:9', '9:16'])) {
            $ratio = '1:1';
        }

        $isActive = isset($payload['is_active']) ? (int)$payload['is_active'] : (isset($payload['isActive']) ? ($payload['isActive'] ? 1 : 0) : (int)$oldTwibon['is_active']);

        // Tentukan URL design: berkas baru atau tetap berkas lama
        $finalDesignUrl = $uploadedDesignUrl ?: (!empty($payload['design_url']) && strpos($payload['design_url'], 'data:image/') !== 0 ? trim($payload['design_url']) : $oldTwibon['design_url']);

        // Cek duplikasi slug terhadap record lain
        $stmtSlug = $pdo->prepare("SELECT id FROM twibons WHERE slug = :slug AND id != :id LIMIT 1");
        $stmtSlug->execute([':slug' => $slug, ':id' => $id]);
        if ($stmtSlug->fetch()) {
            if ($uploadedFilePath && file_exists($uploadedFilePath)) {
                @unlink($uploadedFilePath);
            }
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => "Slug '{$slug}' sudah digunakan oleh kampanye Twibon lain."
            ]);
            exit;
        }

        // UPDATE record di MySQL
        $sql = "UPDATE twibons SET 
                    title = :title,
                    slug = :slug,
                    description = :description,
                    ratio = :ratio,
                    design_url = :design_url,
                    is_active = :is_active,
                    updated_at = NOW()
                WHERE id = :id";

        $stmtUp = $pdo->prepare($sql);
        $stmtUp->execute([
            ':title' => $title,
            ':slug' => $slug,
            ':description' => $description,
            ':ratio' => $ratio,
            ':design_url' => $finalDesignUrl,
            ':is_active' => $isActive,
            ':id' => $id
        ]);

        // Hapus file lama jika ada upload file baru yang menggantikannya
        if (!empty($uploadedDesignUrl) && !empty($oldTwibon['design_url']) && $uploadedDesignUrl !== $oldTwibon['design_url']) {
            deleteTwibonFile($oldTwibon['design_url']);
        }

        // Ambil data terbaru dari database
        $stmtNew = $pdo->prepare("SELECT * FROM twibons WHERE id = :id LIMIT 1");
        $stmtNew->execute([':id' => $id]);
        $updatedData = $stmtNew->fetch(PDO::FETCH_ASSOC);

        echo json_encode([
            'success' => true,
            'message' => 'Kampanye Twibon berhasil diperbarui.',
            'data' => formatTwibonRow($updatedData)
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    } catch (PDOException $e) {
        if ($uploadedFilePath && file_exists($uploadedFilePath)) {
            @unlink($uploadedFilePath);
        }
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Gagal memperbarui Twibon di database: ' . $e->getMessage()
        ]);
        exit;
    }
}

// =========================================================================
// 3B. CREATE NEW TWIBON
// =========================================================================
$title = isset($payload['title']) ? trim($payload['title']) : '';
$rawSlug = !empty($payload['slug']) ? trim($payload['slug']) : $title;
$slug = slugify($rawSlug);
$description = isset($payload['description']) ? trim($payload['description']) : '';

$ratio = isset($payload['ratio']) ? trim($payload['ratio']) : '1:1';
if (!in_array($ratio, ['1:1', '4:3', '16:9', '9:16'])) {
    $ratio = '1:1';
}

$isActive = isset($payload['is_active']) ? (int)$payload['is_active'] : (isset($payload['isActive']) ? ($payload['isActive'] ? 1 : 0) : 1);

if (empty($title)) {
    if ($uploadedFilePath && file_exists($uploadedFilePath)) {
        @unlink($uploadedFilePath);
    }
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Judul kampanye Twibon wajib diisi.'
    ]);
    exit;
}

$finalDesignUrl = $uploadedDesignUrl ?: (!empty($payload['design_url']) ? trim($payload['design_url']) : '');
if (empty($finalDesignUrl)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'File desain frame Twibon PNG transparan wajib diunggah.'
    ]);
    exit;
}

try {
    // Validasi keunikan slug
    $stmtSlug = $pdo->prepare("SELECT id FROM twibons WHERE slug = :slug LIMIT 1");
    $stmtSlug->execute([':slug' => $slug]);
    if ($stmtSlug->fetch()) {
        if ($uploadedFilePath && file_exists($uploadedFilePath)) {
            @unlink($uploadedFilePath);
        }
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Slug kampanye '{$slug}' sudah digunakan. Gunakan slug lain."
        ]);
        exit;
    }

    // INSERT record ke MySQL
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

    $stmtInsert = $pdo->prepare($sql);
    $stmtInsert->execute([
        ':title' => $title,
        ':slug' => $slug,
        ':description' => $description,
        ':ratio' => $ratio,
        ':design_url' => $finalDesignUrl,
        ':is_active' => $isActive
    ]);

    $insertedId = (int)$pdo->lastInsertId();

    // Ambil data yang tersimpan dari database untuk verifikasi
    $stmtGet = $pdo->prepare("SELECT * FROM twibons WHERE id = :id LIMIT 1");
    $stmtGet->execute([':id' => $insertedId]);
    $newTwibon = $stmtGet->fetch(PDO::FETCH_ASSOC);

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Kampanye Twibon berhasil ditambahkan.',
        'data' => formatTwibonRow($newTwibon)
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
} catch (PDOException $e) {
    if ($uploadedFilePath && file_exists($uploadedFilePath)) {
        @unlink($uploadedFilePath);
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal menyimpan kampanye Twibon ke database: ' . $e->getMessage()
    ]);
    exit;
}
