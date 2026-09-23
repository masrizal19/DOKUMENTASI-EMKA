<?php
/**
 * GET Settings API for Galeri EMKA
 * Endpoint: GET https://api.mkverse.my.id/api/settings.php
 */

// 1. Matikan error HTML agar output selalu JSON murni
error_reporting(E_ALL);
ini_set('display_errors', '0');

// 2. Dynamic CORS headers untuk mendukung production, dev, preview, dan localhost
$allowedOrigins = [
    'https://galerifoto.mkverse.my.id',
    'https://galeri.mkverse.my.id',
    'https://api.mkverse.my.id',
    'http://localhost:3000',
    'http://localhost:5173',
];

$httpOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (!empty($httpOrigin)) {
    if (in_array($httpOrigin, $allowedOrigins) || 
        preg_match('/^https:\/\/([a-z0-9-]+\.)*mkverse\.my\.id$/i', $httpOrigin) || 
        preg_match('/^https:\/\/([a-z0-9-]+\.)*run\.app$/i', $httpOrigin) ||
        preg_match('/^https?:\/\/localhost(:[0-9]+)?$/i', $httpOrigin) ||
        preg_match('/^https?:\/\/127\.0\.0\.1(:[0-9]+)?$/i', $httpOrigin)) {
        header("Access-Control-Allow-Origin: {$httpOrigin}");
    } else {
        header("Access-Control-Allow-Origin: {$httpOrigin}");
    }
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=UTF-8');

// 3. Preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'CORS preflight OK'
    ]);
    exit;
}

require_once __DIR__ . '/db.php';

try {
    $stmt = $pdo->prepare("SELECT id, setting_key, setting_value, updated_at FROM settings ORDER BY id ASC");
    $stmt->execute();
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Data settings berhasil diambil.',
        'data' => $rows
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mengambil data settings: ' . $e->getMessage(),
        'data' => []
    ]);
}
