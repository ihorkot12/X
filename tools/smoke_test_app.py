import subprocess
import time
from pathlib import Path
from urllib.request import urlopen

from playwright.sync_api import expect, sync_playwright


ROOT = Path(__file__).resolve().parents[1]
URL = "http://127.0.0.1:3000"
ARTIFACTS = ROOT / "test-artifacts"


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


def is_server_running():
    try:
        with urlopen(URL, timeout=2) as response:
            return response.status == 200
    except Exception:
        return False


def main():
    ARTIFACTS.mkdir(exist_ok=True)
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
            page = browser.new_page(viewport={"width": 1440, "height": 1100})
            errors = []
            page.on("console", lambda msg: errors.append(f"{msg.type}: {msg.text}") if msg.type in {"error", "warning"} else None)
            page.goto(URL)
            page.wait_for_load_state("networkidle")
            page.screenshot(path=str(ARTIFACTS / "01-start.png"), full_page=True)

            expect(page.get_by_text("Set who is creating the plan")).to_be_visible()
            click_button(page, "Coach")
            page.get_by_role("textbox", name="Name", exact=True).fill("Smoke Coach")
            page.get_by_label("Email").fill("smoke@example.com")
            click_button(page, "Register")
            click_button(page, "Continue to Combat Profile")

            expect(page.get_by_text("Classify the fighter first.")).to_be_visible()
            click_button(page, "Kickboxing")
            click_button(page, "Select combat profile: Striker")
            page.get_by_label("Striking").fill("4")
            page.get_by_label("Grappling").fill("0")
            page.get_by_label("Hard sparring").fill("2")
            page.get_by_label("Hard wrestling").fill("0")
            click_button(page, "Next Step")

            expect(page.get_by_text("Build the athlete profile.")).to_be_visible()
            page.get_by_role("textbox", name="Name", exact=True).fill("Test Kickboxer")
            page.get_by_label("Age").fill("22")
            page.get_by_label("Height cm").fill("178")
            page.get_by_label("Weight kg").fill("74")
            click_button(page, "Advanced")
            click_button(page, "3+ yr")
            click_button(page, "Knee")
            click_button(page, "Ankle/Foot")
            click_button(page, "Save athlete profile")
            expect(page.get_by_text("Test Kickboxer").first).to_be_visible()
            click_button(page, "Next Step")

            expect(page.get_by_text("Set the training block.")).to_be_visible()
            click_button(page, "12 Weeks")
            click_button(page, "3 Days")
            page.get_by_label("Main goal").fill("Fight camp power and conditioning")
            click_button(page, "Fight camp")
            click_button(page, "Next Step")

            expect(page.get_by_text("Enter assessment numbers.")).to_be_visible()
            page.get_by_label("Squat / Trap Bar").fill("150")
            page.get_by_label("Bench / Push-ups").fill("95")
            page.get_by_label("Pull-ups").fill("12")
            page.get_by_label("Vertical Jump").fill("54")
            page.get_by_label("Broad Jump").fill("245")
            page.get_by_label("Med Ball Throw").fill("8")
            page.get_by_label("MAS").fill("4.2")
            expect(page.get_by_text("Priority score")).to_be_visible()
            expect(page.get_by_text("Strength deficit")).to_be_visible()
            click_button(page, "Generate Program")

            expect(page.get_by_text("Review the generated program.")).to_be_visible()
            expect(page.get_by_text("WEEK 12")).to_be_visible()
            expect(page.get_by_text("Lateral Bound")).to_be_visible()
            expect(page.get_by_text("Tempo Runs or Bike")).to_be_visible()
            page.screenshot(path=str(ARTIFACTS / "02-program.png"), full_page=True)
            click_button(page, "Preview Google Sheets")

            expect(page.get_by_text("Google Sheets output preview.")).to_be_visible()
            expect(page.get_by_text("Athlete Profile")).to_be_visible()
            expect(page.get_by_text("Testing Checkpoints")).to_be_visible()
            click_button(page, "Week 12")
            expect(page.get_by_text("Power / Speed")).to_be_visible()
            page.screenshot(path=str(ARTIFACTS / "03-sheet.png"), full_page=True)
            browser.close()

            if errors:
                print("Console warnings/errors:")
                for item in errors[:20]:
                    print(item)
            print("Smoke test passed")
    finally:
        if server:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()


if __name__ == "__main__":
    main()
