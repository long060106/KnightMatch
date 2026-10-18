"""Parse the KRSP project list page into (url, status) entries."""

from __future__ import annotations

import re
from dataclasses import dataclass
from urllib.parse import urljoin, urlsplit, urlunsplit

from bs4 import BeautifulSoup, Tag

from . import config

SECTIONS = {
    "available projects": "open",
    "projects with full teams": "full",
}
SEMESTER_PREFIX_RE = re.compile(r"^((?:Spring|Summer|Fall)\s+\d{4})\s*:\s*(.+)$", re.IGNORECASE)


class ListPageLayoutError(RuntimeError):
    """The list page no longer looks the way the parser expects. Better to stop than guess."""


@dataclass(frozen=True)
class ListEntry:
    url: str
    status: str  # "open" | "full"
    list_title: str
    list_semester: str | None
    spots_text: str


def normalize_url(href: str) -> str:
    parts = urlsplit(urljoin(config.BASE_URL, href))
    path = parts.path if parts.path.endswith("/") else parts.path + "/"
    return urlunsplit((parts.scheme, parts.netloc.lower(), path, "", ""))


def _clean(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def _section_container(heading: Tag) -> Tag | None:
    # The links live in the first div.list-projects after each <h3>.
    container = heading.find_next("div", class_="list-projects")
    return container if isinstance(container, Tag) else None


def parse_list(html: str) -> list[ListEntry]:
    soup = BeautifulSoup(html, "lxml")
    headings = {
        _clean(h.get_text()).lower(): h
        for h in soup.find_all(["h2", "h3", "h4"])
        if _clean(h.get_text()).lower() in SECTIONS
    }
    missing = [name for name in SECTIONS if name not in headings]
    if missing:
        raise ListPageLayoutError(f"Section heading(s) not found: {missing}")

    entries: dict[str, ListEntry] = {}
    for name, status in SECTIONS.items():
        container = _section_container(headings[name])
        if container is None:
            raise ListPageLayoutError(f"No project container after heading '{name}'")
        for link in container.find_all("a", href=True):
            url = normalize_url(link["href"])
            if config.PROJECT_PATH_PREFIX not in urlsplit(url).path:
                continue
            cells = [_clean(div.get_text()) for div in link.select("div.list-item-projects > div")]
            label = cells[0] if cells else _clean(link.get_text())
            spots_text = cells[1] if len(cells) > 1 else ""
            match = SEMESTER_PREFIX_RE.match(label)
            semester, title = (match.group(1), match.group(2)) if match else (None, label)
            # A project should appear once; if it is listed twice, the first section wins.
            entries.setdefault(url, ListEntry(url, status, title, semester, spots_text))
    return list(entries.values())
