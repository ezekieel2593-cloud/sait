<?php
/**
 * Клиенты портала: регистрация, профили, подписки, библиотека PDF, тарифы.
 *
 * Хранилище — файлы в data/ (как заявки): data/users.php, data/people.php,
 * data/library.php, data/tariffs.php. На shared-хостинге базы не нужны.
 *
 * Клиентская сессия отдельная от кабинета специалиста (имя astra_client),
 * чтобы вход клиента и вход владельца не мешали друг другу.
 */

declare(strict_types=1);

const CLIENT_SESSION_NAME = 'astra_client';
const CLIENT_SESSION_LIFETIME = 60 * 60 * 24 * 30; // 30 дней

const DEFAULT_TARIFFS = [
    'subscription' => [
        'title' => 'Полный доступ',
        'price' => 990,
        'period' => 'месяц',
        'note' => 'Все скрытые разделы по астрологии, матрице и чакрам + ежедневные прогнозы.',
    ],
    'pdfs' => [
        ['id' => 'moon-code', 'title' => 'Полный Лунный код', 'price' => 499, 'description' => 'Лунный ритм, эмоциональные опоры и практики самонаблюдения.'],
        ['id' => 'matrix-money-love', 'title' => 'Матрица денег и отношений', 'price' => 790, 'description' => 'Денежный канал, канал отношений и родовые программы по дате рождения.'],
        ['id' => 'year-forecast', 'title' => 'Личный прогноз на год', 'price' => 1290, 'description' => 'Тематический обзор личного года и календарь для планирования.'],
    ],
    'consultation' => [
        'price' => 5000,
        'themes' => ['Натальная карта', 'Матрица судьбы', 'Чакры и энергия', 'Совместимость'],
    ],
];

function client_session_start(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $sessionDir = APP_ROOT . '/data/sessions';
    if (!is_dir($sessionDir)) {
        @mkdir($sessionDir, 0775, true);
    }
    if (is_dir($sessionDir) && is_writable($sessionDir)) {
        @session_save_path($sessionDir);
    }
    session_set_cookie_params([
        'lifetime' => CLIENT_SESSION_LIFETIME,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => is_https(),
    ]);
    session_name(CLIENT_SESSION_NAME);
    session_start();
}

function client_logged_in(): bool
{
    client_session_start();
    if (empty($_SESSION['client']) || empty($_SESSION['clientExpires'])) {
        return false;
    }
    if ((int) $_SESSION['clientExpires'] < time()) {
        unset($_SESSION['client'], $_SESSION['clientExpires']);
        session_regenerate_id(true);
        return false;
    }
    return true;
}

function client_id(): string
{
    return (string) ($_SESSION['client'] ?? '');
}

function client_sign_in(string $userId): void
{
    client_session_start();
    session_regenerate_id(true);
    $_SESSION['client'] = $userId;
    $_SESSION['clientExpires'] = time() + CLIENT_SESSION_LIFETIME;
}

function client_sign_out(): void
{
    client_session_start();
    unset($_SESSION['client'], $_SESSION['clientExpires']);
}

/* ------------------------------- Пользователи ---------------------------- */

function all_users(): array
{
    $state = data_read('users');
    return is_array($state['items'] ?? null) ? $state['items'] : [];
}

function find_user(string $id): ?array
{
    foreach (all_users() as $user) {
        if (($user['id'] ?? '') === $id) {
            return $user;
        }
    }
    return null;
}

function find_user_by_email(string $email): ?array
{
    $needle = safe_lower(trim($email));
    foreach (all_users() as $user) {
        if (safe_lower((string) ($user['email'] ?? '')) === $needle) {
            return $user;
        }
    }
    return null;
}

