<?php
/**
 * Запись на личную консультацию из клиентского кабинета.
 *
 * Заявка попадает в общую базу специалиста (data/leads.php) и уходит
 * в Telegram/письмо тем же механизмом, что и заявки с сайта.
 *
 * POST /api/booking.php  { theme, comment, contact, name }
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/store.php';
require_once __DIR__ . '/../inc/notify.php';
require_once __DIR__ . '/../inc/users.php';

header('Cache-Control: no-store, max-age=0');
header('X-Robots-Tag: noindex, nofollow');

if (!host_is_same_origin()) {
    json_out(['error' => 'Запрос отклонён'], 403);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(['error' => 'Метод не поддерживается'], 405);
}

$limit = rate_limit('booking:' . ip_hash(), 5, 30);
if (!$limit['allowed']) {
    json_out(['error' => 'Слишком много заявок подряд. Попробуйте позже'], 429);
}

$body = read_json_body();
$theme = str_cut(trim((string) ($body['theme'] ?? '')), 80);
$comment = str_cut(trim((string) ($body['comment'] ?? '')), 1000);
$contact = str_cut(trim((string) ($body['contact'] ?? '')), 120);
$name = str_cut(trim((string) ($body['name'] ?? '')), 80);

if ($theme === '') {
    json_out(['error' => 'Выберите тему консультации'], 400);
}
if ($contact === '') {
    json_out(['error' => 'Укажите контакт для связи (Telegram или email)'], 400);
}

$client = client_logged_in() ? find_user(client_id()) : null;
if ($name === '' && $client !== null) {
    $name = (string) ($client['name'] ?? '');
}
if ($name === '') {
    $name = 'Клиент портала';
}

// Тема консультации определяет направление заявки.
$matrixThemes = ['Матрица судьбы', 'Чакры и энергия'];
$direction = in_array($theme, $matrixThemes, true) ? 'matrix' : 'astrology';

$lead = create_lead([
    'name' => $name,
    'direction' => $direction,
    'purpose' => 'guide',
    'channel' => str_starts_with($contact, '@') || !str_contains($contact, '@') ? 'telegram' : 'email',
    'contact' => $contact,
    'question' => 'Консультация: ' . $theme . ($comment !== '' ? "\n\n" . $comment : ''),
    'calc' => null,
    'details' => '',
    'birth' => (string) ($client['birthday'] ?? ''),
    'place' => (string) ($client['birthPlace'] ?? ''),
]);

$source = $client !== null ? 'Кабинет клиента (' . (string) ($client['email'] ?? '') . ')' : 'Кабинет без входа';
append_history((string) $lead['id'], [
    'type' => 'created',
    'message' => 'Заявка на консультацию: ' . $theme . ' · ' . $source,
    'at' => now_iso(),
    'actor' => 'client',
]);
$notifications = notify_lead($lead);
save_notifications((string) $lead['id'], $notifications);

json_out(['ok' => true, 'ref' => (string) ($lead['ref'] ?? '')]);
