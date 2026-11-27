<?php
/**
 * Раздача статичных картинок сайта: api/image.php?name=portal-astro.jpg.
 *
 * Используется, когда хостинг отдаёт HTTP 500 на прямые запросы к файлам
 * изображений (сломанный обработчик image-типов), при том что PHP работает.
 * Отдаёт только белый список файлов из каталога media/ — никакого
 * произвольного чтения путей.
 */

declare(strict_types=1);

http_response_code(200);
header_remove();

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json; charset=utf-8');
    header('Allow: GET');
    echo json_encode(['error' => 'Метод не поддерживается'], JSON_UNESCAPED_UNICODE);
    return;
}

$name = (string) ($_GET['name'] ?? '');
if (!preg_match('/^[a-z0-9][a-z0-9._-]{0,80}$/i', $name) || str_contains($name, '..')) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Некорректное имя файла'], JSON_UNESCAPED_UNICODE);
    return;
}

$types = [
    'jpg' => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png' => 'image/png',
    'webp' => 'image/webp',
    'avif' => 'image/avif',
    'ico' => 'image/x-icon',
    'svg' => 'image/svg+xml; charset=utf-8',
];
$extension = strtolower(pathinfo($name, PATHINFO_EXTENSION));
if (!isset($types[$extension])) {
    http_response_code(400);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Тип файла не поддерживается'], JSON_UNESCAPED_UNICODE);
    return;
}

$baseDir = dirname(__DIR__) . '/media';
$file = $baseDir . '/' . $name;
$realBase = realpath($baseDir);
$realFile = realpath($file);
if ($realBase === false || $realFile === false || !str_starts_with($realFile, $realBase . DIRECTORY_SEPARATOR) || !is_file($realFile)) {
    http_response_code(404);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['error' => 'Файл не найден'], JSON_UNESCAPED_UNICODE);
    return;
}

header('Content-Type: ' . $types[$extension]);
header('Content-Length: ' . (string) filesize($realFile));
header('Cache-Control: public, max-age=86400');
header('X-Content-Type-Options: nosniff');
readfile($realFile);
return;
