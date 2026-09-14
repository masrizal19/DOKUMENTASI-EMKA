<?php
/**
 * DELETE Activity API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/delete-activity.php
 */

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
        'message' => 'ID kegiatan tidak valid.',
        'data' => null
    ]);
    exit;
}

try {
    // Check if activity exists
    $stmtCheck = $pdo->prepare("SELECT id FROM activities WHERE id = ? LIMIT 1");
    $stmtCheck->execute([$id]);
    $exists = $stmtCheck->fetch();

    if (!$exists) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Kegiatan tidak ditemukan.',
            'data' => ['id' => $id]
        ]);
        exit;
    }

    // Unlink activity_id from photos first (or let FK SET NULL do it)
    $stmtUnlink = $pdo->prepare("UPDATE photos SET activity_id = NULL WHERE activity_id = ?");
    $stmtUnlink->execute([$id]);

    // Delete activity
    $stmt = $pdo->prepare("DELETE FROM activities WHERE id = ?");
    $stmt->execute([$id]);

    echo json_encode([
        'success' => true,
        'message' => 'Kegiatan berhasil dihapus.',
        'data' => ['id' => $id]
    ]);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal menghapus kegiatan: ' . $e->getMessage(),
        'data' => null
    ]);
}
