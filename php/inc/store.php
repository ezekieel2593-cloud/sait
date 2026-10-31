<?php
/**
 * Хранилище заявок: один защищённый JSON-файл data/leads.php.
 * Объём заявок для личного кабинета небольшой, поэтому файла достаточно:
 * никаких настроек базы данных на хостинге не требуется.
 */

declare(strict_types=1);

const LEAD_STATUSES = [
    'new' => 'Новая',
    'in_progress' => 'В работе',
    'need_data' => 'Нужны данные',
    'awaiting_client' => 'Ожидает клиента',
    'ready' => 'Готова к отправке',
    'done' => 'Завершена',
    'cancelled' => 'Отменена',
];

const CHANNEL_LABELS = [
    'telegram' => 'Telegram',
    'max' => 'MAX',
    'email' => 'Email',
];

const DIRECTION_LABELS = [
    'astrology' => 'Астрология',
    'matrix' => 'Матрица судьбы',
];

function next_reference(array $leads): string
{
    $year = gmdate('Y');
    $max = 0;
    foreach ($leads as $lead) {
        $ref = (string) ($lead['ref'] ?? '');
        if (preg_match('/^AP-' . $year . '-(\d{3,})$/', $ref, $m)) {
            $max = max($max, (int) $m[1]);
        }
    }
    return sprintf('AP-%s-%03d', $year, $max + 1);
}

function all_leads(): array
{
    $leads = data_read('leads');
    return is_array($leads['items'] ?? null) ? $leads['items'] : [];
}

function find_lead(string $id): ?array
{
    foreach (all_leads() as $lead) {
        if (($lead['id'] ?? '') === $id) {
            return $lead;
        }
    }
    return null;
}

/**
 * Создание заявки. Возвращает сохранённую запись.
 * Все поля уже провалидированы вызывающим кодом.
 */
function create_lead(array $input): array
{
    return data_mutate('leads', function (array $state) use ($input) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        $lead = [
            'id' => 'lead_' . bin2hex(random_bytes(8)),
            'ref' => next_reference($items),
            'name' => $input['name'],
            'direction' => $input['direction'],
            'purpose' => $input['purpose'] ?? 'reading',
            'channel' => $input['channel'],
            'contact' => $input['contact'],
            'question' => $input['question'],
            'consent' => true,
            'calc' => $input['calc'],
            'details' => $input['details'] ?? '',
            'place' => $input['place'] ?? '',
            'birth' => $input['birth'] ?? '',
            'status' => 'new',
            'notes' => '',
            'createdAt' => now_iso(),
            'updatedAt' => now_iso(),
            'ipHash' => ip_hash(),
            'history' => [[
                'type' => 'created',
                'message' => 'Заявка получена с сайта',
                'at' => now_iso(),
                'actor' => 'client',
            ]],
            'notifications' => [],
        ];
        $items[] = $lead;
        $state['items'] = $items;
        return [$state, $lead];
    });
}

/** Добавляет запись в журнал заявки и сохраняет её. */
function append_history(string $id, array $entry, ?string $status = null, ?string $notes = null): ?array
{
    return data_mutate('leads', function (array $state) use ($id, $entry, $status, $notes) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        $updated = null;
        foreach ($items as $index => $lead) {
            if (($lead['id'] ?? '') !== $id) {
                continue;
            }
            $history = is_array($lead['history'] ?? null) ? $lead['history'] : [];
            $history[] = $entry;
            if ($status !== null && $status !== ($lead['status'] ?? '')) {
                $history[] = [
                    'type' => 'status',
                    'message' => (LEAD_STATUSES[$lead['status'] ?? 'new'] ?? '—') . ' → ' . (LEAD_STATUSES[$status] ?? $status),
                    'at' => now_iso(),
                    'actor' => 'owner',
                ];
                $lead['status'] = $status;
            }
            if ($notes !== null) {
                $lead['notes'] = $notes;
            }
            $lead['history'] = $history;
            $lead['updatedAt'] = now_iso();
            $items[$index] = $lead;
            $updated = $lead;
            break;
        }
        $state['items'] = $items;
        return [$state, $updated];
    });
}

function set_lead_status(string $id, string $status, string $comment = ''): ?array
{
    if (!array_key_exists($status, LEAD_STATUSES)) {
        return null;
    }
    $entry = [
        'type' => 'status_note',
        'message' => 'Статус выбран владельцем',
        'at' => now_iso(),
        'actor' => 'owner',
    ];
    $comment = trim($comment);
    if ($comment !== '') {
        // Комментарий виден только в кабинете: клиенту он не отправляется.
        $entry['message'] = 'Комментарий: ' . str_cut($comment, 500);
    }
    return append_history($id, $entry, $status);
}

