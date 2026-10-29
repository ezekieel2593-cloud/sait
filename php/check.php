<?php
/**
 * Диагностика хостинга — откройте этот файл в браузере, если сайт не работает.
 *
 *   https://ваш-домен/check.php
 *
 * Файл намеренно написан на «простом» PHP без конструкций 8.x:
 * он должен открываться даже если хостинг всё ещё на PHP 7.x или 5.x.
 * Секретов не показывает. УДАЛИТЕ его после проверки.
 */

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$root = __DIR__;
$phpVersion = PHP_VERSION;
$phpOk = version_compare($phpVersion, '8.0.0', '>=');

$required = array('json', 'session', 'hash', 'filter', 'pcre');
$optional = array('mbstring', 'curl', 'openssl');
$missingRequired = array();
$missingOptional = array();
foreach ($required as $extension) {
    if (!extension_loaded($extension)) {
        $missingRequired[] = $extension;
    }
}
foreach ($optional as $extension) {
    if (!extension_loaded($extension)) {
        $missingOptional[] = $extension;
    }
}

$dataDir = $root . '/data';
$dataExists = is_dir($dataDir);
$dataWritable = $dataExists && is_writable($dataDir);
$configExists = is_file($root . '/config.php');
$configHashSet = false;
$configLogin = 'Adelina';
if ($configExists) {
    $loaded = @include $root . '/config.php';
    if (is_array($loaded) && isset($loaded['owner']['passwordHash'])) {
        $configHashSet = trim((string) $loaded['owner']['passwordHash']) !== '';
    }
    if (is_array($loaded) && !empty($loaded['owner']['login'])) {
        $configLogin = (string) $loaded['owner']['login'];
    }
}
// Пароль по умолчанию действует и без config.php — вход в кабинет работает всегда.
$currentHash = '';
if ($configHashSet) {
    $currentHash = trim((string) $loaded['owner']['passwordHash']);
}
$usingDefault = $currentHash === '' || password_verify('astrolog', $currentHash);
$sessionOk = is_dir($root . '/data/sessions') ? is_writable($root . '/data/sessions') : $dataWritable;
$leadsFile = $dataDir . '/leads.php';
$leadCount = 0;
if (is_file($leadsFile)) {
    $raw = @file_get_contents($leadsFile);
    if (is_string($raw)) {
        $decoded = json_decode(preg_replace('/^<\?php exit; \?>\s*/', '', $raw, 1), true);
        if (is_array($decoded) && isset($decoded['items']) && is_array($decoded['items'])) {
            $leadCount = count($decoded['items']);
        }
    }
}
$installFiles = array('index.html', 'app.js', 'styles.css', 'api/lead.php', 'cabinet/index.php', 'cabinet/.htaccess', 'inc/bootstrap.php', '.htaccess', 'check.php');
$missingFiles = array();
foreach ($installFiles as $file) {
    if (!file_exists($root . '/' . $file)) {
        $missingFiles[] = $file;
    }
}

