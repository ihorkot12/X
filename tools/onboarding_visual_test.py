from pathlib import Path

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:4176"
ARTIFACTS = ROOT / "design-screenshots" / "current"


def register(page, email: str) -> None:
    page.get_by_role("button", name="Почати налаштування").click()
    page.get_by_text("Покращити результат", exact=True).click()
    page.locator('label:has(input[name="sessionsPerWeek"][value="3"])').click()
    page.get_by_role("button", name="Продовжити").click()
    page.get_by_label("Ваше ім’я").fill("Тестовий спортсмен")
    page.get_by_label("Електронна пошта").fill(email)
    page.get_by_label("Пароль", exact=True).fill("testing-pass-2026")
    page.get_by_text("Погоджуюся з умовами", exact=False).click()
    page.get_by_role("button", name="Продовжити").click()
    page.get_by_text("Athlete", exact=True).click()
    page.get_by_role("button", name="Продовжити").click()
    page.get_by_role("button", name="Підтвердити й завершити").click()
    expect(page.get_by_role("heading", name="Бойовий профіль")).to_be_visible()


def assert_page_health(page, errors: list[str]) -> None:
    overflow = page.evaluate(
        "document.documentElement.scrollWidth - document.documentElement.clientWidth"
    )
    assert overflow == 0, f"Horizontal overflow: {overflow}px"
    assert not errors, "\n".join(errors)


def run_viewport(browser, width: int, height: int, prefix: str) -> None:
    context = browser.new_context(viewport={"width": width, "height": height})
    page = context.new_page()
    errors: list[str] = []
    page.on(
        "console",
        lambda message: errors.append(f"console:{message.type}:{message.text}")
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))
    page.goto(URL, wait_until="networkidle")
    page.evaluate("localStorage.clear()")
    page.reload(wait_until="networkidle")

    expect(page.get_by_role("heading", name="Сильні рішення починаються з ясної картини.")).to_be_visible()
    heading_style = page.locator("h1").evaluate(
        "element => ({outline: getComputedStyle(element).outline, border: getComputedStyle(element).border, boxShadow: getComputedStyle(element).boxShadow})"
    )
    print(prefix, "heading-style", heading_style)
    page.screenshot(path=str(ARTIFACTS / f"{prefix}-welcome.png"), full_page=True)
    assert_page_health(page, errors)

    register(page, f"{prefix}@example.com")
    page.wait_for_timeout(700)
    page.screenshot(path=str(ARTIFACTS / f"{prefix}-combat-profile.png"), full_page=True)
    assert_page_health(page, errors)
    context.close()


def run_login(browser) -> None:
    context = browser.new_context(viewport={"width": 1280, "height": 900})
    page = context.new_page()
    errors: list[str] = []
    page.on(
        "console",
        lambda message: errors.append(f"console:{message.type}:{message.text}")
        if message.type == "error"
        else None,
    )
    page.on("pageerror", lambda error: errors.append(f"page:{error}"))
    page.goto(URL, wait_until="networkidle")
    page.evaluate(
        """
        localStorage.clear();
        localStorage.setItem('bbp_accounts_v1', JSON.stringify([{
          id: 'login-athlete',
          name: 'Login спортсмен',
          email: 'login@example.com',
          role: 'athlete',
          createdAt: new Date().toISOString()
        }]));
        """
    )
    page.reload(wait_until="networkidle")
    page.get_by_role("button", name="У мене вже є акаунт").click()
    page.get_by_label("Електронна пошта").fill("login@example.com")
    page.get_by_label("Пароль", exact=True).fill("testing-pass-2026")
    page.get_by_role("button", name="Увійти").click()
    expect(page.get_by_role("heading", name="Кабінет: Login спортсмен")).to_be_visible()
    assert_page_health(page, errors)
    context.close()


def main() -> None:
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        run_viewport(browser, 1440, 1000, "onboarding-desktop")
        run_viewport(browser, 390, 844, "onboarding-mobile")
        run_login(browser)
        browser.close()
    print("Onboarding registration and login flows passed")


if __name__ == "__main__":
    main()
