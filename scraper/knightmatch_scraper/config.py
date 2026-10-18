"""Scraper settings. Values that identify a person (contact email) come from env vars."""

import os
from pathlib import Path

SCRAPER_VERSION = "0.1.0"

BASE_URL = "https://knight.research.ucf.edu"
LIST_URL = f"{BASE_URL}/project-list/"
PROJECT_PATH_PREFIX = "/krsp-project/"

# Politeness rules: at least 2s between requests (we use 2.5s), short timeout, few retries.
REQUEST_DELAY_SECONDS = 2.5
TIMEOUT_SECONDS = 20
MAX_RETRIES = 3

# Abort without writing if the list page suddenly shows far fewer projects than last run.
MIN_LISTED_RATIO = 0.5

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = REPO_ROOT / "data"


def user_agent() -> str:
    """Identify the bot honestly. Contact info is read from env so it never lands in the repo."""
    details = []
    repo_url = os.environ.get("SCRAPER_REPO_URL", "").strip()
    contact = os.environ.get("SCRAPER_CONTACT_EMAIL", "").strip()
    if repo_url:
        details.append(f"+{repo_url}")
    if contact:
        details.append(f"contact: {contact}")
    suffix = f" ({'; '.join(details)})" if details else ""
    return f"KnightMatchBot/{SCRAPER_VERSION}{suffix}"