/** Публичное представление клиента: без хеша пароля. */
function user_public(array $user): array
{
    return [
        'id' => (string) ($user['id'] ?? ''),
        'name' => (string) ($user['name'] ?? ''),
        'email' => (string) ($user['email'] ?? ''),
        'telegram' => (string) ($user['telegram'] ?? ''),
        'birthday' => (string) ($user['birthday'] ?? ''),
        'birthTime' => (string) ($user['birthTime'] ?? ''),
        'birthPlace' => (string) ($user['birthPlace'] ?? ''),
        'onboarding' => $user['onboarding'] ?? null,
        'subscriptionUntil' => $user['subscriptionUntil'] ?? null,
        'subscribed' => subscription_active($user),
        'createdAt' => (string) ($user['createdAt'] ?? ''),
    ];
}

function subscription_active(array $user): bool
{
    $until = (string) ($user['subscriptionUntil'] ?? '');
    if ($until === '') {
        return false;
    }
    return $until >= gmdate('Y-m-d');
}

function user_mutate(string $id, callable $mutator): ?array
{
    return data_mutate('users', function (array $state) use ($id, $mutator) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        foreach ($items as $index => $user) {
            if (($user['id'] ?? '') !== $id) {
                continue;
            }
            $updated = $mutator($user);
            if (is_array($updated)) {
                $items[$index] = $updated;
                $state['items'] = $items;
                return [$state, $updated];
            }
            return [$state, null];
        }
        return [$state, null];
    });
}

/** Регистрация: возвращает [пользователь, ошибка]. */
function create_user(array $input): array
{
    $email = trim((string) ($input['email'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || str_len($email) > 160) {
        return [null, 'Укажите корректный email'];
    }
    if (str_len($password) < 8) {
        return [null, 'Пароль — минимум 8 символов'];
    }
    if (find_user_by_email($email) !== null) {
        return [null, 'Пользователь с таким email уже зарегистрирован'];
    }
    $user = [
        'id' => 'u_' . bin2hex(random_bytes(8)),
        'name' => str_cut(trim((string) ($input['name'] ?? '')), 80),
        'email' => $email,
        'telegram' => str_cut(trim((string) ($input['telegram'] ?? '')), 60),
        'birthday' => (string) ($input['birthday'] ?? ''),
        'birthTime' => '',
        'birthPlace' => '',
        'passHash' => password_hash($password, PASSWORD_DEFAULT),
        'subscriptionUntil' => null,
        'onboarding' => null,
        'createdAt' => now_iso(),
    ];
    data_mutate('users', function (array $state) use ($user) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        $items[] = $user;
        $state['items'] = $items;
        return [$state, true];
    });
    return [$user, null];
}

function client_attempt_login(string $email, string $password): array
{
    $limit = rate_limit('client-login:' . ip_hash(), 10, 15);
    if (!$limit['allowed']) {
        return [null, 'Слишком много попыток входа. Подождите немного и попробуйте снова'];
    }
    $user = find_user_by_email($email);
    if ($user === null || !password_verify($password, (string) ($user['passHash'] ?? ''))) {
        return [null, 'Неверный email или пароль'];
    }
    return [$user, null];
}

/* --------------------------------- Люди --------------------------------- */

function all_people(string $userId): array
{
    $state = data_read('people');
    $items = is_array($state['items'] ?? null) ? $state['items'] : [];
    return array_values(array_filter(
        $items,
        static fn(array $row): bool => ($row['userId'] ?? '') === $userId,
    ));
}

function create_person(string $userId, array $input): array
{
    $person = [
        'id' => 'p_' . bin2hex(random_bytes(8)),
        'userId' => $userId,
        'name' => str_cut(trim((string) ($input['name'] ?? '')), 80),
        'relation' => str_cut(trim((string) ($input['relation'] ?? 'Я')), 40),
        'birthday' => (string) ($input['birthday'] ?? ''),
        'birthTime' => str_cut(trim((string) ($input['birthTime'] ?? '')), 5),
        'birthPlace' => str_cut(trim((string) ($input['birthPlace'] ?? '')), 120),
        'createdAt' => now_iso(),
    ];
    if ($person['name'] === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $person['birthday'])) {
        return [null, 'Укажите имя и дату рождения'];
    }
    data_mutate('people', function (array $state) use ($person) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        $items[] = $person;
        $state['items'] = $items;
        return [$state, true];
    });
    return [$person, null];
}

