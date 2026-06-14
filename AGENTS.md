# Agent Rules

- Never hardcode or print `GEMINI_API_KEY`, `DATABASE_URL`, Vercel tokens, or any other secret.
- Gemini calls must stay in backend/API routes. Do not call Gemini from public frontend code.
- Use the cheapest practical Flash model for MVP testing unless the owner explicitly approves a different model.
- Keep the structured program engine and OTA-style export as the source of truth; AI output is advisory.
- Before reporting done, run typecheck/build and at least one browser smoke test.
- Do not rewrite the app architecture unless a targeted fix cannot solve the current MVP blocker.
