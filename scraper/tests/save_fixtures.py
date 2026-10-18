"""Re-capture the HTML fixtures used by the parser tests.

Run from scraper/:  .venv/Scripts/python -m tests.save_fixtures
Personal emails are replaced with fake ones so the public repo never stores them.
"""

import re
from pathlib import Path

from knightmatch_scraper import config
from knightmatch_scraper.fetch import PoliteClient

FIXTURES = Path(__file__).parent / "fixtures"
PAGES = {
    "list.html": config.LIST_URL,
    # Labeled "Preferred:" then "Required:" in one paragraph.
    "project_534.html": f"{config.BASE_URL}/krsp-project/secure-and-fault-tolerant-large-language-models-for-embedded-systems/",
    # "Skills needed:" plus a list of open roles, arts college.
    "project_660.html": f"{config.BASE_URL}/krsp-project/3d-animated-short-film/",
    # Full team, no semester row, prose-only qualifications.
    "project_821.html": f"{config.BASE_URL}/krsp-project/lived-experiences-of-students-with-disabilities/",
    # Explicit "No specialized professional experience is required."
    "project_1100.html": f"{config.BASE_URL}/krsp-project/individual-differences-in-high-stakes-security-decision-making/",
}
KEEP_EMAILS = {"knightresearch@ucf.edu"}  # the program's public office address
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")


def redact(html: str) -> str:
    fakes: dict[str, str] = {}

    def replace(match: re.Match) -> str:
        email = match.group(0)
        if email.lower() in KEEP_EMAILS:
            return email
        fakes.setdefault(email.lower(), f"person{len(fakes) + 1}@example.edu")
        return fakes[email.lower()]

    return EMAIL_RE.sub(replace, html)


def strip_scripts(html: str) -> str:
    """The parser never needs them, and the repo should not carry the site's third-party JS."""
    html = re.sub(r"<script\b[^>]*>.*?</script>", "", html, flags=re.S | re.I)
    return re.sub(r"<style\b[^>]*>.*?</style>", "", html, flags=re.S | re.I)


def main() -> None:
    client = PoliteClient()
    FIXTURES.mkdir(parents=True, exist_ok=True)
    for name, url in PAGES.items():
        html = strip_scripts(redact(client.get(url)))
        (FIXTURES / name).write_text(html, encoding="utf-8")
        print(f"saved {name} ({len(html):,} chars)")


if __name__ == "__main__":
    main()
