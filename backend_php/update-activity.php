<?php
/**
 * UPDATE Activity API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/update-activity.php
 */

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
        'message' => 'ID kegiatan tidak valid.',
        'data' => null
    ]);
    exit;
}

$title = isset($data['title']) ? trim($data['title']) : '';
$description = isset($data['description']) ? trim($data['description']) : '';
$category_id = !empty($data['category_id']) ? (int) $data['category_id'] : null;
$event_date = !empty($data['event_date']) ? trim($data['event_date']) : (!empty($data['date']) ? trim($data['date']) : date('Y-m-d'));
$cover_url = !empty($data['cover_url']) ? trim($data['cover_url']) : (!empty($data['cover_image']) ? trim($data['cover_image']) : null);
$is_published = isset($data['is_published']) ? (int) $data['is_published'] : (isset($data['status']) && $data['status'] === 'published' ? 1 : 0);
$display_order = isset($data['display_order']) ? (int) $data['display_order'] : 0;

if (empty($title)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Judul kegiatan wajib diisi.',
        'data' => null
    ]);
    exit;
}

function createSlug($string) {
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $string), '-'));
    return !empty($slug) ? $slug : 'kegiatan-' . time();
}

$slugInput = !empty($data['slug']) ? trim($data['slug']) : $title;
$baseSlug = createSlug($slugInput);
$finalSlug = $baseSlug;

try {
    // Check if activity exists
    $checkStmt = $pdo->prepare("SELECT id, cover_url FROM activities WHERE id = ? LIMIT 1");
    $checkStmt->execute([$id]);
    $existing = $checkStmt->fetch();

    if (!$existing) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Kegiatan tidak ditemukan.',
            'data' => ['id' => $id]
        ]);
        exit;
    }

    if ($cover_url === null) {
        $cover_url = $existing['cover_url'];
    }

    // Ensure slug is unique excluding current activity
    $stmtSlug = $pdo->prepare("SELECT id FROM activities WHERE slug = ? AND id != ? LIMIT 1");
    $stmtSlug->execute([$finalSlug, $id]);
    $counter = 1;
    while ($stmtSlug->fetch()) {
        $counter++;
        $finalSlug = "{$baseSlug}-{$counter}";
        $stmtSlug->execute([$finalSlug, $id]);
    }

    $sql = "UPDATE activities SET
                title = :title,
                slug = :slug,
                description = :description,
                category_id = :category_id,
                event_date = :event_date,
                cover_url = :cover_url,
                is_published = :is_published,
                display_order = :display_order,
                updated_at = NOW()
            WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':title' => $title,
        ':slug' => $finalSlug,
        ':description' => $description,
        ':category_id' => $category_id,
        ':event_date' => $event_date,
        ':cover_url' => $cover_url,
        ':is_published' => $is_published,
        ':display_order' => $display_order,
        ':id' => $id,
    ]);

    echo json_encode([
        'success' => true,
        'message' => 'Kegiatan berhasil diperbarui.',
        'data' => [
            'id' => $id,
            'title' => $title,
            'slug' => $finalSlug,
            'description' => $description,
            'category_id' => $category_id,
            'event_date' => $event_date,
            'cover_url' => $cover_url,
            'is_published' => $is_published,
            'display_order' => $display_order,
        ]
    ], JSON_UNESCAPED_SLASHES);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memperbarui kegiatan: ' . $e->getMessage(),
        'data' => null
    ]);
}
