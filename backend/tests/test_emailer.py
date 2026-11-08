"""Delivery mechanics for alert email: retries, backoff and dead letters."""

import json

import httpx
import pytest

import emailer
import replay_dead_letters


def _http_error(status: int) -> httpx.HTTPStatusError:
    request = httpx.Request("POST", "https://api.resend.com/emails")
    response = httpx.Response(status, request=request)
    return httpx.HTTPStatusError(f"status {status}", request=request, response=response)


def _configure(monkeypatch, tmp_path, *, attempts: str = "3") -> tuple[object, object]:
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("INTERNIQ_EMAIL_FROM", "InternIQ <alerts@example.test>")
    monkeypatch.delenv("INTERNIQ_EMAIL_TRANSPORT", raising=False)
    monkeypatch.setenv("INTERNIQ_EMAIL_MAX_ATTEMPTS", attempts)
    monkeypatch.setenv("INTERNIQ_EMAIL_DEAD_LETTER", str(tmp_path / "dead_letter.jsonl"))
    sleeps: list[float] = []
    monkeypatch.setattr(emailer.time, "sleep", lambda seconds: sleeps.append(seconds))
    return sleeps, tmp_path / "dead_letter.jsonl"


ALERTS = [{"title": "New match: Data Intern", "body": "Example Co · matches Python", "link": "/internships"}]


