"""Coverage for student workflows using explicit test-only postings.

The production app must never fill its feed with invented internship listings.
"""
from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

import local_store
import main


def _client(monkeypatch, tmp_path):
    monkeypatch.setenv("INTERNIQ_STORAGE_BACKEND", "sqlite")
    monkeypatch.setenv("INTERNIQ_AUTH_MODE", "local")
    monkeypatch.setenv("INTERNIQ_SQLITE_PATH", str(tmp_path / "product.sqlite3"))
    return TestClient(main.app)


def _insert_test_postings():
    from local_store import upsert_internship

    for item in [
        {
            "title": "Frontend Engineer Intern",
            "company": "Example Payments",
            "location": "Remote",
            "mode": "Remote",
            "source": "Greenhouse",
            "apply_link": "https://jobs.example.test/frontend-intern",
            "skills": ["React", "TypeScript", "SQL"],
            "posted_date": "2026-11-01",
            "description": "Build accessible React and TypeScript interfaces for payment workflows.",
        },
        {
            "title": "Data Science Intern",
            "company": "Example Analytics",
            "location": "Bengaluru",
            "mode": "Hybrid",
            "source": "Lever",
            "apply_link": "https://jobs.example.test/data-intern",
            "skills": ["Python", "SQL", "Machine Learning", "Pandas"],
            "posted_date": "2026-10-28",
            "description": "Use Python, SQL and machine learning to analyze product data.",
        },
        {
            "title": "Product Design Intern",
            "company": "Example Studio",
            "location": "Chennai",
            "mode": "On-site",
            "source": "Ashby",
            "apply_link": "https://jobs.example.test/design-intern",
            "skills": ["Figma", "UX Research", "Prototyping"],
            "posted_date": "2026-10-20",
            "description": "Research user needs and prototype product experiences in Figma.",
        },
    ]:
        upsert_internship(item)


def _auth_headers(client: TestClient, email: str = "student@example.test") -> tuple[dict[str, str], str]:
    response = client.post("/api/auth/register", json={
        "name": "Jordan Lee",
        "email": email,
        "password": "a-secure-demo-password",
    })
    assert response.status_code == 201
    session = response.json()
    return {"Authorization": f"Bearer {session['access_token']}"}, session["user"]["id"]


