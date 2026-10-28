<?php
/**
 * Установка сайта: создание config.php и пароль для кабинета.
 *
 *   https://ваш-домен/setup.php
 *
 * 1. Если config.php ещё нет — страница создаёт его из config.example.php
 *    со случайными salt и setupToken.
 * 2. Затем задаётся пароль: хеш записывается прямо в config.php (если файл
 *    доступен для записи) либо показывается для копирования вручную.
 *
 * config.php НЕ входит в архив сайта, поэтому обновление сайта не сбрасывает
 * ни пароль, ни настройки. После настройки удалите setup.php с хостинга.
 */

declare(strict_types=1);

require_once __DIR__ . '/inc/bootstrap.php';

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

$configPath = APP_ROOT . '/config.php';

/** Пример конфигурации: в архиве он лежит в корне, в исходниках — в inc/. */
$examplePath = null;
foreach ([APP_ROOT . '/config.example.php', APP_ROOT . '/inc/config.example.php'] as $candidate) {
    if (is_file($candidate)) {
        $examplePath = $candidate;
        break;
    }
}

$hashConfigured = trim((string) cfg('owner.passwordHash', '')) !== '';
$configExists = is_file($configPath);
$configWritable = $configExists ? is_writable($configPath) : is_writable(APP_ROOT);
$expected = (string) cfg('security.setupToken', '');
$given = (string) ($_GET['token'] ?? '');
// Токен нужен только чтобы сменить уже заданный пароль.
$tokenGiven = $expected !== '' && $given !== '' && hash_equals($expected, $given);
$blocked = $hashConfigured && !$tokenGiven;

$message = null;
$error = null;
$hash = null;
$written = false;
$method = (string) ($_SERVER['REQUEST_METHOD'] ?? 'GET');

/** Атомарная замена содержимого config.php. */
$writeConfig = function (string $path, string $contents): bool {
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    if (@file_put_contents($tmp, $contents) === false) {
        return false;
    }
    @chmod($tmp, 0640);
    if (!@rename($tmp, $path)) {
        @unlink($tmp);
        return false;
    }
    return true;
};

/** Создание config.php из примера со случайными секретами. */
$createConfig = function (string $configPath, ?string $examplePath) use ($writeConfig): ?string {
    if (is_file($configPath)) {
        return 'config.php уже существует — файл не перезаписан.';
    }
    $example = $examplePath !== null ? @file_get_contents($examplePath) : false;
    if ($example === false) {
        return 'Не найден config.example.php: загрузите архив сайта заново.';
    }
    $contents = str_replace(
        ['__SALT__', '__SETUP_TOKEN__'],
        [bin2hex(random_bytes(24)), bin2hex(random_bytes(12))],
        $example
    );
    return $writeConfig($configPath, $contents) ? null : 'Нет прав на запись: создайте config.php вручную из config.example.php.';
};

/** Запись хеша пароля в config.php с сохранением остальных настроек. */
$savePasswordHash = function (string $configPath, string $hash) use ($writeConfig): bool {
    $contents = @file_get_contents($configPath);
    if ($contents === false) {
        return false;
    }
    $escaped = str_replace(['\\', "'"], ['\\\\', "\\'"], $hash);
    // ВАЖНО: хеш password_hash начинается с $2y$, а preg_replace трактует $2
    // как обратную ссылку и вырезает её. Поэтому заменяем через callback.
    $updated = preg_replace_callback(
        "/'passwordHash'\\s*=>\\s*'[^']*'/",
        static fn(array $m): string => "'passwordHash' => '" . $escaped . "'",
        $contents,
        1
    );
    if (!is_string($updated) || $updated === $contents) {
        return false;
    }
    return $writeConfig($configPath, $updated);
};

/* ------------------------------ Обработка ------------------------------ */

