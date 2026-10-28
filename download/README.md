# Готовый архив для хостинга

Здесь лежат собранные архивы (собираются командой `npm run package:release`):

| Файл | Что это |
| --- | --- |
| `astra-pearl-hosting.zip` | production-сборка (Next.js standalone) + заполненная база + утилиты |
| `astra-pearl-hosting.tar.gz` | то же самое для Linux-серверов |

Требования: **Node.js 22.5+** и постоянный диск.

```bash
unzip astra-pearl-hosting.zip -d /srv
cd /srv/astra-pearl
cp .env.example .env            # AUTH_SECRET, NEXT_PUBLIC_SITE_URL, DATABASE_PATH
node tools/create-specialist.mjs --email you@example.com --name "Имя" --password 'длинный-пароль'
./start.sh
```

Внутри архива: `HOSTING.md` (инструкция), `docs/` (деплой, интеграции, методика, API).
