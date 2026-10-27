from knightmatch_scraper.check_links import all_links, page_says

PAGE = """
<html><head><style>.x { content: "hidden phrase" }</style></head><body>
  <h2>Undergraduate Students</h2>
  <p>We are <strong>currently   hiring</strong>
     undergraduate research assistants. You’re welcome to apply.</p>
  <script>var note = "always looking for undergraduate";</script>
</body></html>
"""


def test_page_says_ignores_case_spacing_and_markup():
    assert page_says(PAGE, "Currently hiring undergraduate research assistants")
    assert page_says(PAGE, "You're welcome to apply")  # curly apostrophe on the page


def test_page_says_only_reads_visible_text():
    assert not page_says(PAGE, "always looking for undergraduate")
    assert not page_says(PAGE, "hidden phrase")
    assert not page_says(PAGE, "not recruiting")


def test_all_links_keeps_still_says_and_dedupes():
    data = {
        "sections": [
            {"links": [{"title": "A", "url": "https://a.example/", "still_says": "we hire"}]},
            {"links": [{"title": "A again", "url": "https://a.example/"}]},
        ]
    }
    links = all_links(data)
    assert len(links) == 1
    assert links[0]["still_says"] == "we hire"