if ($method === 'POST') {
    $action = (string) ($_POST['action'] ?? '');

    if ($action === 'create') {
        if ($examplePath === null) {
            $error = 'Не найден config.example.php: загрузите архив сайта заново.';
        } else {
            $error = $createConfig($configPath, $examplePath);
            if ($error === null) {
                // Значения подхватятся со следующего запроса: конфиг кэшируется в памяти.
                header('Location: setup.php?created=1', true, 303);
                app_exit();
            }
        }
    } elseif ($action === 'password') {
        $password = (string) ($_POST['password'] ?? '');
        $repeat = (string) ($_POST['passwordRepeat'] ?? '');
        if (strlen($password) < 10) {
            $error = 'Пароль должен быть не короче 10 символов';
        } elseif ($password !== $repeat) {
            $error = 'Пароли не совпадают — введите одинаково в оба поля';
        } elseif (!is_file($configPath)) {
            $error = 'Сначала создайте config.php (кнопка выше).';
        } else {
            $hash = password_hash($password, PASSWORD_DEFAULT);
            if ($configWritable) {
                $written = $savePasswordHash($configPath, $hash);
            }
            $message = $written
                ? 'Пароль сохранён в config.php. Теперь удалите файл setup.php и войдите в кабинет.'
                : 'Скопируйте хеш ниже и вставьте его в config.php в поле passwordHash.';
        }
    }
}

if (($_GET['created'] ?? '') === '1') {
    $message = 'config.php создан. Осталось задать пароль.';
    $configExists = is_file($configPath);
    $configWritable = $configExists && is_writable($configPath);
}

