import subprocess
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


def is_server_running():
    try:
        with urlopen(URL, timeout=2) as response:
            return response.status == 200
    except Exception:
        return False


def main():
    server = None
    if not is_server_running():
        server = subprocess.Popen(
            ["cmd", "/c", "npm", "run", "dev", "--", "--port", "3000", "--host", "127.0.0.1"],
            cwd=ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    try:
        wait_for_server()
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(viewport={"width": 1360, "height": 950})
            page.goto(URL)
            page.wait_for_load_state("networkidle")
            page.evaluate(
                """() => {
                    localStorage.removeItem('bbp_accounts_v1');
                    localStorage.removeItem('bbp_session_v1');
                    localStorage.removeItem('bbp_saved_athletes_v1');
                    localStorage.removeItem('bbp_saved_programs_v1');
                    localStorage.removeItem('bbp_training_logs_v1');
                }"""
            )
            page.reload()
            page.wait_for_load_state("networkidle")

            page.get_by_role("textbox", name="Name", exact=True).fill("Persistence Coach")
            page.get_by_label("Email").fill("persist@example.com")
            page.get_by_role("button", name="Register", exact=True).click()
            expect(page.get_by_text("Signed in")).to_be_visible()
            expect(page.get_by_text("Workbench")).to_be_visible()

            page.get_by_role("button", name="Continue to Combat Profile", exact=True).click()
            page.get_by_label("Select combat profile: Striker + Grappler").click()
            try:
                page.get_by_role("button", name="Next Step", exact=True).click(timeout=5000)
            except Exception:
                buttons = page.locator("button").evaluate_all("(items) => items.map((item) => item.innerText)")
                raise AssertionError(f"Next Step unavailable after saving athlete. Buttons: {buttons}")

            page.get_by_role("textbox", name="Name", exact=True).fill("Saved Fighter")
            page.get_by_label("Age").fill("24")
            page.get_by_label("Height cm").fill("178")
            page.get_by_label("Weight kg").fill("76")
            page.get_by_role("button", name="Save athlete profile", exact=True).click()
            expect(page.get_by_text("Saved Fighter").first).to_be_visible()
            try:
                page.get_by_role("button", name="Next Step", exact=True).click(timeout=5000)
            except Exception:
                buttons = page.locator("button").evaluate_all("(items) => items.map((item) => item.innerText)")
                body = page.locator("body").inner_text(timeout=5000)
                raise AssertionError(f"Next Step unavailable after saving athlete. Buttons: {buttons}. Body: {body[:1500]}")
            try:
                page.get_by_role("button", name="Next Step", exact=True).click(timeout=5000)
            except Exception:
                buttons = page.locator("button").evaluate_all("(items) => items.map((item) => item.innerText)")
                body = page.locator("body").inner_text(timeout=5000)
                raise AssertionError(f"Next Step unavailable after settings. Buttons: {buttons}. Body: {body[:1500]}")
            page.get_by_role("button", name="Generate Program", exact=True).click()
            expect(page.get_by_role("button", name="Week 1 Accumulation")).to_be_visible()
            page.get_by_role("button", name="Preview Google Sheets", exact=True).click()

            page.get_by_label("Training diary").fill("Felt sharp, keep power work.")
            page.get_by_role("button", name="Save log", exact=True).click()
            expect(page.get_by_text("Felt sharp, keep power work.")).to_be_visible()

            counts = page.evaluate(
                """() => ({
                    accounts: JSON.parse(localStorage.getItem('bbp_accounts_v1') || '[]').length,
                    session: Boolean(localStorage.getItem('bbp_session_v1')),
                    athletes: JSON.parse(localStorage.getItem('bbp_saved_athletes_v1') || '[]').length,
                    programs: JSON.parse(localStorage.getItem('bbp_saved_programs_v1') || '[]').length,
                    logs: JSON.parse(localStorage.getItem('bbp_training_logs_v1') || '[]').length,
                })"""
            )
            assert counts["accounts"] == 1
            assert counts["session"]
            assert counts["athletes"] == 1
            assert counts["programs"] == 1
            assert counts["logs"] == 1

            page.reload()
            page.wait_for_load_state("networkidle")
            expect(page.get_by_text("Signed in")).to_be_visible()
            expect(page.get_by_text("Saved Fighter").first).to_be_visible()
            expect(page.get_by_text("Recent programs")).to_be_visible()
            expect(page.get_by_text("Recent logs")).to_be_visible()
            page.get_by_role("button", name="Open latest plan", exact=True).click()
            expect(page.get_by_text("Week 8")).to_be_visible()

            browser.close()
            print("Coach persistence test passed")
    finally:
        if server:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()


if __name__ == "__main__":
    main()
