from __future__ import annotations

import hmac
import os
from typing import Any

import requests
from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from local_store import user_for_session


bearer_scheme = HTTPBearer(auto_error=False)


def is_local_auth_mode() -> bool:
    configured_mode = os.getenv("INTERNIQ_AUTH_MODE")
    if configured_mode:
        return configured_mode.strip().lower() == "local"
    return not (os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ANON_KEY"))


def require_authenticated_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Sign in to continue.")

    if is_local_auth_mode():
        user = user_for_session(credentials.credentials)
        if user is None:
            raise HTTPException(status_code=401, detail="Your session is invalid or expired. Sign in again.")
        return {
            "id": user["id"],
            "email": user["email"],
            "user_metadata": {"full_name": user["name"]},
            "app_metadata": {"provider": "email"},
        }

    project_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    anon_key = os.getenv("SUPABASE_ANON_KEY")
    if not project_url or not anon_key:
        raise HTTPException(status_code=503, detail="Supabase authentication is not configured on the backend.")

    try:
        response = requests.get(
            f"{project_url}/auth/v1/user",
            headers={
                "apikey": anon_key,
                "Authorization": f"Bearer {credentials.credentials}",
            },
            timeout=5,
        )
    except requests.RequestException as exc:
        raise HTTPException(status_code=503, detail="Authentication service is unavailable.") from exc

    if response.status_code in {401, 403}:
        raise HTTPException(status_code=401, detail="Your session is invalid or expired. Sign in again.")
    if not response.ok:
        raise HTTPException(status_code=503, detail="Could not verify your session.")

    try:
        user = response.json()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail="Authentication service returned an invalid response.") from exc

    if not isinstance(user, dict) or not isinstance(user.get("id"), str):
        raise HTTPException(status_code=401, detail="Your session did not contain a valid user.")
    return user


def authenticated_user_id(user: dict[str, Any], requested_user_id: str | None = None) -> str:
    user_id = user["id"]
    if requested_user_id is not None and not hmac.compare_digest(requested_user_id, user_id):
        raise HTTPException(status_code=403, detail="You can only access your own account data.")
    return user_id


def require_admin_token(
    token: str | None = Header(default=None, alias="X-InternIQ-Admin-Token"),
) -> None:
    expected_token = os.getenv("INTERNIQ_ADMIN_TOKEN")
    if not expected_token:
        raise HTTPException(status_code=503, detail="Admin operations are not configured.")
    if not token or not hmac.compare_digest(token, expected_token):
        raise HTTPException(status_code=403, detail="Admin token is invalid.")
