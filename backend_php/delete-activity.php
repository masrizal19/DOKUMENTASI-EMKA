<?php
/**
 * DELETE Activity API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/delete-activity.php
 * Menghapus kegiatan beserta SELURUH foto/media yang terhubung (activity_id)
 * Mencegah adanya orphan photos di database.
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
 * Tidak pernah menghapus URL eksternal (Google Drive, Unsplash, Shutterstock, dll.)
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
        'message' => 'ID kegiatan tidak valid.',
        'data' => null
    ]);
    exit;
}

try {
    $pdo->beginTransaction();

    // 1. Cek keberadaan kegiatan
    $stmtCheck = $pdo->prepare("SELECT id, title, cover_url FROM activities WHERE id = ? LIMIT 1");
    $stmtCheck->execute([$id]);
    $activity = $stmtCheck->fetch();

    if (!$activity) {
        $pdo->rollBack();
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Kegiatan tidak ditemukan.',
            'data' => ['id' => $id]
        ]);
        exit;
    }

    // 2. Ambil seluruh foto yang terhubung dengan kegiatan ini (activity_id = $id)
    $stmtPhotos = $pdo->prepare("SELECT id, image_url FROM photos WHERE activity_id = ?");
    $stmtPhotos->execute([$id]);
    $relatedPhotos = $stmtPhotos->fetchAll();

    // 3. Hapus berkas fisik lokal untuk setiap foto
    $deletedFilesCount = 0;
    foreach ($relatedPhotos as $p) {
        if (!empty($p['image_url'])) {
            if (deleteLocalMediaFile($p['image_url'])) {
                $deletedFilesCount++;
            }
        }
    }

    // Hapus juga file cover kegiatan jika tersimpan lokal
    if (!empty($activity['cover_url'])) {
        deleteLocalMediaFile($activity['cover_url']);
    }

    // 4. Hapus semua baris foto terkait dari tabel photos (mencegah orphan photos)
    $stmtDelPhotos = $pdo->prepare("DELETE FROM photos WHERE activity_id = ?");
    $stmtDelPhotos->execute([$id]);
    $deletedPhotosCount = $stmtDelPhotos->rowCount();

    // 5. Hapus baris kegiatan dari tabel activities
    $stmtDelAct = $pdo->prepare("DELETE FROM activities WHERE id = ?");
    $stmtDelAct->execute([$id]);

    // 6. Commit transaksi
    $pdo->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Kegiatan dan semua foto terkait berhasil dihapus.',
        'data' => [
            'id' => $id,
            'title' => $activity['title'],
            'deleted_photos_count' => $deletedPhotosCount,
            'deleted_files_count' => $deletedFilesCount
        ]
    ]);

} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal menghapus kegiatan: ' . $e->getMessage(),
        'data' => null
    ]);
}

