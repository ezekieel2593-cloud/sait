<?php
/**
 * Тарифы и продукты: подписка, PDF-гайды, консультации.
 * Значения редактирует специалист в панели (data/tariffs.php), здесь — чтение.
 *
 * GET /api/tariffs.php
 */

declare(strict_types=1);

require_once __DIR__ . '/../inc/bootstrap.php';
require_once __DIR__ . '/../inc/users.php';

header('Cache-Control: no-store, max-age=0');

if (!host_is_same_origin()) {
    json_out(['error' => 'Запрос отклонён'], 403);
}

json_out(['ok' => true, 'tariffs' => get_tariffs()]);