function set_lead_notes(string $id, string $notes): ?array
{
    return append_history($id, [
        'type' => 'notes',
        'message' => 'Внутренняя заметка обновлена',
        'at' => now_iso(),
        'actor' => 'owner',
    ], null, str_cut($notes, 5000));
}

/** Обезличивание: персональные данные удаляются, история остаётся. */
function anonymize_lead(string $id): ?array
{
    return data_mutate('leads', function (array $state) use ($id) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        $updated = null;
        foreach ($items as $index => $lead) {
            if (($lead['id'] ?? '') !== $id) {
                continue;
            }
            $lead['name'] = 'Удалено по запросу';
            $lead['contact'] = '';
            $lead['question'] = '';
            $lead['calc'] = '';
            $lead['details'] = '';
            $lead['birth'] = '';
            $lead['place'] = '';
            $lead['notes'] = '';
            $history = is_array($lead['history'] ?? null) ? $lead['history'] : [];
            $history[] = [
                'type' => 'anonymized',
                'message' => 'Персональные данные удалены по запросу клиента',
                'at' => now_iso(),
                'actor' => 'owner',
            ];
            $lead['history'] = $history;
            $lead['updatedAt'] = now_iso();
            $items[$index] = $lead;
            $updated = $lead;
            break;
        }
        $state['items'] = $items;
        return [$state, $updated];
    });
}

function save_notifications(string $id, array $notifications): void
{
    data_mutate('leads', function (array $state) use ($id, $notifications) {
        $items = is_array($state['items'] ?? null) ? $state['items'] : [];
        foreach ($items as $index => $lead) {
            if (($lead['id'] ?? '') !== $id) {
                continue;
            }
            $lead['notifications'] = $notifications;
            $summary = [];
            foreach ($notifications as $item) {
                $label = CHANNEL_LABELS[$item['channel']] ?? $item['channel'];
                $summary[] = $label . ': ' . $item['status'] . (!empty($item['error']) ? ' (' . $item['error'] . ')' : '');
            }
            $history = is_array($lead['history'] ?? null) ? $lead['history'] : [];
            $history[] = [
                'type' => 'notifications',
                'message' => $summary === [] ? 'Каналы уведомлений не настроены' : implode('; ', $summary),
                'at' => now_iso(),
                'actor' => 'system',
            ];
            $lead['history'] = $history;
            $items[$index] = $lead;
            break;
        }
        $state['items'] = $items;
        return [$state, null];
    });
}

/** Фильтрация, поиск, сортировка и пагинация списка заявок. */
function query_leads(array $filters): array
{
    $leads = all_leads();

    $search = trim((string) ($filters['search'] ?? ''));
    $status = (string) ($filters['status'] ?? 'all');
    $direction = (string) ($filters['direction'] ?? 'all');

    $filtered = array_values(array_filter($leads, function (array $lead) use ($search, $status, $direction) {
        if ($status !== 'all' && ($lead['status'] ?? '') !== $status) {
            return false;
        }
        if ($direction !== 'all' && ($lead['direction'] ?? '') !== $direction) {
            return false;
        }
        if ($search !== '') {
            $haystack = safe_lower(implode(' ', [
                (string) ($lead['name'] ?? ''),
                (string) ($lead['contact'] ?? ''),
                (string) ($lead['ref'] ?? ''),
                (string) ($lead['question'] ?? ''),
            ]));
            return str_contains($haystack, safe_lower($search));
        }
        return true;
    }));

    $sort = ($filters['sort'] ?? 'new') === 'old' ? 1 : -1;
    usort($filtered, function (array $a, array $b) use ($sort) {
        return strcmp((string) ($a['createdAt'] ?? ''), (string) ($b['createdAt'] ?? '')) * $sort;
    });

    $total = count($filtered);
    $perPage = max(1, (int) ($filters['perPage'] ?? 20));
    $page = max(1, (int) ($filters['page'] ?? 1));
    $offset = ($page - 1) * $perPage;

    return [
        'items' => array_slice($filtered, $offset, $perPage),
        'total' => $total,
        'page' => $page,
        'perPage' => $perPage,
        'pages' => max(1, (int) ceil($total / $perPage)),
    ];
}

function lead_counters(): array
{
    $counters = ['total' => 0];
    foreach (array_keys(LEAD_STATUSES) as $status) {
        $counters[$status] = 0;
    }
    foreach (all_leads() as $lead) {
        $counters['total']++;
        $status = (string) ($lead['status'] ?? 'new');
        $counters[$status] = ($counters[$status] ?? 0) + 1;
    }
    return $counters;
}
