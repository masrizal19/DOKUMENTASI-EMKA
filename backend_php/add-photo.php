<?php
/**
 * ADD Photo API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/add-photo.php
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

$title = isset($data['title']) ? trim($data['title']) : '';
if (empty($title)) {
    $title = !empty($data['caption']) ? trim($data['caption']) : 'Foto Kegiatan';
}
$description = isset($data['description']) ? trim($data['description']) : '';
$image_url = isset($data['image_url']) ? trim($data['image_url']) : '';
$activity_id = !empty($data['activity_id']) ? (int) $data['activity_id'] : null;
$category_id = !empty($data['category_id']) ? (int) $data['category_id'] : null;
$event_date = !empty($data['event_date']) ? trim($data['event_date']) : date('Y-m-d');
$is_featured = isset($data['is_featured']) ? (int) $data['is_featured'] : 0;
$display_order = isset($data['display_order']) ? (int) $data['display_order'] : (isset($data['sort_order']) ? (int) $data['sort_order'] : 0);

if (empty($image_url)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'URL gambar (image_url) wajib diisi.',
        'data' => null
    ]);
    exit;
}

// If activity_id is provided but category_id is not, inherit category_id from activity
if ($activity_id !== null && $category_id === null) {
    try {
        $actStmt = $pdo->prepare("SELECT category_id FROM activities WHERE id = ? LIMIT 1");
        $actStmt->execute([$activity_id]);
        $actRow = $actStmt->fetch();
        if ($actRow && !empty($actRow['category_id'])) {
            $category_id = (int) $actRow['category_id'];
        }
    } catch (PDOException $e) {
        // Fallback
    }
}

try {
    $sql = "INSERT INTO photos (
                title,
                description,
                image_url,
                category_id,
                activity_id,
                event_date,
                is_featured,
                display_order,
                created_at,
                updated_at
            ) VALUES (
                :title,
                :description,
                :image_url,
                :category_id,
                :activity_id,
                :event_date,
                :is_featured,
                :display_order,
                NOW(),
                NOW()
            )";

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
    ]);

    $insertedId = (int) $pdo->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Foto berhasil ditambahkan.',
        'data' => [
            'id' => $insertedId,
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
        'message' => 'Gagal menambahkan foto: ' . $e->getMessage(),
        'data' => null
    ]);
}
