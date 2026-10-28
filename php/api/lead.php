<?php
/**
 * POST /api/lead.php — приём заявки с сайта.
 *
 * Порядок действий: проверка → сохранение → уведомления.
 * Ответ отдаёт номер заявки, поэтому клиент показывает «заявка принята»
 * только после реальной записи в файл данных.
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/store.php';
require_once __DIR__ . '/../inc/notify.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    json_out(['error' => 'Метод не поддерживается'], 405);
}

if (!host_is_same_origin()) {
    json_out(['error' => 'Запрос отклонён'], 403);
}

$body = read_json_body();

// Ловушка для ботов: люди это поле не видят и не заполняют.
if (!empty($body['trap'])) {
    json_out(['error' => 'Заявка отклонена'], 422);
}

try {
    $limit = rate_limit('lead:' . ip_hash(), (int) cfg('limits.leadsPerWindow', 5), (int) cfg('limits.windowMinutes', 15));
} catch (Throwable $error) {
    // Нет прав на data/ или диск недоступен: честно сообщаем, что заявка не сохранена.
    error_log('astra: лимиты недоступны — ' . $error->getMessage());
    json_out(['error' => 'Приём заявок временно недоступен. Напишите, пожалуйста, напрямую в мессенджер или на почту.'], 500);
}

if (!$limit['allowed']) {
    json_out(['error' => 'Заявка уже отправлена. Если нужно связаться снова — напишите на указанную почту.'], 429);
}

$fields = [];
$name = trim((string) ($body['name'] ?? ''));
$direction = (string) ($body['direction'] ?? '');
$channel = (string) ($body['channel'] ?? '');
$contact = trim((string) ($body['contact'] ?? ''));
$question = trim((string) ($body['question'] ?? ''));
$consent = ($body['consent'] ?? false) === true;
$calc = trim((string) ($body['calc'] ?? ''));
$birth = trim((string) ($body['birth'] ?? ''));
$place = trim((string) ($body['place'] ?? ''));

if (str_len($name) < 2 || str_len($name) > 80) {
    $fields['name'] = 'Укажите имя (от 2 до 80 символов)';
}
if (!in_array($direction, ['astrology', 'matrix'], true)) {
    $fields['direction'] = 'Неизвестное направление';
}
if (!in_array($channel, ['telegram', 'max', 'email'], true)) {
    $fields['channel'] = 'Выберите способ связи';
} else {
    $contactError = validate_contact($channel, $contact);
    if ($contactError !== null) {
        $fields['contact'] = $contactError;
    }
}
if (str_len($question) > 1000) {
    $fields['question'] = 'Слишком длинный текст (до 1000 символов)';
}
if (str_len($calc) > 6000) {
    $calc = str_cut($calc, 6000);
}
if (!$consent) {
    $fields['consent'] = 'Без согласия на обработку данных заявку принять нельзя';
}

if ($fields !== []) {
    json_out(['error' => 'Проверьте поля формы', 'fields' => $fields], 422);
}

try {
    $lead = create_lead([
        'name' => $name,
        'direction' => $direction,
        'channel' => $channel,
        'contact' => $contact,
        'question' => $question,
        'calc' => $calc,
        'birth' => str_cut($birth, 300),
        'place' => str_cut($place, 200),
    ]);
} catch (Throwable $error) {
    error_log('astra: не удалось сохранить заявку — ' . $error->getMessage());
    json_out(['error' => 'Не удалось сохранить заявку. Попробуйте ещё раз.'], 500);
}

$notifications = notify_lead($lead);
save_notifications($lead['id'], $notifications);

json_out([
    'ok' => true,
    'apiVersion' => '1',
    'reference' => $lead['ref'],
    'id' => $lead['id'],
    'delivered' => array_values(array_map(
        fn($item) => $item['channel'],
        array_filter($notifications, fn($item) => $item['status'] === 'sent')
    )),
]);