def test_transient_provider_errors_are_retried_then_dead_lettered(monkeypatch, tmp_path):
    sleeps, dead_letter = _configure(monkeypatch, tmp_path)
    calls = []

    def failing_post(*_args, **_kwargs):
        calls.append(1)
        raise _http_error(503)

    monkeypatch.setattr(emailer.httpx, "post", failing_post)

    assert emailer.send_alert_email("student@example.test", "Jordan Lee", ALERTS) is False
    assert len(calls) == 3
    # Backoff must actually grow between attempts, not hammer the provider.
    assert sleeps == [0.75, 1.5]

    records = [json.loads(line) for line in dead_letter.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(records) == 1
    assert records[0]["to"] == "student@example.test"
    assert records[0]["attempts"] == 3
    assert "503" in records[0]["error"]
    assert "Data Intern" in records[0]["text"]


def test_rate_limits_are_retried_but_invalid_recipients_are_not(monkeypatch, tmp_path):
    _sleeps, dead_letter = _configure(monkeypatch, tmp_path)
    monkeypatch.setattr(emailer.httpx, "post", lambda *_a, **_k: (_ for _ in ()).throw(_http_error(429)))
    assert emailer.send_alert_email("student@example.test", "Jordan Lee", ALERTS) is False
    assert json.loads(dead_letter.read_text(encoding="utf-8").splitlines()[0])["attempts"] == 3

    _sleeps, dead_letter = _configure(monkeypatch, tmp_path / "second")
    calls = []

    def rejected_post(*_args, **_kwargs):
        calls.append(1)
        raise _http_error(422)

    monkeypatch.setattr(emailer.httpx, "post", rejected_post)
    assert emailer.send_alert_email("student@example.test", "Jordan Lee", ALERTS) is False
    assert len(calls) == 1, "a rejected sender or recipient must not be retried"
    assert json.loads(dead_letter.read_text(encoding="utf-8").splitlines()[0])["attempts"] == 1


def test_a_recovering_provider_delivers_without_a_dead_letter(monkeypatch, tmp_path):
    sleeps, dead_letter = _configure(monkeypatch, tmp_path)
    calls = []

    def flaky_post(*_args, **_kwargs):
        calls.append(1)
        if len(calls) < 3:
            raise _http_error(502)
        return httpx.Response(200, request=httpx.Request("POST", "https://api.resend.com/emails"), json={"id": "abc"})

    monkeypatch.setattr(emailer.httpx, "post", flaky_post)

    assert emailer.send_alert_email("student@example.test", "Jordan Lee", ALERTS) is True
    assert len(calls) == 3
    assert sleeps == [0.75, 1.5]
    assert not dead_letter.exists()


def _dead_letter_file(tmp_path, count: int = 2):
    path = tmp_path / "dead_letter.jsonl"
    records = [
        {
            "to": f"student{index}@example.test",
            "subject": f"New match: Data Intern {index}",
            "text": "Open InternIQ: http://localhost:5173",
            "html": "<p>Open InternIQ</p>",
            "error": "503 Service Unavailable",
            "attempts": 3,
            "failed_at": "2026-11-08T20:00:00+00:00",
        }
        for index in range(count)
    ]
    path.write_text("".join(json.dumps(record) + "\n" for record in records), encoding="utf-8")
    return path


def test_replay_delivers_every_record_and_clears_the_file(monkeypatch, tmp_path):
    _configure(monkeypatch, tmp_path)
    path = _dead_letter_file(tmp_path, count=2)
    monkeypatch.setattr(replay_dead_letters, "should_deliver", lambda _record: True)
    sent = []
    monkeypatch.setattr(
        emailer.httpx,
        "post",
        lambda _url, **kwargs: (
            sent.append(kwargs["json"]),
            httpx.Response(200, request=httpx.Request("POST", "https://api.resend.com/emails"), json={"id": "ok"}),
        )[1],
    )

    assert replay_dead_letters.replay(path) == (2, 0, 0, 0)
    assert [message["to"] for message in sent] == [["student0@example.test"], ["student1@example.test"]]
    assert not path.exists()


def test_replay_keeps_failed_records_without_duplicating_them(monkeypatch, tmp_path):
    _configure(monkeypatch, tmp_path)
    path = _dead_letter_file(tmp_path, count=2)
    monkeypatch.setattr(replay_dead_letters, "should_deliver", lambda _record: True)
    monkeypatch.setattr(emailer.httpx, "post", lambda *_a, **_k: (_ for _ in ()).throw(_http_error(503)))

    assert replay_dead_letters.replay(path) == (0, 2, 0, 2)
    remaining = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert len(remaining) == 2, "a failed replay must not append a second copy"
    assert remaining[0]["attempts"] == 3


def test_replay_refuses_to_run_without_email_configuration(monkeypatch, tmp_path):
    for variable in ("RESEND_API_KEY", "INTERNIQ_EMAIL_FROM", "INTERNIQ_EMAIL_TRANSPORT"):
        monkeypatch.delenv(variable, raising=False)
    path = _dead_letter_file(tmp_path, count=1)

    with pytest.raises(RuntimeError, match="not configured"):
        replay_dead_letters.replay(path)
    assert path.exists(), "nothing may be dropped when delivery is unavailable"


def test_replay_skips_records_the_student_opted_out_of(monkeypatch, tmp_path):
    _configure(monkeypatch, tmp_path)
    path = _dead_letter_file(tmp_path, count=2)
    monkeypatch.setattr(
        replay_dead_letters,
        "should_deliver",
        lambda record: record["to"].startswith("student0"),
    )
    sent = []
    monkeypatch.setattr(
        emailer.httpx,
        "post",
        lambda _url, **kwargs: (
            sent.append(kwargs["json"]),
            httpx.Response(200, request=httpx.Request("POST", "https://api.resend.com/emails"), json={"id": "ok"}),
        )[1],
    )

    assert replay_dead_letters.replay(path) == (1, 0, 1, 0)
    assert len(sent) == 1
    assert not path.exists(), "an obsolete message must not be retried forever"


def test_replay_dry_run_sends_nothing(monkeypatch, tmp_path, capsys):
    _configure(monkeypatch, tmp_path)
    path = _dead_letter_file(tmp_path, count=2)
    calls = []
    monkeypatch.setattr(emailer.httpx, "post", lambda *_a, **_k: calls.append(1))

    assert replay_dead_letters.main(["--file", str(path), "--dry-run"]) == 0
    assert calls == []
    assert "nothing was sent" in capsys.readouterr().out
    assert len(replay_dead_letters.load_records(path)) == 2


def test_attempt_count_falls_back_when_misconfigured(monkeypatch, tmp_path):
    _sleeps, _dead_letter = _configure(monkeypatch, tmp_path, attempts="not-a-number")
    calls = []
    monkeypatch.setattr(emailer.httpx, "post", lambda *_a, **_k: (calls.append(1), (_ for _ in ()).throw(_http_error(500)))[1])

    assert emailer.send_alert_email("student@example.test", "Jordan Lee", ALERTS) is False
    assert len(calls) == 3