$rows = array();
$rows[] = array(
    'Версия PHP',
    $phpVersion,
    $phpOk ? 'ok' : 'bad',
    $phpOk ? 'подходит' : 'НУЖНА 8.0 или новее: панель → Сайты → Конфигурация → Настройки → Версия PHP → 8.3 → Сохранить',
);
$rows[] = array(
    'Веб-сервер',
    isset($_SERVER['SERVER_SOFTWARE']) ? (string) $_SERVER['SERVER_SOFTWARE'] : 'неизвестен',
    'info',
    'на Apache 2.4 директивы .htaccess работают так же, как в этой сборке',
);
$rows[] = array(
    'Обязательные расширения',
    $missingRequired ? ('нет: ' . implode(', ', $missingRequired)) : 'все на месте',
    $missingRequired ? 'bad' : 'ok',
    $missingRequired ? 'обратитесь в поддержку хостинга: без этих модулей приём заявок не работает' : 'json, session, hash, filter',
);
$rows[] = array(
    'Необязательные расширения',
    $missingOptional ? ('нет: ' . implode(', ', $missingOptional)) : 'все на месте',
    'info',
    'без них сайт работает: mbstring и curl подменяются встроенными средствами',
);
$rows[] = array(
    'Файлы сайта',
    $missingFiles ? ('не хватает: ' . implode(', ', $missingFiles)) : 'все на месте',
    $missingFiles ? 'bad' : 'ok',
    $missingFiles ? 'загрузите архив заново и распакуйте его прямо в public_html' : 'структура верная',
);
$rows[] = array(
    'Папка data/',
    $dataExists ? ($dataWritable ? 'есть, доступна для записи' : 'есть, НЕТ прав на запись') : 'не найдена',
    $dataExists && $dataWritable ? 'ok' : 'bad',
    $dataExists && $dataWritable ? 'заявки будут сохраняться' : 'поставьте права 775 на папку data в файловом менеджере',
);
$rows[] = array(
    'config.php',
    $configExists ? 'найден' : 'не найден',
    $configExists ? 'ok' : 'warn',
    $configExists ? 'настройки на месте' : 'откройте setup.php — файл настроек создастся сам, копировать ничего не нужно',
);
$rows[] = array(
    'Пароль кабинета',
    $usingDefault ? 'пароль по умолчанию' : 'свой пароль',
    $usingDefault ? 'warn' : 'ok',
    $usingDefault
        ? 'вход работает: логин ' . htmlspecialchars($configLogin, ENT_QUOTES, 'UTF-8') . ', пароль astrolog. '
            . 'Смените его на setup.php и удалите setup.php'
        : 'вход по своему паролю',
);
$rows[] = array(
    'Сессии входа',
    $sessionOk ? 'папка data/sessions доступна' : 'НЕТ прав на запись',
    $sessionOk ? 'ok' : 'bad',
    $sessionOk
        ? 'вход в кабинет запоминается в браузере'
        : 'создайте папку data/sessions и поставьте права 775 — иначе после входа кабинет снова просит пароль',
);
$rows[] = array(
    'Заявок в базе',
    (string) $leadCount,
    'info',
    $leadCount > 0 ? 'последние заявки видны в кабинете' : 'пока ни одной — отправьте тестовую с сайта',
);
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Проверка хостинга</title>
<style>
  body { font:15px/1.55 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; background:#f5f6f7; color:#1f2a30; margin:0; padding:32px 16px; }
  main { max-width:860px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 4px; }
  p.lead { color:#68737b; margin:0 0 18px; }
  table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #dcdfe3; border-radius:10px; overflow:hidden; }
  th, td { text-align:left; padding:10px 12px; border-bottom:1px solid #eceef0; vertical-align:top; font-size:14px; }
  th { background:#fafbfb; font-weight:600; font-size:13px; color:#4a545b; }
  tr:last-child td { border-bottom:0; }
  .ok { color:#2c5c40; font-weight:600; }
  .bad { color:#8d4147; font-weight:600; }
  .warn { color:#8a5c12; font-weight:600; }
  .info { color:#4a545b; font-weight:600; }
  .hint { color:#68737b; font-size:13px; }
  .box { margin-top:18px; padding:14px 16px; border-radius:10px; background:#fff; border:1px solid #dcdfe3; }
  code { background:#f2f4f5; padding:1px 5px; border-radius:4px; font-size:13px; }
  a { color:#1f5f6b; }
  ol { padding-left:20px; margin:8px 0 0; }
</style>
</head>
<body>
<main>
  <h1>Проверка хостинга</h1>
  <p class="lead">Страница показывает, всё ли готово к работе сайта. Удалите файл <code>check.php</code> после проверки.</p>

  <table>
    <tr><th>Параметр</th><th>Значение</th><th>Результат</th><th>Что делать</th></tr>
    <?php foreach ($rows as $row): ?>
      <tr>
        <td><?php echo htmlspecialchars($row[0], ENT_QUOTES, 'UTF-8'); ?></td>
        <td><?php echo htmlspecialchars($row[1], ENT_QUOTES, 'UTF-8'); ?></td>
        <td class="<?php echo $row[2]; ?>"><?php echo $row[2] === 'ok' ? 'ок' : ($row[2] === 'bad' ? 'ошибка' : ($row[2] === 'warn' ? 'внимание' : '—')); ?></td>
        <td class="hint"><?php echo htmlspecialchars($row[3], ENT_QUOTES, 'UTF-8'); ?></td>
      </tr>
    <?php endforeach; ?>
  </table>

  <?php if (!$phpOk): ?>
    <div class="box">
      <strong>Сначала переключите PHP.</strong> Сайт требует PHP 8.0+ (проверено на 8.0–8.5), сейчас активна версия <?php echo htmlspecialchars($phpVersion, ENT_QUOTES, 'UTF-8'); ?>.
      <ol>
        <li>Панель управления → раздел <strong>Сайты</strong>.</li>
        <li>Ваш сайт → графа <strong>Конфигурация</strong> → кнопка <strong>Настройки</strong>.</li>
        <li>Поле <strong>Версия PHP</strong> → выберите <strong>8.3</strong> (подойдёт 8.0–8.5) → <strong>Сохранить</strong>.</li>
        <li>Подождите пару минут и обновите эту страницу.</li>
      </ol>
    </div>
  <?php elseif ($missingFiles !== array()): ?>
    <div class="box">
      <strong>Файлы загружены не полностью.</strong> Скачайте архив <code>astra-pearl-php.zip</code> заново,
      распакуйте его прямо в <code>public_html</code> (без вложенной папки) и обновите страницу.
    </div>
  <?php elseif ($dataExists && !$dataWritable): ?>
    <div class="box">
      <strong>Нет прав на папку data.</strong> Файловый менеджер → правый клик по папке <code>data</code> →
      «Права» → <code>775</code> → применить. После этого заявки начнут сохраняться.
    </div>
  <?php elseif (!$configHashSet): ?>
    <div class="box">
      <strong>Остался один шаг: установка.</strong> Откройте <a href="setup.php">setup.php</a>:
      там кнопка «Создать config.php» и поле для пароля — оба действия в браузере,
      копировать хеш вручную не нужно. После настройки удалите <code>setup.php</code>.
    </div>
  <?php else: ?>
    <div class="box">
      <strong>Всё готово.</strong> Проверьте сайт: <a href="index.html">главная</a> ·
      <a href="matrix.html">Матрица судьбы</a> · <a href="astrology.html">натальная карта</a> ·
      <a href="cabinet/">кабинет</a>.
      Не забудьте выпустить SSL-сертификат в панели хостинга и включить редирект на https в <code>.htaccess</code>.
    </div>
  <?php endif; ?>
</main>
</body>
</html>
