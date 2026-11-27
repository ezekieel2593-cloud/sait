<?php
/**
 * Клиенты портала: список зарегистрированных, подписки, личные PDF.
 *
 * Подписка выдаётся в один клик (1/3/6/12 месяцев или точная дата),
 * PDF загружается прямо из панели и появляется в кабинете клиента.
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/store.php';
require_once __DIR__ . '/../inc/auth.php';
require_once __DIR__ . '/../inc/view.php';
require_once __DIR__ . '/../inc/users.php';

session_start_once();
if (!is_logged_in()) {
    render_login();
    app_exit();
}

$flash = (string) ($_GET['saved'] ?? '');
cabinet_head('Клиенты');

$users = all_users();
usort($users, static fn(array $a, array $b): int => strcmp((string) ($b['createdAt'] ?? ''), (string) ($a['createdAt'] ?? '')));
$activeSubs = count(array_filter($users, 'subscription_active'));
$libraryTotal = count(is_array(data_read('library')['items'] ?? null) ? data_read('library')['items'] : []);

$csrf = csrf_token();
?>
<h1>Клиенты портала</h1>
<p class="muted">Регистрации на сайте, статус подписки и персональные PDF-гайды.</p>

<?php if ($flash === 'ok'): ?><div class="msg ok">Изменения сохранены.</div>
<?php elseif ($flash === 'err'): ?><div class="msg err">Не удалось сохранить — проверьте форму и права на data/.</div><?php endif; ?>

<div class="cards">
  <div class="card"><span class="muted">Клиентов</span><b><?= count($users) ?></b></div>
  <div class="card"><span class="muted">Активных подписок</span><b><?= $activeSubs ?></b></div>
  <div class="card"><span class="muted">PDF в библиотеке</span><b><?= $libraryTotal ?></b></div>
</div>

<?php if ($users === []): ?>
  <div class="empty">Пока нет зарегистрированных клиентов — они появятся после регистрации на сайте.</div>
<?php else: ?>
<table>
  <tr><th>Клиент</th><th>Контакты</th><th>Рождения</th><th>Подписка</th><th>Доступ и PDF</th></tr>
  <?php foreach ($users as $user): $uid = (string) ($user['id'] ?? ''); ?>
  <tr>
    <td>
      <strong><?= e((string) ($user['name'] ?? '')) ?></strong>
      <div class="muted">с <?= e(format_dt((string) ($user['createdAt'] ?? ''))) ?></div>
      <?php $onboarding = $user['onboarding'] ?? null; if ($onboarding): ?>
        <div class="muted">интерес: <?= $onboarding === 'relations' ? 'отношения' : ($onboarding === 'money' ? 'деньги' : 'энергия') ?></div>
      <?php endif; ?>
    </td>
    <td><?= e((string) ($user['email'] ?? '')) ?><?php if (($user['telegram'] ?? '') !== ''): ?><div class="muted">@<?= e(ltrim((string) $user['telegram'], '@')) ?></div><?php endif; ?></td>
    <td><?= e((string) ($user['birthday'] ?? '')) ?><?php if (($user['birthPlace'] ?? '') !== ''): ?><div class="muted"><?= e((string) $user['birthPlace']) ?></div><?php endif; ?></td>
    <td>
      <?php if (subscription_active($user)): ?>
        <span class="badge s-done">до <?= e((string) $user['subscriptionUntil']) ?></span>
      <?php else: ?>
        <span class="badge">бесплатный</span>
      <?php endif; ?>
    </td>
    <td>
      <form method="post" action="client-action.php" class="row" style="margin-bottom:6px">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="id" value="<?= e($uid) ?>">
        <select name="months" style="width:auto">
          <option value="1">+1 мес</option>
          <option value="3">+3 мес</option>
          <option value="6">+6 мес</option>
          <option value="12">+12 мес</option>
        </select>
        <button name="action" value="grant">Выдать</button>
        <?php if (subscription_active($user)): ?><button name="action" value="revoke" class="secondary">Отключить</button><?php endif; ?>
      </form>
      <?php $items = all_library($uid); ?>
      <?php foreach ($items as $item): ?>
        <div class="row" style="margin-bottom:4px">
          <a href="../api/library.php?id=<?= e((string) $item['id']) ?>" target="_blank" rel="noopener"><?= e((string) $item['title']) ?></a>
          <form method="post" action="client-action.php" onsubmit="return confirm('Удалить PDF у клиента?')">
            <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
            <input type="hidden" name="id" value="<?= e($uid) ?>">
            <input type="hidden" name="itemId" value="<?= e((string) $item['id']) ?>">
            <button name="action" value="deletePdf" class="danger">Удалить</button>
          </form>
        </div>
      <?php endforeach; ?>
      <form method="post" action="client-action.php" enctype="multipart/form-data" class="row">
        <input type="hidden" name="csrf" value="<?= e($csrf) ?>">
        <input type="hidden" name="id" value="<?= e($uid) ?>">
        <input type="file" name="pdf" accept=".pdf" required>
        <input type="text" name="title" placeholder="Название (необязательно)" style="width:180px">
        <button name="action" value="uploadPdf">Прикрепить PDF</button>
      </form>
    </td>
  </tr>
  <?php endforeach; ?>
</table>
<?php endif; ?>

<?php cabinet_foot();
