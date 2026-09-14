<?php
/**
 * UPDATE Photo API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/update-photo.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
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

$id = isset($data['id']) ? (int) $data['id'] : 0;
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
    $checkStmt = $pdo->prepare("SELECT * FROM photos WHERE id = ? LIMIT 1");
    $checkStmt->execute([$id]);
    $existing = $checkStmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Foto tidak ditemukan.',
            'data' => ['id' => $id]
        ]);
        exit;
    }

    $title = isset($data['title']) ? trim($data['title']) : $existing['title'];
    $description = isset($data['description']) ? trim($data['description']) : $existing['description'];
    $image_url = !empty($data['image_url']) ? trim($data['image_url']) : $existing['image_url'];
    $activity_id = isset($data['activity_id']) ? (!empty($data['activity_id']) ? (int) $data['activity_id'] : null) : $existing['activity_id'];
    $category_id = isset($data['category_id']) ? (!empty($data['category_id']) ? (int) $data['category_id'] : null) : $existing['category_id'];
    $event_date = !empty($data['event_date']) ? trim($data['event_date']) : $existing['event_date'];
    $is_featured = isset($data['is_featured']) ? (int) $data['is_featured'] : (int) $existing['is_featured'];
    $display_order = isset($data['display_order']) ? (int) $data['display_order'] : (isset($data['sort_order']) ? (int) $data['sort_order'] : (int) $existing['display_order']);

    $sql = "UPDATE photos SET
                title = :title,
                description = :description,
                image_url = :image_url,
                category_id = :category_id,
                activity_id = :activity_id,
                event_date = :event_date,
                is_featured = :is_featured,
                display_order = :display_order,
                updated_at = NOW()
            WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':title' => $title,
        ':description' => $description,
        ':image_url' => $image_url,
        ':category_id' => $category_id,
        ':activity_id' => $activity_id,
        ':event_date' => $event_date,
        ':is_featured' => $is_featured,
        ':display_order' => $display_order,
        ':id' => $id,
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Data foto berhasil diperbarui.',
        'data' => [
            'id' => $id,
            'title' => $title,
            'description' => $description,
            'image_url' => $image_url,
            'category_id' => $category_id,
            'activity_id' => $activity_id,
            'event_date' => $event_date,
            'is_featured' => $is_featured,
            'display_order' => $display_order,
        ]
    ], JSON_UNESCAPED_SLASHES);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memperbarui foto: ' . $e->getMessage(),
        'data' => null
    ]);
}
