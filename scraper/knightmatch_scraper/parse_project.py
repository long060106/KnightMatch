"""Parse one KRSP project page. Fields are found by their <dt> label, never by position."""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from bs4 import BeautifulSoup, Tag

from .text import blocks_to_text, clean as _clean, rich_text_blocks


class ProjectPageError(RuntimeError):
    pass


@dataclass
class Person:
    name: str
    email: str | None = None
    role: str | None = None


@dataclass
class ParsedProject:
    wp_post_id: int
    url: str
    title: str
    capacity_status: str | None  # "open" | "full" from the page's CSS modifier, if present
    team_size: int | None
    open_spots: int | None
    affiliation: str | None
    semester: str | None
    team_leaders: list[Person]
    faculty_mentors: list[str]
    quals_html: str
    description: str
    extra_fields: dict[str, str] = field(default_factory=dict)


def _post_id(soup: BeautifulSoup) -> int:
    body = soup.find("body")
    for cls in (body.get("class", []) if body else []):
        if match := re.fullmatch(r"postid-(\d+)", cls):
            return int(match.group(1))
    shortlink = soup.find("link", rel="shortlink")
    if shortlink and (match := re.search(r"[?&]p=(\d+)", shortlink.get("href", ""))):
        return int(match.group(1))
    article = soup.find("article", attrs={"aria-labelledby": re.compile(r"project-title-\d+")})
    if article and (match := re.search(r"(\d+)$", article["aria-labelledby"])):
        return int(match.group(1))
    raise ProjectPageError("Could not find the WordPress post id")


def _int_or_none(text: str | None) -> int | None:
    match = re.search(r"\d+", text or "")
    return int(match.group(0)) if match else None


def _people(dd: Tag) -> list[Person]:
    people = []
    for item in dd.select("li.project-person"):
        name = item.select_one(".project-person-name")
        email = item.select_one(".project-person-email")
        role = item.select_one(".project-person-department")
        if name is None:
            continue
        people.append(
            Person(
                name=_clean(name.get_text()),
                email=_clean(email.get_text()) if email else None,
                role=_clean(role.get_text()) if role else None,
            )
        )
    if not people and _clean(dd.get_text()):
        people.append(Person(name=_clean(dd.get_text())))
    return people


def parse_project(html: str, url: str) -> ParsedProject:
    soup = BeautifulSoup(html, "lxml")
    main = soup.find("main") or soup

    title_el = main.select_one(".project-title") or main.find("h1")
    if title_el is None:
        raise ProjectPageError("No project title")

    capacity: dict[str, int | None] = {}
    capacity_status = None
    for item in main.select(".project-capacity-item"):
        label = _clean(item.find("dt").get_text()).lower() if item.find("dt") else ""
        number = item.select_one(".project-capacity-number")
        capacity[label] = _int_or_none(number.get_text() if number else None)
        classes = item.get("class", [])
        if "project-capacity-item--full" in classes:
            capacity_status = "full"
        elif "project-capacity-item--open" in classes:
            capacity_status = "open"

    affiliation = semester = None
    leaders: list[Person] = []
    mentors: list[str] = []
    extra: dict[str, str] = {}
    for row in main.select("dl.project-record-list > div.project-record-row"):
        dt, dd = row.find("dt"), row.find("dd")
        if dt is None or dd is None:
            continue
        label = _clean(dt.get_text()).lower()
        if label in ("affiliation", "affiliations"):
            parts = [_clean(li.get_text()) for li in dd.find_all("li")] or [_clean(dd.get_text())]
            affiliation = "; ".join(p for p in parts if p) or None
        elif label in ("semester", "semesters"):
            semester = _clean(dd.get_text()) or None
        elif label in ("team leader", "team leaders"):
            leaders = _people(dd)
        elif label in ("faculty mentor", "faculty mentors"):
            mentors = [p.name for p in _people(dd)]
        else:
            extra[label] = _clean(dd.get_text(" "))

    quals_html = ""
    description = ""
    for section in main.select("section.project-record-section"):
        heading = section.find("h2")
        body = section.select_one(".project-rich-text")
        if heading is None or body is None:
            continue
        name = _clean(heading.get_text()).lower()
        if "qualification" in name:
            quals_html = body.decode_contents()
        elif "description" in name:
            description = blocks_to_text(rich_text_blocks(body.decode_contents()))

    return ParsedProject(
        wp_post_id=_post_id(soup),
        url=url,
        title=_clean(title_el.get_text()),
        capacity_status=capacity_status,
        team_size=capacity.get("team size"),
        open_spots=capacity.get("open spots"),
        affiliation=affiliation,
        semester=semester,
        team_leaders=leaders,
        faculty_mentors=mentors,
        quals_html=quals_html,
        description=description,
        extra_fields=extra,
    )
