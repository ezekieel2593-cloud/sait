<?php
/**
 * Карточка заявки: данные клиента, расчёт, статус, заметки, история.
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/store.php';
require_once __DIR__ . '/../inc/auth.php';
require_once __DIR__ . '/../inc/view.php';

session_start_once();
if (!is_logged_in()) {
    header('Location: index.php', true, 303);
    app_exit();
}

cabinet_headers();

$id = (string) ($_GET['id'] ?? '');
$lead = find_lead($id);
if ($lead === null) {
    http_response_code(404);
    cabinet_head('Заявка не найдена');
    echo '<h1>Заявка не найдена</h1><p class="muted"><a href="index.php">← Ко всем заявкам</a></p>';
    cabinet_foot();
    app_exit();
}

$flash = (string) ($_GET['saved'] ?? '');

cabinet_head('Заявка ' . ($lead['ref'] ?? ''));
?>
<p class="muted"><a href="index.php">← Ко всем заявкам</a></p>
<h1><?= e((string) ($lead['name'] ?? '')) ?> <span class="muted" style="font-size:14px"><?= e((string) ($lead['ref'] ?? '')) ?></span></h1>

<?php if ($flash === 'status'): ?>
  <div class="msg ok">Статус обновлён.</div>
<?php elseif ($flash === 'notes'): ?>
  <div class="msg ok">Заметка сохранена.</div>
<?php elseif ($flash === 'anonymized'): ?>
  <div class="msg ok">Персональные данные удалены.</div>
<?php elseif ($flash === 'notified'): ?>
  <div class="msg ok">Запрошена повторная отправка уведомлений.</div>
<?php elseif ($flash === 'save_failed'): ?>
  <div class="msg warn">Не удалось сохранить изменения: папка <code>data/</code> недоступна для записи.
    Поставьте на неё права 775 в файловом менеджере хостинга и повторите.</div>
<?php endif; ?>

<?php if (!is_https()): ?>
  <div class="msg warn">Сайт открыт по <strong>http</strong>: данные передаются без шифрования.
    Выпустите SSL-сертификат в панели хостинга и включите редирект на https в <code>.htaccess</code>.</div>
<?php endif; ?>
<?php if (!data_writable()): ?>
  <div class="msg warn">Заявки сейчас не сохраняются: у PHP нет прав на запись в папку <code>data/</code>.
    Проверьте права (775) — до этого новые заявки с сайта будут теряться.</div>
<?php endif; ?>

<div class="grid2">
  <section class="panel">
    <h2 style="margin-top:0">Данные клиента</h2>
    <dl class="meta">
      <dt>Статус</dt><dd><?= status_badge((string) ($lead['status'] ?? 'new')) ?></dd>
      <dt>Направление</dt><dd><?= e(DIRECTION_LABELS[$lead['direction'] ?? ''] ?? '—') ?></dd>
      <dt>Способ связи</dt><dd><?= e(CHANNEL_LABELS[$lead['channel'] ?? ''] ?? '—') ?></dd>
      <dt>Контакт</dt><dd><?= $lead['contact'] !== '' ? e((string) $lead['contact']) : '<span class="muted">удалён</span>' ?></dd>
      <dt>Тип запроса</dt><dd><?= ($lead['purpose'] ?? 'reading') === 'guide' ? 'Гайд по энергиям' : 'Полный разбор' ?></dd>
      <dt>Вопрос</dt><dd><?= $lead['question'] !== '' ? nl2br(e((string) $lead['question'])) : '<span class="muted">—</span>' ?></dd>
      <dt>Данные рождения</dt><dd><?= $lead['birth'] !== '' ? e((string) $lead['birth']) : '<span class="muted">—</span>' ?></dd>
      <dt>Получена</dt><dd><?= e(format_dt($lead['createdAt'] ?? null)) ?></dd>
      <dt>Согласие</dt><dd><?= !empty($lead['consent']) ? 'есть' : 'нет' ?></dd>
    </dl>

    <h2>Расчёт из результата</h2>
    <?php if (!empty($lead['calc'])): ?>
      <pre class="calc" id="calc-text"><?= e((string) $lead['calc']) ?></pre>
      <div class="actions">
        <button type="button" class="secondary" onclick="navigator.clipboard.writeText(document.getElementById('calc-text').innerText).then(()=>{this.textContent='Скопировано';setTimeout(()=>this.textContent='Скопировать текст',1800)})">Скопировать текст</button>
      </div>
    <?php else: ?>
      <p class="muted">Клиент не приложил расчёт — уточните данные рождения в переписке.</p>
    <?php endif; ?>

    <?php
      $details = (string) ($lead['details'] ?? '');
      $detailsLines = $details === '' ? 0 : substr_count($details, "\n") + 1;
    ?>
    <h2>Полный расчёт для разбора</h2>
    <?php if ($details !== ''): ?>
      <p class="muted">
        Всё, что видел клиент: положения планет с домами и ретроградностью, куспиды домов,
        аспекты с орбисами, все точки Матрицы с формулами. Можно копировать и работать с этим текстом.
      </p>
      <details class="calc-more">
        <summary>Показать полный расчёт (<?= (int) $detailsLines ?> строк)</summary>
        <pre class="calc" id="details-text"><?= e($details) ?></pre>
        <div class="actions">
          <button type="button" class="secondary" onclick="navigator.clipboard.writeText(document.getElementById('details-text').innerText).then(()=>{this.textContent='Скопировано';setTimeout(()=>this.textContent='Скопировать полный расчёт',1800)})">Скопировать полный расчёт</button>
        </div>
      </details>
    <?php else: ?>
      <p class="muted">
        Заявка пришла без подробного расчёта: клиент оставил её со страницы, где расчёт не выполнялся,
        либо заявка старая. Данные рождения — в карточке выше.
      </p>
    <?php endif; ?>

    <h2>Гайд в PDF</h2>
    <?php
      // Дата рождения приходит строкой «1992-06-23» (или с временем и городом для карты).
      $birthRaw = (string) ($lead['birth'] ?? '');
      $birthDate = preg_match('/(\d{4})-(\d{2})-(\d{2})/', $birthRaw, $m) ? "{$m[1]}-{$m[2]}-{$m[3]}" : '';
      $guideLink = $birthDate === ''
        ? ''
        : '../matrix.html?d=' . rawurlencode($birthDate) . '&guide=1&name=' . rawurlencode((string) ($lead['name'] ?? ''));
    ?>
    <?php if ($guideLink !== ''): ?>
      <p class="muted">
        Откроется расчёт Матрицы для этого человека и сразу соберётся PDF: схема, гайд по каждой энергии
        с шагами и практиками, методика. Файл сохраняется в загрузки браузера — дальше его можно отправить клиенту.
      </p>
      <div class="actions">
        <a class="btn" href="<?= e($guideLink) ?>" target="_blank" rel="noopener">Создать гайд (PDF)</a>
      </div>
    <?php else: ?>
      <p class="muted">
        В заявке нет даты рождения в формате ГГГГ-ММ-ДД — соберите гайд вручную: откройте
        <a href="../matrix.html">расчёт Матрицы</a> и подставьте дату клиента.
      </p>
    <?php endif; ?>

    <h2>История</h2>
    <ul class="history">
      <?php foreach (array_reverse(is_array($lead['history'] ?? null) ? $lead['history'] : []) as $event): ?>
        <li>
          <strong><?= e((string) ($event['message'] ?? $event['type'] ?? '')) ?></strong><br>
          <span class="muted"><?= e(format_dt($event['at'] ?? null)) ?> · <?= e((string) ($event['actor'] ?? '')) ?></span>
        </li>
      <?php endforeach; ?>
    </ul>
  </section>

  <aside>
    <section class="panel">
      <h2 style="margin-top:0">Статус</h2>
      <form method="post" action="action.php">
        <input type="hidden" name="id" value="<?= e((string) $lead['id']) ?>">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="status">
        <label for="status">Текущий статус</label>
        <select id="status" name="status">
          <?php foreach (LEAD_STATUSES as $key => $label): ?>
            <option value="<?= e($key) ?>" <?= ($lead['status'] ?? 'new') === $key ? 'selected' : '' ?>><?= e($label) ?></option>
          <?php endforeach; ?>
        </select>
        <label for="comment">Комментарий к смене статуса (необязательно)</label>
        <input id="comment" name="comment" maxlength="500" placeholder="Например: отправила уточняющие вопросы">
        <div class="actions"><button type="submit">Сохранить статус</button></div>
      </form>
    </section>

    <section class="panel">
      <h2 style="margin-top:0">Внутренняя заметка</h2>
      <p class="muted">Клиент её не видит.</p>
      <form method="post" action="action.php">
        <input type="hidden" name="id" value="<?= e((string) $lead['id']) ?>">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="notes">
        <label for="notes">Заметка</label>
        <textarea id="notes" name="notes" maxlength="5000"><?= e((string) ($lead['notes'] ?? '')) ?></textarea>
        <div class="actions"><button type="submit">Сохранить заметку</button></div>
      </form>
    </section>

    <section class="panel">
      <h2 style="margin-top:0">Уведомления</h2>
      <?php $notifications = is_array($lead['notifications'] ?? null) ? $lead['notifications'] : []; ?>
      <?php if ($notifications === []): ?>
        <p class="muted">Каналы не настроены: заявка сохранена, но сообщений не отправлялось.</p>
      <?php else: ?>
        <ul class="history">
          <?php foreach ($notifications as $item): ?>
            <li><strong><?= e(CHANNEL_LABELS[$item['channel'] ?? ''] ?? (string) ($item['channel'] ?? '')) ?></strong> —
              <?= e((string) ($item['status'] ?? '')) ?>
              <?php if (!empty($item['error'])): ?><br><span class="muted"><?= e((string) $item['error']) ?></span><?php endif; ?>
            </li>
          <?php endforeach; ?>
        </ul>
      <?php endif; ?>
      <form method="post" action="action.php" class="actions">
        <input type="hidden" name="id" value="<?= e((string) $lead['id']) ?>">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="notify">
        <button type="submit" class="secondary">Отправить уведомления повторно</button>
      </form>
    </section>

    <section class="panel">
      <h2 style="margin-top:0">Персональные данные</h2>
      <p class="muted">Обезличивание необратимо: имя, контакт, вопрос и расчёт удаляются, история остаётся.</p>
      <form method="post" action="action.php" onsubmit="return confirm('Удалить персональные данные клиента?')">
        <input type="hidden" name="id" value="<?= e((string) $lead['id']) ?>">
        <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
        <input type="hidden" name="action" value="anonymize">
        <div class="actions"><button type="submit" class="danger">Удалить персональные данные</button></div>
      </form>
    </section>
  </aside>
</div>
<?php cabinet_foot(); ?>
