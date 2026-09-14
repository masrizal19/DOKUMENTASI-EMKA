<?php
/**
 * UPDATE Photo API for Galeri EMKA
 * Endpoint: POST / PUT https://api.mkverse.my.id/api/update-photo.php
 */

// 1. Output Buffering & Error Handling
// Pastikan tidak ada output HTML, Notice, atau Warning liar yang merusak format JSON
ob_start();
error_reporting(E_ALL);
ini_set('display_errors', '0');

// 2. CORS HEADERS — HARUS PALING AWAL SEBELUM REQUIRE ATAU DATABASE APA PUN
$httpOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigins = [
    'https://galerifoto.mkverse.my.id',
    'https://api.mkverse.my.id',
    'http://localhost:3000',
    'http://localhost:5173',
];

if (!empty($httpOrigin) && (
    in_array($httpOrigin, $allowedOrigins) || 
    preg_match('/^https:\/\/([a-z0-9-]+\.)*mkverse\.my\.id$/i', $httpOrigin) || 
    preg_match('/^https:\/\/([a-z0-9-]+\.)*run\.app$/i', $httpOrigin)
)) {
    header("Access-Control-Allow-Origin: {$httpOrigin}");
} else {
    header('Access-Control-Allow-Origin: https://galerifoto.mkverse.my.id');
}

header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Max-Age: 86400');
header('Content-Type: application/json; charset=UTF-8');

// 3. OPTIONS PREFLIGHT HANDLING SEBELUM REQUIRE ATAU KONEKSI DATABASE
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (ob_get_length()) {
        ob_clean();
    }
    http_response_code(204);
    exit;
}

// 4. Tangani Fatal Error agar Selalu Mengembalikan JSON + CORS
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR])) {
        if (ob_get_length()) {
            ob_clean();
        }
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Gagal memperbarui foto.',
            'data' => null,
            'error' => $error['message'] . ' in ' . basename($error['file']) . ':' . $error['line']
        ], JSON_UNESCAPED_SLASHES);
    }
});

