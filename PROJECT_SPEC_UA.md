# Black Bear Performance: повний опис проєкту, ТЗ і правила роботи

## 1. Що це за проєкт

**Black Bear Performance** — це web-додаток для **спортсменів і тренерів бойових видів спорту**, який допомагає:

- зібрати стабільні дані про спортсмена
- пройти бойовий і фізичний onboarding
- внести тести, силові показники, пульсові зони, ризики, цілі
- автоматично згенерувати структуровану програму підготовки
- вести тренувальний щоденник
- зберігати програми, тести, команди та зв’язки тренер-спортсмен
- виводити фінальний результат у вигляді **OTA-style structured sheet/export**

Проєкт не є просто “чат-ботом для порад”. Його основа — це **структурований програмний рушій**, а AI використовується як **допоміжний консультативний шар**, а не як єдине джерело програми.

---

## 2. Для чого цей продукт потрібен

Основна проблема ринку:

- багато бійців не мають грамотно побудованої силової й кондиційної підготовки
- багато тренерів не вміють системно працювати з 1ПМ, MAS, HR zones, readiness, deload, taper, injury-prehab
- програми часто робляться хаотично: “3-5 на силу”, “10 на рельєф”, без логіки під бійця, період, навантаження і дату старту
- спортсменам потрібен не PDF “для галочки”, а робоча система: план, сьогоднішнє завдання, відмітки, щоденник, контроль прогресу

Продукт вирішує це так:

1. Збирає **стабільний профіль спортсмена**
2. Фіксує **тип бойового профілю**
3. Збирає **assessment і readiness**
4. Генерує **тижневу програму по днях**
5. Дає **структурований фінальний лист/експорт**
6. Дає тренеру і спортсмену **портал для ведення роботи**

---

## 3. Цільова аудиторія

### 3.1. Athlete

Спортсмен, який:

- тренується самостійно або під наглядом тренера
- хоче розуміти, що робити в залі
- хоче мати програму по днях
- хоче відмічати виконання, readiness, вагу, RPE, біль, нотатки

### 3.2. Coach

Тренер, який:

- веде кількох спортсменів
- хоче будувати програми швидше
- хоче не вводити одні й ті самі стабільні дані щоразу
- хоче дивитися логи, тести, програми, команду, прогрес

### 3.3. Admin

Технічна або операційна роль для MVP:

- бачить загальний стан системи
- бачить акаунти, програми, логи
- потрібна для локального MVP-контролю й перевірки

---

## 4. Бойова логіка продукту

Проєкт будується не “для всіх спортсменів”, а конкретно для **combat sports**.

### 4.1. Основні бойові профілі

У продукті зараз закладені три логічні профілі:

- `grappler` — борцівський профіль
- `striker` — ударний профіль
- `hybrid` — змішаний профіль

### 4.2. Практичний сенс профілів

#### Grappler

Акцент:

- posterior chain
- grip / neck / trunk
- repeated efforts
- carries / isometrics

Ризики:

- не ставити важкий хват / шию / спину перед важкою боротьбою

#### Striker

Акцент:

- elastic power
- foot stiffness
- acceleration / deceleration
- rotational power
- aerobic base

Ризики:

- не забивати ноги перед важким спарингом

#### Hybrid

Акцент:

- баланс сили, потужності й кондицій
- контроль втоми
- комбінування ударки і боротьби

Ризики:

- уважно розкладати S&C щодо бойового тижня

---

## 5. Які задачі продукт виконує

### 5.1. Бізнес-задачі

- створити цифровий продукт для продажу програм
- продавати демо / MVP / базовий доступ
- масштабувати роботу тренера
- будувати спільноту навколо методики
- підвести користувача до наставництва, курсів або офлайн-залу

### 5.2. Продуктові задачі

- швидкий onboarding
- генерація програм
- збереження профілю
- збереження історії програм
- трекінг логів
- тести по мікроциклах
- coach-athlete linkage
- фінальний structured export

### 5.3. Технічні задачі

- безпечний backend-only доступ до Gemini
- зберігання даних локально і, за потреби, через Neon sync
- придатність до деплою на Vercel
- можливість швидко розвивати MVP у production продукт

---

## 6. Поточна назва проєкту

### 6.1. Технічна назва

- **Black Bear Performance**
- npm / Vercel slug: `black-bear-performance-mvp`

### 6.2. Поточна product-identity логіка

Black Bear = жорстка, дисциплінована, професійна система для бойової підготовки:

- сила
- контроль
- витривалість
- бойовий функціонал
- тренерська аналітика

### 6.3. Можливі публічні назви

Якщо далі захочеш окремий бренд-неймінг, можна розглядати:

- Black Bear Performance
- Black Bear Combat System
- Black Bear Fight Lab
- Black Bear S&C
- Black Bear Athlete Engine

