<?php
/**
 * Генератор хеша пароля для кабинета.
 *
 * Как пользоваться:
 *  1. Узнайте setupToken из config.php (раздел security).
 *  2. Откройте setup.php?token=ВАШ_ТОКЕН
 *  3. Введите пароль, скопируйте полученный хеш в config.php → owner.passwordHash
 *  4. Удалите этот файл (setup.php) с хостинга.
 */

declare(strict_types=1);

require_once __DIR__ . '/inc/bootstrap.php';

$expected = (string) cfg('security.setupToken', '');
$given = (string) ($_GET['token'] ?? '');
$hashConfigured = trim((string) cfg('owner.passwordHash', '')) !== '';

header('X-Robots-Tag: noindex, nofollow');
header('Cache-Control: no-store');

if ($hashConfigured && ($expected === '' || !hash_equals($expected, $given))) {
    http_response_code(403);
    echo '<!doctype html><meta charset="utf-8"><title>Настройка закрыта</title>'
        . '<p style="font:15px/1.5 sans-serif;padding:30px">Пароль уже задан, setup.php закрыт. '
        . 'Чтобы сменить пароль, очистите owner.passwordHash в config.php или откройте setup.php?token=… (setupToken из config.php). '
        . 'Файл setup.php лучше удалить с хостинга.</p>';
    app_exit();
}

$hash = null;
$error = null;
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $password = (string) ($_POST['password'] ?? '');
    if (strlen($password) < 10) {
        $error = 'Пароль должен быть не короче 10 символов';
    } else {
        $hash = password_hash($password, PASSWORD_DEFAULT);
    }
}
?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Настройка пароля кабинета</title>
<style>
  body { font:15px/1.55 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; background:#f5f6f7; color:#1f2a30; margin:0; padding:40px 18px; }
  .box { max-width:640px; margin:0 auto; background:#fff; border:1px solid #dcdfe3; border-radius:12px; padding:22px; }
  label { display:block; font-size:13px; color:#68737b; margin:12px 0 4px; }
  input { width:100%; box-sizing:border-box; padding:9px 11px; border:1px solid #c8ced3; border-radius:8px; font:inherit; }
  button { margin-top:14px; padding:9px 14px; border:1px solid #1f5f6b; background:#1f5f6b; color:#fff; border-radius:8px; font:inherit; cursor:pointer; }
  code { display:block; margin-top:10px; padding:10px; background:#fafbfb; border:1px solid #dcdfe3; border-radius:8px; word-break:break-all; font-size:13px; }
  .err { color:#8d4147; margin-top:10px; }
  .ok { color:#2c5c40; margin-top:10px; }
  ol { padding-left:20px; }
</style>
</head>
<body>
<div class="box">
  <h1>Пароль для кабинета</h1>
  <form method="post">
    <label for="password">Придумайте пароль (минимум 10 символов)</label>
    <input id="password" type="password" name="password" autocomplete="new-password" required>
    <button type="submit">Сгенерировать хеш</button>
  </form>
  <?php if ($error !== null): ?>
    <p class="err"><?= e($error) ?></p>
  <?php endif; ?>
  <?php if ($hash !== null): ?>
    <p class="ok">Готово. Скопируйте строку и вставьте в config.php:</p>
    <code><?= e($hash) ?></code>
    <ol>
      <li>Откройте config.php, найдите <code>owner =&gt; [... 'passwordHash' =&gt; '' ...]</code>.</li>
      <li>Вставьте хеш в кавычки: <code>'passwordHash' =&gt; 'вставьте сюда'</code>.</li>
      <li>Сохраните файл.</li>
      <li>Удалите setup.php с хостинга — он больше не нужен.</li>
    </ol>
  <?php endif; ?>
</div>
</body>
</html>
