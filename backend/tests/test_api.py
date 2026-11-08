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


def test_mentor_chat_composes_retrieved_context_into_structured_response(monkeypatch, client):
    monkeypatch.setenv("GROQ_API_KEY", "provider-test-key")
    main.app.dependency_overrides[main.require_authenticated_user] = lambda: {"id": "student-123"}
    retrieved_docs = [
        {
            "source_type": "internship",
            "source_id": "job-1",
            "title": "Data Engineering Intern",
            "content": "Build Python and SQL data pipelines at Example Labs.",
            "metadata": {
                "internship_id": "job-1",
                "company": "Example Labs",
                "source": "Example Board",
                "apply_link": "https://jobs.example.test/1",
            },
            "similarity": 0.86,
        }
    ]
    observed = {}

    class FakeChatModel:
        def with_structured_output(self, schema):
            assert schema is main.StructuredMentorResponse
            return self

        def invoke(self, messages):
            observed["messages"] = messages
            return main.StructuredMentorResponse(
                answer="This role uses Python and SQL for data pipelines.",
                next_steps=["Review the role requirements."],
                recommended_internships=[
                    main.MentorInternshipRecommendation(
                        internship_id="job-1",
                        reason="The work matches your data-pipeline interests.",
                    ),
                    main.MentorInternshipRecommendation(
                        internship_id="invented-job",
                        reason="This role supposedly matches.",
                    ),
                ],
            )

    monkeypatch.setattr(main, "GeminiEmbeddingClient", lambda: object())
    monkeypatch.setattr(main, "get_db_connection", lambda: nullcontext(object()))
    monkeypatch.setattr(
        main,
        "index_user_context",
        lambda connection, embedder, user_id, profile: observed.update(
            indexed_user=(user_id, profile)
        ),
    )
    monkeypatch.setattr(
        main,
        "retrieve_context",
        lambda connection, embedder, query, user_id, top_k: retrieved_docs,
    )
    monkeypatch.setattr(main, "ChatGroq", lambda **config: FakeChatModel())

    response = client.post(
        "/api/mentor-chat",
        json={
            "message": "Find a data engineering internship",
            "user_id": "student-123",
            "user_profile": {"interests": ["data engineering"]},
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["answer"].startswith("This role uses Python and SQL")
    assert result["sources"] == [
        {
            "title": "Data Engineering Intern",
            "source_type": "internship",
            "source_id": "job-1",
            "similarity": 0.86,
        }
    ]
    assert [item["internship_id"] for item in result["suggested_internships"]] == ["job-1"]
    assert observed["indexed_user"] == ("student-123", {"interests": ["data engineering"]})
    assert "Build Python and SQL data pipelines" in observed["messages"][0].content
