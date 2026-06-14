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
            page = browser.new_page(viewport={"width": 1280, "height": 900})
            page.goto(URL)
            page.wait_for_load_state("networkidle")
            page.evaluate(
                """() => {
                    localStorage.removeItem('bbp_accounts_v1');
                    localStorage.removeItem('bbp_session_v1');
                    localStorage.removeItem('bbp_saved_athletes_v1');
                    localStorage.removeItem('bbp_training_logs_v1');
                }"""
            )
            page.reload()
            page.wait_for_load_state("networkidle")

            page.get_by_role("textbox", name="Name", exact=True).fill("Validation Coach")
            page.get_by_label("Email").fill("validation@example.com")
            page.get_by_role("button", name="Register", exact=True).click()
            page.get_by_role("button", name="Continue to Combat Profile", exact=True).click()
            page.get_by_role("button", name="Next Step", exact=True).click()
            page.get_by_role("button", name="Next Step", exact=True).click()
            expect(page.get_by_text("Athlete name is required")).to_be_visible()
            expect(page.get_by_text("Age must be between 12 and 70.")).to_be_visible()
            expect(page.get_by_text("Weight must be realistic in kg.")).to_be_visible()
            expect(page.get_by_text("Height must be realistic in cm.")).to_be_visible()
            browser.close()
            print("Validation test passed")
    finally:
        if server:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()


if __name__ == "__main__":
    main()
