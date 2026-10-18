from knightmatch_scraper.parse_project import parse_project
from knightmatch_scraper.quals import quals_hash, split_quals, split_sentences


def quals_for(fixture_html, post_id):
    page = parse_project(fixture_html(f"project_{post_id}.html"), "https://example/")
    return split_quals(page.quals_html)


def test_labeled_lines_in_any_order(fixture_html):
    q = quals_for(fixture_html, 534)
    assert q.required == [
        "C/C++ and Python programming",
        "basic knowledge and experience to run open source LLMs",
        "basic knowledge of embedded systems",
    ]
    assert q.preferred[0] == "LLM model training"
    assert "Java and Swift programming skills" in q.preferred
    assert q.no_experience_statement is False


def test_skills_needed_label_and_bare_preferred(fixture_html):
    q = quals_for(fixture_html, 660)
    assert q.required[0].startswith("Applicants must be familiar with the 3D animation pipeline")
    assert "3D rigging" in q.required
    assert "Digital art over tradition to expedite workflow" in q.preferred
    # Role list lines have no label or "must" wording, so they never count against a student.
    assert "3D modeler (open)" in q.preferred


def test_prose_is_classified_by_wording(fixture_html):
    q = quals_for(fixture_html, 821)
    assert "Basic research experience is required" in q.required
    assert "Meetings are typically recorded" in q.preferred


def test_explicit_no_experience_statement(fixture_html):
    q = quals_for(fixture_html, 1100)
    assert q.no_experience_statement is True
    assert not any("No specialized professional experience" in item for item in q.required)
    assert "willing to learn" in q.required


def test_heading_label_applies_to_following_list():
    html = "<p>Required:</p><ul><li>Python</li><li>Statistics</li></ul><p>Preferred:</p><ul><li>R</li></ul>"
    q = split_quals(html)
    assert q.required == ["Python", "Statistics"]
    assert q.preferred == ["R"]


def test_label_scope_ends_at_next_paragraph():
    q = split_quals("<p>Required: Python</p><p>Meetings are on Fridays.</p>")
    assert q.required == ["Python"]
    assert q.preferred == ["Meetings are on Fridays"]


def test_other_no_experience_wordings():
    assert split_quals("<p>Experience is not required.</p>").no_experience_statement
    assert split_quals("<p>No prior research experience necessary!</p>").no_experience_statement
    assert not split_quals("<p>Basic research experience is required.</p>").no_experience_statement


def test_not_required_is_preferred_even_with_required_word():
    q = split_quals("<p>Basic Python skills are preferred but not required. You must attend weekly meetings.</p>")
    assert q.preferred == ["Basic Python skills are preferred but not required"]
    assert q.required == ["You must attend weekly meetings"]


def test_bare_list_without_markers_is_what_the_team_expects():
    q = split_quals("<p>PyTorch. CNN. Deep learning. Computer vision</p>")
    assert q.required == ["PyTorch", "CNN", "Deep learning", "Computer vision"]
    assert q.preferred == []
    q = split_quals("<p>Analytical Chemistry skills, data processing, CAD software.</p>")
    assert q.required == ["Analytical Chemistry skills", "data processing", "CAD software"]


def test_heading_lines_without_colon():
    html = ("<p>Minimum Requirements<br>GPA of 3.0 or higher<br>Sophomore standing or above</p>"
            "<p>Preferred Background<br>Completion of Organic Chemistry</p>"
            "<p>No previous research experience is required. We welcome students who are eager to learn.</p>")
    q = split_quals(html)
    assert q.required == ["GPA of 3.0 or higher", "Sophomore standing or above"]
    assert q.preferred[0] == "Completion of Organic Chemistry"
    assert q.no_experience_statement is True


def test_label_sentences_and_typos():
    q = split_quals("<p>Preferred qualifications are attention to detail.</p>"
                    "<p>Required qualification are CITI Training.</p><p>Perferred: Ability to work online.</p>")
    assert q.required == ["CITI Training"]
    assert q.preferred == ["attention to detail", "Ability to work online"]


def test_label_in_the_middle_of_a_line():
    q = split_quals("<p>Preferred: We visit senior centers. Required: 3-hour windows of availability.</p>")
    assert q.preferred == ["We visit senior centers"]
    assert q.required == ["3-hour windows of availability"]


def test_preferred_wording_inside_required_block():
    q = split_quals("<p>REQUIRED SKILLS: CAD modeling. Availability on Fridays is strongly preferred.</p>")
    assert q.required == ["CAD modeling"]
    assert q.preferred == ["Availability on Fridays is strongly preferred"]


def test_numbered_list_inside_prose_is_split():
    q = split_quals("<p>Applicants should have: (1) access to Zoom, OneDrive, and Excel; "
                    "(2) strong communication skills; and (3) willingness to learn statistical analysis.</p>")
    assert q.required == [
        "Applicants should have",
        "access to Zoom, OneDrive, and Excel",
        "strong communication skills",
        "willingness to learn statistical analysis",
    ]


def test_example_lists_stay_whole():
    q = split_quals("<p>Required: Knowledge of 3D modeling software. Blender, Maya, etc.</p>")
    assert q.required == ["Knowledge of 3D modeling software", "Blender, Maya, etc"]


def test_no_real_technical_requirements():
    assert split_quals("<p>There are no real technical requirements.</p>").no_experience_statement


def test_empty_quals():
    q = split_quals("")
    assert (q.raw, q.required, q.preferred) == ("", [], [])


def test_abbreviations_do_not_split_sentences():
    assert split_sentences("Use tools, e.g. Excel and SPSS. Then report.") == [
        "Use tools, e.g. Excel and SPSS.",
        "Then report.",
    ]


def test_hash_ignores_whitespace_and_case():
    assert quals_hash("Python  and\nC++") == quals_hash("python and c++")
    assert len(quals_hash("x")) == 16
