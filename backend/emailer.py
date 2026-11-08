"""Out-of-app alert email delivery.

Sends one summary message per alert run rather than one message per posting, so a
student with several new matches still gets a single email. Delivery is disabled
until an API key and sender address are configured; ``INTERNIQ_EMAIL_TRANSPORT=log``
records messages to a local file for development without contacting a provider.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time
from datetime import datetime, timezone
from html import escape
from pathlib import Path
from typing import Sequence
from urllib.parse import quote

import httpx

logger = logging.getLogger(__name__)

RESEND_ENDPOINT = "https://api.resend.com/emails"
DEFAULT_TIMEOUT_SECONDS = 10.0
DEFAULT_LOG_PATH = Path(__file__).resolve().parent / "data" / "email_outbox.jsonl"
DEFAULT_DEAD_LETTER_PATH = Path(__file__).resolve().parent / "data" / "email_dead_letter.jsonl"
MAX_ATTEMPTS = 3
BACKOFF_SECONDS = 0.75


def _api_key() -> str:
    return os.getenv("RESEND_API_KEY", "").strip()


def _sender() -> str:
    return os.getenv("INTERNIQ_EMAIL_FROM", "").strip()


def _app_url() -> str:
    configured = os.getenv("INTERNIQ_APP_URL", "").strip()
    if configured:
        return configured.rstrip("/")
    origins = os.getenv("ALLOWED_ORIGINS", "").split(",")
    for origin in origins:
        candidate = origin.strip().rstrip("/")
        if candidate and candidate.startswith("http"):
            return candidate
    return "http://localhost:5173"


def transport() -> str:
    explicit = os.getenv("INTERNIQ_EMAIL_TRANSPORT", "").strip().lower()
    if explicit == "log":
        return "log"
    if explicit == "disabled":
        return "disabled"
    if explicit == "resend" and _api_key() and _sender():
        return "resend"
    return "resend" if _api_key() and _sender() else "disabled"


def is_configured() -> bool:
    return transport() in {"resend", "log"}


def _unsubscribe_secret() -> str:
    return (os.getenv("INTERNIQ_UNSUBSCRIBE_SECRET", "") or os.getenv("INTERNIQ_ADMIN_TOKEN", "")).strip()


def _sign(user_id: str, secret: str) -> str:
    return hmac.new(secret.encode("utf-8"), f"unsubscribe:{user_id}".encode("utf-8"), hashlib.sha256).hexdigest()


def unsubscribe_token(user_id: str) -> str:
    """Signed, user-specific token. Stable across restarts for the same secret."""
    secret = _unsubscribe_secret()
    if not secret or not user_id:
        return ""
    return _sign(user_id, secret)


def verify_unsubscribe_token(user_id: str, token: str) -> bool:
    expected = unsubscribe_token(user_id)
    if not expected or not token:
        return False
    return hmac.compare_digest(expected, token)


def unsubscribe_url(user_id: str) -> str:
    token = unsubscribe_token(user_id)
    if not token:
        return ""
    origin = os.getenv("INTERNIQ_API_PUBLIC_URL", "").strip().rstrip("/")
    if not origin:
        origin = _app_url().replace(":5173", ":8000")
    return f"{origin}/api/notifications/unsubscribe?u={quote(user_id)}&t={quote(token)}"


def _max_attempts() -> int:
    try:
        return max(1, min(5, int(os.getenv("INTERNIQ_EMAIL_MAX_ATTEMPTS", str(MAX_ATTEMPTS)))))
    except ValueError:
        return MAX_ATTEMPTS


def _backoff_seconds() -> float:
    try:
        return max(0.0, min(10.0, float(os.getenv("INTERNIQ_EMAIL_BACKOFF_SECONDS", str(BACKOFF_SECONDS)))))
    except ValueError:
        return BACKOFF_SECONDS


def _is_retryable(exc: httpx.HTTPError) -> bool:
    """Retry timeouts, connection failures, rate limits and provider 5xx only."""
    if isinstance(exc, (httpx.TimeoutException, httpx.TransportError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        return status == 429 or status >= 500
    return False


def record_dead_letter(
    to_email: str,
    subject: str,
    text: str,
    error: str,
    attempts: int,
    html: str = "",
) -> bool:
    """Keep an undeliverable message so an operator can see it was lost."""
    path = Path(os.getenv("INTERNIQ_EMAIL_DEAD_LETTER", "") or DEFAULT_DEAD_LETTER_PATH)
    record = {
        "to": to_email,
        "subject": subject,
        "text": text,
        "html": html,
        "error": error,
        "attempts": attempts,
        "failed_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")
        return True
    except OSError as exc:
        logger.warning("Could not write the email dead-letter record: %s", exc)
        return False


def _alert_lines(alerts: Sequence[dict[str, str]]) -> list[str]:
    base = _app_url()
    lines = []
    for alert in alerts:
        link = alert.get("link") or ""
        suffix = f" {base}{link}" if link.startswith("/") else ""
        body = alert.get("body") or ""
        lines.append(f"- {alert.get('title', 'Update')}" + (f": {body}" if body else "") + suffix)
    return lines


def _render(name: str, alerts: Sequence[dict[str, str]], user_id: str = "") -> tuple[str, str, str]:
    base = _app_url()
    first_name = (name or "there").split()[0] if name else "there"
    if len(alerts) == 1:
        subject = alerts[0].get("title") or "New internship alert on InternIQ"
    else:
        subject = f"{len(alerts)} new internship alerts on InternIQ"

    text_lines = [f"Hi {first_name},", "", "Here is what is new on InternIQ:", ""]
    text_lines.extend(_alert_lines(alerts))
    opt_out = unsubscribe_url(user_id) if user_id else ""
    if opt_out:
        text_lines.extend(["", "Open InternIQ: " + base, "", f"Turn off these emails: {opt_out}"])
    else:
        text_lines.extend(["", "Open InternIQ: " + base, "", "You can change or turn off these emails in Alert settings."])
    text = "\n".join(text_lines)

    items = []
    for alert in alerts:
        link = alert.get("link") or ""
        url = f"{base}{link}" if link.startswith("/") else base
        items.append(
            '<li style="margin-bottom:12px">'
            f'<a href="{escape(url)}" style="font-weight:600;color:#4f46e5">{escape(alert.get("title", "Update"))}</a>'
            f'<div style="color:#4b5563;font-size:14px">{escape(alert.get("body", ""))}</div>'
            "</li>"
        )
    html = (
        '<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">'
        f"<p>Hi {escape(first_name)},</p>"
        "<p>Here is what is new on InternIQ:</p>"
        f'<ul style="padding-left:18px">{"".join(items)}</ul>'
        f'<p><a href="{escape(base)}" style="color:#4f46e5">Open InternIQ</a></p>'
        + (
            f'<p style="color:#6b7280;font-size:12px">Don\'t want these emails? '
            f'<a href="{escape(opt_out)}" style="color:#6b7280">Turn them off</a>.</p>'
            if opt_out
            else '<p style="color:#6b7280;font-size:12px">Change or turn off these emails in Alert settings.</p>'
        )
        + "</div>"
    )
    return subject, text, html


def send_alert_email(
    to_email: str,
    name: str,
    alerts: Sequence[dict[str, str]],
    user_id: str = "",
) -> bool:
    """Deliver one summary email. Returns True only when a message was handed off."""
    if not to_email or not alerts:
        return False
    subject, text, html = _render(name, alerts, user_id)
    return send_message(
        to_email,
        subject,
        text,
        html=html,
        opt_out=unsubscribe_url(user_id) if user_id else "",
    )


def send_message(
    to_email: str,
    subject: str,
    text: str,
    html: str = "",
    opt_out: str = "",
    *,
    dead_letter: bool = True,
) -> bool:
    """Deliver one already-rendered message, with retries and dead-lettering.

    ``dead_letter=False`` is used by the replay tool so a still-failing message
    keeps its original record instead of being written a second time.
    """
    if not to_email or not subject:
        return False
    mode = transport()
    if mode == "disabled":
        return False

    if mode == "log":
        path = Path(os.getenv("INTERNIQ_EMAIL_LOG", "") or DEFAULT_LOG_PATH)
        record = {
            "to": to_email,
            "subject": subject,
            "text": text,
            "html": html,
            "unsubscribe_url": opt_out,
            "sent_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as handle:
                handle.write(json.dumps(record) + "\n")
            return True
        except OSError as exc:
            # Local email logging is also a side channel; an unwritable log
            # must not make the in-app alert endpoint fail.
            logger.warning("Could not write alert email to the local outbox: %s", exc)
            return False

    payload: dict[str, object] = {
        "from": _sender(),
        "to": [to_email],
        "subject": subject,
        "text": text,
    }
    if html:
        payload["html"] = html
    if opt_out:
        # RFC 8058 one-click unsubscribe, plus the header mail clients surface natively.
        payload["headers"] = {
            "List-Unsubscribe": f"<{opt_out}>",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }

    attempts = 0
    last_error = ""
    delay = _backoff_seconds()
    while attempts < _max_attempts():
        attempts += 1
        try:
            response = httpx.post(
                RESEND_ENDPOINT,
                headers={"Authorization": f"Bearer {_api_key()}", "Content-Type": "application/json"},
                json=payload,
                timeout=DEFAULT_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            return True
        except httpx.HTTPError as exc:
            last_error = str(exc)
            # A permanent rejection (bad sender, invalid recipient) cannot improve
            # by retrying, so stop immediately.
            if attempts >= _max_attempts() or not _is_retryable(exc):
                break
            time.sleep(delay)
            delay *= 2

    # Email is a side channel: a provider outage must not break alert generation.
    logger.warning("Could not send alert email after %s attempt(s): %s", attempts, last_error)
    if dead_letter:
        record_dead_letter(to_email, subject, text, last_error, attempts, html=html)
    return False
