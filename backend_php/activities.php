<?php
/**
 * GET Activities API for Galeri EMKA
 * Endpoint: GET https://api.mkverse.my.id/api/activities.php
 * Parameters:
 *   ?published=1 -> Filter only published activities (for public site)
 */

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
    $publishedOnly = isset($_GET['published']) && ($_GET['published'] === '1' || $_GET['published'] === 'true');

    // Build SQL query
    $sql = "SELECT 
                a.id,
                a.title,
                a.slug,
                a.google_drive_url,
                a.description,
                a.category_id,
                c.name AS category_name,
                a.event_date,
                a.cover_url,
                a.is_published,
                a.display_order,
                a.created_at,
                a.updated_at
            FROM activities a
            LEFT JOIN categories c ON a.category_id = c.id";

    if ($publishedOnly) {
        $sql .= " WHERE a.is_published = 1";
    }

    $sql .= " ORDER BY a.display_order ASC, a.event_date DESC, a.created_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $activities = $stmt->fetchAll();

    // Normalize output types
    $formatted = array_map(function ($row) {
        return [
            'id' => (int) $row['id'],
            'title' => $row['title'] ?? '',
            'slug' => $row['slug'] ?? '',
            'google_drive_url' => $row['google_drive_url'] ?? null,
            'description' => $row['description'] ?? '',
            'category_id' => $row['category_id'] !== null ? (int) $row['category_id'] : null,
            'category_name' => $row['category_name'] ?? 'Kegiatan Sekolah',
            'category' => $row['category_name'] ?? 'Kegiatan Sekolah',
            'event_date' => $row['event_date'] ?? date('Y-m-d'),
            'date' => $row['event_date'] ?? date('Y-m-d'),
            'cover_url' => $row['cover_url'] ?? '',
            'cover_image' => $row['cover_url'] ?? '',
            'is_published' => (int) $row['is_published'],
            'status' => ((int) $row['is_published'] === 1) ? 'published' : 'draft',
            'display_order' => (int) ($row['display_order'] ?? 0),
            'created_at' => $row['created_at'] ?? date('Y-m-d H:i:s'),
            'updated_at' => $row['updated_at'] ?? date('Y-m-d H:i:s'),
        ];
    }, $activities);

    echo json_encode([
        'success' => true,
        'message' => 'Data kegiatan berhasil diambil.',
        'count' => count($formatted),
        'data' => $formatted
    ], JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mengambil data kegiatan: ' . $e->getMessage(),
        'data' => []
    ]);
}
