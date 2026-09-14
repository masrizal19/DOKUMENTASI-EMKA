<?php
/**
 * UPLOAD API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/upload.php
 * Accepts multipart/form-data with field name 'file'
 */

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan POST.',
        'data' => null
    ]);
    exit;
}

if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    $errorMsg = 'File tidak ditemukan atau terjadi kesalahan saat upload.';
    if (isset($_FILES['file']['error'])) {
        switch ($_FILES['file']['error']) {
            case UPLOAD_ERR_INI_SIZE:
            case UPLOAD_ERR_FORM_SIZE:
                $errorMsg = 'Ukuran file melebihi batas maksimal server.';
                break;
            case UPLOAD_ERR_NO_FILE:
                $errorMsg = 'Tidak ada file yang dipilih.';
                break;
        }
    }
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => $errorMsg,
        'data' => null
    ]);
    exit;
}

$file = $_FILES['file'];
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
$fileMime = mime_content_type($file['tmp_name']);

if (!in_array($fileMime, $allowedTypes)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Format file tidak diizinkan. Hanya file gambar (JPG, PNG, WEBP, GIF) yang diperbolehkan.',
        'data' => null
    ]);
    exit;
}

$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$ext = pathinfo($file['name'], PATHINFO_EXTENSION);
$filename = 'emka_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.' . strtolower($ext);
$destination = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $destination)) {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'];
    $baseUrl = $protocol . $host . '/uploads/' . $filename;

    echo json_encode([
        'success' => true,
        'message' => 'File berhasil diunggah.',
        'data' => [
            'url' => $baseUrl,
            'filename' => $filename,
            'size' => $file['size'],
            'mime' => $fileMime
        ]
    ], JSON_UNESCAPED_SLASHES);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memindahkan file yang diunggah ke direktori tujuan.',
        'data' => null
    ]);
}
