import pytest

import local_store


@pytest.fixture(autouse=True)
def isolated_database(tmp_path, monkeypatch):
    monkeypatch.setenv("INTERNIQ_SQLITE_PATH", str(tmp_path / "interniq.sqlite3"))


def test_passwords_are_hashed_and_sessions_can_be_revoked():
    session = local_store.register("Student@Example.test", "A-local-password-123", "Jordan Lee")

    assert session["user"]["email"] == "student@example.test"
    assert local_store.login("STUDENT@example.test", "A-local-password-123") is not None
    assert local_store.login("student@example.test", "wrong-password") is None
    assert local_store.user_for_session(session["access_token"])["name"] == "Jordan Lee"

    with local_store.connection() as conn:
        password_hash = conn.execute("SELECT password_hash FROM users WHERE id = ?", (session["user"]["id"],)).fetchone()[0]
    assert password_hash.startswith("pbkdf2_sha256$")
    assert "A-local-password-123" not in password_hash

    local_store.revoke_session(session["access_token"])
    assert local_store.user_for_session(session["access_token"]) is None


def test_account_data_is_scoped_and_dashboard_counts_update():
    first_user = local_store.register("first@example.test", "first-password-123", "First Student")["user"]
    second_user = local_store.register("second@example.test", "second-password-123", "Second Student")["user"]
    internship = local_store.upsert_internship({
        "title": "Software Engineering Intern",
        "company": "Example Labs",
        "location": "Remote, India",
        "mode": "Remote",
        "source": "Example Careers",
        "apply_link": "https://careers.example.test/jobs/123",
        "skills": ["Python", "SQL"],
        "posted_date": "2026-11-08",
    })

    local_store.save_internship(first_user["id"], internship["id"])
    local_store.track_application(first_user["id"], internship["id"], "interviewing", "Panel interview next week")
    local_store.save_checklist(first_user["id"], ["resume-project", "github-profile", "resume-project"])

    assert len(local_store.list_saved_internships(first_user["id"])) == 1
    assert local_store.list_saved_internships(second_user["id"]) == []
    assert local_store.list_applications(first_user["id"])[0]["notes"] == "Panel interview next week"
    assert local_store.dashboard_summary(first_user["id"]) == {
        "applications_tracked": 1,
        "interviewing": 1,
        "offers": 0,
        "saved_internships": 1,
    }
    assert local_store.dashboard_summary(second_user["id"])["saved_internships"] == 0
    assert local_store.get_checklist(first_user["id"]) == ["resume-project", "github-profile"]


def test_profile_persists_and_updates_the_account_display_name():
    user = local_store.register("profile@example.test", "profile-password-123", "Old Name")["user"]
    profile = {
        "name": "New Name",
        "target_role": "Data analyst intern",
        "location": "Bengaluru",
        "education": "BSc Computer Science",
        "graduation_year": "2027",
        "interests": ["analytics"],
        "skills": ["Python", "SQL"],
        "email": user["email"],
    }

    assert local_store.save_profile(user["id"], profile)["target_role"] == "Data analyst intern"
    assert local_store.get_profile(user["id"])["skills"] == ["Python", "SQL"]
    assert local_store.user_for_session(local_store.login(user["email"], "profile-password-123")["access_token"])["name"] == "New Name"


def test_duplicate_email_is_rejected_case_insensitively():
    local_store.create_user("student@example.test", "first-password-123", "Student")

    with pytest.raises(ValueError, match="already exists"):
        local_store.create_user("STUDENT@example.test", "another-password-123", "Other Student")


def test_internship_rejects_non_web_apply_urls():
    result = local_store.upsert_internship({
        "title": "Design Intern",
        "company": "Example Studio",
        "apply_link": "javascript:alert(1)",
    })

    assert result["apply_link"] is None
