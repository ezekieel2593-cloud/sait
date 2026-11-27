<?php
/**
 * Действия с клиентом: выдать/отключить подписку, прикрепить/удалить PDF.
 * Все запросы — POST с CSRF-токеном сессии специалиста.
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/auth.php';
require_once __DIR__ . '/../inc/users.php';

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
$user = find_user($id);
$back = 'clients.php';

if ($user === null) {
    header('Location: ' . $back . '?saved=err', true, 303);
    app_exit();
}

$ok = false;
switch ($action) {
    case 'grant':
        $months = max(1, min(24, (int) ($_POST['months'] ?? 1)));
        $ok = user_mutate($id, static function (array $user) use ($months): array {
            $from = subscription_active($user)
                ? (string) $user['subscriptionUntil']
                : gmdate('Y-m-d');
            $base = new DateTimeImmutable($from);
            $user['subscriptionUntil'] = $base->modify('+' . $months . ' months')->format('Y-m-d');
            return $user;
        }) !== null;
        break;

    case 'revoke':
        $ok = user_mutate($id, static function (array $user): array {
            $user['subscriptionUntil'] = null;
            return $user;
        }) !== null;
        break;

    case 'uploadPdf':
        $file = $_FILES['pdf'] ?? null;
        if (
            $file === null
            || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK
            || !is_uploaded_file((string) ($file['tmp_name'] ?? ''))
        ) {
            header('Location: ' . $back . '?saved=err', true, 303);
            app_exit();
        }
        // Простая проверка подписи PDF: %PDF- в первых байтах.
        $head = (string) @file_get_contents((string) $file['tmp_name'], false, null, 0, 8);
        if (!str_starts_with($head, '%PDF-')) {
            header('Location: ' . $back . '?saved=err', true, 303);
            app_exit();
        }
        if ((int) $file['size'] > 40 * 1024 * 1024) {
            header('Location: ' . $back . '?saved=err', true, 303);
            app_exit();
        }
        [$item, $error] = add_library_item(
            $id,
            (string) ($_POST['title'] ?? ''),
            (string) $file['tmp_name'],
            (string) ($file['name'] ?? 'guide.pdf'),
        );
        $ok = $error === null;
        break;

    case 'deletePdf':
        $ok = delete_library_item($id, (string) ($_POST['itemId'] ?? ''));
        break;
}

header('Location: ' . $back . '?saved=' . ($ok ? 'ok' : 'err'), true, 303);
app_exit();
