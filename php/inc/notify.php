<?php
/**
 * Уведомления владельцу о новой заявке.
 *
 * Каналы:
 *  - Telegram Bot API (токен и chat_id в config.php);
 *  - e-mail через mail() хостинга (адрес владельца в config.php).
 *
 * Каждая попытка возвращает статус: sent / failed / skipped.
 * Если канал не настроен — это не ошибка: заявка уже сохранена,
 * в журнале заявки останется пометка «не настроено».
 */

declare(strict_types=1);

function http_post_json(string $url, array $payload, array $headers = [], int $timeout = 8): array
{
    $body = json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($body === false) {
        return ['ok' => false, 'error' => 'Не удалось сериализовать данные'];
    }

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_HTTPHEADER => array_merge(['Content-Type: application/json'], $headers),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => 5,
        ]);
        $response = curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        if ($response === false) {
            return ['ok' => false, 'error' => $error !== '' ? $error : 'Сеть недоступна', 'status' => $status];
        }
        return ['ok' => $status >= 200 && $status < 300, 'status' => $status, 'body' => (string) $response];
    }

    if (!filter_var(ini_get('allow_url_fopen'), FILTER_VALIDATE_BOOLEAN)) {
        return ['ok' => false, 'error' => 'На сервере нет ни curl, ни allow_url_fopen'];
    }

    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", array_merge(['Content-Type: application/json'], $headers)),
            'content' => $body,
            'timeout' => $timeout,
            'ignore_errors' => true,
        ],
    ]);
    $response = @file_get_contents($url, false, $context);
    $status = 0;
    if (isset($http_response_header) && is_array($http_response_header)) {
        foreach ($http_response_header as $line) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#', $line, $m)) {
                $status = (int) $m[1];
            }
        }
    }
    if ($response === false) {
        return ['ok' => false, 'error' => 'HTTP-запрос не выполнен', 'status' => $status];
    }
    return ['ok' => $status >= 200 && $status < 300, 'status' => $status, 'body' => (string) $response];
}

function send_telegram(string $text): array
{
    $token = trim((string) cfg('telegram.botToken', ''));
    $chatId = trim((string) cfg('telegram.chatId', ''));

    if ($token === '' || $chatId === '') {
        return ['channel' => 'telegram', 'status' => 'skipped', 'error' => 'Не настроены telegram.botToken и telegram.chatId'];
    }

    $result = http_post_json(
        'https://api.telegram.org/bot' . $token . '/sendMessage',
        ['chat_id' => $chatId, 'text' => $text, 'disable_web_page_preview' => true]
    );

    if (!$result['ok']) {
        $error = $result['error'] ?? ('HTTP ' . ($result['status'] ?? 0));
        if (!empty($result['body'])) {
            $decoded = json_decode((string) $result['body'], true);
            if (is_array($decoded) && isset($decoded['description'])) {
                $error = (string) $decoded['description'];
            }
        }
        return ['channel' => 'telegram', 'status' => 'failed', 'error' => str_cut($error, 200)];
    }

    return ['channel' => 'telegram', 'status' => 'sent'];
}

function send_email(string $subject, string $text): array
{
    $to = trim((string) cfg('mail.adminEmail', ''));
    if ($to === '' || !filter_var($to, FILTER_VALIDATE_EMAIL)) {
        return ['channel' => 'email', 'status' => 'skipped', 'error' => 'Не настроен mail.adminEmail'];
    }

    $from = trim((string) cfg('mail.from', ''));
    if ($from === '') {
        $host = preg_replace('/^www\./', '', (string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
        $host = preg_replace('/:\d+$/', '', $host);
        $from = 'no-reply@' . ($host !== '' ? $host : 'localhost');
    }

    $headers = [
        'From: ' . $from,
        'Reply-To: ' . $from,
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'MIME-Version: 1.0',
        'X-Mailer: AstraPearl/' . APP_VERSION,
    ];

    $encodedSubject = '=?UTF-8?B?' . base64_encode($subject) . '?=';
    $sent = @mail($to, $encodedSubject, $text, implode("\r\n", $headers));

    return $sent
        ? ['channel' => 'email', 'status' => 'sent']
        : ['channel' => 'email', 'status' => 'failed', 'error' => 'Функция mail() вернула ошибку'];
}

/** Текст уведомления о заявке. */
function lead_notification_text(array $lead): string
{
    $lines = [
        'Новая заявка ' . ($lead['ref'] ?? ''),
        'Направление: ' . (DIRECTION_LABELS[$lead['direction'] ?? ''] ?? '—'),
        'Имя: ' . ($lead['name'] ?? ''),
        'Связь: ' . (CHANNEL_LABELS[$lead['channel'] ?? ''] ?? '—') . ' — ' . ($lead['contact'] ?? ''),
    ];
    if (!empty($lead['question'])) {
        $lines[] = 'Вопрос: ' . $lead['question'];
    }
    if (!empty($lead['birth'])) {
        $lines[] = 'Данные рождения: ' . $lead['birth'];
    }
    if (!empty($lead['calc'])) {
        $lines[] = '';
        $lines[] = 'Расчёт:';
        $lines[] = str_cut((string) $lead['calc'], 1200);
    }
    $siteUrl = rtrim((string) cfg('siteUrl', ''), '/');
    if ($siteUrl !== '') {
        $lines[] = '';
        $lines[] = 'Кабинет: ' . $siteUrl . '/cabinet/';
    }
    return implode("\n", $lines);
}

/** Отправка во все настроенные каналы. Возвращает список статусов. */
function notify_lead(array $lead): array
{
    $text = lead_notification_text($lead);
    $subject = trim((string) cfg('mail.subjectPrefix', 'Заявка с сайта')) . ' ' . ($lead['ref'] ?? '');
    $results = [send_telegram($text), send_email($subject, $text)];
    return array_values(array_filter($results, fn($item) => in_array($item['status'], ['sent', 'failed'], true)));
}