// 5. Validasi Method HTTP (GET ditolak dengan HTTP 405)
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method !== 'POST' && $method !== 'PUT') {
    if (ob_get_length()) {
        ob_clean();
    }
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Method tidak diperbolehkan. Gunakan POST atau PUT.',
        'data' => null
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

try {
    // 6. Koneksi Database Menggunakan config.php yang Sudah Ada
    if (file_exists(__DIR__ . '/config.php')) {
        require_once __DIR__ . '/config.php';
    } elseif (file_exists(__DIR__ . '/db.php')) {
        require_once __DIR__ . '/db.php';
    }

    // Dukung $conn jika berupa PDO
    if (!isset($pdo) && isset($conn) && $conn instanceof PDO) {
        $pdo = $conn;
    }

    // Aktifkan mode strict error reporting jika MySQLi
    if (isset($conn) && $conn instanceof mysqli) {
        mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);
    }

    // Fallback inisialisasi koneksi jika belum terdefinisi
    if (!isset($pdo) && (!isset($conn) || !($conn instanceof mysqli))) {
        $db_host = defined('DB_HOST') ? DB_HOST : 'localhost';
        $db_name = defined('DB_NAME') ? DB_NAME : 'mkversem_galeriemka';
        $db_user = defined('DB_USER') ? DB_USER : 'mkversem_galeriemka';
        $db_pass = defined('DB_PASS') ? DB_PASS : '';
        $pdo = new PDO(
            "mysql:host={$db_host};dbname={$db_name};charset=utf8mb4",
            $db_user,
            $db_pass,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
            ]
        );
    }

    // 7. Request Body Parser (Mendukung JSON Body dan FormData/POST)
    $rawInput = file_get_contents('php://input');
    $data = null;
    $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

    if (!empty($rawInput)) {
        $decoded = json_decode($rawInput, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            $data = $decoded;
        } elseif (stripos($contentType, 'application/json') !== false) {
            if (ob_get_length()) {
                ob_clean();
            }
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

    // 8. Validasi ID Foto (wajib > 0)
    $id = intval($data['id'] ?? ($_GET['id'] ?? 0));
    if ($id <= 0) {
        if (ob_get_length()) {
            ob_clean();
        }
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'ID foto wajib diisi.',
            'data' => null
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // 9. Ambil Data Lama (SELECT * FROM photos WHERE id = ? LIMIT 1)
    $existing = null;
    if (isset($conn) && $conn instanceof mysqli) {
        $checkStmt = $conn->prepare("SELECT * FROM photos WHERE id = ? LIMIT 1");
        $checkStmt->bind_param('i', $id);
        $checkStmt->execute();
        $res = $checkStmt->get_result();
        $existing = $res ? $res->fetch_assoc() : null;
    } elseif (isset($pdo) && $pdo instanceof PDO) {
        $checkStmt = $pdo->prepare("SELECT * FROM photos WHERE id = ? LIMIT 1");
        $checkStmt->execute([$id]);
        $existing = $checkStmt->fetch(PDO::FETCH_ASSOC);
    }

    if (!$existing) {
        if (ob_get_length()) {
            ob_clean();
        }
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Foto tidak ditemukan.',
            'data' => [
                'id' => $id
            ]
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    // 10. Periksa Struktur Kolom Aktual pada Tabel photos (SHOW COLUMNS FROM photos)
    $columns = [];
    if (isset($conn) && $conn instanceof mysqli) {
        $colRes = $conn->query("SHOW COLUMNS FROM photos");
        if ($colRes) {
            while ($col = $colRes->fetch_assoc()) {
                $colName = strtolower($col['Field'] ?? '');
                if (!empty($colName)) {
                    $columns[$colName] = true;
                }
            }
        }
    } elseif (isset($pdo) && $pdo instanceof PDO) {
        $colStmt = $pdo->query("SHOW COLUMNS FROM photos");
        while ($col = $colStmt->fetch(PDO::FETCH_ASSOC)) {
            $colName = strtolower($col['Field'] ?? '');
            if (!empty($colName)) {
                $columns[$colName] = true;
            }
        }
    }

    // 11. Penentuan Nilai Field dengan Mempertahankan Nilai Lama jika Kosong
    // Title
    $title = array_key_exists('title', $data) && trim((string)$data['title']) !== '' 
        ? trim((string)$data['title']) 
        : ($existing['title'] ?? 'Foto Kegiatan');

    // Description
    $description = array_key_exists('description', $data) 
        ? trim((string)$data['description']) 
        : ($existing['description'] ?? '');

    // Image URL: JANGAN MENGHAPUS ATAU MENGOSONGKAN FILE JIKA TIDAK ADA INPUT BARU
    if (array_key_exists('image_url', $data) && !empty(trim((string)$data['image_url']))) {
        $image_url = trim((string)$data['image_url']);
    } else {
        $image_url = $existing['image_url'] ?? '';
    }

    // Category ID
    $category_id = isset($existing['category_id']) ? intval($existing['category_id']) : 1;
    if (array_key_exists('category_id', $data) && $data['category_id'] !== '' && $data['category_id'] !== null) {
        $category_id = intval($data['category_id']);
    }

    // Activity ID (Jangan dihilangkan jika kolom tersedia dan data dikirim)
    $activity_id = isset($existing['activity_id']) && $existing['activity_id'] !== null ? intval($existing['activity_id']) : null;
    if (array_key_exists('activity_id', $data)) {
        if ($data['activity_id'] !== '' && $data['activity_id'] !== null && intval($data['activity_id']) > 0) {
            $activity_id = intval($data['activity_id']);
        } elseif ($data['activity_id'] === null || $data['activity_id'] === '') {
            $activity_id = null;
        }
    }

    // Event Date
    $event_date = array_key_exists('event_date', $data) && !empty(trim((string)$data['event_date']))
        ? trim((string)$data['event_date'])
        : ($existing['event_date'] ?? date('Y-m-d'));

    // Is Featured
    $is_featured = array_key_exists('is_featured', $data)
        ? intval($data['is_featured'])
        : intval($existing['is_featured'] ?? 0);

    // Display Order
    $display_order = intval($existing['display_order'] ?? 0);
    if (array_key_exists('display_order', $data)) {
        $display_order = intval($data['display_order']);
    } elseif (array_key_exists('sort_order', $data)) {
        $display_order = intval($data['sort_order']);
    }

    // 12. Bangun SQL UPDATE Berdasarkan Kolom yang Benar-Benar Ada di Tabel
    $setClauses = [];
    $bindTypes = "";
    $bindValues = [];
    $pdoParams = [];

    if (isset($columns['title'])) {
        $setClauses[] = "title = ?";
        $bindTypes .= "s";
        $bindValues[] = $title;
        $pdoParams[':title'] = $title;
    }

    if (isset($columns['description'])) {
        $setClauses[] = "description = ?";
        $bindTypes .= "s";
        $bindValues[] = $description;
        $pdoParams[':description'] = $description;
    }

    if (isset($columns['image_url'])) {
        $setClauses[] = "image_url = ?";
        $bindTypes .= "s";
        $bindValues[] = $image_url;
        $pdoParams[':image_url'] = $image_url;
    }

    if (isset($columns['category_id'])) {
        $setClauses[] = "category_id = ?";
        $bindTypes .= "i";
        $bindValues[] = $category_id;
        $pdoParams[':category_id'] = $category_id;
    }

    if (isset($columns['activity_id'])) {
        $setClauses[] = "activity_id = ?";
        if ($activity_id === null) {
            $bindTypes .= "s";
            $bindValues[] = null;
            $pdoParams[':activity_id'] = null;
        } else {
            $bindTypes .= "i";
            $bindValues[] = $activity_id;
            $pdoParams[':activity_id'] = $activity_id;
        }
    }

    if (isset($columns['event_date'])) {
        $setClauses[] = "event_date = ?";
        $bindTypes .= "s";
        $bindValues[] = $event_date;
        $pdoParams[':event_date'] = $event_date;
    }

    if (isset($columns['is_featured'])) {
        $setClauses[] = "is_featured = ?";
        $bindTypes .= "i";
        $bindValues[] = $is_featured;
        $pdoParams[':is_featured'] = $is_featured;
    }

    if (isset($columns['display_order'])) {
        $setClauses[] = "display_order = ?";
        $bindTypes .= "i";
        $bindValues[] = $display_order;
        $pdoParams[':display_order'] = $display_order;
    }

    if (isset($columns['updated_at'])) {
        $setClauses[] = "updated_at = CURRENT_TIMESTAMP";
    }

    // Eksekusi Query UPDATE
    if (isset($conn) && $conn instanceof mysqli) {
        $bindTypes .= "i";
        $bindValues[] = $id;

        $updateSql = "UPDATE photos SET " . implode(', ', $setClauses) . " WHERE id = ?";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param($bindTypes, ...$bindValues);
        $updateStmt->execute();
    } elseif (isset($pdo) && $pdo instanceof PDO) {
        $pdoParams[':id'] = $id;
        $pdoClauses = [];
        foreach ($setClauses as $clause) {
            if (strpos($clause, 'CURRENT_TIMESTAMP') !== false) {
                $pdoClauses[] = $clause;
            } else {
                $col = trim(explode('=', $clause)[0]);
                $pdoClauses[] = "{$col} = :{$col}";
            }
        }
        $updateSql = "UPDATE photos SET " . implode(', ', $pdoClauses) . " WHERE id = :id";
        $updateStmt = $pdo->prepare($updateSql);
        $updateStmt->execute($pdoParams);
    }

    // 13. SELECT Ulang Data Terbaru Setelah UPDATE (SELECT * FROM photos WHERE id = ?)
    $updatedPhoto = null;
    if (isset($conn) && $conn instanceof mysqli) {
        $fetchStmt = $conn->prepare("SELECT * FROM photos WHERE id = ? LIMIT 1");
        $fetchStmt->bind_param('i', $id);
        $fetchStmt->execute();
        $fetchRes = $fetchStmt->get_result();
        $updatedPhoto = $fetchRes ? $fetchRes->fetch_assoc() : null;
    } elseif (isset($pdo) && $pdo instanceof PDO) {
        $fetchStmt = $pdo->prepare("SELECT * FROM photos WHERE id = ? LIMIT 1");
        $fetchStmt->execute([$id]);
        $updatedPhoto = $fetchStmt->fetch(PDO::FETCH_ASSOC);
    }

    // 14. Kirim Response Sukses JSON (HTTP 200)
    if (ob_get_length()) {
        ob_clean();
    }
    http_response_code(200);

    $responseData = [
        'id' => $id
    ];
    if ($updatedPhoto) {
        $responseData = array_merge($responseData, $updatedPhoto);
    } else {
        $responseData['title'] = $title;
        $responseData['description'] = $description;
        $responseData['image_url'] = $image_url;
        $responseData['category_id'] = $category_id;
        if (isset($columns['activity_id'])) {
            $responseData['activity_id'] = $activity_id;
        }
        $responseData['event_date'] = $event_date;
        $responseData['is_featured'] = $is_featured;
        $responseData['display_order'] = $display_order;
    }

    echo json_encode([
        'success' => true,
        'message' => 'Foto berhasil diperbarui.',
        'data' => $responseData
    ], JSON_UNESCAPED_SLASHES);
    exit;

} catch (Throwable $e) {
    if (ob_get_length()) {
        ob_clean();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memperbarui foto.',
        'data' => null,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_SLASHES);
    exit;
}
