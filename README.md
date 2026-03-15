# uDev Creator — Инструкция по деплою

## Структура проекта

```
udev-server/          ← этот архив (бэкенд)
├── server.js         ← главный сервер
├── package.json      ← зависимости
├── railway.toml      ← настройки Railway
└── public/           ← сюда кладём HTML файл
    └── index.html    ← ваш udev-creator-phantom.html (переименовать!)

udev-creator-phantom.html  ← фронтенд (деплоить на Vercel)
```

---

## ШАГ 1 — Деплой бэкенда на Railway (бесплатно)

### 1.1 Создайте GitHub репозиторий

1. Зайдите на [github.com](https://github.com) → New Repository
2. Назовите `udev-server` → Create
3. Загрузите файлы: `server.js`, `package.json`, `railway.toml`, `.gitignore`

### 1.2 Задеплойте на Railway

1. Зайдите на [railway.app](https://railway.app)
2. Нажмите **"New Project"** → **"Deploy from GitHub repo"**
3. Выберите ваш репозиторий `udev-server`
4. Railway автоматически обнаружит Node.js и задеплоит

### 1.3 Получите URL сервера

После деплоя Railway выдаст URL вида:
```
https://udev-server-production-xxxx.railway.app
```
**Скопируйте этот URL** — он понадобится на шаге 2.

---

## ШАГ 2 — Настройте URL в HTML файле

Откройте `udev-creator-phantom.html` в текстовом редакторе.

Найдите эту строку (около строки 10):
```javascript
window.UDEV_SERVER = 'https://udev-server.railway.app';
```

Замените на ваш реальный URL с Railway:
```javascript
window.UDEV_SERVER = 'https://udev-server-production-xxxx.railway.app';
```

---

## ШАГ 3 — Деплой фронтенда на Vercel (бесплатно)

1. Зайдите на [vercel.com](https://vercel.com)
2. Нажмите **"Add New Project"**
3. Выберите **"Browse"** или перетащите файл `udev-creator-phantom.html`
4. Нажмите **Deploy**

Vercel выдаст URL:
```
https://udev-creator-xxxx.vercel.app
```

🎉 **Готово! Ваш сайт работает!**

---

## ШАГ 4 — Проверка

Откройте ваш Vercel URL и проверьте:
- [ ] Страница загружается
- [ ] Кнопка "Connect Phantom" работает
- [ ] Pinata JWT сохраняется
- [ ] При нажатии Deploy — появляется окно Phantom

---

## Что делает сервер

| Endpoint | Что делает |
|----------|-----------|
| `POST /api/pumpfun/ipfs` | Загружает изображение + метаданные на pump.fun IPFS |
| `POST /api/pumpfun/trade-local` | Получает транзакцию создания токена от pump.fun |
| `GET /api/token/:ca` | Данные токена по контракт адресу (для Vamp) |
| `GET /api/search?q=...` | Поиск токенов через DexScreener |
| `POST /api/balance` | Баланс SOL кошелька |
| `GET /api/sol-price` | Текущий курс SOL/USD |

---

## Проблемы и решения

**"Cannot connect to server"**
→ Проверьте что Railway деплой завершился успешно
→ Откройте `https://ваш-url.railway.app/health` — должен вернуть `{"status":"ok"}`

**"pump.fun API: 403"**
→ pump.fun обновил защиту. Напишите в поддержку uDev или используйте альтернативный лаунчпад

**"Phantom not found"**
→ Установите расширение Phantom из [phantom.app](https://phantom.app)
→ Сайт должен быть на HTTPS (Vercel делает это автоматически)

---

## Стоимость

| Сервис | Бесплатно | Платно |
|--------|-----------|--------|
| Railway | 5$ кредитов при регистрации | $5/мес после |
| Vercel | Полностью бесплатно | — |
| Pinata | 1GB бесплатно | $20/мес за 100GB |
| Twitter API | 500k запросов/мес | $100/мес Basic |
