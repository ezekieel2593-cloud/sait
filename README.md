# SAIT — сайт студии веб-продуктов

Статический одностраничный сайт без сборки: чистые HTML, CSS и JavaScript.
Готов к публикации на GitHub Pages, Netlify, Vercel или любом статическом хостинге.

![cover](assets/img/og-cover.svg)

## Структура

```
.
├── index.html               # главная страница (лендинг)
├── 404.html                 # страница ошибки
├── assets/
│   ├── css/styles.css       # все стили, токены темы, адаптив
│   ├── js/main.js           # тема, меню, анимации, валидация формы
│   └── img/                 # favicon.svg, og-cover.svg
├── robots.txt
├── .nojekyll                # отключает Jekyll на GitHub Pages
└── .github/workflows/pages.yml  # автодеплой в GitHub Pages
```

## Локальный запуск

Достаточно открыть `index.html` в браузере. Если нужен HTTP-сервер:

```bash
python3 -m http.server 8000
# → http://localhost:8000
```

или

```bash
npx serve .
```

## Что уже работает

- Тёмная и светлая темы с сохранением выбора (`localStorage`) и учётом системной настройки
- Адаптив от 320px: мобильное меню-бургер, перестроение сеток
- Появление блоков при прокрутке, счётчики, подсветка карточек курсором
- Активный пункт меню по текущей секции
- FAQ-аккордеон (открыт один пункт за раз)
- Валидация формы заявки с сообщениями об ошибках и состояниями отправки
- Поддержка `prefers-reduced-motion`, скип-ссылка, фокус-стили, семантика и aria-атрибуты

## Как настроить под себя

| Что менять | Где |
|---|---|
| Тексты, блоки, цены, отзывы | `index.html` |
| Цвета, шрифты, радиусы, тени | переменные в `:root` и `[data-theme="light"]` в `assets/css/styles.css` |
| Логотип и favicon | `assets/img/favicon.svg`, инлайн-SVG `.logo__mark` в `index.html` |
| Отправка формы | функция-заглушка в конце `assets/js/main.js` (замените `setTimeout` на `fetch` к вашему API, Formspree или Telegram-боту) |
| Контакты | блок `footer` в `index.html` |

## Деплой на GitHub Pages

1. Settings → Pages → Source: **GitHub Actions**.
2. Пуш в `main` запускает workflow `.github/workflows/pages.yml` — сайт публикуется автоматически.

Для работы на своём домене добавьте файл `CNAME` с нужным доменом.
