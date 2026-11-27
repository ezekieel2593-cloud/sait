<?php
/**
 * Редактор тарифов: подписка, PDF-гайды, консультации.
 * Значения сохраняются в data/tariffs.php и сразу видны в кабинете клиента.
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/auth.php';
require_once __DIR__ . '/../inc/view.php';
require_once __DIR__ . '/../inc/users.php';

session_start_once();
if (!is_logged_in()) {
    render_login();
    app_exit();
}

$flash = '';
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_valid($_POST['csrf'] ?? null)) {
    $subscription = [
        'title' => 'Полный доступ',
        'price' => max(0, (int) ($_POST['subPrice'] ?? 0)),
        'period' => in_array($_POST['subPeriod'] ?? '', ['месяц', '3 месяца', 'год'], true) ? (string) $_POST['subPeriod'] : 'месяц',
        'note' => str_cut(trim((string) ($_POST['subNote'] ?? '')), 300),
    ];
    $pdfs = [];
    $titles = (array) ($_POST['pdfTitle'] ?? []);
    $prices = (array) ($_POST['pdfPrice'] ?? []);
    $descriptions = (array) ($_POST['pdfDesc'] ?? []);
    $ids = (array) ($_POST['pdfId'] ?? []);
    foreach ($titles as $index => $title) {
        $title = trim((string) $title);
        if ($title === '') {
            continue;
        }
        $pdfs[] = [
            'id' => str_cut((string) ($ids[$index] ?? 'pdf-' . ($index + 1)), 40),
            'title' => str_cut($title, 120),
            'price' => max(0, (int) ($prices[$index] ?? 0)),
            'description' => str_cut(trim((string) ($descriptions[$index] ?? '')), 300),
        ];
    }
    $consultation = [
        'price' => max(0, (int) ($_POST['consultPrice'] ?? 0)),
        'themes' => array_values(array_filter(array_map('trim', explode("\n", (string) ($_POST['consultThemes'] ?? ''))))),
    ];
    save_tariffs(['subscription' => $subscription, 'pdfs' => $pdfs, 'consultation' => $consultation]);
    $flash = 'ok';
}

$tariffs = get_tariffs();
$flashGet = (string) ($_GET['saved'] ?? '');
cabinet_head('Тарифы');
?>
<h1>Тарифы и продукты</h1>
<p class="muted">Цены меняются без кода: значения видны клиенту сразу в его кабинете.</p>
<?php if ($flash === 'ok' || $flashGet === 'ok'): ?><div class="msg ok">Тарифы сохранены.</div><?php endif; ?>

<form method="post" class="panel">
  <input type="hidden" name="csrf" value="<?= e(csrf_token()) ?>">
  <h2>Подписка «Полный доступ»</h2>
  <div class="row">
    <label>Цена, ₽<input type="text" name="subPrice" value="<?= e((string) (int) ($tariffs['subscription']['price'] ?? 0)) ?>"></label>
    <label>Период
      <select name="subPeriod">
        <?php foreach (['месяц', '3 месяца', 'год'] as $period): ?>
          <option <?= ($tariffs['subscription']['period'] ?? '') === $period ? 'selected' : '' ?>><?= $period ?></option>
        <?php endforeach; ?>
      </select>
    </label>
  </div>
  <label>Что входит (показывается клиенту)<textarea name="subNote" style="min-height:60px"><?= e((string) ($tariffs['subscription']['note'] ?? '')) ?></textarea></label>

  <h2>PDF-гайды</h2>
  <?php foreach ($tariffs['pdfs'] as $index => $pdf): ?>
    <div class="row" style="margin-bottom:8px">
      <input type="hidden" name="pdfId[]" value="<?= e((string) ($pdf['id'] ?? '')) ?>">
      <label style="flex:1">Название<input type="text" name="pdfTitle[]" value="<?= e((string) ($pdf['title'] ?? '')) ?>"></label>
      <label>Цена, ₽<input type="text" name="pdfPrice[]" value="<?= e((string) (int) ($pdf['price'] ?? 0)) ?>"></label>
      <label style="flex:1.6">Описание<input type="text" name="pdfDesc[]" value="<?= e((string) ($pdf['description'] ?? '')) ?>"></label>
    </div>
  <?php endforeach; ?>
  <div class="row" style="margin-bottom:8px">
    <input type="hidden" name="pdfId[]" value="">
    <label style="flex:1">Название (новый)<input type="text" name="pdfTitle[]" placeholder="Новый PDF-гайд"></label>
    <label>Цена, ₽<input type="text" name="pdfPrice[]" value="790"></label>
    <label style="flex:1.6">Описание<input type="text" name="pdfDesc[]" placeholder="Коротко о содержании"></label>
  </div>

  <h2>Консультация</h2>
  <div class="row">
    <label>Цена, ₽<input type="text" name="consultPrice" value="<?= e((string) (int) ($tariffs['consultation']['price'] ?? 0)) ?>"></label>
  </div>
  <label>Темы (по одной в строке)<textarea name="consultThemes" style="min-height:80px"><?= e(implode("\n", (array) ($tariffs['consultation']['themes'] ?? []))) ?></textarea></label>

  <div class="actions"><button type="submit">Сохранить тарифы</button></div>
</form>

<?php cabinet_foot();
