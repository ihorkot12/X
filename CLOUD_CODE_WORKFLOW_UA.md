# Cloud Code / AI Studio workflow для Black Bear Performance

## 1. Актуальний стан проєкту

### Назва проєкту

- Product name: **Black Bear Performance**
- Tech / deploy slug: **black-bear-performance-mvp**

### Де задеплоєно

- Hosting: **Vercel**
- Production URL: [https://black-bear-performance-mvp.vercel.app/](https://black-bear-performance-mvp.vercel.app/)

Примітка:

- production URL перевірений 4 липня 2026 року

### Де код

#### Локально на ПК

Коренева робоча папка:

`C:\Users\ihork\Documents\Х проект\app`

#### GitHub

Репозиторій:

`https://github.com/ihorkot12/X`

Branch:

- `main`

### Ключові службові документи

Обов’язково тримати під рукою:

- [PROJECT_SPEC_UA.md](</C:/Users/ihork/Documents/Х проект/app/PROJECT_SPEC_UA.md>)
- [CLOUD_CODE_HANDOFF_UA.md](</C:/Users/ihork/Documents/Х проект/app/CLOUD_CODE_HANDOFF_UA.md>)
- [AGENTS.md](</C:/Users/ihork/Documents/Х проект/app/AGENTS.md>)
- [README.md](</C:/Users/ihork/Documents/Х проект/app/README.md>)
- [package.json](</C:/Users/ihork/Documents/Х проект/app/package.json>)
- [.env.example](</C:/Users/ihork/Documents/Х проект/app/.env.example>)

---

## 2. Як має працювати Cloud Code в цьому проєкті

Cloud Code повинен працювати у **гібридній схемі**:

1. **Дизайн і UX**:
   - через **AI Studio у браузері**
   - через скріни
   - через live URL
   - через короткі дизайн-брифи

2. **Код і виправлення**:
   - через **локальні файли на ПК**
   - або через **GitHub repo**
   - або через **filesystem / browser / GitHub / Vercel plugins**, якщо вони доступні

3. **Перевірка і дебаг**:
   - локальний запуск
   - console / build errors
   - browser smoke tests
   - production verification

Головна ідея:

- **AI Studio не повинна бути головним редактором коду**
- **Cloud Code не повинен вигадувати дизайн без реального візуального фідбеку**

---

## 3. Найкраща схема роботи

## Режим A: AI Studio для дизайну, Cloud Code для коду

Це рекомендований режим.

### Кроки

1. Відкрити в браузері:
   - live URL
   - або локальний dev server
   - або preview в AI Studio

2. Дати AI Studio:
   - 2–4 скріни
   - короткий UI brief
   - список екранів
   - опис, що саме не подобається

3. Отримати від AI Studio:
   - 1 дизайн-напрям
   - 5–10 конкретних UI змін
   - короткі prompts/instructions для coding agent

4. Передати це Cloud Code разом із frontend-файлами

5. Cloud Code:
   - змінює код
   - запускає build/typecheck/lint
   - проганяє browser smoke flow

6. Після цього знову можна повернути нові скріни в AI Studio

---

## Режим B: Cloud Code працює локально на ПК

Це найкраще для:

- виправлення помилок
- build issues
- backend routes
- програми і логіки
- роботу з великим кодом

### Що треба

Cloud Code повинен мати доступ до:

- локальної папки проєкту
- terminal / commands
- файлів
- логів

### Що він має робити

1. Прочитати тільки потрібні документи
2. Не читати весь repo без потреби
3. Внести правки
4. Перевірити:
   - `npm run typecheck`
   - `npm run lint`
   - `npm run build`
5. При потребі:
   - запустити dev server
   - відкрити сторінку
   - подивитися помилки

---

## Режим C: Cloud Code працює через GitHub

Це запасний режим, якщо Cloud Code не має нормального доступу до локальної папки.

### Як працювати

1. Дати:
   - GitHub URL
   - branch
   - ключові markdown документи
   - task-specific files

2. Якщо треба багато локального контексту:
   - закомітити нові markdown-інструкції в repo
   - не кидати великий context просто в чат

### Мінус

- через GitHub складніше працювати з локальними логами, dev server і живими помилками

---

## 4. Що саме давати Cloud Code

## 4.1. Завжди давати

Мінімальний пакет:

1. `PROJECT_SPEC_UA.md`
2. `CLOUD_CODE_HANDOFF_UA.md`
3. `AGENTS.md`
4. `README.md`
5. `package.json`

Це ядро.

## 4.2. Для фронтенду

Дати:

1. `src/App.tsx`
2. `src/index.css`
3. `src/components/ui/Base.tsx`
4. `src/components/program/ProgramDashboard.tsx`
5. `src/components/sheets/SheetPreview.tsx`
6. `src/components/forms/AssessmentInputs.tsx`
7. 2–6 актуальних скрінів

## 4.3. Для програмної логіки

Дати:

1. `src/types.ts`
2. `src/lib/programEngine.ts`
3. `src/lib/exerciseLibrary.ts`
4. `src/lib/priorityScoring.ts`

## 4.4. Для backend / Gemini / sync

Дати:

1. `server.mjs`
2. `api/gemini.js`
3. `api/sync.js`
4. `src/lib/remoteSync.ts`
5. `.env.example`

## 4.5. Для deploy / hosting

Дати:

1. `vercel.json`
2. `.vercel/project.json`
3. `README.md`
4. `package.json`

---

## 5. Що НЕ давати Cloud Code без потреби

Не треба давати:

- `node_modules`
- `dist`
- `.env.local`
- повну `.git` історію
- весь `design-screenshots`
- старі артефакти
- великі дампи логів без конкретної проблеми

Це спалює токени і знижує якість роботи.

---

## 6. Де Cloud Code має брати дизайн

Дизайн Cloud Code не повинен вигадувати “всліпу”.

### Джерела дизайну:

1. **AI Studio**
2. **live URL**
3. **локальний preview**
4. **скріни**

### Який підхід правильний

Cloud Code повинен:

- дивитися на скріни
- читати короткий UI brief
- вносити зміни в код
- перевіряти сторінки в браузері

А AI Studio повинна:

- критикувати
- пропонувати варіанти
- давати UI-напрям

---

## 7. Якщо Cloud Code працює через браузер AI Studio

Якщо він працює “через браузер з AI Studio”, то модель має бути така:

### AI Studio у браузері використовується для:

- дизайн-напряму
- UX
- screen structure
- microcopy
- critique по скрінах

### Але код він повинен брати:

- або з локальної папки на ПК
- або з GitHub repo
- або через plugin/connector до filesystem

### Правильна практика

Не треба намагатися зробити так, щоб AI Studio стала IDE.

Краще:

1. AI Studio дивиться на UI
2. Cloud Code править локальний код
3. Cloud Code запускає локально
4. Cloud Code або ти даєте нові скріни в AI Studio

---

## 8. Якщо Cloud Code має доступ до локального комп’ютера

Це найкращий сценарій.

### Він повинен мати доступ до:

- папки:
  `C:\Users\ihork\Documents\Х проект\app`
- terminal
- браузера
- логів

### Які файли для старту

Відкривати спочатку:

- `PROJECT_SPEC_UA.md`
- `AGENTS.md`
- `README.md`
- `package.json`

А далі тільки task-specific files.

### Які команди він повинен вміти запускати

Основні:

```bash
npm install
npm run dev
npm run typecheck
npm run lint
npm run build
```

### Які файли логів корисні

У проєкті вже можуть бути:

- `dev-server.out.log`
- `dev-server.err.log`

Якщо є проблема, агенту краще давати саме ці логи, а не “знайди сам усе”.

---

## 9. Якщо Cloud Code хоче скачати файли

Є 3 нормальні варіанти.

## Варіант 1 — найкращий

Працювати прямо з локальною папкою.

Це краще, ніж скачувати щось окремо.

## Варіант 2

Працювати через GitHub repo:

- клонувати repo
- працювати з `main`
- або окремою гілкою

## Варіант 3

Зробити **маленький task pack**:

- zip тільки потрібних файлів
- markdown docs
- 2–4 screenshots

Це корисно, якщо доступ до repo або local FS незручний.

---

## 10. Якщо Cloud Code працює через plugins / connectors

Найкорисніші канали:

### GitHub

Для:

- читання repo
- внесення змін
- push / PR / branch work

### Vercel

Для:

- розуміння, де live deploy
- перевірки deploy status
- production verification

### Browser / Chrome

Для:

- live review
- smoke flow
- скрінів
- form test

### Filesystem / local files

Для:

- швидкого читання реального коду
- роботи без зайвого копіювання

---

## 11. Як правильно ставити задачі Cloud Code

Погано:

- “подивись весь проект”
- “зроби красиво”
- “сам розберись”

Добре:

- “онови Step 6 mobile layout”
- “виправ тільки ProgramDashboard.tsx і Base.tsx”
- “не чіпай backend”
- “перевір build і browser flow”

### Ідеальний формат задачі

1. Що треба зробити
2. Які файли читати
3. Які файли не чіпати
4. Як перевірити результат

---

## 12. Готовий prompt для Cloud Code

```text
Працюємо над Black Bear Performance.

Актуальний production deploy:
https://black-bear-performance-mvp.vercel.app/

Локальна папка проєкту:
C:\Users\ihork\Documents\Х проект\app

GitHub repo:
https://github.com/ihorkot12/X

Спочатку прочитай тільки:
- PROJECT_SPEC_UA.md
- CLOUD_CODE_HANDOFF_UA.md
- AGENTS.md
- README.md
- package.json
- [далі список task-specific файлів]

Не читай весь репозиторій без потреби.
Не чіпай node_modules, dist, .env.local, старі screenshots.

Цей проєкт працює так:
- AI Studio / browser = дизайн, UX, critique
- Cloud Code = локальний код, помилки, збірка, перевірка, deploy

Спочатку коротко опиши:
1. як ти зрозумів задачу
2. які файли реально треба змінити
3. що чіпати не треба

Потім виконай задачу.

Після цього обов’язково:
- npm run typecheck
- npm run lint
- npm run build
- browser smoke test

В кінці дай:
- changed files
- що зроблено
- які перевірки пройдені
- що ще лишилось
```

---

## 13. Готовий prompt для AI Studio

```text
Подивись на цей екран Black Bear Performance.

Production URL:
https://black-bear-performance-mvp.vercel.app/

Це не лендинг, а робочий premium sports-tech інструмент для спортсменів і тренерів бойових видів спорту.

Оціни:
1. visual hierarchy
2. clarity of action
3. information density
4. what feels raw
5. what should be made more premium

Дай:
- 1 сильний дизайн-напрям
- 5 конкретних UI змін
- 3 короткі instructions для coding agent
```

---

## 14. Що робити, якщо треба правити дизайн

Правильний workflow:

1. Відкрити live URL або local preview
2. Зняти скріни
3. Дати скріни в AI Studio
4. Отримати короткий список змін
5. Передати список у Cloud Code
6. Cloud Code вносить зміни у:
   - `src/App.tsx`
   - `src/index.css`
   - `src/components/ui/Base.tsx`
   - інші потрібні frontend files
7. Прогнати перевірки
8. Повторити цикл

---

## 15. Що робити, якщо треба правити логіку програми

Правильний workflow:

1. Дати Cloud Code:
   - `src/types.ts`
   - `src/lib/programEngine.ts`
   - `src/lib/exerciseLibrary.ts`
   - `src/lib/priorityScoring.ts`
2. Чітко сформулювати:
   - що саме не так у логіці
   - для якого профілю
   - на якому етапі
3. Попросити не чіпати UI без потреби
4. Після правок прогнати build/typecheck/lint

---

## 16. Що робити, якщо треба правити AI / sync / backend

Дати Cloud Code:

- `server.mjs`
- `api/gemini.js`
- `api/sync.js`
- `src/lib/remoteSync.ts`
- `.env.example`

Окремо вказати:

- чи працюємо тільки локально
- чи потрібен Neon sync
- чи треба перевірка deploy

---

## 17. Головне правило ефективності

**Cloud Code повинен працювати локально з кодом і помилками, а AI Studio — з візуалом, UX і короткими дизайн-інструкціями.**

Саме ця схема дає:

- найменше витрат токенів
- найменше хаосу
- найшвидший прогрес
- найкращу якість результату
