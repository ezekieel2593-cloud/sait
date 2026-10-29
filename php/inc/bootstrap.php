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

/*
 * Служебные сообщения PHP (warning, notice, deprecated) не должны попадать
 * в браузер: они ломают JSON-ответ API и раскрывают пути на сервере.
 * Пишем их в журнал ошибок хостинга. APP_DEBUG=true включает вывод локально.
 */
error_reporting(E_ALL);
ini_set('display_errors', defined('APP_DEBUG') && APP_DEBUG ? '1' : '0');
ini_set('log_errors', '1');

/**
 * Непойманная ошибка не должна превращаться в белый экран или в «успешный» ответ.
 * Для /api/ отдаём JSON, для остальных страниц — короткую понятную страницу.
 */
set_exception_handler(static function (Throwable $error): void {
    error_log('astra: ' . $error->getMessage() . ' в ' . $error->getFile() . ':' . $error->getLine());
    if (!headers_sent()) {
        http_response_code(500);
        header('X-Robots-Tag: noindex, nofollow');
    }
    $uri = (string) ($_SERVER['REQUEST_URI'] ?? '');
    if (strpos($uri, '/api/') !== false) {
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
            header('Cache-Control: no-store');
        }
        echo json_encode(
            ['error' => 'Внутренняя ошибка сервера. Попробуйте отправить ещё раз позже.'],
            JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES
        );
        return;
    }
    header('Content-Type: text/html; charset=utf-8');
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8">'
        . '<meta name="viewport" content="width=device-width, initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>Ошибка сервера</title>'
        . '<style>body{font:15px/1.55 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2a30;'
        . 'background:#f5f6f7;margin:0;padding:48px 18px}main{max-width:560px;margin:0 auto;background:#fff;'
        . 'border:1px solid #dcdfe3;border-radius:12px;padding:22px}h1{font-size:20px;margin:0 0 8px}'
        . 'p{color:#4a545b;margin:8px 0}a{color:#1f5f6b}</style></head><body><main>'
        . '<h1>Ошибка сервера</h1>'
        . '<p>Запрос не выполнен. Данные не сохранены — повторите попытку через минуту.</p>'
        . '<p>Если ошибка повторяется, проверьте права на папку <code>data/</code> '
        . 'и версию PHP (нужна 8.0 или новее).</p>'
        . '<p><a href="/">На главную</a></p></main></body></html>';
});

define('APP_ROOT', dirname(__DIR__));

/** Загруженная конфигурация сайта и серверных секретов. */
function app_config(bool $reload = false): array
{
    static $config = null;
    if ($reload) {
        $config = null;
    }
    if ($config !== null) {
        return $config;
    }

    $file = APP_ROOT . '/config.php';
    $defaults = [
        'siteName' => 'Жемчужина',
        'siteUrl' => '',
        'owner' => ['login' => 'Adelina', 'email' => '', 'passwordHash' => ''],
        'telegram' => ['botToken' => '', 'chatId' => ''],
        'mail' => ['adminEmail' => '', 'from' => '', 'subjectPrefix' => 'Заявка с сайта'],
        'security' => ['salt' => '', 'setupToken' => '', 'allowInsecureCookie' => false, 'allowDefaultLogin' => true],
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

/** Каталог данных. Создаётся при первой записи, права 0775. */
function data_dir(): string
{
    $dir = APP_ROOT . '/data';
    if (!is_dir($dir)) {
        @mkdir($dir, 0775, true);
    }
    return $dir;
}

function data_path(string $name): string
{
    return data_dir() . '/' . $name . '.php';
}

/** Можно ли писать в каталог данных: кабинет показывает предупреждение, если нет. */
function data_writable(): bool
{
    $dir = data_dir();
    return is_dir($dir) && is_writable($dir);
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
    $raw = @file_get_contents($path);
    if ($raw === false) {
        return [];
    }
    $raw = preg_replace('/^<\?php exit; \?>\s*/', '', $raw, 1) ?? $raw;
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

/**
 * Атомарная запись: сначала во временный файл, затем rename.
 * Возвращает false, если записать не удалось — вызывающий код обязан
 * сообщить об ошибке, а не показывать «успешно сохранено».
 */
function data_write(string $name, array $payload): bool
{
    $path = data_path($name);
    $json = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, "<?php exit; ?>\n" . $json) === false) {
        return false;
    }
    @chmod($tmp, 0664);
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

/**
 * Монопольная модификация данных: блокировка, чтение, изменение, запись.
 * Если запись не удалась — исключение: молча «терять» заявку нельзя.
 */
function data_mutate(string $name, callable $mutator)
{
    $dir = data_dir();
    if (!is_dir($dir) || !is_writable($dir)) {
        throw new RuntimeException('Каталог data/ недоступен для записи');
    }
    $lockPath = $dir . '/' . $name . '.lock';
    $handle = @fopen($lockPath, 'c');
    if ($handle === false) {
        throw new RuntimeException('Не удалось открыть файл блокировки');
    }
    try {
        if (!flock($handle, LOCK_EX)) {
            throw new RuntimeException('Не удалось заблокировать данные');
        }
        $current = data_read($name);
        [$next, $result] = $mutator($current);
        if (!data_write($name, $next)) {
            throw new RuntimeException('Не удалось записать данные');
        }
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
