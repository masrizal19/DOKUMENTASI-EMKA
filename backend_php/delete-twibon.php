<?php
/**
 * DELETE TWIBON API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/delete-twibon.php
 * Payload JSON: { "id": 12 }
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

header('Access-Control-Allow-Methods: POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan POST atau DELETE.',
        'data' => null
    ]);
    exit;
}

require_once __DIR__ . '/db.php';

function deleteTwibonFile($fileUrl) {
    if (empty($fileUrl)) return false;
    $parsed = parse_url($fileUrl);
    $path = $parsed['path'] ?? $fileUrl;
    if (strpos($path, '/uploads/twibon/') === false && strpos($path, 'uploads/twibon/') === false) {
        return false;
    }
    $filename = basename($path);
    if (empty($filename) || $filename === '.' || $filename === '..') return false;

    $possiblePaths = [
        __DIR__ . '/../uploads/twibon/' . $filename,
        __DIR__ . '/uploads/twibon/' . $filename,
        dirname(__DIR__) . '/uploads/twibon/' . $filename,
    ];
    foreach ($possiblePaths as $filePath) {
        if (file_exists($filePath) && is_file($filePath)) {
            @unlink($filePath);
            return true;
        }
    }
    return false;
}

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);
if (!is_array($data)) {
    $data = $_POST;
}

$id = isset($data['id']) && is_numeric($data['id']) ? (int)$data['id'] : (isset($_GET['id']) && is_numeric($_GET['id']) ? (int)$_GET['id'] : 0);

if ($id <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID Twibon tidak valid.',
        'data' => null
    ]);
    exit;
}

try {
    // 1. Cek keberadaan Twibon di database
    $stmtCheck = $pdo->prepare("SELECT id, design_url, title FROM twibons WHERE id = ? LIMIT 1");
    $stmtCheck->execute([$id]);
    $twibon = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$twibon) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Twibon tidak ditemukan.',
            'data' => ['id' => $id]
        ]);
        exit;
    }

    $designUrl = $twibon['design_url'] ?? '';

    // 2. Hapus record database dengan prepared statement
    $stmtDel = $pdo->prepare("DELETE FROM twibons WHERE id = ?");
    $stmtDel->execute([$id]);

    // 3. Verifikasi DELETE (Requirement 6)
    $stmtVerify = $pdo->prepare("SELECT id FROM twibons WHERE id = ? LIMIT 1");
    $stmtVerify->execute([$id]);
    if ($stmtVerify->fetch()) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Gagal menghapus Twibon dari database (record masih ada).'
        ]);
        exit;
    }

    // 4. Hapus file PNG terkait jika berada di folder upload Twibon
    $fileDeleted = deleteTwibonFile($designUrl);

    echo json_encode([
        'success' => true,
        'message' => 'Twibon berhasil dihapus.',
        'data' => [
            'id' => $id,
            'database_deleted' => true,
            'file_deleted' => $fileDeleted
        ]
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal menghapus Twibon: ' . $e->getMessage(),
        'data' => null
    ]);
}
