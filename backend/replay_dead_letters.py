"""Resend alert emails that were dead-lettered while the provider was down.

Usage (from the backend directory, with the same environment as the API):

    python replay_dead_letters.py --dry-run
    python replay_dead_letters.py

Delivered records are removed from the file; failures are kept so nothing is
silently lost.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Any

from db import is_sqlite_backend
import emailer
import local_store

logger = logging.getLogger(__name__)


def dead_letter_path() -> Path:
    configured = os.getenv("INTERNIQ_EMAIL_DEAD_LETTER", "").strip()
    return Path(configured) if configured else emailer.DEFAULT_DEAD_LETTER_PATH


def should_deliver(record: dict[str, Any]) -> bool:
    """Skip messages for accounts that opted out or no longer exist.

    A replay runs hours after the original failure, so the student's choice may
    have changed since. Delivering anyway would ignore an unsubscribe.
    """
    to_email = str(record.get("to") or "").strip()
    if not to_email:
        return False
    if not is_sqlite_backend():
        return True
    return local_store.email_alerts_status(to_email) is True


def load_records(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    records = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            records.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return records


def replay(
    path: Path,
    *,
    dry_run: bool = False,
    stop_on_failure: bool = False,
) -> tuple[int, int, int, int]:
    """Return (delivered, failed, skipped, remaining) after attempting every record.

    ``stop_on_failure`` is used by the background retry job: once the provider
    rejects a send there is no point waiting through backoff for every other
    record in the queue.
    """
    records = load_records(path)
    if not records:
        return 0, 0, 0, 0
    if dry_run:
        return 0, 0, 0, len(records)
    if emailer.transport() == "disabled":
        raise RuntimeError(
            "Email delivery is not configured. Set RESEND_API_KEY and INTERNIQ_EMAIL_FROM before replaying."
        )

    delivered = 0
    failed = 0
    skipped = 0
    remaining: list[dict[str, Any]] = []
    for index, record in enumerate(records):
        if not should_deliver(record):
            # Opted out or deleted account: drop the message instead of retrying forever.
            skipped += 1
            continue
        ok = emailer.send_message(
            str(record.get("to") or ""),
            str(record.get("subject") or ""),
            str(record.get("text") or ""),
            html=str(record.get("html") or ""),
            # Keep the original record on failure instead of writing a duplicate.
            dead_letter=False,
        )
        if ok:
            delivered += 1
        else:
            failed += 1
            remaining.append(record)
            if stop_on_failure:
                # Keep everything not yet attempted for the next cycle.
                remaining.extend(records[index + 1 :])
                break

    if remaining:
        path.write_text(
            "".join(json.dumps(record, ensure_ascii=False) + "\n" for record in remaining),
            encoding="utf-8",
        )
    elif path.exists():
        path.unlink()
    return delivered, failed, skipped, len(remaining)


def retry_if_needed() -> tuple[int, int, int, int]:
    """One background retry pass: only touches the file when it has work to do."""
    path = dead_letter_path()
    records = load_records(path)
    if not records:
        return 0, 0, 0, 0
    if emailer.transport() == "disabled":
        return 0, 0, 0, len(records)
    result = replay(path, stop_on_failure=True)
    delivered, failed, skipped, remaining = result
    if delivered:
        logger.info(
            "Dead-letter retry delivered %s message(s); %s skipped, %s remaining.",
            delivered,
            skipped,
            remaining,
        )
    elif failed:
        logger.warning("Dead-letter retry failed with %s message(s) still queued.", remaining)
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Replay dead-lettered InternIQ alert emails.")
    parser.add_argument("--file", help="Dead-letter file to replay. Defaults to INTERNIQ_EMAIL_DEAD_LETTER.")
    parser.add_argument("--dry-run", action="store_true", help="List what would be resent without sending.")
    args = parser.parse_args(argv)

    path = Path(args.file) if args.file else dead_letter_path()
    records = load_records(path)
    if not records:
        print(f"No dead-lettered messages in {path}.")
        return 0

    if args.dry_run:
        print(f"{len(records)} message(s) in {path}:")
        for record in records:
            print(f"  {record.get('failed_at', '?')}  {record.get('to', '?')}  {record.get('subject', '?')}")
        print("Dry run: nothing was sent.")
        return 0

    try:
        delivered, failed, skipped, remaining = replay(path)
    except RuntimeError as exc:
        print(str(exc), file=sys.stderr)
        return 2

    summary = f"Delivered {delivered}, failed {failed}, {remaining} still in {path}."
    if skipped:
        summary = f"Delivered {delivered}, skipped {skipped} (opted out or account removed), failed {failed}, {remaining} still in {path}."
    print(summary)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