Рекомендація зараз:

- **залишити Black Bear Performance як master brand**
- а всередині продукту використовувати підписи типу:
  - Combat Performance System
  - Fight Preparation Engine
  - Coach + Athlete Portal

---

## 7. Де проєкт знаходиться і як він організований

### 7.1. Локальна директорія

Проєкт у роботі знаходиться тут:

`C:\Users\ihork\Documents\Х проект\app`

### 7.2. GitHub

Репозиторій:

`https://github.com/ihorkot12/X`

Головна гілка:

- `main`

### 7.3. Деплой

Проєкт задеплоєний на **Vercel**.

Поточний linked Vercel project:

- `black-bear-performance-mvp`

Linked IDs у `.vercel/project.json`:

- `projectId: prj_0J4LZMUPXq6bDIHzDxCFFpGpK0oO`
- `orgId: team_37Cv8jyG9VmkQAX62htD5I0M`

Production alias, який використовується як live URL:

- `https://black-bear-performance-mvp.vercel.app`

Примітка:

- цей URL є production alias проєкту за поточною конфігурацією і останнім успішним деплоєм

---

## 8. Через що все це працює: стек

### 8.1. Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS v4
- Lucide icons

### 8.2. Backend

- Node.js
- Express
- Vite middleware у dev-режимі

### 8.3. AI

- Google Gemini через `@google/genai`
- AI викликається **тільки через backend API route**

### 8.4. База / sync

- базовий режим MVP: localStorage
- опційно: Neon Postgres через `/api/sync`

### 8.5. Hosting / DevOps

- Vercel
- GitHub

---

## 9. Архітектурна логіка

## 9.1. Головний принцип

**Програма генерується не AI-моделлю напряму, а власним структурованим рушієм.**

Це критично.

AI тут використовується для:

- coach notes
- risk explanation
- plain-language explanation
- допоміжних текстових підказок

Але:

- sets / reps / tempo / rest / block logic / structure / week logic
- повинні контролюватися системою продукту

### 9.2. Чому це правильно

Бо якщо дати AI повну свободу, продукт стане:

- нестабільним
- дорогим
- важким для перевірки
- небезпечним з точки зору якості

Тому модель така:

**Engine first, AI second.**

---

## 10. Поточні основні модулі

### 10.1. Auth / account layer

Є локальна логіка:

- реєстрація
- логін
- роль користувача
- збереження поточного session

Типи ролей:

- athlete
- coach
- admin

### 10.2. Combat onboarding

Блок, де вибирається:

- бойовий профіль
- спортивний напрям
- weekly combat load

### 10.3. Athlete profile

Стабільні дані спортсмена:

- ім’я
- вік
- стать
- зріст
- вага
- вид спорту
- рівень
- strength training age
- equipment
- pain / risk flags

### 10.4. Program settings

Керує рамкою блоку:

- 4 / 8 / 12 тижнів
- 2 / 3 / 4 S&C дні
- session duration
- phase
- competition date
- main goal

### 10.5. Assessment

Зараз є:

- squat / trap bar
- bench / push-ups
- pull-ups
- vertical jump
- broad jump
- med ball throw
- 10m sprint
- MAS
- resting HR
- HR max
- sleep
- stress
- soreness
- motivation

### 10.6. Priority scoring

Окремий шар аналізує:

- strength deficit
- power deficit
- aerobic deficit
- repeat effort deficit
- mobility/stability risk
- recovery risk
- combat load risk

### 10.7. Program engine

Генерує:

- summary
- weeks
- days
- session structure
- notes for coach and athlete

### 10.8. Program dashboard

Показує:

- week tabs
- active block
- next session
- day cards
- sectioned exercises
- mobile “one day at a time”

### 10.9. Sheet preview / export

Дає:

- Athlete Profile tab
- Assessment tab
- Goals tab
- Week tabs
- Exercise Notes
- Conditioning Zones
- Testing Checkpoints
- Readiness

Із цього можна експортувати:

- active week CSV
- workbook CSV
- Excel workbook

### 10.10. Training log

Спортсмен або тренер можуть фіксувати:

- дату
- week
- day
- status
- readiness
- RPE
- body weight
- pain note
- training diary notes

### 10.11. Team / membership logic

Тренер може:

- створювати команду
- генерувати join code
- прив’язувати спортсменів
- бачити пов’язані дані

### 10.12. Test history

Зберігає checkpoint тести по мікроциклах:

- дата
- microcycle label
- основні тести
- notes

### 10.13. Gemini coach check

Окремий backend endpoint для AI-питань.

Призначення:

- коротке пояснення ризиків
- уточнення для тренера
- пояснення блоку спортсмену

Не призначення:

- не генерувати всю програму замість engine

---

## 11. Логіка генерації програми

### 11.1. Вхідні дані

