<?php
/**
 * Базовый слой приложения: конфигурация, утилиты, ответы JSON.
 *
 * Версия для обычного хостинга с PHP (SpaceWeb и подобные).
 * Не требует Composer, фреймворков и базы данных: заявки хранятся в файле
 * внутри каталога data/ (файл закрыт от прямого доступа).
 *
 * Требования: PHP 8.0+ с расширениями json, session, mbstring (желательно).
 * Для отправки в Telegram нужен curl или включённый allow_url_fopen.
 */

declare(strict_types=1);

const APP_VERSION = '1.0.0';

define('APP_ROOT', dirname(__DIR__));

/** Загруженная конфигурация сайта и серверных секретов. */
function app_config(): array
{
    static $config = null;
    if ($config !== null) {
        return $config;
    }

    $file = APP_ROOT . '/config.php';
    $defaults = [
        'siteName' => 'Astra Pearl',
        'siteUrl' => '',
        'owner' => ['email' => '', 'passwordHash' => ''],
        'telegram' => ['botToken' => '', 'chatId' => ''],
        'mail' => ['adminEmail' => '', 'from' => '', 'subjectPrefix' => 'Заявка с сайта'],
        'security' => ['salt' => '', 'setupToken' => '', 'allowInsecureCookie' => false],
        'limits' => ['leadsPerWindow' => 5, 'windowMinutes' => 15, 'loginAttempts' => 6, 'lockMinutes' => 15],
        'retentionDays' => 365,
        'timezoneOffsetHours' => 3,
    ];

    if (!is_file($file)) {
        $config = $defaults;
        return $config;
    }

    /** @var mixed $loaded config.php возвращает массив */
    $loaded = include $file;
    if (!is_array($loaded)) {
        $config = $defaults;
        return $config;
    }

    $config = array_replace_recursive($defaults, $loaded);
    return $config;
}

function cfg(string $path, $default = null)
{
    $value = app_config();
    foreach (explode('.', $path) as $key) {
        if (!is_array($value) || !array_key_exists($key, $value)) {
            return $default;
        }
        $value = $value[$key];
    }
    return $value;
}

/** Путь к файлу данных. Файлы с расширением .php закрыты от чтения снаружи. */
function data_path(string $name): string
{
    $dir = APP_ROOT . '/data';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }
    return $dir . '/' . $name . '.php';
}

/**
 * Чтение защищённого файла данных.
 * Первая строка файла — `<?php exit; ?>`, поэтому при прямом обращении
 * браузер получит пустой ответ даже если .htaccess не поддерживается.
 */
