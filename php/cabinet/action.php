<?php
/**
 * Действия над заявкой: статус, заметка, обезличивание, повтор уведомлений.
 * Все запросы — POST с CSRF-токеном из сессии.
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/store.php';
require_once __DIR__ . '/../inc/auth.php';
require_once __DIR__ . '/../inc/notify.php';

session_start_once();
if (!is_logged_in()) {
    header('Location: index.php', true, 303);
    app_exit();
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !csrf_valid($_POST['csrf'] ?? null)) {
    http_response_code(400);
    app_exit('Некорректный запрос');
}

$id = (string) ($_POST['id'] ?? '');
$action = (string) ($_POST['action'] ?? '');
$lead = find_lead($id);

if ($lead === null) {
    http_response_code(404);
    app_exit('Заявка не найдена');
}

$flash = '';

try {
    switch ($action) {
        case 'status':
            if (set_lead_status($id, (string) ($_POST['status'] ?? ''), (string) ($_POST['comment'] ?? '')) !== null) {
                $flash = 'status';
            }
            break;

        case 'notes':
            set_lead_notes($id, (string) ($_POST['notes'] ?? ''));
            $flash = 'notes';
            break;

        case 'anonymize':
            anonymize_lead($id);
            $flash = 'anonymized';
            break;

        case 'notify':
            $limit = rate_limit('notify:' . $id, 6, 10);
            if ($limit['allowed']) {
                $notifications = notify_lead($lead);
                save_notifications($id, $notifications);
            }
            $flash = 'notified';
            break;
    }
} catch (Throwable $error) {
    // Запись не удалась (права на data/): не показываем «сохранено».
    error_log('astra: не удалось сохранить изменения — ' . $error->getMessage());
    $flash = 'save_failed';
}

header('Location: lead.php?id=' . urlencode($id) . ($flash !== '' ? '&saved=' . $flash : ''), true, 303);
app_exit();
