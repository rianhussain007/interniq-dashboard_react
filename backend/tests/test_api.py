from contextlib import nullcontext

import pytest
from fastapi.testclient import TestClient

import main


@pytest.fixture
def client():
    with TestClient(main.app) as test_client:
        yield test_client
    main.app.dependency_overrides.clear()


def test_health_endpoint_needs_no_external_configuration(client):
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_keyword_search_is_public(monkeypatch, client):
    captured = {}
    monkeypatch.setattr(main, "get_db_connection", lambda: nullcontext(object()))
    monkeypatch.setattr(
        main,
        "search_internships",
        lambda connection, **params: captured.update(params) or [],
    )

    response = client.get("/api/internships/search?q=data&sort=deadline")

    assert response.status_code == 200
    assert response.json() == []
    assert captured["query"] == "data"
    assert captured["sort"] == "deadline"


def test_semantic_search_requires_a_verified_session(client):
    response = client.get("/api/internships/semantic-search?q=data+engineering")

    assert response.status_code == 401
    assert response.json()["detail"] == "Sign in to continue."


def test_search_rejects_unknown_sort_modes(client):
    response = client.get("/api/internships/search?sort=random")

    assert response.status_code == 422


def test_scraper_summary_is_extracted_from_noisy_output():
    output = "starting scraper\nsource one: ok\n{\"event\":\"interniq_scrape_summary\",\"status\":\"partial\"}\n"

    assert main.parse_scraper_summary(output) == {
        "event": "interniq_scrape_summary",
        "status": "partial",
    }


def test_mentor_recommendations_are_limited_to_retrieved_internships():
    docs = [
        {
            "source_type": "internship",
            "title": "Data Engineering Intern at Example Labs",
            "similarity": 0.82,
            "metadata": {
                "internship_id": "job-1",
                "company": "Example Labs",
                "source": "Example Board",
                "apply_link": "https://jobs.example.test/1",
            },
        }
    ]
    recommendations = [
        main.MentorInternshipRecommendation(internship_id="job-1", reason="Uses Python and SQL."),
        main.MentorInternshipRecommendation(internship_id="hallucinated-id", reason="A matching role."),
    ]

    suggestions = main.suggested_internships_from_docs(docs, recommendations)

    assert len(suggestions) == 1
    assert suggestions[0]["internship_id"] == "job-1"
    assert suggestions[0]["similarity"] == 0.82
