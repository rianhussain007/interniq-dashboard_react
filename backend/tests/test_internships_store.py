from datetime import date

import pytest

from internships_store import normalize_internship


def test_normalize_scraped_record_for_storage():
    internship = normalize_internship(
        {
            "title": "  Data  Engineering Intern ",
            "company": "Example Labs",
            "location": "Remote — United States",
            "requirements": "Python, SQL | Data modeling",
            "deadline": "2026-12-15",
            "apply_link": "javascript:alert(1)",
            "source": " Example Board ",
        }
    )

    assert internship["title"] == "Data Engineering Intern"
    assert internship["mode"] == "Remote"
    assert internship["skills"] == ["Python", "SQL", "Data modeling"]
    assert internship["deadline"] == date(2026, 12, 15)
    assert internship["apply_link"] is None
    assert internship["dedupe_key"] == "composite:data engineering intern|example labs|example board"


def test_scraped_record_requires_title_and_company():
    with pytest.raises(ValueError, match="title and company"):
        normalize_internship({"title": "Research Intern", "company": " "})