function delete_person(string $userId, string $personId): bool
{
    return (bool) data_mutate('people', function (array $state) use ($userId, $personId) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        $kept = array_values(array_filter(
            $items,
            static fn(array $row): bool => !(($row['userId'] ?? '') === $userId && ($row['id'] ?? '') === $personId),
        ));
        if (count($kept) === count($items)) {
            return [$state, false];
        }
        $state['items'] = $kept;
        return [$state, true];
    });
}

/* ------------------------------ Библиотека PDF --------------------------- */

function library_dir(string $userId): string
{
    return data_dir() . '/library/' . $userId;
}

function all_library(string $userId): array
{
    $state = data_read('library');
    $items = is_array($state['items'] ?? null) ? $state['items'] : [];
    return array_values(array_filter(
        $items,
        static fn(array $row): bool => ($row['userId'] ?? '') === $userId,
    ));
}

function find_library_item(string $userId, string $itemId): ?array
{
    foreach (all_library($userId) as $item) {
        if (($item['id'] ?? '') === $itemId) {
            return $item;
        }
    }
    return null;
}

/** Добавляет загруженный специалистом PDF в полку клиента. */
function add_library_item(string $userId, string $title, string $tmpPath, string $originalName): array
{
    $dir = library_dir($userId);
    if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
        return [null, 'Не удалось создать папку библиотеки — проверьте права на data/'];
    }
    $safe = preg_replace('/[^a-z0-9_-]+/', '-', strtolower((string) preg_replace('/\.pdf$/i', '', $originalName)));
    $safe = trim((string) $safe, '-');
    if ($safe === '') {
        $safe = 'guide';
    }
    $file = $safe . '-' . substr(bin2hex(random_bytes(4)), 0, 6) . '.pdf';
    if (!@move_uploaded_file($tmpPath, $dir . '/' . $file) && !@rename($tmpPath, $dir . '/' . $file)) {
        return [null, 'Не удалось сохранить файл'];
    }
    $item = [
        'id' => 'pdf_' . bin2hex(random_bytes(6)),
        'userId' => $userId,
        'title' => str_cut(trim($title) !== '' ? trim($title) : $originalName, 120),
        'file' => $file,
        'size' => (int) filesize($dir . '/' . $file),
        'createdAt' => now_iso(),
    ];
    data_mutate('library', function (array $state) use ($item) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        $items[] = $item;
        $state['items'] = $items;
        return [$state, true];
    });
    return [$item, null];
}

function delete_library_item(string $userId, string $itemId): bool
{
    return (bool) data_mutate('library', function (array $state) use ($userId, $itemId) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        $kept = [];
        $removed = false;
        foreach ($items as $item) {
            if (($item['userId'] ?? '') === $userId && ($item['id'] ?? '') === $itemId) {
                $removed = true;
                @unlink(library_dir($userId) . '/' . (string) ($item['file'] ?? ''));
                continue;
            }
            $kept[] = $item;
        }
        $state['items'] = $kept;
        return [$state, $removed];
    });
}

/* --------------------------------- Тарифы -------------------------------- */

function get_tariffs(): array
{
    $stored = data_read('tariffs');
    $tariffs = DEFAULT_TARIFFS;
    foreach (['subscription', 'consultation'] as $key) {
        if (is_array($stored[$key] ?? null)) {
            $tariffs[$key] = array_merge($tariffs[$key], $stored[$key]);
        }
    }
    if (is_array($stored['pdfs'] ?? null) && $stored['pdfs'] !== []) {
        $tariffs['pdfs'] = $stored['pdfs'];
    }
    return $tariffs;
}

function save_tariffs(array $input): void
{
    data_write('tariffs', [
        'subscription' => $input['subscription'] ?? [],
        'pdfs' => $input['pdfs'] ?? [],
        'consultation' => $input['consultation'] ?? [],
        'updatedAt' => now_iso(),
    ]);
}
