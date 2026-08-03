import { expect, test } from "@playwright/test";

test("a local account can enter the deterministic program workflow", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedCoreRequests: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    if (request.url().startsWith("http://127.0.0.1:4173")) {
      failedCoreRequests.push(`${request.method()} ${request.url()}`);
    }
  });

  await page.addInitScript(() => localStorage.clear());
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Black Bear" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Створюйте блоки. Проводьте тренування. Стежте за прогресом." })).toBeVisible();

  await page.getByLabel("Ім'я").first().fill("Локальний тестовий спортсмен");
  await page.getByLabel("Електронна пошта").fill("local-athlete@example.test");
  await page.getByRole("button", { name: "Зареєструватися" }).click();

  await expect(page.getByText("Вхід виконано", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /До профілю бійця/ }).click();
  await expect(page.getByText("Тижневе бойове навантаження", { exact: true })).toBeVisible();

  const viewportFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(viewportFits).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedCoreRequests).toEqual([]);
});
