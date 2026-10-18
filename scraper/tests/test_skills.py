import pytest

from knightmatch_scraper import store
from knightmatch_scraper.quals import QualsResult
from knightmatch_scraper.skills import SkillDictionary, extract_project_skills

TEST_DICTIONARY = {
    "categories": {"programming": "Programming", "soft": "Soft skills"},
    "skills": [
        {"id": "c_cpp", "label": "C/C++", "category": "programming", "aliases": ["c\\s*/\\s*c\\+\\+", "c\\+\\+"]},
        {"id": "python", "label": "Python", "category": "programming", "aliases": ["python"]},
        {"id": "java", "label": "Java", "category": "programming", "aliases": ["java(?!\\s*script)"]},
        {"id": "javascript", "label": "JavaScript", "category": "programming", "aliases": ["javascript", "js"]},
        {"id": "r_lang", "label": "R", "category": "programming", "aliases": [{"pattern": "R", "case_sensitive": True}]},
        {"id": "teamwork", "label": "Teamwork", "category": "soft", "counts_toward_match": False, "aliases": ["teamwork"]},
    ],
}


@pytest.fixture
def dictionary():
    return SkillDictionary(TEST_DICTIONARY)


def test_symbols_like_cpp_match(dictionary):
    assert dictionary.extract("C/C++ and Python programming") == ["c_cpp", "python"]
    assert dictionary.extract("strong C++ skills") == ["c_cpp"]


def test_java_is_not_javascript(dictionary):
    assert dictionary.extract("JavaScript experience") == ["javascript"]
    assert dictionary.extract("Java and Swift") == ["java"]


def test_case_sensitive_alias(dictionary):
    assert dictionary.extract("statistics in R or SPSS") == ["r_lang"]
    assert dictionary.extract("are reliable") == []


def test_word_boundaries(dictionary):
    assert dictionary.extract("pythonic") == []


def test_counts_toward_match(dictionary):
    assert dictionary.counts("python") is True
    assert dictionary.counts("teamwork") is False


def test_required_skill_is_not_repeated_as_preferred(dictionary):
    quals = QualsResult(raw="", required=["Python"], preferred=["Python and C++", "Must love dogs"])
    result = extract_project_skills(dictionary, quals)
    assert result.required == ["python"]
    assert result.preferred == ["c_cpp"]
    assert result.unmatched == [{"bucket": "preferred", "text": "Must love dogs"}]


PARENT_DICTIONARY = {
    "categories": {"c": "C"},
    "skills": [
        {"id": "programming", "label": "Programming", "category": "c", "aliases": ["programming", "coding"]},
        {"id": "python", "label": "Python", "category": "c", "parent": "programming", "aliases": ["python"]},
        {"id": "csharp", "label": "C#", "category": "c", "parent": "programming", "aliases": ["c#"]},
        {"id": "software_3d", "label": "3D software", "category": "c", "aliases": ["3d software"]},
        {"id": "maya", "label": "Maya", "category": "c", "parent": "software_3d", "aliases": ["maya"]},
        {"id": "blender", "label": "Blender", "category": "c", "parent": "software_3d", "aliases": ["blender"]},
        {"id": "physics", "label": "Physics", "category": "c", "aliases": ["physics"]},
        {"id": "vr", "label": "VR", "category": "c", "aliases": ["vr"]},
    ],
}


def test_child_skill_replaces_vaguer_parent():
    d = SkillDictionary(PARENT_DICTIONARY)
    assert d.extract("Python programming") == ["python"]
    assert d.extract("basic coding") == ["programming"]


def test_examples_fold_into_parent():
    d = SkillDictionary(PARENT_DICTIONARY)
    assert d.extract("Blender, Maya, etc") == ["software_3d"]
    assert d.extract("Basic programming skills (e.g., Python, C#)") == ["programming"]
    assert d.extract("Maya and Blender") == ["maya", "blender"]  # named directly, not as examples


def test_interest_items_are_skipped_and_either_interest_is_preferred():
    d = SkillDictionary(PARENT_DICTIONARY)
    quals = QualsResult(raw="", required=["Interest in physics", "access to Maya", "experience or interest in VR"])
    result = extract_project_skills(d, quals)
    assert result.required == []
    assert result.preferred == ["vr"]
    assert result.unmatched == []


def test_unknown_parent_is_rejected():
    bad = {"categories": {"c": "C"}, "skills": [{"id": "a", "label": "A", "category": "c", "parent": "zzz", "aliases": ["a"]}]}
    with pytest.raises(ValueError):
        SkillDictionary(bad)


def test_invalid_dictionaries_are_rejected():
    duplicate = {"categories": {"x": "X"}, "skills": [
        {"id": "a", "label": "A", "category": "x", "aliases": ["a"]},
        {"id": "a", "label": "A", "category": "x", "aliases": ["b"]},
    ]}
    with pytest.raises(ValueError):
        SkillDictionary(duplicate)
    with pytest.raises(ValueError):
        SkillDictionary({"categories": {}, "skills": [{"id": "a", "label": "A", "category": "nope", "aliases": ["a"]}]})


def test_real_dictionary_file_loads():
    dictionary = SkillDictionary.load(store.data_path(store.SKILLS_FILE))
    assert dictionary.skills
    for skill in dictionary.skills.values():
        assert skill.id.replace("_", "").isalnum() and skill.id.islower()
        assert skill.patterns