Генератор спирається на:

- combatProfile
- combatLoad
- athleteProfile
- programSettings
- assessment

### 11.2. Тижнева структура

Програма працює хвилями:

- build / accumulation
- transmutation
- realization / taper
- checkpoint / deload

Кожен 4-й тиждень може бути checkpoint week.

### 11.3. Шаблони днів

Залежно від кількості S&C днів:

- `strength`
- `upper_trunk`
- `power_conditioning`
- `conditioning_prehab`

### 11.4. Що є в дні

Кожен день містить:

- warm-up
- power / speed
- strength
- accessory
- conditioning
- mobility / prehab

### 11.5. Що впливає на навантаження

- readiness risk
- high combat load
- checkpoint week
- final taper

### 11.6. Output day-level

Для вправ зберігається:

- name
- sets
- reps
- tempo
- rest
- intensity
- notesUa
- notesEn

---

## 12. Логіка exercise library

Бібліотека вправ — одна з найважливіших частин системи.

Кожна вправа має:

- category
- combatProfiles
- pattern
- bodyRegions
- equipment
- level
- phases
- contraindications
- default sets/reps/tempo/rest/intensity
- notes UA / EN
- sourceReference

### 12.1. Джерела логіки вправ

Зараз використовуються 3 маркери походження:

- `OTA-inspired`
- `Daru-inspired`
- `Black Bear`

### 12.2. Як вибирається вправа

Система намагається знайти:

1. релевантну профілю
2. доступну за equipment
3. без конфлікту з pain/risk flags

Якщо є ризик:

- вправа не просто вставляється “як є”
- система додає risk note

---

## 13. Логіка даних і збереження

### 13.1. Базовий режим

У MVP дані зберігаються в browser storage:

- accounts
- session
- athletes
- programs
- training logs
- teams
- memberships
- test history

### 13.2. Remote sync mode

Коли ввімкнений `VITE_BBP_REMOTE_SYNC=true`, додаток може:

- тягнути snapshot з `/api/sync`
- пушити snapshot у `/api/sync`

### 13.3. Що лежить у Neon

Таблиці:

- `bbp_accounts`
- `bbp_athletes`
- `bbp_programs`
- `bbp_training_logs`
- `bbp_teams`
- `bbp_team_memberships`
- `bbp_test_history`

---

## 14. AI-архітектура і правила

### 14.1. Поточний endpoint

`/api/gemini`

### 14.2. Що він робить

- приймає `prompt`
- перевіряє `GEMINI_API_KEY`
- перевіряє account id
- обмежує довжину prompt
- має rate limit
- звертається до `gemini-2.5-flash` за замовчуванням

### 14.3. Захист

Є:

- `MAX_PROMPT_LENGTH = 2500`
- rate limit: `10` запитів на `60` секунд
- backend-only secret usage

### 14.4. Головне правило

**Ніколи не викликати Gemini напряму з фронтенду.**

---

## 15. Environment variables

Потрібні змінні:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (опційно)
- `APP_URL` (опційно)
- `VITE_BBP_REMOTE_SYNC`
- `DATABASE_URL` (для sync)

Файл-шаблон:

- `.env.example`

Локальний секретний файл:

- `.env.local`

---

## 16. Деплой-логіка

### 16.1. Platform

Vercel

### 16.2. Build

У `vercel.json`:

- `buildCommand: npm run build`
- `outputDirectory: dist`
- `framework: vite`

### 16.3. Routing

SPA rewrite:

- усе, що не `/api/*`, ведеться на `index.html`

### 16.4. Functions

API routes:

- `api/*.js`
- `maxDuration: 30`

### 16.5. Local dev

У dev-режимі:

- працює `server.mjs`
- Express підключає Vite middleware

---

## 17. Як треба працювати з продуктом як користувач

### 17.1. Спортсмен

1. Реєструється або логіниться
2. Обирає мову
3. Вибирає роль athlete
4. Проходить combat onboarding
5. Вводить стабільний профіль
6. Вводить assessment
7. Генерує програму
8. Щодня відмічає лог:
   - status
   - readiness
   - RPE
   - pain
   - notes
9. У checkpoint week вносить нові тести

### 17.2. Тренер

1. Реєструється або логіниться
2. Обирає роль coach
3. Створює команди
4. Додає спортсменів / зв’язки
5. Створює або відкриває профіль спортсмена
6. Генерує програму
7. Дивиться logs / tests / history
8. Коригує план наступного циклу

### 17.3. Адмін

1. Входить у роль admin
2. Перевіряє загальний стан MVP
3. Контролює системні дані й smoke-flow

---

## 18. Як треба працювати з продуктом як команді розробки

## 18.1. Головна модель роботи

Рекомендована схема:

