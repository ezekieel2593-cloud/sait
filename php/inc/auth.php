<?php
/**
 * Авторизация владельца в кабинете.
 * Один аккаунт: логин (owner.login), почта (owner.email) и хеш пароля в config.php.
 * Войти можно по логину или по почте — что удобнее.
 * Сессия — PHP session с httpOnly/SameSite cookie, вход ограничен по попыткам.
 */

declare(strict_types=1);

/**
 * Логин и пароль владельца по умолчанию.
 *
 * Работают всегда — даже если config.php пуст, потерян или в нём не записан
 * хеш. Владелец не должен остаться без доступа к кабинету из-за одного
 * отсутствующего поля. Пароль по умолчанию виден в инструкции, поэтому
 * кабинет напоминает о смене, а setup.php записывает свой хеш.
 */
const DEFAULT_OWNER_LOGIN = 'Adelina';
const DEFAULT_OWNER_PASSWORD = 'astrolog';
/** password_hash('astrolog') — тот же хеш, что в config.example.php. */
const DEFAULT_OWNER_HASH = '$2y$12$IneZ2FGb4oXdF5KJCLFYVeGtxfZr/MX/wR7TAydNU9s1nf3by2aSS';

function session_start_once(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    // На shared-хостинге системная папка сессий бывает недоступна на запись:
    // тогда вход «проходит», но сессия теряется и кабинет снова просит пароль.
    // Держим сессии в data/sessions (папка закрыта .htaccess от браузера).
    $sessionDir = APP_ROOT . '/data/sessions';
    if (!is_dir($sessionDir)) {
        @mkdir($sessionDir, 0775, true);
    }
    if (is_dir($sessionDir) && is_writable($sessionDir)) {
        @session_save_path($sessionDir);
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

/** Хеш пароля из config.php (пустая строка — если владелец его ещё не задал). */
function login_hash(): string
{
    return trim((string) cfg('owner.passwordHash', ''));
}

function login_name(): string
{
    $login = trim((string) cfg('owner.login', ''));
    return $login !== '' ? $login : DEFAULT_OWNER_LOGIN;
}

/**
 * Принимается ли вход по встроенным данным (Adelina / astrolog).
 *
 * По умолчанию — да: владелец не должен остаться без кабинета из-за забытого
 * пароля или старого config.php. Выключается одной строкой в config.php:
 *
 *   'security' => ['allowDefaultLogin' => false],
 */
function login_allow_default(): bool
{
    return (bool) cfg('security.allowDefaultLogin', true);
}

/** Подходит ли встроенный пароль к текущему конфигу. */
function login_using_default(): bool
{
    return login_allow_default();
}

function attempt_login(string $identity, string $password): array
{
    session_start_once();
    if (session_status() !== PHP_SESSION_ACTIVE) {
        return ['ok' => false, 'error' => 'Не удалось начать сессию на хостинге. Проверьте права на папку data/ (775) и откройте check.php.'];
    }

    $ownerLogin = login_name();
    $ownerEmail = trim((string) cfg('owner.email', ''));
    $hash = login_hash();
    if ($hash === '' && !login_allow_default()) {
        return ['ok' => false, 'error' => 'Вход не настроен: задайте пароль на странице setup.php.'];
    }

    $limit = rate_limit('login:' . ip_hash(), (int) cfg('limits.loginAttempts', 6), (int) cfg('limits.lockMinutes', 15));
    if (!$limit['allowed']) {
        return ['ok' => false, 'error' => 'Слишком много попыток входа. Попробуйте через 15 минут.'];
    }

    $given = trim($identity);
    $identityMatches = false;
    if ($ownerLogin !== '' && safe_lower($given) === safe_lower($ownerLogin)) {
        $identityMatches = true;
    }
    if ($ownerEmail !== '' && safe_lower($given) === safe_lower($ownerEmail)) {
        $identityMatches = true;
    }
    // Встроенный логин тоже принимаем: config.php мог остаться от старой версии.
    if (safe_lower($given) === safe_lower(DEFAULT_OWNER_LOGIN)) {
        $identityMatches = true;
    }
    // Подходит либо свой пароль из config.php, либо встроенный — пока владелец
    // не выключил его строкой 'allowDefaultLogin' => false.
    $passwordMatches = $hash !== '' && password_verify($password, $hash);
    if (!$passwordMatches && login_allow_default()) {
        $passwordMatches = password_verify($password, DEFAULT_OWNER_HASH);
    }

    if (!$identityMatches || !$passwordMatches) {
        return ['ok' => false, 'error' => 'Неверный логин или пароль.'];
    }

    session_regenerate_id(true);
    $_SESSION['owner'] = $ownerLogin !== '' ? $ownerLogin : DEFAULT_OWNER_LOGIN;
    $_SESSION['expires'] = time() + 12 * 3600;
    $_SESSION['csrf'] = bin2hex(random_bytes(16));
    // Записываем сессию на диск сразу: если PHP не успеет закрыть её при
    // редиректе, вход всё равно сохранится.
    session_write_close();
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