function data_read(string $name): array
{
    $path = data_path($name);
    if (!is_file($path)) {
        return [];
    }
    $raw = file_get_contents($path);
    if ($raw === false) {
        return [];
    }
    $raw = preg_replace('/^<\?php exit; \?>\s*/', '', $raw, 1) ?? $raw;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/** Атомарная запись: сначала во временный файл, затем rename. */
function data_write(string $name, array $payload): bool
{
    $path = data_path($name);
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (file_put_contents($tmp, "<?php exit; ?>\n" . $json) === false) {
        return false;
    }
    @chmod($tmp, 0664);
    return rename($tmp, $path);
}

/**
 * Монопольная модификация данных: открываем lock-файл, читаем, меняем, пишем.
 * Возвращает то, что вернул callback.
 */
function data_mutate(string $name, callable $mutator)
{
    $lockPath = APP_ROOT . '/data/' . $name . '.lock';
    if (!is_dir(dirname($lockPath))) {
        mkdir(dirname($lockPath), 0775, true);
    }
    $handle = fopen($lockPath, 'c');
    if ($handle === false) {
        throw new RuntimeException('Не удалось открыть файл блокировки');
    }
    try {
        if (!flock($handle, LOCK_EX)) {
            throw new RuntimeException('Не удалось заблокировать данные');
        }
        $current = data_read($name);
        [$next, $result] = $mutator($current);
        data_write($name, $next);
        return $result;
    } finally {
        flock($handle, LOCK_UN);
        fclose($handle);
    }
}

function now_iso(): string
{
    return gmdate('Y-m-d\TH:i:s\Z');
}

function e($value): string
{
    return htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function safe_lower(string $value): string
{
    if (function_exists('mb_strtolower')) {
        return mb_strtolower($value, 'UTF-8');
    }
    return strtolower($value);
}

function str_len(string $value): int
{
    if (function_exists('mb_strlen')) {
        return mb_strlen($value, 'UTF-8');
    }
    return strlen($value);
}

function str_cut(string $value, int $limit): string
{
    if (function_exists('mb_substr')) {
        return mb_substr($value, 0, $limit, 'UTF-8');
    }
    return substr($value, 0, $limit);
}

function is_https(): bool
{
    if (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') {
        return true;
    }
    $proto = $_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '';
    return is_string($proto) && strtolower($proto) === 'https';
}

function client_ip(): string
{
    $forwarded = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? '';
    if (is_string($forwarded) && $forwarded !== '') {
        return trim(explode(',', $forwarded)[0]);
    }
    return (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown');
}

/** В журналах и лимитах храним только необратимый хеш IP. */
function ip_hash(): string
{
    $salt = (string) cfg('security.salt', 'astra');
    return substr(hash('sha256', client_ip() . '|' . $salt), 0, 24);
}

function host_is_same_origin(): bool
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (!is_string($origin) || $origin === '') {
        return true; // небраузерные клиенты (curl) не получают cookie автоматически
    }
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $parsedHost = parse_url($origin, PHP_URL_HOST);
    $parsedPort = parse_url($origin, PHP_URL_PORT);
    $originHost = $parsedHost . ($parsedPort ? ':' . $parsedPort : '');
    return is_string($parsedHost) && (
        $originHost === $host
        || $parsedHost === preg_replace('/:\d+$/', '', (string) $host)
        || $originHost === preg_replace('/:\d+$/', '', (string) $host)
    );
}

/**
 * Завершение запроса.
 *
 * Единственная точка выхода: в CLI-проверках (php-wasm) вместо exit бросается
 * исключение, потому что встроенный SAPI после exit не продолжает работу.
 */
function app_exit(string $message = ''): void
{
    if ($message !== '') {
        echo $message;
    }
    if (defined('APP_TEST_NO_EXIT')) {
        throw new \RuntimeException('app_exit');
    }
    exit;
}

function json_out(array $payload, int $status = 200): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store');
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    app_exit();
}

function read_json_body(): array
{
    // В CLI-проверках поток php://input недоступен — тело подставляется из глобальной переменной.
    if (isset($GLOBALS['APP_TEST_INPUT']) && is_string($GLOBALS['APP_TEST_INPUT'])) {
        $raw = $GLOBALS['APP_TEST_INPUT'];
    } elseif (defined('APP_TEST_INPUT')) {
        $raw = (string) APP_TEST_INPUT;
    } else {
        $raw = (string) file_get_contents('php://input');
    }
    if (trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/** Простой ограничитель частоты на файле. */
function rate_limit(string $key, int $limit, int $windowMinutes): array
{
    $window = $windowMinutes * 60;
    $now = time();
    $result = ['allowed' => true, 'remaining' => $limit];

    data_mutate('limits', function (array $state) use ($key, $limit, $window, $now, &$result, $windowMinutes) {
        $entries = is_array($state[$key] ?? null) ? $state[$key] : [];
        $fresh = array_values(array_filter($entries, fn($ts) => is_int($ts) && $ts > $now - $window));
        if (count($fresh) >= $limit) {
            $result['allowed'] = false;
            $result['remaining'] = 0;
            $result['retryAfter'] = max(1, ($fresh[0] + $window) - $now) / 60;
            $state[$key] = $fresh;
            return [$state, null];
        }
        $fresh[] = $now;
        $state[$key] = $fresh;

        // Чистим старые ключи, чтобы файл не рос бесконечно
        foreach ($state as $name => $timestamps) {
            if (!is_array($timestamps)) {
                unset($state[$name]);
                continue;
            }
            $alive = array_values(array_filter($timestamps, fn($ts) => is_int($ts) && $ts > $now - max($window, $windowMinutes * 60)));
            if ($alive === []) {
                unset($state[$name]);
            } else {
                $state[$name] = $alive;
            }
        }

        $result['remaining'] = max(0, $limit - count($fresh));
        return [$state, null];
    });

    return $result;
}

/** Проверка контакта по каналу — те же правила, что в клиентской форме. */
function validate_contact(string $channel, string $value): ?string
{
    $trimmed = trim($value);
    if ($trimmed === '') {
        return 'Укажите контакт для связи';
    }
    $emailRe = '/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/';
    $tgRe = '/^@?[a-zA-Z][a-zA-Z0-9_]{4,31}$/';
    $phoneRe = '/^\+?[0-9\s()\-]{7,20}$/';

    if ($channel === 'email') {
        return preg_match($emailRe, $trimmed) ? null : 'Проверьте адрес электронной почты';
    }
    if ($channel === 'telegram') {
        if (preg_match($tgRe, $trimmed) || preg_match($phoneRe, $trimmed)) {
            return null;
        }
        return 'Укажите @username в Telegram или номер телефона';
    }
    if (preg_match($phoneRe, $trimmed) || preg_match($tgRe, $trimmed)) {
        return null;
    }
    return 'Укажите номер телефона или username в MAX';
}
