<?php
/**
 * Клиентская авторизация портала: регистрация, вход, выход, кто я.
 *
 * GET  /api/auth.php            → { ok, authed, user? }
 * POST /api/auth.php            → { action: "register" | "login" | "logout" }
 *
 * Пароль хранится хешем (password_hash), сессия — httpOnly cookie.
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/users.php';

header('Cache-Control: no-store, max-age=0');
header('X-Robots-Tag: noindex, nofollow');

if (!host_is_same_origin()) {
    json_out(['error' => 'Запрос отклонён'], 403);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'GET') {
    if (!client_logged_in()) {
        json_out(['ok' => true, 'authed' => false]);
    }
    $user = find_user(client_id());
    if ($user === null) {
        client_sign_out();
        json_out(['ok' => true, 'authed' => false]);
    }
    json_out(['ok' => true, 'authed' => true, 'user' => user_public($user)]);
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(['error' => 'Метод не поддерживается'], 405);
}

$body = read_json_body();
$action = (string) ($body['action'] ?? '');

switch ($action) {
    case 'register':
        $limit = rate_limit('client-register:' . ip_hash(), 6, 30);
        if (!$limit['allowed']) {
            json_out(['error' => 'Слишком много регистраций подряд. Попробуйте позже'], 429);
        }
        [$user, $error] = create_user($body);
        if ($error !== null || $user === null) {
            json_out(['error' => (string) $error], 400);
        }
        client_sign_in((string) $user['id']);
        json_out(['ok' => true, 'user' => user_public($user)]);

    case 'login':
        [$user, $error] = client_attempt_login(
            (string) ($body['email'] ?? ''),
            (string) ($body['password'] ?? ''),
        );
        if ($error !== null || $user === null) {
            json_out(['error' => (string) $error], 401);
        }
        client_sign_in((string) $user['id']);
        json_out(['ok' => true, 'user' => user_public($user)]);

    case 'logout':
        client_sign_out();
        json_out(['ok' => true, 'authed' => false]);

    default:
        json_out(['error' => 'Неизвестное действие'], 400);
}
