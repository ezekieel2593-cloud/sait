<?php
/** Временный зонд: минимальный PHP-ответ. Удалить после диагностики хостинга. */
http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
echo json_encode(['ping' => 'pong', 'php' => PHP_VERSION, 'time' => gmdate('c')]);
