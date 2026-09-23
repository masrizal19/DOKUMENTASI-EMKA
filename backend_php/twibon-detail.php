<?php
/**
 * TWIBON DETAIL API for Galeri EMKA
 * Endpoint: GET https://api.mkverse.my.id/api/twibon-detail.php?slug={slug}
 *       or: GET https://api.mkverse.my.id/api/twibon-detail.php?id={id}
 */

error_reporting(E_ALL);
ini_set('display_errors', '0');

$allowedOrigins = [
    'https://galerifoto.mkverse.my.id',
    'https://galeri.mkverse.my.id',
    'https://api.mkverse.my.id',
    'http://localhost:3000',
    'http://localhost:5173',
];

$httpOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($httpOrigin)) {
    header("Access-Control-Allow-Origin: {$httpOrigin}");
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan GET.',
        'data' => null
    ]);
    exit;
}

require_once __DIR__ . '/db.php';

$slug = isset($_GET['slug']) ? trim($_GET['slug']) : '';
$id = isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : 0;

if (empty($slug) && $id <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Parameter slug atau id Twibon wajib diisi.',
        'data' => null
    ]);
    exit;
}

try {
    if (!empty($slug)) {
        // Query database mencari berdasarkan slug
        $stmt = $pdo->prepare("SELECT * FROM twibons WHERE slug = ? LIMIT 1");
        $stmt->execute([$slug]);
    } else {
        // Query database mencari berdasarkan ID
        $stmt = $pdo->prepare("SELECT * FROM twibons WHERE id = ? LIMIT 1");
        $stmt->execute([$id]);
    }

    $item = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$item) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Twibon tidak ditemukan atau sudah dihapus.',
            'data' => null
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Hanya tampilkan jika is_active = 1
    if ((int)$item['is_active'] !== 1) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Twibon sedang tidak aktif.',
            'data' => null
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        exit;
    }

    // Pastikan frame_url selalu tersedia
    $frameUrl = !empty($item['frame_url']) ? $item['frame_url'] : ($item['design_url'] ?? '');

    $responseItem = [
        'id' => (int)$item['id'],
        'title' => (string)$item['title'],
        'slug' => (string)$item['slug'],
        'description' => (string)($item['description'] ?? ''),
        'frame_url' => (string)$frameUrl,
        'ratio' => (string)($item['ratio'] ?? '1:1'),
        'is_active' => (int)$item['is_active'],
        'use_count' => (int)($item['use_count'] ?? 0),
        'created_at' => (string)($item['created_at'] ?? ''),
        'updated_at' => (string)($item['updated_at'] ?? ''),
    ];

    echo json_encode([
        'success' => true,
        'message' => 'Detail Twibon berhasil diambil.',
        'data' => $responseItem
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mengambil detail Twibon dari database: ' . $e->getMessage(),
        'data' => null
    ]);
    exit;
}
