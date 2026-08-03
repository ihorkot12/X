# Інструкція для роботи з проєктом у Cloud Code / AI cowork

## 1. Мета цього документа

Цей документ потрібен, щоб будь-який AI coding agent у Cloud Code швидко зрозумів проєкт **Black Bear Performance** без зайвих токенів, не лазив по всьому репозиторію без потреби і працював як технічний виконавець, а не як “випадковий генератор коду”.

---

## 2. Головний принцип роботи

AI повинен отримувати:

1. **один короткий master brief**
2. **чіткі правила**
3. **тільки релевантні файли під конкретну задачу**
4. **скріни або UI-референси окремо**

Не треба кожного разу кидати йому весь репозиторій.

---

## 3. Що дати Cloud Code обов’язково

Це мінімальний пакет, який треба дати майже завжди:

1. [PROJECT_SPEC_UA.md](</C:/Users/ihork/Documents/Х проект/app/PROJECT_SPEC_UA.md>)
2. [AGENTS.md](</C:/Users/ihork/Documents/Х проект/app/AGENTS.md>)
3. [README.md](</C:/Users/ihork/Documents/Х проект/app/README.md>)
4. [package.json](</C:/Users/ihork/Documents/Х проект/app/package.json>)
5. [.env.example](</C:/Users/ihork/Documents/Х проект/app/.env.example>)

Цього достатньо, щоб агент зрозумів:

- що це за продукт
- правила роботи
- стек
- як запускати
- які env змінні потрібні

---

## 4. Які файли давати залежно від типу задачі

## 4.1. Якщо задача по логіці програм

Дати:

1. [src/types.ts](</C:/Users/ihork/Documents/Х проект/app/src/types.ts>)
2. [src/lib/programEngine.ts](</C:/Users/ihork/Documents/Х проект/app/src/lib/programEngine.ts>)
3. [src/lib/exerciseLibrary.ts](</C:/Users/ihork/Documents/Х проект/app/src/lib/exerciseLibrary.ts>)
4. [src/lib/priorityScoring.ts](</C:/Users/ihork/Documents/Х проект/app/src/lib/priorityScoring.ts>)

Це пакет для:

- генерації програм
- бойової логіки
- підбору вправ
- readiness/load logic

## 4.2. Якщо задача по фронтенду / дизайну

Дати:

1. [src/App.tsx](</C:/Users/ihork/Documents/Х проект/app/src/App.tsx>)
2. [src/index.css](</C:/Users/ihork/Documents/Х проект/app/src/index.css>)
3. [src/components/ui/Base.tsx](</C:/Users/ihork/Documents/Х проект/app/src/components/ui/Base.tsx>)
4. [src/components/program/ProgramDashboard.tsx](</C:/Users/ihork/Documents/Х проект/app/src/components/program/ProgramDashboard.tsx>)
5. [src/components/sheets/SheetPreview.tsx](</C:/Users/ihork/Documents/Х проект/app/src/components/sheets/SheetPreview.tsx>)
6. [src/components/forms/AssessmentInputs.tsx](</C:/Users/ihork/Documents/Х проект/app/src/components/forms/AssessmentInputs.tsx>)
7. 2–6 актуальних скрінів

Це пакет для:

- UI/UX
- responsive
- layout
- design system

## 4.3. Якщо задача по backend / AI / API

Дати:

1. [server.mjs](</C:/Users/ihork/Documents/Х проект/app/server.mjs>)
2. [api/gemini.js](</C:/Users/ihork/Documents/Х проект/app/api/gemini.js>)
3. [api/sync.js](</C:/Users/ihork/Documents/Х проект/app/api/sync.js>)
4. [src/lib/remoteSync.ts](</C:/Users/ihork/Documents/Х проект/app/src/lib/remoteSync.ts>)
5. [.env.example](</C:/Users/ihork/Documents/Х проект/app/.env.example>)

Це пакет для:

- Gemini integration
- sync
- Neon
- API routes

## 4.4. Якщо задача по deploy / infra

Дати:

1. [vercel.json](</C:/Users/ihork/Documents/Х проект/app/vercel.json>)
2. [.vercel/project.json](</C:/Users/ihork/Documents/Х проект/app/.vercel/project.json>)
3. [package.json](</C:/Users/ihork/Documents/Х проект/app/package.json>)
4. [README.md](</C:/Users/ihork/Documents/Х проект/app/README.md>)
5. [.env.example](</C:/Users/ihork/Documents/Х проект/app/.env.example>)

---

## 5. Що НЕ треба давати агенту без потреби

Не треба давати:

- `node_modules`
- `dist`
- старі логи
- зайві screenshots пачкою
- `.env.local`
- `.git` історію цілком
- випадкові експорти
- усі файли репо, якщо задача вузька

Це просто спалює токени.

---

## 6. Найефективніша схема по токенах

### Схема 1: Master brief + task pack

Кожна сесія повинна мати:

1. `PROJECT_SPEC_UA.md`
2. `AGENTS.md`
3. коротку задачу
4. тільки 3–10 потрібних файлів

Це найкращий баланс між контекстом і токенами.

### Схема 2: Не давати весь код одразу