- **Codex / senior AI engineer** — архітектура, код, QA, інтеграції, деплой
- **Google AI Studio** — ideation, UI-концепти, UX-варіанти, текстові концепції
- **GitHub** — репозиторій, контроль версій
- **Vercel** — production deploy
- **Neon** — database/sync, коли вмикається remote mode

### 18.2. Як правильно розділяти задачі

#### Gemini / AI Studio

Використовувати для:

- варіантів інтерфейсу
- UX-текстів
- структури екранів
- ідей модулів

Не використовувати як:

- джерело production-коду без перевірки
- джерело секретів
- джерело рішень по безпеці без рев’ю

#### Codex / engineering layer

Використовувати для:

- реального впровадження
- перевірки логіки
- build / test / deploy
- рефакторингу
- фіксів багів

---

## 19. Правила роботи з кодом

### 19.1. Секрети

Заборонено:

- вставляти `GEMINI_API_KEY` у frontend
- комітити `.env.local`
- друкувати ключі в логах
- класти `DATABASE_URL` у клієнтський код

### 19.2. AI-запити

Тільки через backend/API routes.

### 19.3. Source of truth

Для програм:

- **programEngine + exerciseLibrary + structured export**

Для AI:

- advisory only

### 19.4. Не ламати архітектуру

Не можна:

- переписувати весь продукт без потреби
- міняти роль AI з advisory на core generator без окремого рішення

### 19.5. Перед завершенням задачі

Обов’язково:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- хоча б один browser smoke test

---

## 20. Правила роботи з контентом програм

### 20.1. Не робити медичних заяв

Продукт:

- не ставить діагноз
- не лікує травми
- не заміняє лікаря

### 20.2. Не давати “магічні” обіцянки

Не писати:

- “ця програма гарантує перемогу”
- “ця вправа лікує проблему”

### 20.3. Консервативний стиль рекомендацій

Система повинна:

- знижувати обсяг при low readiness
- берегти бойовий графік
- не вбивати техніку заради навантаження

---

## 21. Поточний статус продукту

На сьогодні це **MVP, який уже працює як web app**.

Що вже є:

- ролі
- onboarding
- athlete profile
- assessment
- priority scoring
- program generation
- program dashboard
- sheet preview/export
- logs
- tests
- teams/memberships
- backend Gemini route
- sync architecture
- deploy on Vercel

Що ще потребує розвитку:

- повноцінна production auth
- реальна multi-user команда без локальних обхідних шляхів
- сильніша аналітика прогресу
- кращий mobile workflow для sheet/result
- cleaner UTF-8 normalization деяких текстових нотаток у джерелах вправ
- production-grade admin panel

---

## 22. Яке повне ТЗ на продукт у продуктовому формулюванні

### 22.1. Мета

Створити digital platform для тренерів і спортсменів бойових видів спорту, яка:

- збирає дані
- генерує S&C програми
- дає тренерську логіку
- зберігає історію
- трекає виконання
- формує structured export

### 22.2. Основний MVP scope

Обов’язково:

- roles
- onboarding
- athlete profile
- assessment
- program generation
- daily structure
- notes
- readiness
- logs
- test checkpoints
- team linkage
- final sheet/export

### 22.3. Non-goals для MVP

Не обов’язково на першому етапі:

- billing system
- full marketplace
- advanced analytics BI
- wearable integrations
- push notifications ecosystem

---

## 23. Що є “правильним результатом” для цього проєкту

Правильний результат — це не просто красивий сайт.

Правильний результат:

1. Тренер або спортсмен реєструється
2. Швидко вводить дані
3. Отримує адекватну програму
4. Має структуру на 4/8/12 тижнів
5. Має день-за-днем інструкції
6. Має фінальний документ / sheet
7. Має історію, тести, логи
8. Тренер може масштабувати ведення спортсменів

---

## 24. Правила подальшої роботи над проєктом

### Rule 1

Не втрачати core-logic бойової підготовки заради “AI магії”.

### Rule 2

Усі важливі рішення по програмі мають бути структуровані й перевірювані.

### Rule 3

AI тільки допомагає, але не підміняє методику.

### Rule 4

Фронтенд має бути зручним для реальної тренерської роботи, а не рекламним.

### Rule 5

Будь-яка нова функція повинна відповідати на питання:

- чи вона допомагає тренеру?
- чи вона допомагає спортсмену виконувати план?
- чи вона покращує якість програми?
- чи вона масштабує продукт?

### Rule 6

Перед будь-яким релізом:

- перевірити build
- перевірити typecheck
- перевірити smoke-flow
- перевірити production route

### Rule 7

Секрети, auth і AI ключі не мають з’являтися у клієнтському коді.

---

## 25. Коротка формула проєкту

**Black Bear Performance** =
**combat-sport onboarding + structured S&C engine + coach/athlete portal + OTA-style output + AI advisory layer**
