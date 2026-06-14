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
            page = browser.new_page(viewport={"width": 390, "height": 900}, is_mobile=True)
            page.goto(URL)
            page.wait_for_load_state("networkidle")
            expect(page.get_by_text("Set who is creating the plan")).to_be_visible()
            page.screenshot(path=str(ARTIFACTS / "04-mobile-start.png"), full_page=True)
            browser.close()
            print("Mobile snapshot passed")
    finally:
        if server:
            server.terminate()
            try:
                server.wait(timeout=10)
            except subprocess.TimeoutExpired:
                server.kill()


if __name__ == "__main__":
    main()
