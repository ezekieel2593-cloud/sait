<?php
/**
 * Профиль клиента и «Мои люди»: сохранённые данные рождения и близкие.
 *
 * GET  /api/profile.php            → { ok, people: [...] }
 * POST /api/profile.php            → action: add | delete | updateMe | onboarding
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/users.php';

header('Cache-Control: no-store, max-age=0');
header('X-Robots-Tag: noindex, nofollow');

if (!host_is_same_origin()) {
    json_out(['error' => 'Запрос отклонён'], 403);
}

if (!client_logged_in()) {
    json_out(['error' => 'Нужен вход'], 401);
}

$userId = client_id();

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    json_out(['ok' => true, 'people' => all_people($userId)]);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(['error' => 'Метод не поддерживается'], 405);
}

$body = read_json_body();
$action = (string) ($body['action'] ?? 'add');

switch ($action) {
    case 'add':
        [$person, $error] = create_person($userId, $body);
        if ($error !== null || $person === null) {
            json_out(['error' => (string) $error], 400);
        }
        json_out(['ok' => true, 'people' => all_people($userId)]);

    case 'delete':
        delete_person($userId, (string) ($body['id'] ?? ''));
        json_out(['ok' => true, 'people' => all_people($userId)]);

    case 'updateMe':
        $updated = user_mutate($userId, static function (array $user) use ($body): array {
            foreach (['birthday', 'birthTime', 'birthPlace', 'telegram', 'name'] as $field) {
                if (array_key_exists($field, $body)) {
                    $user[$field] = str_cut(trim((string) $body[$field]), $field === 'birthPlace' ? 120 : 80);
                }
            }
            return $user;
        });
        if ($updated === null) {
            json_out(['error' => 'Профиль не найден'], 404);
        }
        json_out(['ok' => true, 'user' => user_public($updated)]);

    case 'onboarding':
        $topic = (string) ($body['topic'] ?? '');
        if (!in_array($topic, ['relations', 'money', 'energy'], true)) {
            json_out(['error' => 'Неизвестная тема'], 400);
        }
        user_mutate($userId, static function (array $user) use ($topic): array {
            $user['onboarding'] = $topic;
            return $user;
        });
        json_out(['ok' => true, 'topic' => $topic]);

    default:
        json_out(['error' => 'Неизвестное действие'], 400);
}
