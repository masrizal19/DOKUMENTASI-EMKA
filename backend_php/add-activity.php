<?php
/**
 * ADD Activity API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/add-activity.php
 */

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

// Support both JSON body and FormData
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    $data = $_POST;
}

$title = isset($data['title']) ? trim($data['title']) : '';
$google_drive_url = !empty($data['google_drive_url']) ? trim($data['google_drive_url']) : null;
$description = isset($data['description']) ? trim($data['description']) : '';
$category_id = !empty($data['category_id']) ? (int) $data['category_id'] : null;
$event_date = !empty($data['event_date']) ? trim($data['event_date']) : (!empty($data['date']) ? trim($data['date']) : date('Y-m-d'));
$cover_url = !empty($data['cover_url']) ? trim($data['cover_url']) : (!empty($data['cover_image']) ? trim($data['cover_image']) : '');
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

// Generate or sanitize slug
function createSlug($string) {
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $string), '-'));
    return !empty($slug) ? $slug : 'kegiatan-' . time();
}

$slugInput = !empty($data['slug']) ? trim($data['slug']) : $title;
$baseSlug = createSlug($slugInput);
$finalSlug = $baseSlug;

try {
    // Ensure slug is unique in activities table
    $stmtSlug = $pdo->prepare("SELECT id FROM activities WHERE slug = ? LIMIT 1");
    $stmtSlug->execute([$finalSlug]);
    $counter = 1;
    while ($stmtSlug->fetch()) {
        $counter++;
        $finalSlug = "{$baseSlug}-{$counter}";
        $stmtSlug->execute([$finalSlug]);
    }

    $sql = "INSERT INTO activities (
                title,
                slug,
                google_drive_url,
                description,
                category_id,
                event_date,
                cover_url,
                is_published,
                display_order,
                created_at,
                updated_at
            ) VALUES (
                :title,
                :slug,
                :google_drive_url,
                :description,
                :category_id,
                :event_date,
                :cover_url,
                :is_published,
                :display_order,
                NOW(),
                NOW()
            )";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':title' => $title,
        ':slug' => $finalSlug,
        ':google_drive_url' => $google_drive_url,
        ':description' => $description,
        ':category_id' => $category_id,
        ':event_date' => $event_date,
        ':cover_url' => $cover_url,
        ':is_published' => $is_published,
        ':display_order' => $display_order,
    ]);

    $insertedId = (int) $pdo->lastInsertId();

    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Kegiatan berhasil ditambahkan.',
        'data' => [
            'id' => $insertedId,
            'title' => $title,
            'slug' => $finalSlug,
            'google_drive_url' => $google_drive_url,
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
        'message' => 'Gagal menambahkan kegiatan: ' . $e->getMessage(),
        'data' => null
    ]);
}