if ($blocked) {
    http_response_code(403);
    echo '<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Настройка закрыта</title>'
        . '<style>body{font:15px/1.55 -apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#1f2a30;'
        . 'background:#f5f6f7;margin:0;padding:40px 18px}.box{max-width:640px;margin:0 auto;background:#fff;'
        . 'border:1px solid #dcdfe3;border-radius:12px;padding:22px}a{color:#1f5f6b}code{background:#f2f4f5;padding:1px 5px;border-radius:4px}</style>'
        . '</head><body><div class="box"><h1 style="font-size:20px;margin:0 0 8px">Пароль уже задан</h1>'
        . '<p>Чтобы сменить пароль: очистите <code>owner.passwordHash</code> в <code>config.php</code> '
        . 'или откройте <code>setup.php?token=…</code> (токен — <code>security.setupToken</code> в config.php).</p>'
        . '<p>Файл <code>setup.php</code> лучше удалить с хостинга — он больше не нужен.</p>'
        . '<p><a href="cabinet/">Войти в кабинет</a> · <a href="index.html">На сайт</a></p>'
        . '</div></body></html>';
    app_exit();
}
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Установка — пароль кабинета</title>
<style>
  body { font:15px/1.55 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; background:#f5f6f7; color:#1f2a30; margin:0; padding:36px 18px; }
  .box { max-width:680px; margin:0 auto; background:#fff; border:1px solid #dcdfe3; border-radius:12px; padding:22px; }
  h1 { font-size:21px; margin:0 0 4px; }
  p.lead { color:#68737b; margin:0 0 16px; }
  label { display:block; font-size:13px; color:#68737b; margin:12px 0 4px; }
  input { width:100%; box-sizing:border-box; padding:9px 11px; border:1px solid #c8ced3; border-radius:8px; font:inherit; }
  button { margin-top:14px; padding:10px 16px; border:1px solid #1f5f6b; background:#1f5f6b; color:#fff; border-radius:8px; font:inherit; cursor:pointer; }
  button.secondary { background:#fff; color:#1f5f6b; }
  code.hash { display:block; margin-top:10px; padding:10px; background:#fafbfb; border:1px solid #dcdfe3; border-radius:8px; word-break:break-all; font-size:13px; }
  .msg { padding:10px 12px; border-radius:8px; margin:12px 0; font-size:14px; }
  .ok { background:#e9f3ec; color:#2c5c40; }
  .err { background:#fdeeee; color:#8d4147; }
  .info { background:#eef4f5; color:#26545c; }
  .steps { font-size:14px; color:#4a545b; }
  ol { padding-left:20px; }
  a { color:#1f5f6b; }
</style>
</head>
<body>
<div class="box">
  <h1>Установка сайта</h1>
  <p class="lead">Два шага: конфигурация и пароль для кабинета. Оба делаются здесь, в браузере.</p>

  <?php if ($message !== null): ?>
    <div class="msg ok"><?= e($message) ?></div>
  <?php endif; ?>
  <?php if ($error !== null): ?>
    <div class="msg err"><?= e($error) ?></div>
  <?php endif; ?>

  <?php if (!$configExists): ?>
    <h2 style="font-size:16px;margin:16px 0 6px">Шаг 1. Создать config.php</h2>
    <p class="steps">Файла настроек ещё нет. Нажмите кнопку — он будет создан из
      <code>config.example.php</code> со случайными секретами (соль для лимитов и токен установки).
      Ничего вводить не нужно.</p>
    <?php if (!$configWritable): ?>
      <div class="msg err">Нет прав на запись в корень сайта, поэтому создать файл автоматически не получится.
        Скачайте <code>config.example.php</code>, переименуйте его в <code>config.php</code> и загрузите
        в <code>public_html</code> через файловый менеджер, затем обновите эту страницу.</div>
    <?php endif; ?>
    <form method="post">
      <input type="hidden" name="action" value="create">
      <button type="submit" <?= $configWritable ? '' : 'disabled' ?>>Создать config.php</button>
    </form>
  <?php elseif ($hashConfigured && !$tokenGiven): ?>
    <div class="msg info">Пароль уже задан. Чтобы сменить его, откройте <code>setup.php?token=…</code>
      (токен — <code>security.setupToken</code> в config.php) или очистите <code>passwordHash</code>.</div>
  <?php else: ?>
    <h2 style="font-size:16px;margin:16px 0 6px">Шаг 2. Пароль для кабинета</h2>
    <p class="steps">Минимум 10 символов. Это единственный пароль: логин — почта из <code>config.php</code>
      (<code>owner.email</code>). Хеш запишется в конфиг автоматически
      <?= $configWritable ? '' : 'не сможет записаться: файл закрыт от записи — тогда скопируйте его вручную' ?>.</p>
    <form method="post">
      <input type="hidden" name="action" value="password">
      <label for="password">Пароль</label>
      <input id="password" type="password" name="password" autocomplete="new-password" minlength="10" required>
      <label for="passwordRepeat">Повторите пароль</label>
      <input id="passwordRepeat" type="password" name="passwordRepeat" autocomplete="new-password" minlength="10" required>
      <button type="submit">Задать пароль</button>
    </form>

    <?php if ($hash !== null && !$written): ?>
      <p class="steps" style="margin-top:14px">Вставьте этот хеш в <code>config.php</code> в поле
        <code>'passwordHash' => ''</code> и сохраните:</p>
      <code class="hash"><?= e($hash) ?></code>
      <ol>
        <li>Файловый менеджер → <code>config.php</code> → «Редактировать».</li>
        <li>Найдите строку <code>'passwordHash' => '',</code> и вставьте хеш вместо пустых кавычек.</li>
        <li>Сохраните файл и обновите эту страницу.</li>
      </ol>
    <?php endif; ?>
  <?php endif; ?>

  <hr style="border:0;border-top:1px solid #e6e9eb;margin:20px 0 14px">
  <p class="steps" style="margin:0">
    <?php if ($hashConfigured || $written): ?>
      <strong>Готово.</strong> Удалите файл <code>setup.php</code> с хостинга и войдите в
      <a href="cabinet/">кабинет</a>. Проверить установку целиком: <a href="check.php">check.php</a>.
    <?php else: ?>
      Проверить состояние сайта можно на странице <a href="check.php">check.php</a>.
      Файл <code>setup.php</code> удалите сразу после настройки.
    <?php endif; ?>
  </p>
</div>
</body>
</html>
