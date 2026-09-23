<?php
/**
 * SAVE / UPDATE Settings API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/save-settings.php
 */

// 1. Matikan error HTML agar response selalu JSON murni
error_reporting(E_ALL);
ini_set('display_errors', '0');

// 2. Dynamic CORS headers untuk mendukung production, dev, preview, dan localhost
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

header('Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// 3. Preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'CORS preflight OK'
    ]);
    exit;
}

// 4. Periksa HTTP method (mendukung POST dan PUT sebagai fallback)
if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan POST.'
    ]);
    exit;
}

require_once __DIR__ . '/db.php';

// 5. Baca Request Body (JSON payload atau form-data)
$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);

if (!is_array($payload)) {
    $payload = $_POST;
}

if (empty($payload) || !is_array($payload)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Payload pengaturan kosong atau tidak valid.'
    ]);
    exit;
}

try {
    // 6. Siapkan statement UPSERT untuk tabel settings
    $checkStmt = $pdo->prepare("SELECT id FROM settings WHERE setting_key = :key LIMIT 1");
    $updateStmt = $pdo->prepare("UPDATE settings SET setting_value = :val, updated_at = NOW() WHERE setting_key = :key");
    $insertStmt = $pdo->prepare("INSERT INTO settings (setting_key, setting_value, updated_at) VALUES (:key, :val, NOW())");

    $savedKeys = [];

    foreach ($payload as $key => $val) {
        $cleanKey = trim($key);
        if ($cleanKey === '' || $cleanKey === 'id' || $cleanKey === 'updated_at') {
            continue;
        }

        // Normalisasi format setting slideshow & array foto
        if ($cleanKey === 'slideshow_source') {
            $srcVal = strtolower(trim((string)$val));
            if ($srcVal === 'gallery' || $srcVal === 'selected' || $srcVal === 'pilih dari galeri') {
                $stringVal = 'selected';
            } else {
                $stringVal = 'latest';
            }
        } elseif ($cleanKey === 'homepage_selected_photo_ids' || $cleanKey === 'slideshow_selected_photo_ids') {
            if (is_array($val)) {
                $stringVal = json_encode(array_values($val), JSON_UNESCAPED_SLASHES);
            } elseif (is_string($val)) {
                $test = json_decode($val, true);
                if (is_array($test)) {
                    $stringVal = json_encode(array_values($test), JSON_UNESCAPED_SLASHES);
                } else {
                    $stringVal = '[]';
                }
            } else {
                $stringVal = '[]';
            }
        } elseif (is_array($val) || is_object($val)) {
            $stringVal = json_encode($val, JSON_UNESCAPED_SLASHES);
        } elseif (is_bool($val)) {
            $stringVal = $val ? '1' : '0';
        } else {
            $stringVal = (string)$val;
        }

        // Eksekusi UPSERT pada MySQL
        $checkStmt->execute([':key' => $cleanKey]);
        $exists = $checkStmt->fetch();

        if ($exists) {
            $updateStmt->execute([
                ':val' => $stringVal,
                ':key' => $cleanKey
            ]);
        } else {
            $insertStmt->execute([
                ':key' => $cleanKey,
                ':val' => $stringVal
            ]);
        }

        $savedKeys[] = $cleanKey;

        // Jika homepage_selected_photo_ids diperbarui, cerminkan ke slideshow_selected_photo_ids agar kompatibel
        if ($cleanKey === 'homepage_selected_photo_ids' && !isset($payload['slideshow_selected_photo_ids'])) {
            $checkStmt->execute([':key' => 'slideshow_selected_photo_ids']);
            if ($checkStmt->fetch()) {
                $updateStmt->execute([':val' => $stringVal, ':key' => 'slideshow_selected_photo_ids']);
            } else {
                $insertStmt->execute([':key' => 'slideshow_selected_photo_ids', ':val' => $stringVal]);
            }
            $savedKeys[] = 'slideshow_selected_photo_ids';
        }
    }

    echo json_encode([
        'success' => true,
        'message' => 'Pengaturan berhasil disimpan.',
        'data' => [
            'saved_keys' => array_values(array_unique($savedKeys))
        ]
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal menyimpan pengaturan ke database: ' . $e->getMessage()
    ]);
}
