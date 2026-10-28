<?php
/**
 * Представление кабинета: намеренно функциональное, без декоративных эффектов.
 * Всё в одном файле, чтобы не зависеть от сборки CSS на хостинге.
 */

declare(strict_types=1);

function cabinet_head(string $title, bool $withNav = true): void
{
    $statuses = LEAD_STATUSES;
    $counters = $withNav ? lead_counters() : [];
    ?>
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title><?= e($title) ?> — кабинет</title>
<style>
  :root { --line:#dcdfe3; --ink:#1f2a30; --muted:#68737b; --accent:#1f5f6b; --bg:#f5f6f7; --warn:#8d4147; }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.55 -apple-system, "Segoe UI", Roboto, Arial, sans-serif; color:var(--ink); background:var(--bg); }
  a { color: var(--accent); }
  header.top { background:#fff; border-bottom:1px solid var(--line); position:sticky; top:0; z-index:5; }
  .wrap { max-width:1080px; margin:0 auto; padding:14px 18px; }
  .top .wrap { display:flex; flex-wrap:wrap; align-items:center; gap:12px; justify-content:space-between; }
  .brand { font-weight:600; }
  nav.tabs { display:flex; gap:6px; flex-wrap:wrap; }
  nav.tabs a { padding:6px 10px; border-radius:8px; text-decoration:none; color:var(--ink); border:1px solid transparent; font-size:14px; }
  nav.tabs a.active { background:#eef4f5; border-color:#cfe0e3; color:var(--accent); }
  h1 { font-size:22px; margin:18px 0 6px; }
  h2 { font-size:16px; margin:22px 0 8px; }
  .muted { color:var(--muted); font-size:13px; }
  .cards { display:grid; gap:10px; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); margin:14px 0; }
  .card { background:#fff; border:1px solid var(--line); border-radius:10px; padding:12px 14px; }
  .card b { display:block; font-size:22px; font-weight:600; }
  .panel { background:#fff; border:1px solid var(--line); border-radius:10px; padding:14px; margin-bottom:16px; }
  table { width:100%; border-collapse:collapse; background:#fff; }
  th, td { text-align:left; padding:9px 10px; border-bottom:1px solid var(--line); font-size:14px; vertical-align:top; }
  th { font-size:12px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); font-weight:600; }
  tr:hover td { background:#fafbfb; }
  .badge { display:inline-block; padding:2px 8px; border-radius:999px; font-size:12px; background:#eef1f3; }
  .badge.s-new { background:#e6f2f4; color:#1f5f6b; }
  .badge.s-in_progress { background:#f6eedd; color:#7a5c25; }
  .badge.s-done { background:#e7f0ea; color:#2c5c40; }
  .badge.s-cancelled { background:#f0f0f0; color:#6b7178; }
  .badge.s-awaiting_client, .badge.s-need_data { background:#f1e9f0; color:#6d4a65; }
  .badge.s-ready { background:#e7f0ea; color:#2c5c40; }
  input[type=text], input[type=password], input[type=email], input[type=search], select, textarea {
    width:100%; padding:8px 10px; border:1px solid #c8ced3; border-radius:8px; font:inherit; background:#fff; }
  textarea { min-height:110px; resize:vertical; }
  label { display:block; font-size:13px; color:var(--muted); margin:10px 0 4px; }
  button, .btn { display:inline-block; padding:9px 14px; border-radius:8px; border:1px solid var(--accent); background:var(--accent);
    color:#fff; font:inherit; cursor:pointer; text-decoration:none; }
  .btn.secondary, button.secondary { background:#fff; color:var(--accent); }
  button.danger { background:#fff; color:var(--warn); border-color:#d9b4b7; }
  .row { display:flex; gap:8px; flex-wrap:wrap; align-items:flex-end; }
  .grid2 { display:grid; gap:12px; grid-template-columns:1fr; }
  @media (min-width:760px) { .grid2 { grid-template-columns:1.3fr 1fr; } }
  .msg { padding:9px 12px; border-radius:8px; margin:12px 0; font-size:14px; }
  .msg.ok { background:#e9f3ec; color:#2c5c40; }
  .msg.err { background:#fdeeee; color:var(--warn); }
  pre.calc { white-space:pre-wrap; word-break:break-word; background:#fafbfb; border:1px solid var(--line);
    border-radius:8px; padding:10px; font-size:13px; margin:0; }
  dl.meta { display:grid; grid-template-columns:150px 1fr; gap:6px 12px; margin:0; font-size:14px; }
  dl.meta dt { color:var(--muted); }
  dl.meta dd { margin:0; word-break:break-word; }
  ul.history { list-style:none; margin:0; padding:0; font-size:13px; }
  ul.history li { padding:6px 0; border-bottom:1px solid var(--line); }
  .actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
  .empty { padding:28px; text-align:center; color:var(--muted); }
  .pager { display:flex; gap:10px; align-items:center; justify-content:space-between; margin-top:12px; font-size:14px; }
  .login { max-width:380px; margin:8vh auto; background:#fff; border:1px solid var(--line); border-radius:12px; padding:22px; }
</style>
</head>
<body>
<?php if ($withNav): ?>
<header class="top">
  <div class="wrap">
    <div class="brand">Кабинет · <?= e((string) cfg('siteName', 'Astra Pearl')) ?></div>
    <nav class="tabs">
      <a href="index.php" class="<?= basename($_SERVER['SCRIPT_NAME'] ?? '') === 'index.php' ? 'active' : '' ?>">Заявки</a>
      <a href="../index.html" target="_blank" rel="noopener">Сайт</a>
      <a href="logout.php">Выйти</a>
    </nav>
  </div>
</header>
<?php endif; ?>
<main class="wrap">
<?php
}

function cabinet_foot(): void
{
    ?>
</main>
</body>
</html>
<?php
}

function render_login(?string $error = null, string $email = ''): void
{
    cabinet_headers();
    cabinet_head('Вход', false);
    ?>
    <div class="login">
      <h1 style="margin-top:0">Вход в кабинет</h1>
      <p class="muted">Доступ только для владельца сайта.</p>
      <?php if ($error !== null): ?>
        <div class="msg err"><?= e($error) ?></div>
      <?php endif; ?>
      <form method="post" action="index.php">
        <label for="email">E-mail</label>
        <input id="email" type="email" name="email" value="<?= e($email) ?>" autocomplete="username" required>
        <label for="password">Пароль</label>
        <input id="password" type="password" name="password" autocomplete="current-password" required>
        <div class="actions">
          <button type="submit">Войти</button>
        </div>
      </form>
    </div>
    <?php
    cabinet_foot();
}

function status_badge(string $status): string
{
    $label = LEAD_STATUSES[$status] ?? $status;
    return '<span class="badge s-' . e($status) . '">' . e($label) . '</span>';
}

function format_dt(?string $iso): string
{
    if (!$iso) {
        return '—';
    }
    $timestamp = strtotime($iso);
    if ($timestamp === false) {
        return '—';
    }
    $offset = (int) cfg('timezoneOffsetHours', 3);
    return gmdate('d.m.Y H:i', $timestamp + $offset * 3600);
}
