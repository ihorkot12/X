import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import geminiHandler from "./api/gemini.js";
import syncHandler from "./api/sync.js";

const app = express();
const port = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "1mb" }));
app.all("/api/gemini", (req, res) => geminiHandler(req, res));
app.all("/api/sync", (req, res) => syncHandler(req, res));

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
