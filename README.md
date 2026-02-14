# 📱 UniFlow - Telegram Mini App для СДО РГСУ

**Современный мобильный интерфейс для СДО РГСУ прямо в Telegram!**

---

## 🎯 Что это?

**UniFlow** - это Telegram Mini App (TWA), который позволяет **всем студентам РГСУ**:

✅ Просматривать курсы прямо в Telegram
✅ Смотреть расписание занятий
✅ Получать уведомления о заданиях
✅ Не устанавливать отдельное приложение
✅ Работает на iOS, Android, Desktop

---

## 🚀 Преимущества Telegram Mini App

| Обычное веб-приложение | Telegram Mini App |
|------------------------|-------------------|
| Нужен домен и хостинг | Работает внутри Telegram |
| Нужно устанавливать PWA | Открывается по ссылке |
| Сложная авторизация | Авто-вход через Telegram |
| Push уведомления платные | Бесплатные уведомления |
| Нужно делать для iOS/Android | Работает везде одинаково |

---

## 📁 Структура проекта

```
uniflow-telegram/
├── index.html          # Основная страница приложения
├── styles.css          # Стили (адаптивные под Telegram темы)
├── app.js             # Логика приложения + Telegram WebApp API
└── README.md          # Эта инструкция
```

---

## 🛠 Как создать Telegram Mini App

### Шаг 1: Создайте бота через @BotFather

1. Откройте Telegram
2. Найдите **@BotFather**
3. Отправьте `/newbot`
4. Придумайте имя: `UniFlow RGSU`
5. Придумайте username: `uniflow_rgsu_bot` (должен быть уникальный)
6. Сохраните токен бота

### Шаг 2: Загрузите файлы на хостинг

**Вариант 1: GitHub Pages (бесплатно)**

```bash
# 1. Создайте репозиторий на GitHub
# 2. Загрузите файлы: index.html, styles.css, app.js
# 3. В настройках репозитория включите GitHub Pages
# 4. Ваше приложение будет по адресу:
# https://username.github.io/repo-name/
```

**Вариант 2: Vercel (бесплатно, проще)**

```bash
# 1. Установите Vercel CLI
npm i -g vercel

# 2. В папке uniflow-telegram выполните
vercel

# 3. Следуйте инструкциям
# 4. Получите URL типа https://uniflow-telegram.vercel.app
```

**Вариант 3: Netlify (бесплатно)**

1. Перетащите папку `uniflow-telegram` на https://app.netlify.com/drop
2. Готово! Получите URL

### Шаг 3: Настройте Mini App в боте

Вернитесь в **@BotFather** и выполните:

```
/setmenubutton
# Выберите вашего бота
# Отправьте:
text: Открыть UniFlow
url: https://your-app-url.com

# ИЛИ используйте /newapp для полноценного Mini App:
/newapp
# Выберите бота
# Название: UniFlow
# Короткое имя: uniflow
# Описание: Современный интерфейс для СДО РГСУ
# Загрузите иконку (512x512 px)
# URL: https://your-app-url.com
```

### Шаг 4: Добавьте кнопку для открытия

В @BotFather:

```
/mybots
# Выберите бота
# Bot Settings -> Menu Button
# Введите:
text: 🚀 Открыть UniFlow
url: https://your-app-url.com
```

---

## ⚙️ Настройка Backend (опционально)

Для работы с реальными данными СДО нужен backend.

**Минимальный backend (Python + FastAPI):**

```python
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import hashlib
import hmac

app = FastAPI()

# CORS для Telegram
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://web.telegram.org"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ваш BOT_TOKEN от @BotFather
BOT_TOKEN = "your_bot_token_here"

def verify_telegram_data(init_data: str):
    """Проверка что запрос от Telegram"""
    try:
        parsed = dict(item.split('=') for item in init_data.split('&'))
        data_check_string = '\n'.join(f"{k}={v}" for k, v in sorted(parsed.items()) if k != 'hash')
        secret_key = hmac.new("WebAppData".encode(), BOT_TOKEN.encode(), hashlib.sha256).digest()
        calculated_hash = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256).hexdigest()
        return calculated_hash == parsed.get('hash')
    except:
        return False

@app.post("/api/sdo/login")
async def sdo_login(request: Request):
    # Проверяем что запрос от Telegram
    init_data = request.headers.get('X-Telegram-Init-Data')
    if not verify_telegram_data(init_data):
        return {"error": "Unauthorized"}

    data = await request.json()
    username = data.get('username')
    password = data.get('password')
    telegram_id = data.get('telegram_id')

    # Здесь логика входа в СДО
    # Используйте код из uniflow-backend/main.py

    return {
        "success": True,
        "token": "..."
    }

@app.get("/api/sdo/courses")
async def get_courses(request: Request):
    # Получить курсы для пользователя
    pass

# Запуск: uvicorn main:app --host 0.0.0.0 --port 8000
```

Деплой backend:
- **Railway.app** - бесплатно, автодеплой из GitHub
- **Render.com** - бесплатно, простая настройка
- **Heroku** - платно, но надежно

В `app.js` измените:
```javascript
const API_URL = 'https://your-backend.railway.app/api';
```

---

## 🎨 Кастомизация

### Изменить цвета

В `styles.css`:
```css
:root {
    --primary: #667eea;  /* Основной цвет */
    --primary-dark: #5568d3;
    --gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
```

### Добавить иконку/логотип

Замените в `index.html`:
```html
<div class="logo">📚</div>
<!-- НА -->
<div class="logo"><img src="logo.png" width="64" height="64"></div>
```

