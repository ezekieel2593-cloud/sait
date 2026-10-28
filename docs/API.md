# API

HTTP API для сайта и мобильного приложения. Бизнес-логика отделена от интерфейса
(`src/lib/services/*`), поэтому приложение получает те же результаты, что и веб-версия.

**Версия:** `1`. Все успешные ответы публичных расчётных маршрутов содержат поле
`apiVersion: "1"`. Несовместимые изменения будут выпущены под новым префиксом пути,
старая версия продолжит работать.

**Форматы.** Запросы и ответы — `application/json; charset=utf-8`. Даты — `YYYY-MM-DD`,
время — `HH:MM`, даты-время в ответах — ISO 8601 (UTC).

**Ошибки.** Всегда JSON с человекочитаемым `error`. Для ошибок валидации добавляется
объект `fields` (`поле → сообщение`), его можно показывать в форме.

| Код | Значение |
| --- | --- |
| 200 | успех |
| 400 | некорректный запрос или идентификатор |
| 401 | требуется авторизация (только кабинет) |
| 403 | запрос отклонён проверкой origin |
| 404 | объект не найден |
| 422 | данные не прошли валидацию (`fields`) |
| 429 | превышен лимит запросов (`Retry-After` в секундах) |
| 500 | внутренняя ошибка |

---

## POST /api/charts/astrology

Расчёт натальной карты.

```json
{
  "date": "1992-06-23",
  "timeAccuracy": "exact",
  "time": "14:30",
  "place": {
    "name": "Москва",
    "region": "Москва",
    "country": "Россия",
    "latitude": 55.7558,
    "longitude": 37.6173,
    "timezone": "Europe/Moscow"
  }
}
```

- `timeAccuracy`: `exact` | `approx` | `unknown`. При `unknown` поле `time` можно не передавать;
  асцендент и дома не рассчитываются.
- `time` обязательно при `exact` и `approx`.
- Год рождения: 1900 — текущий, дата не в будущем.

Ответ:

```json
{
  "apiVersion": "1",
  "calculationId": "calc_…",
  "headline": "Солнце в Рак, Луна в Овен, асцендент в Весы",
  "freeCount": 4,
  "warnings": [],
  "redirectTo": "/astrology/result/calc_…"
}
```

## POST /api/charts/matrix

```json
{ "date": "1992-06-23" }
```

Ответ: `apiVersion`, `calculationId`, `headline`, `freeCount`, `redirectTo`.

Лимит: расчёты ограничены по IP (`RATE_LIMIT_MAX_CALCULATIONS` за `RATE_LIMIT_WINDOW_MS`).

## GET /api/charts/[id]

Чтение сохранённого расчёта. Отдаётся полная карта/матрица и **только бесплатная часть**
интерпретации: закрытые разделы возвращаются списком `lockedTitles` без текста.

```json
{
  "apiVersion": "1",
  "calculationId": "calc_…",
  "direction": "matrix",
  "algorithmVersion": "matrix-22-v1",
  "methodology": "…",
  "createdAt": "2026-10-28T17:58:14.000Z",
  "chart": { "…": "см. engine.ts" },
  "interpretation": {
    "headline": "…",
    "lead": "…",
    "freeCount": 5,
    "totalCount": 17,
    "methodology": "…",
    "version": "matrix-22-v1",
    "warnings": [],
    "limitations": [],
    "sections": [
      { "id": "center", "title": "…", "paragraphs": ["…"], "positive": [], "shadow": [], "recommendations": [], "sourceNote": null }
    ],
    "lockedTitles": ["…"]
  }
}
```

Ответы `no-store`, `X-Robots-Tag: noindex`.

## GET /api/geo/search?q=…

Поиск населённого пункта в локальном справочнике.

```json
{
  "results": [
    { "id": "москва", "name": "Москва", "region": "Москва", "country": "Россия",
      "latitude": 55.7558, "longitude": 37.6173, "timezone": "Europe/Moscow" }
  ]
}
```

Кэшируется на час. Пустой `q` возвращает пустой список.

## POST /api/leads

Заявка на полный разбор. Заявка считается принятой только после сохранения в базе;
уведомления отправляются после этого и не влияют на успех.

```json
{
  "name": "Имя",
  "direction": "astrology",
  "serviceId": "astrology-full",
  "channel": "telegram",
  "contact": "@username",
  "question": "Что важно разобрать?",
  "consent": true,
  "calculationId": "calc_…"
}
```

- `channel`: `telegram` | `max` | `email`; контакт проверяется по каналу
  (для email — адрес, для Telegram/MAX — `@username` или телефон).
- `consent` должен быть `true`.
- `calculationId` необязателен, но если передан — расчёт должен существовать
  и совпадать по направлению.
- Требуется заголовок `Origin` своего домена (защита от CSRF).

Ответ:

```json
{ "apiVersion": "1", "ok": true, "reference": "AP-2026-001", "leadId": "lead_…", "delivered": [], "failed": [] }
```

`delivered` / `failed` — каналы уведомлений специалисту. Пустые массивы означают, что каналы
не настроены; заявка при этом сохранена и видна в кабинете.

Лимит: `RATE_LIMIT_MAX_LEADS` заявок с одного IP за окно, плюс суточный предохранитель.

---

## Кабинет (требуется сессия)

Все маршруты проверяют сессию на сервере и требуют совпадения `Origin` (кроме GET).

| Маршрут | Назначение |
| --- | --- |
| `POST /api/specialist/login` | вход: `{ email, password }`, ставит httpOnly-cookie |
| `POST /api/specialist/logout` | завершение сессии |
| `GET /api/specialist` | текущий пользователь и версия API |
| `POST /api/specialist/leads/[id]/status` | `{ status }` — смена статуса заявки |
| `POST /api/specialist/leads/[id]/notes` | `{ notes }` — внутренняя заметка |
| `POST /api/specialist/leads/[id]/notify` | повторная отправка уведомлений |
| `POST /api/specialist/leads/[id]/anonymize` | обезличивание персональных данных |
| `POST /api/specialist/settings` | частичное обновление настроек |
| `POST /api/specialist/knowledge` | правка записи базы знаний (`id`, `summary`, `positive`, `shadow`, `recommendations`, `methodology`, `sourceId`, `version`) |
| `POST /api/specialist/password` | `{ currentPassword, newPassword, repeatPassword }` |

Статусы заявок: `new`, `in_progress`, `need_data`, `awaiting_client`, `ready`, `done`, `cancelled`.
Каждое изменение статуса, заметки и обезличивание фиксируются в истории заявки.

Публичного API к персональным данным нет: списки и карточки заявок доступны только
серверным страницам кабинета.
