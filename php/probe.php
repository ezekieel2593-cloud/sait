<?php
/** ВРЕМЕННЫЙ зонд состояния загруженных файлов. Удалить после диагностики. */
http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

$report = [
    'php' => PHP_VERSION,
    'sapi' => PHP_SAPI,
    'image' => null,
    'check' => null,
    'tariffs' => null,
    'media' => [],
    'self' => null,
];

$describe = static function (string $path): array {
    if (!is_file($path)) {
        return ['exists' => false];
    }
    $raw = (string) file_get_contents($path);
    return [
        'exists' => true,
        'size' => strlen($raw),
        'md5' => md5($raw),
        'head' => substr($raw, 0, 48),
        'tail' => substr($raw, -48),
    ];
};

$report['image'] = $describe(__DIR__ . '/image.php');
$report['check'] = $describe(dirname(__DIR__) . '/check.php');
$report['tariffs'] = $describe(__DIR__ . '/tariffs.php');
$report['self'] = $describe(__FILE__);

foreach (['portal-astro.jpg', 'portal-matrix.jpg', 'favicon.svg', 'og-cover.svg', 'pearl-background.jpg'] as $name) {
    $report['media'][$name] = is_file(dirname(__DIR__) . '/media/' . $name)
        ? (int) filesize(dirname(__DIR__) . '/media/' . $name)
        : null;
}

echo json_encode($report, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
