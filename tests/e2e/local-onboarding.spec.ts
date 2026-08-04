import { expect, test } from "@playwright/test";

test("an athlete can complete the local onboarding workflow", async ({ page }, testInfo) => {
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

  await expect(
    page.getByRole("heading", { name: "Сильні рішення починаються з ясної картини." }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("onboarding-start.png"), fullPage: true });
  await page.getByRole("button", { name: "Почати налаштування" }).click();
  await expect(page.getByRole("heading", { name: "На який вид спорту будуємо підготовку?" })).toBeVisible();
  await page.getByText("MMA", { exact: true }).click();
  await page.getByRole("button", { name: "Продовжити" }).click();
  await page.getByText("Покращити результат", { exact: true }).click();
  await page.locator('label:has(input[name="sessionsPerWeek"][value="4"])').click();
  await page.getByRole("button", { name: "Продовжити" }).click();

  await page.getByLabel("Ваше ім’я").fill("Локальний тестовий спортсмен");
  await page.getByLabel("Електронна пошта").fill("local-athlete@example.test");
  await page.getByText("Погоджуюся з умовами", { exact: false }).click();
  await page.getByRole("button", { name: "Продовжити" }).click();

  await page.getByText("Спортсмен", { exact: true }).click();
  await page.getByRole("button", { name: "Продовжити" }).click();
  await page.getByRole("button", { name: "Підтвердити й завершити" }).click();

  await expect(page.getByRole("heading", { name: "Бойовий профіль" })).toBeVisible();
  await expect(page.getByText("Тижневе бойове навантаження", { exact: true })).toBeVisible();
  await expect(page.getByText("8 тиж. / 4 дні", { exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("onboarding-complete.png"), fullPage: true });

  const viewportFits = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth + 1,
  );
  expect(viewportFits).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(failedCoreRequests).toEqual([]);
});
