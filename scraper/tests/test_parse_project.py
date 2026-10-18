import pytest

from knightmatch_scraper.parse_project import ProjectPageError, parse_project


def parse(fixture_html, post_id):
    return parse_project(fixture_html(f"project_{post_id}.html"), f"https://example/{post_id}/")


def test_open_project_fields(fixture_html):
    page = parse(fixture_html, 534)
    assert page.wp_post_id == 534
    assert page.title == "Secure and Fault-Tolerant Large Language Models for Embedded Systems"
    assert page.capacity_status == "open"
    assert (page.team_size, page.open_spots) == (10, 1)
    assert page.affiliation == "College of Engineering and Computer Science"
    assert page.semester == "Fall 2026"
    assert len(page.team_leaders) == 1
    leader = page.team_leaders[0]
    assert leader.name == "Chanhee Lee, PhD"
    assert leader.email == "person1@example.edu"  # fixture emails are fake
    assert leader.role == "Postdoctoral Scholar"
    assert page.faculty_mentors == ["Jongouk Choi, PhD"]
    assert "Required:" in page.quals_html
    assert page.description.startswith("In this project, we analyze")
    assert page.extra_fields == {}


def test_full_project_has_zero_spots_and_no_semester(fixture_html):
    page = parse(fixture_html, 821)
    assert page.capacity_status == "full"
    assert (page.team_size, page.open_spots) == (14, 0)
    assert page.semester is None
    assert page.affiliation == "College of Community Innovation and Education"


def test_arts_project_role_and_mentor(fixture_html):
    page = parse(fixture_html, 660)
    assert page.title == "NEON SOUL (3D Animated Short Film)"
    assert page.team_leaders[0].role == "MFA track in Animation and Visual Effects"
    assert page.faculty_mentors == ["JoAnne Adams, MFA"]
    assert (page.team_size, page.open_spots) == (20, 8)


def test_description_keeps_line_breaks(fixture_html):
    page = parse(fixture_html, 660)
    lines = page.description.split("\n")
    assert lines[1] == "Theme: GRIEF & NEGLECT"
    assert lines[-1] == "Genre: Cyberpunk, Sci-Fi, Tech-Noir"


def test_page_without_post_id_raises():
    html = "<html><body><main><h1>Title</h1></main></body></html>"
    with pytest.raises(ProjectPageError):
        parse_project(html, "https://example/")
