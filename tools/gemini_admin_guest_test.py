import time
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:3000"


def wait_for_server(timeout=40):
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urlopen(URL, timeout=2) as response:
                if response.status == 200:
                    return
        except Exception:
            time.sleep(1)
    raise RuntimeError("Dev server did not start")


def click_button(page, name):
    page.get_by_role("button", name=name, exact=True).click()


def clear_storage(page):
    page.evaluate(
        """() => {
            for (const key of Object.keys(localStorage)) {
                if (key.startsWith('bbp_')) localStorage.removeItem(key);
            }
        }"""
    )


def main():
    wait_for_server()
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1360, "height": 950})
        page.goto(URL)
        page.wait_for_load_state("networkidle")
        clear_storage(page)
        page.reload()
        page.wait_for_load_state("networkidle")

        click_button(page, "Continue to Combat Profile")
        expect(page.get_by_text("Register or log in first")).to_be_visible()

        click_button(page, "Admin")
        page.get_by_role("textbox", name="Name", exact=True).fill("Admin Tester")
        page.get_by_label("Email").fill("admin@example.com")
        click_button(page, "Register")
        expect(page.get_by_text("Admin overview")).to_be_visible()
        click_button(page, "Logout")

        click_button(page, "Coach")
        page.get_by_role("textbox", name="Name", exact=True).fill("Gemini Coach")
        page.get_by_label("Email").fill("gemini-coach@example.com")
        click_button(page, "Register")
        click_button(page, "Continue to Combat Profile")
        click_button(page, "Next Step")
        page.get_by_role("textbox", name="Name", exact=True).fill("Gemini Fighter")
        page.get_by_label("Age").fill("21")
        page.get_by_label("Height cm").fill("176")
        page.get_by_label("Weight kg").fill("74")
        click_button(page, "Save athlete profile")
        click_button(page, "Next Step")
        click_button(page, "Next Step")
        page.get_by_label("Squat / Trap Bar").fill("140")
        page.get_by_label("Pull-ups").fill("10")
        click_button(page, "Generate Program")
        expect(page.get_by_text("Gemini coach check")).to_be_visible()
        page.get_by_label("Question").fill("Give one short coach note for week 1.")
        click_button(page, "Ask Gemini")
        expect(page.get_by_text("Uses server GEMINI_API_KEY")).to_be_visible()
        expect(page.locator("text=/\\S{8,}/").last).to_be_visible(timeout=30000)

        browser.close()
        print("Gemini/admin/guest test passed")


if __name__ == "__main__":
    main()