Правильно:

- “ось продукт, ось правила, ось 5 потрібних файлів”

Неправильно:

- “прочитай весь репозиторій і сам зрозумій”

### Схема 3: Працювати пакетами

Розбивай задачі на пакети:

- engine task
- frontend task
- api task
- deploy task

Тоді агент читає тільки те, що реально потрібно.

---

## 7. Як найкраще працювати з дизайном через AI Studio

AI Studio краще використовувати не як програміста, а як:

- design critic
- UX consultant
- UI concept helper
- microcopy helper

### Для AI Studio давати:

1. короткий UI brief
2. 2–4 скріни поточного стану
3. опис ролей:
   - athlete
   - coach
   - admin
4. список екранів:
   - start
   - onboarding
   - athlete dashboard
   - coach dashboard
   - program page
   - sheet/export page

### Не треба давати AI Studio:

- весь репозиторій
- backend код
- всі env файли
- всю exercise library

### Найкраща роль AI Studio

1. Подивитися на екран
2. Сказати, що в дизайні слабке
3. Запропонувати нову структуру
4. Дати короткі конкретні промти або UI-напрями

Після цього **Cloud Code або coding agent** вносить реальні зміни в код.

---

## 8. Як ділити роботу між Cloud Code і AI Studio

### AI Studio

Використовувати для:

- visual direction
- UX hierarchy
- interface critique
- wording
- screen structure

### Cloud Code

Використовувати для:

- кодингу
- рефакторингу
- тестування
- build
- lint
- typecheck
- deploy

### Правильна схема

1. AI Studio каже, що змінити у візуалі
2. Cloud Code змінює код
3. Cloud Code робить smoke test
4. Після цього знову можна дати нові скріни в AI Studio

---

## 9. Який стартовий prompt давати Cloud Code

Ось хороший короткий prompt:

```text
Ти працюєш над проєктом Black Bear Performance.
Спочатку прочитай тільки ці файли:
- PROJECT_SPEC_UA.md
- AGENTS.md
- README.md
- package.json
- [далі список потрібних файлів під задачу]

Не читай весь репозиторій без потреби.
Не чіпай node_modules, dist, .env.local.
Спочатку коротко опиши, як ти зрозумів задачу і які файли реально будеш змінювати.
Потім внеси зміни, перевір build/typecheck/lint і дай короткий звіт.
```

Це сильно економить токени.

---

## 10. Який prompt давати AI Studio для дизайну

Приклад:

```text
Подивись на цей екран web-додатку для спортсменів і тренерів бойових видів спорту.
Стиль має бути premium sports-tech, dark, professional, expensive, practical.
Не пропонуй маркетинговий лендинг. Це робочий інструмент.

Оціни:
1. візуальну ієрархію
2. чи зрозуміло, що робити далі
3. чи не перевантажений екран
4. що виглядає сиро
5. як це переробити в рамках реального продукту

Дай:
- 1 новий дизайн-напрям
- 5 конкретних UI змін
- 3 короткі промти для coding agent
```

---

## 11. Які документи варто підготувати окремо для постійної роботи

Щоб працювати з мінімумом токенів, добре мати в проєкті окрему папку, наприклад:

`/ai-context`

І там тримати:

1. `PROJECT_BRIEF.md`
2. `WORK_RULES.md`
3. `UI_BRIEF.md`
4. `ENGINE_RULES.md`
5. `DEPLOY_RUNBOOK.md`
6. `DB_SCHEMA.md`
7. `TASK_BOARD.md`

Тоді агенту не доведеться щоразу читати великі файли.

---

## 12. Як формулювати задачі, щоб агент не палив токени

Погано:

- “зроби красиво”
- “подивись весь проєкт”
- “сам розберись”

Добре:

- “покращ mobile layout на Step 6”
- “онови тільки ProgramDashboard.tsx і Base.tsx”
- “не змінюй backend”
- “перевір build і 1 browser flow”

Чим конкретніша задача, тим менше токенів.

---

## 13. Які правила треба завжди нагадувати агенту

1. Не виносити Gemini на frontend
2. Не чіпати секрети
3. Не переписувати архітектуру без потреби
4. Program engine — source of truth
5. AI only advisory
6. Перед завершенням:
   - build
   - typecheck
   - lint
   - smoke test

---

## 14. Мінімальний “ідеальний пакет” для більшості задач

Якщо хочеш максимально економно, то в більшості випадків давай:

1. [PROJECT_SPEC_UA.md](</C:/Users/ihork/Documents/Х проект/app/PROJECT_SPEC_UA.md>)
2. [AGENTS.md](</C:/Users/ihork/Documents/Х проект/app/AGENTS.md>)
3. [README.md](</C:/Users/ihork/Documents/Х проект/app/README.md>)
4. [package.json](</C:/Users/ihork/Documents/Х проект/app/package.json>)
5. один task-specific блок файлів
6. 2–3 актуальні скріни

Це найкращий формат для швидкої й дешевої роботи.

---

## 15. Головна формула ефективної роботи

**Один source of truth документ + вузький набір файлів під задачу + окремі скріни для дизайну + AI Studio для critique, Cloud Code для implementation**
