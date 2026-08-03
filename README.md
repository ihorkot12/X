# Black Bear Performance MVP

Вебплатформа для спортсменів і тренерів бойових видів спорту: профіль спортсмена, квіз, оцінювання, детермінована генерація програми на 4-12 тижнів, щоденник, контрольні тести, команди, OTA-style експорт і серверний Gemini-помічник.

Методична архітектура описана в [PROGRAM_PLATFORM_ARCHITECTURE_UA.md](./PROGRAM_PLATFORM_ARCHITECTURE_UA.md). Структурована програма та затверджені правила є джерелом істини; Gemini лише пояснює або перевіряє готовий план.

## Локальний запуск

Потрібен Node.js 18 або новіший.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Відкрийте `http://localhost:3000`.

Для локального режиму без Neon залиште `VITE_BBP_REMOTE_SYNC=false`. Дані зберігатимуться у браузері й можуть експортуватися як резервна JSON-копія.

## Production-режим

Для справжніх облікових записів і синхронізації встановіть:

```text
DATABASE_URL=...
VITE_BBP_REMOTE_SYNC=true
DEMO_MODE=false
```

У цьому режимі реєстрація й вхід працюють через серверну сесію в захищеній `HttpOnly` cookie. Публічно можна зареєструвати лише спортсмена або тренера. Ролі адміністратора й редактора методики призначаються серверними allowlist-змінними.

## Gemini

Додайте ключ лише в `.env.local` або секрети Vercel:

```text
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.5-flash
```

Ключ не потрапляє у frontend. Запити йдуть через `/api/gemini`, мають перевірку сесії, обмеження довжини, rate limit та обробку помилок.

## Перевірки

```bash
npm run lint
npm run typecheck
npm test
npm run test:coverage
npm run test:integration
npm run build
npm run test:e2e
npm audit --audit-level=low
```

Playwright перевіряє desktop і mobile. Якщо Windows блокує автоматичний дочірній запуск preview-процесу, окремо запустіть `npm run preview:test`, а потім `npx playwright test`.

## Змінні середовища

- `GEMINI_API_KEY` - серверний ключ Gemini.
- `GEMINI_MODEL` - Flash-модель для помічника.
- `DATABASE_URL` - Neon Postgres.
- `VITE_BBP_REMOTE_SYNC` - вмикає production auth/sync у frontend.
- `DEMO_MODE` - локальний compatibility-режим; у production має бути `false`.
- `ADMIN_EMAILS` - адреси, яким сервер призначає роль адміністратора.
- `METHODOLOGY_EDITOR_EMAILS` - адреси редакторів методики.
- `APP_URL` - публічна адреса застосунку.

## Деплой

Проєкт налаштований для Vercel. Root directory має вказувати на `app`, а всі production-змінні додаються в Project Settings -> Environment Variables. Після деплою потрібно перевірити реєстрацію, `/api/auth/me`, командне приєднання, синхронізацію, Gemini і збереження даних після оновлення сторінки.