def test_first_run_feed_has_no_invented_internships(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        listings = client.get("/api/internships").json()
        assert listings == []


def test_keyword_search_ranks_terms_and_excludes_non_matches(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        _insert_test_postings()
        results = client.get("/api/internships/search", params={"q": "react"}).json()

    assert results, "Expected at least one React posting"
    titles = [item["title"] for item in results]
    assert titles[0] == "Frontend Engineer Intern"
    assert "Product Design Intern" not in titles
    assert all(item["score"] > 0 for item in results)


def test_keyword_search_returns_nothing_for_unrelated_query(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        _insert_test_postings()
        assert client.get("/api/internships/search", params={"q": "astrophysics"}).json() == []


def test_semantic_search_falls_back_locally_and_explains_matches(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        _insert_test_postings()
        headers, _user_id = _auth_headers(client)
        client.put("/api/profile", headers=headers, json={
            "name": "Jordan Lee",
            "target_role": "data science intern",
            "location": "Bengaluru",
            "education": "BSc Computer Science",
            "graduation_year": "2027",
            "interests": ["machine learning"],
            "skills": ["Python", "SQL"],
        })
        results = client.get(
            "/api/internships/semantic-search",
            params={"q": "machine learning python", "limit": 5},
            headers=headers,
        )

    assert results.status_code == 200
    items = results.json()
    assert items, "Semantic search must work without pgvector"
    assert items[0]["title"] == "Data Science Intern"
    assert 0 <= items[0]["similarity"] <= 1
    assert "Python" in (items[0].get("matched_terms") or []) + (items[0].get("matched_skills") or [])


def test_resume_tailor_reports_covered_and_missing_skills(monkeypatch, tmp_path):
    resume = (
        "Jordan Lee\njordan@example.test\n"
        "SKILLS\nPython, SQL, React\n"
        "EXPERIENCE\nBuilt dashboards in Python and SQL. Improved load time by 40%.\n"
        "PROJECTS\nCampus analytics tool used by 300 students.\n"
        "EDUCATION\nBSc Computer Science, 2027\n"
    )
    job_description = (
        "Data Science Intern. You will use Python, SQL, machine learning and pandas. "
        "Experience with Docker is a plus."
    )
    with _client(monkeypatch, tmp_path) as client:
        headers, _user_id = _auth_headers(client)
        response = client.post("/api/resume/tailor", headers=headers, json={
            "resume_text": resume,
            "job_description": job_description,
        })
        short = client.post("/api/resume/tailor", headers=headers, json={
            "resume_text": "too short",
            "job_description": job_description,
        })

    assert response.status_code == 200
    body = response.json()
    assert {"Python", "SQL"} <= set(body["matched_skills"])
    assert {"Machine Learning", "Pandas", "Docker"} & set(body["missing_skills"])
    assert 0 < body["coverage"] <= 1
    assert body["suggestions"]
    assert short.status_code == 422


def test_skill_detection_ignores_trailing_punctuation():
    from resume_tailor import tailor_resume

    resume = (
        "Jordan Lee\nBuilt services with C++ and Node.js for internal tools.\n"
        "Shipped React and SQL dashboards used by 200 analysts.\n"
    )
    result = tailor_resume(
        resume,
        "Backend Intern. You will write C++ and Node.js services. Docker. Kubernetes. React, SQL.",
    )

    assert {"C++", "Node.js", "React", "SQL"} <= set(result["matched_skills"])
    assert {"Docker", "Kubernetes"} <= set(result["missing_skills"])


def test_resume_draft_persists_per_account(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        first_headers, _ = _auth_headers(client, "first@example.test")
        second_headers, _ = _auth_headers(client, "second@example.test")

        assert client.get("/api/resume/draft", headers=first_headers).json() == {}
        saved = client.put("/api/resume/draft", headers=first_headers, json={
            "draft": {"name": "Jordan Lee", "skills": "Python, SQL"},
        })
        assert saved.status_code == 200
        assert client.get("/api/resume/draft", headers=first_headers).json()["name"] == "Jordan Lee"
        assert client.get("/api/resume/draft", headers=second_headers).json() == {}


def test_community_post_notifies_members_and_events_accept_rsvp(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        author_headers, _ = _auth_headers(client, "author@example.test")
        member_headers, _ = _auth_headers(client, "member@example.test")

        created = client.post("/api/communities", headers=author_headers, json={
            "name": "Data Interns India",
            "description": "Questions about data internships",
        })
        assert created.status_code == 200
        community_id = created.json()["id"]

        assert client.post("/api/communities/join", headers=member_headers, json={
            "community_id": community_id, "body": "join",
        }).status_code == 200

        posted = client.post("/api/communities/posts", headers=author_headers, json={
            "community_id": community_id, "body": "How did you prepare for the SQL round?",
        })
        assert posted.status_code == 200

        posts = client.get("/api/communities/posts", params={"community_id": community_id}, headers=member_headers)
        assert posts.json()[0]["body"] == "How did you prepare for the SQL round?"
        assert posts.json()[0]["author"] == "Jordan Lee"

        notifications = client.get("/api/notifications", headers=member_headers).json()
        assert notifications["unread_count"] >= 1
        assert notifications["items"][0]["kind"] == "community_post"
        assert client.post("/api/notifications/read", headers=member_headers).json()["unread_count"] == 0

        event = client.post("/api/events", headers=author_headers, json={
            "title": "Resume workshop",
            "starts_at": "2026-12-01T10:00",
            "community_id": community_id,
        })
        assert event.status_code == 200
        event_id = event.json()["id"]
        assert client.post("/api/events/rsvp", headers=member_headers, json={
            "community_id": event_id, "body": "rsvp",
        }).status_code == 200

        events = client.get("/api/events", headers=member_headers).json()
        assert events[0]["rsvp_count"] == 2
        assert events[0]["rsvped"] is True


def test_match_alerts_are_created_once_and_respect_cooldown(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        _insert_test_postings()
        headers, user_id = _auth_headers(client)
        client.put("/api/profile", headers=headers, json={
            "name": "Jordan Lee",
            "target_role": "data science intern",
            "location": "Bengaluru",
            "education": "BSc Computer Science",
            "graduation_year": "2027",
            "interests": ["machine learning"],
            "skills": ["Python", "SQL"],
        })

        first = client.get("/api/notifications", headers=headers).json()
        matches = [item for item in first["items"] if item["kind"] == "new_match"]
        assert matches, "A profile with matching skills should produce match alerts"
        assert matches[0]["title"].startswith("New match: Data Science Intern")
        assert "Python" in matches[0]["body"]
        assert first["unread_count"] == len(first["items"])

        # Polling again within the cooldown must not duplicate alerts.
        second = client.get("/api/notifications", headers=headers).json()
        assert len(second["items"]) == len(first["items"])

        local_store.generate_user_alerts(user_id, force=True)
        third = client.get("/api/notifications", headers=headers).json()
        assert len(third["items"]) == len(first["items"])


def test_deadline_alert_fires_for_tracked_application_closing_soon(monkeypatch, tmp_path):
    # Alerts compare against the server's UTC clock, so build the fixture on it too.
    closing_soon = (datetime.now(timezone.utc).date() + timedelta(days=2)).isoformat()
    with _client(monkeypatch, tmp_path) as client:
        headers, user_id = _auth_headers(client)
        internship = local_store.upsert_internship({
            "title": "Analytics Intern",
            "company": "Example Data Co",
            "source": "Greenhouse",
            "apply_link": "https://jobs.example.test/analytics",
            "deadline": closing_soon,
            "skills": ["SQL"],
        })
        local_store.track_application(user_id, internship["id"], "applied", None)

        notifications = client.get("/api/notifications", headers=headers).json()

    deadlines = [item for item in notifications["items"] if item["kind"] == "deadline"]
    assert deadlines, "A tracked application closing in 2 days should raise a deadline alert"
    assert "in 2 days" in deadlines[0]["title"]
    assert deadlines[0]["link"] == "/applications"


def test_community_endpoints_require_authentication(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        assert client.get("/api/communities").status_code == 401
        assert client.get("/api/notifications").status_code == 401
        assert client.get("/api/resume/draft").status_code == 401


def test_internship_detail_returns_posting_or_404(monkeypatch, tmp_path):
    with _client(monkeypatch, tmp_path) as client:
        _insert_test_postings()
        listing = client.get("/api/internships").json()[0]
        detail = client.get(f"/api/internships/{listing['id']}")
        assert detail.status_code == 200
        assert detail.json()["id"] == listing["id"]
        assert client.get("/api/internships/00000000-0000-0000-0000-000000000000").status_code == 404
