<?php
/**
 * UPDATE Activity API for Galeri EMKA
 * Endpoint: POST / PUT https://api.mkverse.my.id/api/update-activity.php
 */

// 1. Matikan tampilan HTML error agar response selalu JSON murni
error_reporting(E_ALL);
ini_set('display_errors', '0');

// 2. Header CORS dan JSON Dinamis & Aman
$allowedOrigins = [
    'https://galerifoto.mkverse.my.id',
    'https://api.mkverse.my.id',
    'http://localhost:3000',
    'http://localhost:5173',
];

$httpOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($httpOrigin, $allowedOrigins) || 
    preg_match('/^https:\/\/([a-z0-9-]+\.)*mkverse\.my\.id$/i', $httpOrigin) || 
    preg_match('/^https:\/\/([a-z0-9-]+\.)*run\.app$/i', $httpOrigin)) {
    header("Access-Control-Allow-Origin: {$httpOrigin}");
} else {
    header("Access-Control-Allow-Origin: https://galerifoto.mkverse.my.id");
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Content-Type: application/json; charset=UTF-8');

// 3. Tangani HTTP Preflight Request (OPTIONS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'CORS preflight OK'
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// 4. Validasi Method HTTP (Mendukung POST dan PUT)
$method = $_SERVER['REQUEST_METHOD'];
if ($method !== 'POST' && $method !== 'PUT') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan POST atau PUT.',
        'data' => null
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    // 5. Koneksi Database (gunakan db.php atau config.php)
    if (file_exists(__DIR__ . '/db.php')) {
        require_once __DIR__ . '/db.php';
    } elseif (file_exists(__DIR__ . '/config.php')) {
        require_once __DIR__ . '/config.php';
    }

    // Dukung $conn jika berupa PDO
    if (!isset($pdo) && isset($conn) && $conn instanceof PDO) {
        $pdo = $conn;
    }

    // Aktifkan error reporting jika MySQLi
    if (isset($conn) && $conn instanceof mysqli) {
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    }

    if (!isset($pdo) && (!isset($conn) || !($conn instanceof mysqli))) {
        throw new Exception('Koneksi database tidak tersedia.');
    }

    // 6. Request Body Parser (JSON Body & FormData/POST)
    $rawInput = file_get_contents('php://input');
    $data = null;
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

    if (!empty($rawInput)) {
        $decoded = json_decode($rawInput, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $data = $decoded;
        } elseif (stripos($contentType, 'application/json') !== false) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'JSON request tidak valid.',
                'data' => null
            ], JSON_UNESCAPED_SLASHES);
            exit;
        }
    }

    if (!is_array($data)) {
        $data = $_POST;
    }
    if (empty($data) && !empty($_GET)) {
        $data = $_GET;
    }

    // 7. Validasi ID Kegiatan (harus > 0)
    $id = intval($data['id'] ?? ($_GET['id'] ?? 0));
    if ($id <= 0) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID kegiatan tidak valid.',
            'data' => null
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // 8. Cari kegiatan di database
    if (isset($pdo) && $pdo instanceof PDO) {
        $checkStmt = $pdo->prepare("SELECT * FROM activities WHERE id = ? LIMIT 1");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
    } else {
        $checkStmt = $conn->prepare("SELECT * FROM activities WHERE id = ? LIMIT 1");
        $checkStmt->bind_param('i', $id);
        $checkStmt->execute();
        $res = $checkStmt->get_result();
        $existing = $res ? $res->fetch_assoc() : null;
    }

    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Kegiatan tidak ditemukan.',
            'data' => null
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // 9. Validasi Field Title
    $title = isset($data['title']) && trim((string)$data['title']) !== '' 
        ? trim((string)$data['title']) 
        : ($existing['title'] ?? '');

    if (empty($title)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Judul kegiatan wajib diisi.',
            'data' => null
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // 10. Validasi category_id ke tabel categories
    $category_id = $existing['category_id'] ?? null;
    if (array_key_exists('category_id', $data) && $data['category_id'] !== '' && $data['category_id'] !== null) {
        $candCatId = intval($data['category_id']);
        if ($candCatId > 0) {
            $catFound = false;
            if (isset($pdo) && $pdo instanceof PDO) {
                $cCheck = $pdo->prepare("SELECT id FROM categories WHERE id = ? LIMIT 1");
                $cCheck->execute([$candCatId]);
                if ($cCheck->fetch()) {
                    $catFound = true;
                }
            } else {
                $cCheck = $conn->prepare("SELECT id FROM categories WHERE id = ? LIMIT 1");
                $cCheck->bind_param('i', $candCatId);
                $cCheck->execute();
                $cRes = $cCheck->get_result();
                if ($cRes && $cRes->num_rows > 0) {
                    $catFound = true;
                }
            }

            if (!$catFound) {
                http_response_code(400);
                echo json_encode([
                    'success' => false,
                    'message' => 'Kategori kegiatan tidak ditemukan.',
                    'data' => [
                        'category_id' => $candCatId
                    ]
                ], JSON_UNESCAPED_SLASHES);
                exit;
            }
            $category_id = $candCatId;
        } else {
            $category_id = null;
        }
    }

    // 11. Preservasi Google Drive URL (Jangan pernah mengganti dengan NULL/kosong jika tidak dikirim)
    if (array_key_exists('google_drive_url', $data) && $data['google_drive_url'] !== null && trim((string)$data['google_drive_url']) !== '') {
        $google_drive_url = trim((string)$data['google_drive_url']);
    } else {
        $google_drive_url = $existing['google_drive_url'] ?? null;
    }

    // 12. Preservasi Cover URL (Pertahankan cover lama jika admin tidak mengganti cover)
    if (array_key_exists('cover_url', $data) && !empty(trim((string)$data['cover_url']))) {
        $cover_url = trim((string)$data['cover_url']);
    } elseif (array_key_exists('cover_image', $data) && !empty(trim((string)$data['cover_image']))) {
        $cover_url = trim((string)$data['cover_image']);
    } else {
        $cover_url = $existing['cover_url'] ?? '';
    }

    $description = array_key_exists('description', $data) ? trim((string)$data['description']) : ($existing['description'] ?? '');
    $event_date = !empty($data['event_date']) ? trim((string)$data['event_date']) : (!empty($data['date']) ? trim((string)$data['date']) : ($existing['event_date'] ?? date('Y-m-d')));
    $is_published = isset($data['is_published']) ? intval($data['is_published']) : (isset($data['status']) && $data['status'] === 'published' ? 1 : intval($existing['is_published'] ?? 1));
    $display_order = isset($data['display_order']) ? intval($data['display_order']) : intval($existing['display_order'] ?? 0);

    // 13. Generate / Update Slug (Unik per kegiatan, tidak bentrok dengan ID sendiri)
    if (!function_exists('createSlug')) {
        function createSlug($string) {
            $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $string), '-'));
            return !empty($slug) ? $slug : 'kegiatan-' . time();
        }
    }

    $slugInput = !empty($data['slug']) ? trim((string)$data['slug']) : (!empty($existing['slug']) ? $existing['slug'] : $title);
    $baseSlug = createSlug($slugInput);
    $finalSlug = $baseSlug;

    if (isset($pdo) && $pdo instanceof PDO) {
        $stmtSlug = $pdo->prepare("SELECT id FROM activities WHERE slug = ? AND id != ? LIMIT 1");
        $stmtSlug->execute([$finalSlug, $id]);
        $counter = 1;
        while ($stmtSlug->fetch()) {
            $counter++;
            $finalSlug = "{$baseSlug}-{$counter}";
            $stmtSlug->execute([$finalSlug, $id]);
        }
    } else {
        $counter = 1;
        while (true) {
            $stmtSlug = $conn->prepare("SELECT id FROM activities WHERE slug = ? AND id != ? LIMIT 1");
            $stmtSlug->bind_param('si', $finalSlug, $id);
            $stmtSlug->execute();
            $sRes = $stmtSlug->get_result();
            if ($sRes && $sRes->num_rows > 0) {
                $counter++;
                $finalSlug = "{$baseSlug}-{$counter}";
            } else {
                break;
            }
        }
    }

    // 14. Eksekusi UPDATE dengan Prepared Statements (JANGAN UBAH id & created_at)
    if (isset($pdo) && $pdo instanceof PDO) {
        $sql = "UPDATE activities SET
                    title = :title,
                    slug = :slug,
                    google_drive_url = :google_drive_url,
                    description = :description,
                    category_id = :category_id,
                    event_date = :event_date,
                    cover_url = :cover_url,
                    is_published = :is_published,
                    display_order = :display_order,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :id";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            ':title' => $title,
            ':slug' => $finalSlug,
            ':google_drive_url' => $google_drive_url,
            ':description' => $description,
            ':category_id' => $category_id,
            ':event_date' => $event_date,
            ':cover_url' => $cover_url,
            ':is_published' => $is_published,
            ':display_order' => $display_order,
            ':id' => $id,
        ]);
    } else {
        $sql = "UPDATE activities SET
                    title = ?,
                    slug = ?,
                    google_drive_url = ?,
                    description = ?,
                    category_id = ?,
                    event_date = ?,
                    cover_url = ?,
                    is_published = ?,
                    display_order = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param('ssssissiii', $title, $finalSlug, $google_drive_url, $description, $category_id, $event_date, $cover_url, $is_published, $display_order, $id);
        $stmt->execute();
    }

    // 15. Response Sukses
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Kegiatan berhasil diperbarui.',
        'data' => [
            'id' => $id,
            'title' => $title,
            'slug' => $finalSlug,
            'google_drive_url' => $google_drive_url,
            'description' => $description,
            'category_id' => $category_id,
            'event_date' => $event_date,
            'cover_url' => $cover_url,
            'is_published' => $is_published,
            'display_order' => $display_order,
        ]
    ], JSON_UNESCAPED_SLASHES);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memperbarui kegiatan.',
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_SLASHES);
    exit;
}
