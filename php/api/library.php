<?php
/**
 * Полка «Мои PDF»: список персональных гайдов клиента и скачивание.
 *
 * GET /api/library.php            → { ok, items: [{id, title, size, createdAt, url}] }
 * GET /api/library.php?id=...     → отдаёт сам PDF-файл (только своему владельцу)
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/users.php';

header('X-Robots-Tag: noindex, nofollow');

if (!host_is_same_origin()) {
    json_out(['error' => 'Запрос отклонён'], 403);
}

if (!client_logged_in()) {
    json_out(['error' => 'Нужен вход'], 401);
}

$userId = client_id();

if (isset($_GET['id'])) {
    $item = find_library_item($userId, (string) $_GET['id']);
    if ($item === null) {
        json_out(['error' => 'Файл не найден'], 404);
    }
    $path = library_dir($userId) . '/' . (string) ($item['file'] ?? '');
    if (!is_file($path)) {
        json_out(['error' => 'Файл не найден на сервере'], 404);
    }
    header('Content-Type: application/pdf');
    header('Content-Length: ' . (string) filesize($path));
    header('Content-Disposition: attachment; filename="' . basename($path) . '"');
    header('Cache-Control: no-store');
    readfile($path);
    app_exit();
}

header('Cache-Control: no-store, max-age=0');

$items = array_map(
    static fn(array $item): array => [
        'id' => (string) ($item['id'] ?? ''),
        'title' => (string) ($item['title'] ?? ''),
        'size' => (int) ($item['size'] ?? 0),
        'createdAt' => (string) ($item['createdAt'] ?? ''),
        'url' => 'api/library.php?id=' . urlencode((string) ($item['id'] ?? '')),
    ],
    all_library($userId),
);

json_out(['ok' => true, 'items' => array_values($items)]);