### Изменить название

В `index.html`:
```html
<title>UniFlow - СДО РГСУ</title>
<!-- И в настройках бота через @BotFather -->
```

---

## 📱 Как пользоваться (для студентов)

1. **Откройте бот** `@uniflow_rgsu_bot` (или ваше имя)
2. **Нажмите кнопку** "🚀 Открыть UniFlow" внизу
3. **Войдите** с логином и паролем от СДО РГСУ
4. **Готово!** Теперь можете:
   - Смотреть курсы
   - Проверять расписание
   - Получать уведомления

---

## 🔐 Безопасность

### Где хранятся данные?

- **Логин/пароль СДО** - в Telegram Cloud Storage (зашифровано)
- **Кэш курсов** - в Cloud Storage
- **Токен авторизации** - только на сервере

### Telegram Cloud Storage

Telegram предоставляет безопасное хранилище:
- Объем: до 1024 записей
- Зашифровано end-to-end
- Синхронизируется между устройствами
- Очищается при удалении бота

### Верификация запросов

В `app.js` все запросы к API содержат:
```javascript
headers: {
    'X-Telegram-Init-Data': tg.initData
}
```

На backend проверяется что запрос действительно от Telegram.

---

## 🆕 Возможности Telegram WebApp API

### Haptic Feedback (вибрация)

```javascript
tg.HapticFeedback.impactOccurred('light'); // light, medium, heavy
tg.HapticFeedback.notificationOccurred('success'); // success, warning, error
```

### Главная кнопка

```javascript
tg.MainButton.text = 'Обновить данные';
tg.MainButton.show();
tg.MainButton.onClick(() => {
    // Действие
});
```

### Popup сообщения

```javascript
tg.showAlert('Данные обновлены!');
tg.showConfirm('Выйти?', (confirmed) => {
    if (confirmed) { /* ... */ }
});
```

### Открыть ссылку

```javascript
tg.openLink('https://sdo.rgsu.net/course/123');
```

### Получить данные пользователя

```javascript
const user = tg.initDataUnsafe.user;
console.log(user.id, user.first_name, user.username);
```

### Закрыть приложение

```javascript
tg.close();
```

---

## 📊 Аналитика (опционально)

Добавьте счетчики использования:

```javascript
// В app.js
async function trackEvent(eventName, data = {}) {
    await api.request('/analytics/track', {
        method: 'POST',
        body: JSON.stringify({
            telegram_id: AppState.tgUser.id,
            event: eventName,
            data: data,
            timestamp: Date.now()
        })
    });
}

// Использование
trackEvent('page_view', { page: 'courses' });
trackEvent('course_opened', { course_id: '123' });
```

На backend сохраняйте в БД для аналитики.

---

## 🔔 Push уведомления

Отправляйте уведомления через Telegram Bot API:

**Python пример:**

```python
import requests

def send_notification(user_id, message):
    BOT_TOKEN = "your_bot_token"
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"

    data = {
        "chat_id": user_id,
        "text": message,
        "parse_mode": "HTML",
        "reply_markup": {
            "inline_keyboard": [[
                {
                    "text": "Открыть UniFlow",
                    "web_app": {"url": "https://your-app-url.com"}
                }
            ]]
        }
    }

    requests.post(url, json=data)

# Использование
send_notification(
    user_id=123456789,
    message="📚 <b>Новое задание</b>\n\nИнформационные технологии\nСрок: 15.02.2026"
)
```

**Автоматические уведомления:**

Настройте cron job, который:
1. Раз в час проверяет новые события в СДО
2. Отправляет уведомления студентам

---

## 🐛 Troubleshooting

### Приложение не открывается

- Проверьте что HTTPS (HTTP не работает)
- Проверьте URL в настройках бота
- Откройте консоль браузера (в Telegram Desktop)

### "Telegram is not defined"

Убедитесь что подключен скрипт:
```html
<script src="https://telegram.org/js/telegram-web-app.js"></script>
```

### Не работают кнопки

Проверьте что функции экспортированы:
```javascript
window.switchPage = switchPage;
window.openCourse = openCourse;
```

### Данные не сохраняются

CloudStorage может не работать в браузере. Fallback на localStorage:
```javascript
async function saveToCloud(key, value) {
    try {
        await tg.CloudStorage.setItem(key, value);
    } catch {
        localStorage.setItem(key, value); // Fallback
    }
}
```

---

## 📚 Полезные ссылки

- **Telegram WebApp Docs**: https://core.telegram.org/bots/webapps
- **Bot API**: https://core.telegram.org/bots/api
- **@BotFather**: https://t.me/BotFather
- **Примеры Mini Apps**: https://github.com/telegram-mini-apps

---

## 🎓 Для разработчиков

### Локальная разработка

```bash
# Запустите локальный сервер
python -m http.server 8080
# ИЛИ
npx serve .

# Откройте в браузере
# http://localhost:8080
```

**Важно:** Telegram WebApp API работает только внутри Telegram!
Для тестирования используйте Telegram Desktop или:

```
https://web.telegram.org/k/#?tgWebAppData=...
```

### Деплой через GitHub Actions

Создайте `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

---

## 📞 Поддержка

**Разработчик:** Алексей, IVT-B-02-D-2025-1
**Telegram:** @your_username
**GitHub:** https://github.com/your-username/uniflow-telegram

---

## 📄 Лицензия

MIT License

---

**Сделано с ❤️ для студентов РГСУ**

🚀 **Начните прямо сейчас!** Загрузите файлы на GitHub Pages и создайте бота через @BotFather!
