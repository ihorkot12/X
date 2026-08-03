import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import authHandler from "./api/auth.js";
import geminiHandler from "./api/gemini.js";
import syncHandler from "./api/sync.js";
import teamJoinHandler from "./api/team-join.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "1mb" }));
app.all(["/api/auth", "/api/auth/:action"], (req, res) => authHandler(req, res));
app.all("/api/gemini", (req, res) => geminiHandler(req, res));
app.all("/api/sync", (req, res) => syncHandler(req, res));
app.all("/api/team-join", (req, res) => teamJoinHandler(req, res));
app.use((error, req, res, next) => {
  if (!req.path.startsWith("/api/")) return next(error);
  const isTooLarge = error?.type === "entity.too.large";
  const isInvalidJson = error instanceof SyntaxError && error?.type === "entity.parse.failed";
  if (!isTooLarge && !isInvalidJson) return next(error);
  res.status(isTooLarge ? 413 : 400).json({
    error: isTooLarge ? "Request body is too large." : "Request body must be valid JSON.",
  });
});

if (isProduction) {
  app.use(express.static("dist"));
  app.get("*", (_req, res) => res.sendFile(new URL("./dist/index.html", import.meta.url).pathname));
} else {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.listen(port, "0.0.0.0", () => {
  console.log(`Black Bear Performance app running on http://localhost:${port}`);
});
