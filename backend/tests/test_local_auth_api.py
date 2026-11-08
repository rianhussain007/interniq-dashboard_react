from fastapi.testclient import TestClient

import main
import local_store


def test_local_register_login_restore_and_logout(monkeypatch, tmp_path):
    monkeypatch.setenv("INTERNIQ_STORAGE_BACKEND", "sqlite")
    monkeypatch.setenv("INTERNIQ_AUTH_MODE", "local")
    monkeypatch.setenv("INTERNIQ_SQLITE_PATH", str(tmp_path / "auth.sqlite3"))
    with TestClient(main.app) as client:
        assert client.get("/api/internships").json() == []
        registered = client.post("/api/auth/register", json={
            "name": "Jordan Lee",
            "email": "jordan@example.test",
            "password": "a-secure-demo-password",
        })
        assert registered.status_code == 201
        session = registered.json()
        assert session["user"]["name"] == "Jordan Lee"
        assert session["token_type"] == "bearer"

        headers = {"Authorization": f"Bearer {session['access_token']}"}
        restored = client.get("/api/auth/me", headers=headers)
        assert restored.status_code == 200
        assert restored.json() == {
            "id": session["user"]["id"],
            "email": "jordan@example.test",
            "name": "Jordan Lee",
        }

        internship = local_store.upsert_internship({
            "title": "Frontend Intern",
            "company": "Example Labs",
            "location": "Remote",
            "mode": "Remote",
            "source": "Ashby",
            "apply_link": "https://jobs.example.test/frontend-intern",
        })
        save = client.post("/api/saved", headers=headers, json={
            "user_id": session["user"]["id"],
            "internship_id": internship["id"],
        })
        assert save.status_code == 200
        assert client.get(f"/api/saved?user_id={session['user']['id']}", headers=headers).json()[0]["id"] == internship["id"]

        application = client.post("/api/applications", headers=headers, json={
            "user_id": session["user"]["id"],
            "internship_id": internship["id"],
            "status": "interviewing",
            "notes": "Interview scheduled",
        })
        assert application.status_code == 200
        assert client.get("/api/applications?user_id=" + session["user"]["id"], headers=headers).json()[0]["notes"] == "Interview scheduled"

        profile = client.put("/api/profile", headers=headers, json={
            "name": "Jordan Updated",
            "target_role": "Product intern",
            "location": "Remote",
            "education": "BSc",
            "graduation_year": "2027",
            "interests": ["product"],
            "skills": ["research"],
        })
        assert profile.status_code == 200
        assert client.get("/api/profile", headers=headers).json()["target_role"] == "Product intern"
        assert client.get("/api/dashboard/summary", headers=headers).json()["interviewing"] == 1

        bad_login = client.post("/api/auth/login", json={
            "email": "jordan@example.test",
            "password": "wrong-password",
        })
        assert bad_login.status_code == 401

        good_login = client.post("/api/auth/login", json={
            "email": "JORDAN@example.test",
            "password": "a-secure-demo-password",
        })
        assert good_login.status_code == 200

        logged_out = client.post("/api/auth/logout", headers=headers)
        assert logged_out.json() == {"success": True}
        assert client.get("/api/auth/me", headers=headers).status_code == 401
