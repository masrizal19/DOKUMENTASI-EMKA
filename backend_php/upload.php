<?php
/**
 * UPLOAD API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/upload.php
 * Endpoint: GET  https://api.mkverse.my.id/api/upload.php (Cek konfigurasi PHP upload)
 * Accepts multipart/form-data with field name 'file'
 */

// Konfigurasi batas upload PHP
@ini_set('upload_max_filesize', '2G');
@ini_set('post_max_size', '2G');
@ini_set('max_execution_time', '3600');
@ini_set('max_input_time', '3600');
@ini_set('memory_limit', '512M');

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. GET METHOD: Debug & Verifikasi Konfigurasi PHP
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Konfigurasi PHP Upload aktif.',
        'php_upload' => [
            'upload_max_filesize' => ini_get('upload_max_filesize') ?: '2G',
            'post_max_size' => ini_get('post_max_size') ?: '2G',
            'max_execution_time' => ini_get('max_execution_time') ?: '3600',
            'max_input_time' => ini_get('max_input_time') ?: '3600',
            'memory_limit' => ini_get('memory_limit') ?: '512M'
        ]
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan POST untuk upload berkas.',
        'data' => null
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// 2. DETEKSI POST_MAX_SIZE EXCEEDED
// Jika ukuran upload melebihi post_max_size, PHP otomatis mengosongkan $_FILES dan $_POST
if (empty($_FILES) && empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && (int)$_SERVER['CONTENT_LENGTH'] > 0) {
    http_response_code(413);
    echo json_encode([
        'success' => false,
        'message' => 'File melebihi batas upload server (post_max_size).',
        'error' => 'POST_MAX_SIZE_EXCEEDED',
        'php' => [
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size')
        ]
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// 3. VALIDASI KEBERADAAN BERKAS 'file'
if (!isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Parameter berkas "file" tidak ditemukan dalam request upload.',
        'error' => 'NO_FILE_FIELD',
        'php' => [
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size')
        ]
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

$file = $_FILES['file'];

// 4. PENANGANAN SEMUA ERROR UPLOAD PHP
if ($file['error'] !== UPLOAD_ERR_OK) {
    $errorMsg = 'Terjadi kesalahan saat upload berkas.';
    $errorCode = 'UPLOAD_ERROR_' . $file['error'];
    $httpCode = 400;

    switch ($file['error']) {
        case UPLOAD_ERR_INI_SIZE:
            $errorMsg = 'File melebihi upload_max_filesize PHP.';
            $errorCode = 'UPLOAD_ERR_INI_SIZE';
            $httpCode = 413;
            break;
        case UPLOAD_ERR_FORM_SIZE:
            $errorMsg = 'File melebihi batas form upload.';
            $errorCode = 'UPLOAD_ERR_FORM_SIZE';
            $httpCode = 413;
            break;
        case UPLOAD_ERR_PARTIAL:
            $errorMsg = 'File hanya terunggah sebagian (koneksi terputus).';
            $errorCode = 'UPLOAD_ERR_PARTIAL';
            break;
        case UPLOAD_ERR_NO_FILE:
            $errorMsg = 'Tidak ada file yang dipilih untuk diunggah.';
            $errorCode = 'UPLOAD_ERR_NO_FILE';
            break;
        case UPLOAD_ERR_NO_TMP_DIR:
            $errorMsg = 'Folder temporary server tidak ditemukan.';
            $errorCode = 'UPLOAD_ERR_NO_TMP_DIR';
            $httpCode = 500;
            break;
        case UPLOAD_ERR_CANT_WRITE:
            $errorMsg = 'Gagal menulis file ke disk server.';
            $errorCode = 'UPLOAD_ERR_CANT_WRITE';
            $httpCode = 500;
            break;
        case UPLOAD_ERR_EXTENSION:
            $errorMsg = 'Upload dihentikan oleh ekstensi PHP pada server.';
            $errorCode = 'UPLOAD_ERR_EXTENSION';
            $httpCode = 500;
            break;
    }

    http_response_code($httpCode);
    echo json_encode([
        'success' => false,
        'message' => $errorMsg,
        'error' => $errorCode,
        'php' => [
            'upload_max_filesize' => ini_get('upload_max_filesize'),
            'post_max_size' => ini_get('post_max_size')
        ]
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// 5. VALIDASI IS_UPLOADED_FILE
if (!is_uploaded_file($file['tmp_name'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Berkas yang diunggah tidak valid atau tidak melalui HTTP POST upload.',
        'error' => 'INVALID_UPLOADED_FILE'
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// 6. VALIDASI TIPE FILE (FOTO & VIDEO)
$allowedMimeTypes = [
    // Foto / Gambar
    'image/jpeg', 'image/jpg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif',
    'image/heic', 'image/heif', 'image/avif', 'image/svg+xml',
    // Video
    'video/mp4', 'video/webm', 'video/quicktime', 'video/mov', 'video/ogg',
    'video/x-matroska', 'video/x-msvideo', 'video/avi'
];

$allowedExtensions = [
    'jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif', 'avif', 'svg',
    'mp4', 'webm', 'mov', 'ogv', 'mkv', 'avi'
];

$fileExt = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

// Deteksi MIME type secara aman
$detectedMime = '';
if (function_exists('finfo_open')) {
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    if ($finfo) {
        $detectedMime = finfo_file($finfo, $file['tmp_name']);
        finfo_close($finfo);
    }
}
if (empty($detectedMime) && function_exists('mime_content_type')) {
    $detectedMime = mime_content_type($file['tmp_name']);
}
if (empty($detectedMime) || $detectedMime === 'application/octet-stream') {
    $detectedMime = $file['type'] ?? '';
}

$isExtValid = in_array($fileExt, $allowedExtensions, true);
$isMimeValid = in_array($detectedMime, $allowedMimeTypes, true);

if (!$isExtValid && !$isMimeValid) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Format file tidak diizinkan. Hanya file foto (JPG, PNG, WEBP, GIF, HEIC, AVIF) dan video (MP4, WEBM, MOV) yang diperbolehkan.',
        'error' => 'INVALID_FILE_TYPE',
        'details' => [
            'extension' => $fileExt,
            'detected_mime' => $detectedMime
        ]
    ], JSON_UNESCAPED_SLASHES);
    exit;
}

// 7. PENYIMPANAN KE DIREKTORI UPLOADS
$uploadDir = __DIR__ . '/../uploads/';
if (!is_dir($uploadDir)) {
    @mkdir($uploadDir, 0755, true);
}

// Nama berkas unik dan aman
$cleanName = preg_replace('/[^a-zA-Z0-9_-]/', '_', pathinfo($file['name'], PATHINFO_FILENAME));
$cleanName = substr($cleanName, 0, 30);
$safeExt = !empty($fileExt) ? $fileExt : 'bin';
$filename = 'emka_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . ($cleanName ? '_' . $cleanName : '') . '.' . $safeExt;
$destination = $uploadDir . $filename;

if (move_uploaded_file($file['tmp_name'], $destination)) {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
    $host = $_SERVER['HTTP_HOST'];
    $baseUrl = $protocol . $host . '/uploads/' . $filename;

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Upload berhasil.',
        'data' => [
            'url' => $baseUrl,
            'filename' => $filename,
            'size' => $file['size'],
            'mime' => $detectedMime,
            'extension' => $safeExt
        ]
    ], JSON_UNESCAPED_SLASHES);
} else {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memindahkan file ke direktori penyimpanan server.',
        'error' => 'CANT_MOVE_FILE',
        'data' => null
    ], JSON_UNESCAPED_SLASHES);
}
