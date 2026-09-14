<?php
/**
 * GET Photos API for Galeri EMKA
 * Endpoint: GET https://api.mkverse.my.id/api/photos.php
 * Parameters (optional):
 *   ?activity_id=1 -> Filter photos belonging to specific activity
 *   ?category_id=1 -> Filter photos belonging to specific category
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan GET.',
        'data' => null
    ]);
    exit;
}

try {
    $activityId = isset($_GET['activity_id']) && $_GET['activity_id'] !== '' && $_GET['activity_id'] !== 'all' ? (int) $_GET['activity_id'] : null;
    $categoryId = isset($_GET['category_id']) && $_GET['category_id'] !== '' && $_GET['category_id'] !== 'all' ? (int) $_GET['category_id'] : null;

    $sql = "SELECT 
                p.id,
                p.title,
                p.description,
                p.image_url,
                p.category_id,
                p.activity_id,
                p.event_date,
                p.is_featured,
                p.display_order,
                p.created_at,
                p.updated_at,
                a.title AS activity_title,
                c.name AS category_name
            FROM photos p
            LEFT JOIN activities a ON p.activity_id = a.id
            LEFT JOIN categories c ON p.category_id = c.id";

    $where = [];
    $params = [];

    if ($activityId !== null) {
        $where[] = "p.activity_id = :activity_id";
        $params[':activity_id'] = $activityId;
    }

    if ($categoryId !== null) {
        $where[] = "p.category_id = :category_id";
        $params[':category_id'] = $categoryId;
    }

    if (!empty($where)) {
        $sql .= " WHERE " . implode(" AND ", $where);
    }

    $sql .= " ORDER BY p.display_order ASC, p.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $photos = $stmt->fetchAll();

    $formatted = array_map(function ($row) {
        return [
            'id' => (int) $row['id'],
            'title' => $row['title'] ?? '',
            'description' => $row['description'] ?? '',
            'image_url' => $row['image_url'] ?? '',
            'category_id' => $row['category_id'] !== null ? (int) $row['category_id'] : null,
            'category_name' => $row['category_name'] ?? null,
            'activity_id' => $row['activity_id'] !== null ? (int) $row['activity_id'] : null,
            'activity_title' => $row['activity_title'] ?? null,
            'event_date' => $row['event_date'] ?? date('Y-m-d'),
            'is_featured' => (int) ($row['is_featured'] ?? 0),
            'display_order' => (int) ($row['display_order'] ?? 0),
            'created_at' => $row['created_at'] ?? date('Y-m-d H:i:s'),
            'updated_at' => $row['updated_at'] ?? date('Y-m-d H:i:s'),
        ];
    }, $photos);

    echo json_encode([
        'success' => true,
        'message' => 'Data foto berhasil diambil.',
        'count' => count($formatted),
        'data' => $formatted
    ], JSON_UNESCAPED_SLASHES);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mengambil data foto: ' . $e->getMessage(),
        'data' => []
    ]);
}
