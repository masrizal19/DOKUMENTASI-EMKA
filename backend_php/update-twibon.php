<?php
/**
 * UPDATE TWIBON API for Galeri EMKA
 * Endpoint: POST https://api.mkverse.my.id/api/update-twibon.php
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

header('Access-Control-Allow-Methods: POST, PUT, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Cache-Control, Pragma');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST' && $_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Metode HTTP tidak diizinkan. Gunakan POST.',
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

$id = isset($data['id']) && is_numeric($data['id']) ? (int)$data['id'] : 0;
if ($id <= 0) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'ID Twibon tidak valid.'
    ]);
    exit;
}

try {
    $stmtOld = $pdo->prepare("SELECT * FROM twibons WHERE id = ? LIMIT 1");
    $stmtOld->execute([$id]);
    $oldTwibon = $stmtOld->fetch(PDO::FETCH_ASSOC);

    if (!$oldTwibon) {
        http_response_code(404);
        echo json_encode([
            'success' => false,
            'message' => 'Twibon tidak ditemukan atau sudah dihapus.'
        ]);
        exit;
    }

    $title = isset($data['title']) ? trim($data['title']) : $oldTwibon['title'];
    $rawSlug = !empty($data['slug']) ? trim($data['slug']) : $oldTwibon['slug'];
    $slug = strtolower(trim(preg_replace('/[^A-Za-z0-9-]+/', '-', $rawSlug), '-'));
    $description = isset($data['description']) ? trim($data['description']) : $oldTwibon['description'];
    
    $ratio = isset($data['ratio']) ? trim($data['ratio']) : $oldTwibon['ratio'];
    if (!in_array($ratio, ['1:1', '4:3', '16:9', '9:16'])) {
        $ratio = '1:1';
    }

    $isActive = isset($data['is_active']) ? (int)$data['is_active'] : (isset($data['isActive']) ? ($data['isActive'] ? 1 : 0) : (int)$oldTwibon['is_active']);

    // Cek duplikasi slug terhadap record lain
    $stmtSlug = $pdo->prepare("SELECT id FROM twibons WHERE slug = ? AND id != ? LIMIT 1");
    $stmtSlug->execute([$slug, $id]);
    if ($stmtSlug->fetch()) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => "Slug '{$slug}' sudah digunakan oleh kampanye Twibon lain."
        ]);
        exit;
    }

    $uploadDir = __DIR__ . '/../uploads/twibon/';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    $uploadedDesignUrl = '';
    $uploadedFilePath = '';

    // Handle new file upload
    if (isset($_FILES['file']) && $_FILES['file']['error'] === UPLOAD_ERR_OK) {
        $file = $_FILES['file'];
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));

        if ($ext !== 'png') {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'message' => 'Frame Twibon harus berupa berkas format PNG transparan (.png).'
            ]);
            exit;
        }

        $uniqueName = 'twibon_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.png';
        $dest = $uploadDir . $uniqueName;

        if (move_uploaded_file($file['tmp_name'], $dest)) {
            $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
            $host = $_SERVER['HTTP_HOST'];
            $uploadedDesignUrl = $protocol . $host . '/uploads/twibon/' . $uniqueName;
            $uploadedFilePath = $dest;
        }
    } elseif (!empty($data['image_base64']) || (isset($data['design_url']) && strpos($data['design_url'], 'data:image/') === 0)) {
        $dataUri = !empty($data['image_base64']) ? $data['image_base64'] : $data['design_url'];
        if (preg_match('/^data:image\/(\w+);base64,/', $dataUri)) {
            $dataUri = substr($dataUri, strpos($dataUri, ',') + 1);
            $decoded = base64_decode($dataUri);
            if ($decoded !== false) {
                $uniqueName = 'twibon_' . date('Ymd_His') . '_' . bin2hex(random_bytes(4)) . '.png';
                $dest = $uploadDir . $uniqueName;
                if (@file_put_contents($dest, $decoded)) {
                    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? "https://" : "http://";
                    $host = $_SERVER['HTTP_HOST'];
                    $uploadedDesignUrl = $protocol . $host . '/uploads/twibon/' . $uniqueName;
                    $uploadedFilePath = $dest;
                }
            }
        }
    }

    $finalDesignUrl = $uploadedDesignUrl ?: (!empty($data['design_url']) && strpos($data['design_url'], 'data:image/') !== 0 ? trim($data['design_url']) : $oldTwibon['design_url']);

    // UPDATE database
    $sql = "UPDATE twibons SET
                title = :title,
                slug = :slug,
                description = :description,
                ratio = :ratio,
                design_url = :design_url,
                is_active = :is_active,
                updated_at = NOW()
            WHERE id = :id";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':title' => $title,
        ':slug' => $slug,
        ':description' => $description,
        ':ratio' => $ratio,
        ':design_url' => $finalDesignUrl,
        ':is_active' => $isActive,
        ':id' => $id,
    ]);

    // SETELAH database berhasil diupdate, baru hapus file PNG lama jika ada file baru yang menggantikannya
    if (!empty($uploadedDesignUrl) && !empty($oldTwibon['design_url']) && $uploadedDesignUrl !== $oldTwibon['design_url']) {
        deleteTwibonFile($oldTwibon['design_url']);
    }

    // Ambil data terbaru
    $stmtNew = $pdo->prepare("SELECT * FROM twibons WHERE id = ? LIMIT 1");
    $stmtNew->execute([$id]);
    $updated = $stmtNew->fetch(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'message' => 'Kampanye Twibon berhasil diperbarui.',
        'data' => [
            'id' => (int)$updated['id'],
            'title' => $updated['title'],
            'slug' => $updated['slug'],
            'description' => $updated['description'],
            'ratio' => $updated['ratio'],
            'design_url' => $updated['design_url'],
            'designUrl' => $updated['design_url'],
            'is_active' => (int)$updated['is_active'],
            'isActive' => ((int)$updated['is_active']) === 1,
            'use_count' => (int)$updated['use_count'],
            'useCount' => (int)$updated['use_count'],
            'created_at' => $updated['created_at'],
            'createdAt' => $updated['created_at'],
            'updated_at' => $updated['updated_at'],
            'updatedAt' => $updated['updated_at'],
        ]
    ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
} catch (PDOException $e) {
    if (!empty($uploadedFilePath) && file_exists($uploadedFilePath)) {
        @unlink($uploadedFilePath);
    }
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Gagal memperbarui Twibon: ' . $e->getMessage(),
        'data' => null
    ]);
}
