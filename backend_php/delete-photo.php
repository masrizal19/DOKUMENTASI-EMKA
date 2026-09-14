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
    $stmtCheck = $pdo->prepare("SELECT id, image_url FROM photos WHERE id = ? LIMIT 1");
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

    // 2. Hapus file fisik lokal jika tersimpan di server lokal uploads
    $imageUrl = $photo['image_url'] ?? '';
    if (!empty($imageUrl) && strpos($imageUrl, '/uploads/') !== false) {
        $parsedUrl = parse_url($imageUrl, PHP_URL_PATH);
        $filename = basename($parsedUrl);
        $filePath = __DIR__ . '/uploads/' . $filename;
        if (file_exists($filePath) && is_file($filePath)) {
            @unlink($filePath);
        }
    }

    // 3. Hapus record dari tabel photos
    $stmt = $pdo->prepare("DELETE FROM photos WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode([
        'success' => true,
        'message' => 'Data foto berhasil dihapus.',
        'data' => ['id' => $id]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal menghapus foto: ' . $e->getMessage(),
        'data' => null
    ]);
}
