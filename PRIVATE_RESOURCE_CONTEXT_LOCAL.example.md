# Private Resource Context for Cloud Code

## Important

This file is a **local private context template**.

Rules:

1. Copy this file to:
   `PRIVATE_RESOURCE_CONTEXT_LOCAL.md`
2. Fill in private credentials **manually on your own machine**
3. Do **not** commit the filled file
4. Do **not** paste passwords into public chats or GitHub issues
5. Cloud Code may read this file locally to understand methodology and resource structure

---

## 1. Project Identity

- Project: Black Bear Performance
- Product type: combat sports S&C platform
- Live URL: https://black-bear-performance-mvp.vercel.app/
- Local project folder: `C:\Users\ihork\Documents\Х проект\app`
- GitHub repo: https://github.com/ihorkot12/X

---

## 2. Private Learning / Reference Resources

### 2.1 OTA SamCart course login

- URL:
  `https://overtimeathlete.samcart.com/courses/login`
- Login:
  `[PASTE MANUALLY]`
- Password:
  `[PASTE MANUALLY]`
- Purpose:
  Use for understanding OTA logic, templates, weekly structure, output style, and coaching language.

### 2.2 OTA member portal

- URL:
  `https://my.overtimeathletes.com/`
- Username:
  `[PASTE MANUALLY]`
- Password:
  `[PASTE MANUALLY]`
- Purpose:
  Use for understanding:
  - training structure
  - exercise selection style
  - athlete progression logic
  - week/day presentation style

### 2.3 OTA movement library

- URL:
  `https://movements.overtimeathletes.com/`
- Login if needed:
  `[IF NEEDED, PASTE MANUALLY]`
- Password if needed:
  `[IF NEEDED, PASTE MANUALLY]`
- Purpose:
  Use for:
  - exercise naming
  - movement categories
  - drill inspiration
  - filtering choices for program engine improvements

### 2.4 Google Sheet reference

- URL:
  `https://docs.google.com/spreadsheets/d/1-PKo1BZktckeZ-ZJtY3RAk0s-LGjMXJMMsKpAzIcJOw/edit#gid=0`
- Purpose:
  This is the structural reference for final athlete/coach output.

### 2.5 AI Studio design workspace

- URL:
  `https://aistudio.google.com/apps/6f304628-109e-4fd9-9a2a-45b72e1de5e7?showPreview=true&showAssistant=true`
- Purpose:
  Use for:
  - design critique
  - visual alternatives
  - microcopy
  - screen logic
  Not for final code ownership.

### 2.6 Additional methodology source

- TriPhasic / exercise reference:
  `https://www.xlathlete.com/exercises/`
- Purpose:
  Secondary methodology support for strength/power/tempo logic.

---

## 3. Methodology Interpretation Rules

Cloud Code must **not** blindly clone OTA.

It should use OTA as:

- structure reference
- export reference
- exercise language reference
- progression inspiration

It should use Daru / combat-sports logic as:

- combat specificity
- fighter conditioning logic
- rotational power logic
- repeat-effort logic
- mobility / tissue / prehab emphasis

### Combined product rule

The product should combine:

- **OTA structure and clarity**
- **Daru combat specificity**
- **Black Bear system logic and product constraints**

---

## 4. Program Building Rules for the Agent

When the agent works on program logic, it must follow these rules:

1. Final source of truth is the app’s structured engine, not AI free text
2. Final output must remain OTA-style structured
3. Programs must be filtered by:
   - grappler
   - striker
   - hybrid
4. Program duration:
   - 4 weeks
   - 8 weeks
   - 12 weeks
5. Program must include:
   - warm-up
   - power / speed
   - strength
   - accessory
   - conditioning
   - mobility / prehab
6. Program logic must respect:
   - weekly combat load
   - hard sparring days
   - hard grappling days
   - readiness
   - checkpoint / deload logic
   - taper logic
7. The app must not present random AI-written plans outside the structured format

---

## 5. Portal Rules

The agent must treat the portal as a real working system, not a landing page.

### Athlete portal must do this

- show what to do today
- show current program
- show current week / current day
- allow training completion status
- allow readiness / RPE / weight / pain / notes input
- allow test entry at checkpoints

### Coach portal must do this

- show athlete list
- show linked athletes
- show current logs / check-ins
- show checkpoints / tests
- reopen saved programs
- create new programs
- track who is active today

### Admin portal must do this

- show system-level overview
- help inspect accounts / programs / logs in MVP mode

---

## 6. Design Rules

AI Studio may be used for:

- visual direction
- premium sports-tech critique
- hierarchy fixes
- text / UI wording

Cloud Code must do:

- actual code changes
- local run
- build / lint / typecheck
- browser testing

### Design target

- premium sports-tech
- dark
- practical
- expensive
- strong combat-performance feeling
- not marketing-first
- not generic fitness UI

---

## 7. Security Rules

Cloud Code must:

- never print these passwords into logs
- never commit this file
- never copy credentials into source code
- never expose credentials in README or frontend
- use private resource accounts only for methodology reference, not for permanent secret storage in code

---

## 8. Example Task Instruction for Cloud Code

```text
Before starting, read:
- PROJECT_SPEC_UA.md
- CLOUD_CODE_HANDOFF_UA.md
- CLOUD_CODE_WORKFLOW_UA.md
- PRIVATE_RESOURCE_CONTEXT_LOCAL.md
- AGENTS.md
- README.md
- package.json

Use PRIVATE_RESOURCE_CONTEXT_LOCAL.md only as private methodology context.
Do not print any credentials.
Do not commit that file.

When working on design:
- use AI Studio as critique/reference
- use live URL and screenshots
- implement changes in local code

When working on program logic:
- combine OTA structure with Daru combat specificity
- keep programEngine as source of truth
- preserve OTA-style final export structure
```

---

## 9. Example of the Desired Output Style

The desired athlete-facing result is:

- clear week-by-week structure
- clear day cards
- exact exercise names
- sets / reps / tempo / rest / intensity
- conditioning zones
- notes to coach
- notes to athlete
- warm-up and prehab included
- practical output similar in clarity to the OTA sheet format
