"""Shared Selenium setup for local development and Linux containers."""

from __future__ import annotations

import os
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.service import Service


def create_chrome_driver(*, user_agent: str | None = None) -> webdriver.Chrome:
    options = webdriver.ChromeOptions()
    browser_binary = os.getenv("CHROME_BIN")
    if browser_binary:
        options.binary_location = browser_binary

    options.add_argument("--headless=new")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    if os.name != "nt":
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
    if user_agent:
        options.add_argument(f"--user-agent={user_agent}")

    driver_path = os.getenv("CHROMEDRIVER_PATH")
    if not driver_path and os.name == "nt":
        project_root = Path(__file__).resolve().parents[2]
        local_driver = project_root / "drivers" / "chromedriver.exe"
        if local_driver.is_file():
            driver_path = str(local_driver)

    service = Service(executable_path=driver_path) if driver_path else Service()
    return webdriver.Chrome(service=service, options=options)
