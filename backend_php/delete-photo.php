<?php
/**
 * DELETE Photo API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/delete-photo.php
 * Payload JSON: { "id": 8 }
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

/**
 * Hapus file media lokal hanya jika URL berasal dari server storage sendiri
 * Mendukung foto & video (JPG, JPEG, PNG, WEBP, HEIC, MP4, WEBM, MOV, dsb.)
 * Tidak pernah melakukan unlink terhadap URL eksternal (Google Drive, Unsplash, Shutterstock, dll.)
 */
function deleteLocalMediaFile($imageUrl) {
    if (empty($imageUrl)) {
        return false;
    }

    $parsed = parse_url($imageUrl);
    $host = $parsed['host'] ?? '';
    $path = $parsed['path'] ?? $imageUrl;

    $isLocal = false;
    if (empty($host)) {
        if (strpos($path, '/uploads/') !== false || strpos($path, 'uploads/') === 0) {
            $isLocal = true;
        }
    } else {
        if (stripos($host, 'mkverse.my.id') !== false || stripos($host, 'localhost') !== false || stripos($host, '127.0.0.1') !== false) {
            if (strpos($path, '/uploads/') !== false) {
                $isLocal = true;
            }
        }
    }

    if (!$isLocal) {
        return false;
    }

    $filename = basename($path);
    if (empty($filename) || $filename === '.' || $filename === '..') {
        return false;
    }

    $possiblePaths = [
        __DIR__ . '/../uploads/' . $filename,
        __DIR__ . '/uploads/' . $filename,
        dirname(__DIR__) . '/uploads/' . $filename,
    ];

    foreach ($possiblePaths as $filePath) {
        if (file_exists($filePath) && is_file($filePath)) {
            @unlink($filePath);
            return true;
        }
    }

    return false;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan POST.',
        'data' => null
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    $data = $_POST;
}

$id = isset($data['id']) ? (int) $data['id'] : (isset($_GET['id']) ? (int) $_GET['id'] : 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID foto tidak valid.',
        'data' => null
    ]);
    exit;
}

try {
    // 1. Cek keberadaan foto di database
    $stmtCheck = $pdo->prepare("SELECT id, image_url, title, activity_id FROM photos WHERE id = ? LIMIT 1");
    $stmtCheck->execute([$id]);
    $photo = $stmtCheck->fetch();

    if (!$photo) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Foto tidak ditemukan.',
            'data' => ['id' => $id]
        ]);
        exit;
    }

    // 2. Hapus file fisik lokal jika memang milik server storage sendiri
    $imageUrl = $photo['image_url'] ?? '';
    $fileDeleted = false;
    $fileMissing = false;

    if (!empty($imageUrl)) {
        $fileDeleted = deleteLocalMediaFile($imageUrl);
        if (!$fileDeleted) {
            $parsed = parse_url($imageUrl);
            $host = $parsed['host'] ?? '';
            $path = $parsed['path'] ?? $imageUrl;
            if (empty($host) || stripos($host, 'mkverse.my.id') !== false) {
                if (strpos($path, '/uploads/') !== false) {
                    $fileMissing = true;
                }
            }
        }
    }

    // 3. Hapus record dari tabel photos
    $stmt = $pdo->prepare("DELETE FROM photos WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode([
        'success' => true,
        'message' => 'Data foto berhasil dihapus.',
        'data' => [
            'id' => $id,
            'database_deleted' => true,
            'file_deleted' => $fileDeleted,
            'file_missing' => $fileMissing
        ]
    ]);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal menghapus foto: ' . $e->getMessage(),
        'data' => null
    ]);
}

