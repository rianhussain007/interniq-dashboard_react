import pytest
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

import auth


def test_missing_bearer_token_is_rejected():
    with pytest.raises(HTTPException) as error:
        auth.require_authenticated_user(None)

    assert error.value.status_code == 401


def test_session_is_verified_by_supabase(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co/")
    monkeypatch.setenv("SUPABASE_ANON_KEY", "public-test-key")
    request = {}

    class Response:
        status_code = 200
        ok = True

        @staticmethod
        def json():
            return {"id": "student-123", "email": "student@example.test"}

    def fake_get(url, *, headers, timeout):
        request.update(url=url, headers=headers, timeout=timeout)
        return Response()

    monkeypatch.setattr(auth.requests, "get", fake_get)
    credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials="session-token")

    user = auth.require_authenticated_user(credentials)

    assert user["id"] == "student-123"
    assert request["url"] == "https://example.supabase.co/auth/v1/user"
    assert request["headers"]["Authorization"] == "Bearer session-token"
    assert request["timeout"] == 5


def test_user_id_cannot_be_switched_by_request_payload():
    with pytest.raises(HTTPException) as error:
        auth.authenticated_user_id({"id": "student-123"}, "another-student")

    assert error.value.status_code == 403


def test_user_id_defaults_to_verified_session():
    assert auth.authenticated_user_id({"id": "student-123"}) == "student-123"
