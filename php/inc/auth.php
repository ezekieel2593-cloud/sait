<?php
/**
 * Авторизация владельца в кабинете.
 * Один аккаунт: e-mail и хеш пароля (password_hash) в config.php.
 * Сессия — PHP session с httpOnly/SameSite cookie, вход ограничен по попыткам.
 */

declare(strict_types=1);

function session_start_once(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => is_https(),
    ]);
    session_name('astra_cabinet');
    session_start();
}

function is_logged_in(): bool
{
    session_start_once();
    if (empty($_SESSION['owner']) || empty($_SESSION['expires'])) {
        return false;
    }
    if ((int) $_SESSION['expires'] < time()) {
        session_destroy();
        return false;
    }
    // Скользящее продление сессии
    $_SESSION['expires'] = time() + 12 * 3600;
    return true;
}

function attempt_login(string $email, string $password): array
{
    session_start_once();
    $ownerEmail = trim((string) cfg('owner.email', ''));
    $hash = (string) cfg('owner.passwordHash', '');

    if ($ownerEmail === '' || $hash === '') {
        return ['ok' => false, 'error' => 'Владелец ещё не настроил вход: заполните owner в config.php (см. setup.php).'];
    }

    $limit = rate_limit('login:' . ip_hash(), (int) cfg('limits.loginAttempts', 6), (int) cfg('limits.lockMinutes', 15));
    if (!$limit['allowed']) {
        return ['ok' => false, 'error' => 'Слишком много попыток входа. Попробуйте через 15 минут.'];
    }

    $emailMatches = safe_lower(trim($email)) === safe_lower($ownerEmail);
    $passwordMatches = password_verify($password, $hash);

    if (!$emailMatches || !$passwordMatches) {
        return ['ok' => false, 'error' => 'Неверная почта или пароль.'];
    }

    session_regenerate_id(true);
    $_SESSION['owner'] = $ownerEmail;
    $_SESSION['expires'] = time() + 12 * 3600;
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    return ['ok' => true];
}

function logout(): void
{
    session_start_once();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'] ?? '', (bool) ($params['secure'] ?? false), (bool) ($params['httponly'] ?? true));
    }
    session_destroy();
}

function require_login(): void
{
    if (!is_logged_in()) {
        header('Location: index.php', true, 303);
        app_exit();
    }
}

function csrf_token(): string
{
    session_start_once();
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}

function csrf_valid(?string $token): bool
{
    session_start_once();
    return is_string($token) && !empty($_SESSION['csrf']) && hash_equals((string) $_SESSION['csrf'], $token);
}

/** Заголовки для страниц кабинета: без индексации и кэша. */
function cabinet_headers(): void
{
    header('X-Robots-Tag: noindex, nofollow, noarchive');
    header('X-Frame-Options: DENY');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: no-referrer');
    header('Cache-Control: no-store, max-age=0');
}
