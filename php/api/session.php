<?php
/**
 * GET /api/session.php — кто смотрит сайт.
 *
 * Нужен страницам расчёта: владелец, вошедший в кабинет, видит полную
 * расшифровку без ограничений бесплатной версии. Для гостя возвращается
 * только «admin: false» — никаких данных о владельце.
 *
 * Ответ: { ok: true, admin: bool, login: string }
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/store.php';
require_once __DIR__ . '/../inc/auth.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'GET') {
    json_out(['error' => 'Метод не поддерживается'], 405);
}

header('Cache-Control: no-store, max-age=0');
header('X-Robots-Tag: noindex, nofollow');

if (!host_is_same_origin()) {
    json_out(['error' => 'Запрос отклонён'], 403);
}

if (!is_logged_in()) {
    json_out(['ok' => true, 'admin' => false, 'login' => '']);
}

json_out([
    'ok' => true,
    'admin' => true,
    'login' => (string) ($_SESSION['owner'] ?? ''),
]);
