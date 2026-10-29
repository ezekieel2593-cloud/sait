<?php
/**
 * Кабинет: вход и список заявок.
 * Поиск, фильтры по статусу и направлению, сортировка, пагинация.
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/store.php';
require_once __DIR__ . '/../inc/auth.php';
require_once __DIR__ . '/../inc/view.php';

session_start_once();

$loginError = null;
$loginValue = '';

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && isset($_POST['password'])) {
    // Поле называется login; старое имя email принимаем для совместимости.
    $loginValue = (string) ($_POST['login'] ?? $_POST['email'] ?? '');
    $result = attempt_login($loginValue, (string) $_POST['password']);
    if ($result['ok']) {
        header('Location: index.php', true, 303);
        app_exit();
    }
    $loginError = $result['error'] ?? 'Не удалось войти';
}

if (!is_logged_in()) {
    render_login($loginError, $loginValue);
    app_exit();
}

cabinet_headers();

$search = trim((string) ($_GET['q'] ?? ''));
$status = (string) ($_GET['status'] ?? 'all');
$direction = (string) ($_GET['direction'] ?? 'all');
$sort = (string) ($_GET['sort'] ?? 'new');
$page = max(1, (int) ($_GET['page'] ?? 1));

if (!array_key_exists($status, LEAD_STATUSES)) {
    $status = 'all';
}
if (!array_key_exists($direction, DIRECTION_LABELS)) {
    $direction = 'all';
}

$data = query_leads([
    'search' => $search,
    'status' => $status,
    'direction' => $direction,
    'sort' => $sort,
    'page' => $page,
    'perPage' => 20,
]);

$counters = lead_counters();
$queryBase = function (array $patch) use ($search, $status, $direction, $sort, $page): string {
    $params = array_merge([
        'q' => $search,
        'status' => $status,
        'direction' => $direction,
        'sort' => $sort,
        'page' => (string) $page,
    ], $patch);
    $params = array_filter($params, fn($value) => $value !== '' && $value !== 'all' && $value !== null);
    unset($params['q2']);
    return 'index.php' . ($params === [] ? '' : '?' . http_build_query($params));
};

cabinet_head('Заявки');
?>
<?php if (!is_https()): ?>
  <div class="msg warn">Сайт открыт по <strong>http</strong>: пароль и заявки передаются без шифрования.
    Выпустите бесплатный SSL-сертификат в панели хостинга, а затем включите редирект на https
    в файле <code>.htaccess</code> (подробности — в инструкции).</div>
<?php endif; ?>
<?php if (!data_writable()): ?>
  <div class="msg warn">Заявки сейчас не сохраняются: у PHP нет прав на запись в папку <code>data/</code>.
    Поставьте права 775 в файловом менеджере хостинга.</div>
<?php endif; ?>
<?php
?>
<h1>Заявки</h1>
<p class="muted">Всего: <?= (int) $counters['total'] ?>. Данные видны только вам; страница закрыта от индексации.</p>

<div class="cards">
  <div class="card"><span class="muted">Новые</span><b><?= (int) ($counters['new'] ?? 0) ?></b></div>
  <div class="card"><span class="muted">В работе</span><b><?= (int) ($counters['in_progress'] ?? 0) ?></b></div>
  <div class="card"><span class="muted">Ожидают клиента</span><b><?= (int) ($counters['awaiting_client'] ?? 0) ?></b></div>
  <div class="card"><span class="muted">Завершены</span><b><?= (int) ($counters['done'] ?? 0) ?></b></div>
</div>

<form class="panel" method="get" action="index.php">
  <div class="row">
    <div style="flex:2 1 240px">
      <label for="q">Поиск</label>
      <input id="q" type="search" name="q" value="<?= e($search) ?>" placeholder="Имя, контакт или номер заявки">
    </div>
    <div style="flex:1 1 140px">
      <label for="status">Статус</label>
      <select id="status" name="status">
        <option value="all">Все</option>
        <?php foreach (LEAD_STATUSES as $key => $label): ?>
          <option value="<?= e($key) ?>" <?= $status === $key ? 'selected' : '' ?>><?= e($label) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div style="flex:1 1 140px">
      <label for="direction">Направление</label>
      <select id="direction" name="direction">
        <option value="all">Все</option>
        <?php foreach (DIRECTION_LABELS as $key => $label): ?>
          <option value="<?= e($key) ?>" <?= $direction === $key ? 'selected' : '' ?>><?= e($label) ?></option>
        <?php endforeach; ?>
      </select>
    </div>
    <div style="flex:1 1 130px">
      <label for="sort">Сортировка</label>
      <select id="sort" name="sort">
        <option value="new" <?= $sort !== 'old' ? 'selected' : '' ?>>Сначала новые</option>
        <option value="old" <?= $sort === 'old' ? 'selected' : '' ?>>Сначала старые</option>
      </select>
    </div>
    <div>
      <button type="submit">Показать</button>
    </div>
  </div>
</form>

<div class="panel" style="padding:0; overflow-x:auto">
  <?php if ($data['items'] === []): ?>
    <p class="empty">Заявок по этим условиям нет.</p>
  <?php else: ?>
    <table>
      <thead>
        <tr>
          <th>Заявка</th>
          <th>Клиент</th>
          <th>Направление</th>
          <th>Статус</th>
          <th>Получена</th>
        </tr>
      </thead>
      <tbody>
      <?php foreach ($data['items'] as $lead): ?>
        <tr>
          <td><a href="lead.php?id=<?= e((string) $lead['id']) ?>"><?= e((string) ($lead['ref'] ?? '')) ?></a></td>
          <td>
            <strong><?= e((string) ($lead['name'] ?? '')) ?></strong><br>
            <span class="muted"><?= e(CHANNEL_LABELS[$lead['channel'] ?? ''] ?? '') ?>: <?= e((string) ($lead['contact'] ?? '')) ?></span>
          </td>
          <td><?= e(DIRECTION_LABELS[$lead['direction'] ?? ''] ?? '—') ?></td>
          <td><?= status_badge((string) ($lead['status'] ?? 'new')) ?></td>
          <td class="muted"><?= e(format_dt($lead['createdAt'] ?? null)) ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table>
  <?php endif; ?>
</div>

<?php if ($data['pages'] > 1): ?>
  <div class="pager">
    <a class="btn secondary" href="<?= e($queryBase(['page' => (string) max(1, $data['page'] - 1)])) ?>">Назад</a>
    <span class="muted">Страница <?= (int) $data['page'] ?> из <?= (int) $data['pages'] ?></span>
    <a class="btn secondary" href="<?= e($queryBase(['page' => (string) min($data['pages'], $data['page'] + 1)])) ?>">Вперёд</a>
  </div>
<?php endif; ?>
<?php cabinet_foot(); ?>
