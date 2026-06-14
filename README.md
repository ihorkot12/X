# Black Bear Performance MVP

Web MVP for combat-sport athletes and coaches: registration, athlete/coach/admin roles, combat profile quiz, assessment inputs, program generation, OTA-style sheet preview/export, team portal, training diary, checkpoint tests, and a backend-only Gemini coach-check endpoint.

## Local Run

Prerequisite: Node.js 18+.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set:
   ```bash
   GEMINI_API_KEY=your_key_here
   ```
3. Start the app with API routes:
   ```bash
   npm run dev
   ```
4. Open:
   ```text
   http://localhost:3000
   ```

## Checks

```bash
npm run lint
npm run build
```

Browser tests live in `tools/` and can be run after the dev server starts.

## Environment Variables

- `GEMINI_API_KEY`: required for `/api/gemini`, server-only.
- `GEMINI_MODEL`: optional, defaults to `gemini-2.5-flash`.
- `VITE_BBP_REMOTE_SYNC`: set to `true` only when Neon sync is configured.
- `DATABASE_URL`: optional Neon Postgres connection string for `/api/sync`.

## Deployment

Deploy to Vercel from the `app` directory. Add `GEMINI_API_KEY` in Vercel Project Settings -> Environment Variables for Production/Preview. Add `DATABASE_URL` only if remote sync is enabled.
