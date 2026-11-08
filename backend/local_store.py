"""SQLite-backed local accounts and application data for laptop development."""

from __future__ import annotations

import base64
import hashlib
import json
import os
import re
import secrets
import sqlite3
import uuid
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Iterator
from urllib.parse import urlsplit


BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_DATABASE_PATH = BACKEND_DIR / "data" / "interniq.sqlite3"
PASSWORD_ITERATIONS = 310_000
SESSION_DAYS = 30

SCHEMA = """
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS internships (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    company TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL DEFAULT '',
    stipend TEXT NOT NULL DEFAULT '',
    skills_json TEXT NOT NULL DEFAULT '[]',
    source TEXT NOT NULL DEFAULT 'Unknown',
    apply_link TEXT,
    posted_date TEXT,
    deadline TEXT,
    description TEXT NOT NULL DEFAULT '',
    dedupe_key TEXT NOT NULL UNIQUE,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS internships_last_seen_idx ON internships(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS internships_source_idx ON internships(source);
CREATE TABLE IF NOT EXISTS saved_internships (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    internship_id TEXT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    saved_at TEXT NOT NULL,
    UNIQUE(user_id, internship_id)
);
CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    internship_id TEXT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('applied', 'interviewing', 'offer', 'rejected', 'withdrawn')),
    notes TEXT,
    applied_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(user_id, internship_id)
);
CREATE INDEX IF NOT EXISTS applications_user_updated_idx ON applications(user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS user_checklists (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    completed_task_ids_json TEXT NOT NULL DEFAULT '[]',
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    profile_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS resume_drafts (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    draft_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS communities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS community_members (
    community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TEXT NOT NULL,
    PRIMARY KEY (community_id, user_id)
);
CREATE TABLE IF NOT EXISTS community_posts (
    id TEXT PRIMARY KEY,
    community_id TEXT NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    starts_at TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    community_id TEXT REFERENCES communities(id) ON DELETE SET NULL,
    created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS event_rsvps (
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rsvp_at TEXT NOT NULL,
    PRIMARY KEY (event_id, user_id)
);
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL DEFAULT '',
    read_at TEXT,
    dedupe_key TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS notification_state (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    generated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS community_posts_community_idx ON community_posts(community_id, created_at DESC);
"""


@contextmanager
def connection() -> Iterator[sqlite3.Connection]:
    configured_path = os.getenv("INTERNIQ_SQLITE_PATH")
    database_path = Path(configured_path).expanduser() if configured_path else DEFAULT_DATABASE_PATH
    database_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(database_path, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA busy_timeout = 15000")
    conn.executescript(SCHEMA)
    _migrate(conn)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _migrate(conn: sqlite3.Connection) -> None:
    """Add columns introduced after a database was first created."""
    columns = {row[1] for row in conn.execute("PRAGMA table_info(notifications)").fetchall()}
    if "dedupe_key" not in columns:
        conn.execute("ALTER TABLE notifications ADD COLUMN dedupe_key TEXT")
    conn.execute(
        "CREATE UNIQUE INDEX IF NOT EXISTS notifications_dedupe_idx "
        "ON notifications(user_id, dedupe_key)"
    )


def _hash_password(password: str, salt: bytes | None = None) -> str:
    actual_salt = salt or secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), actual_salt, PASSWORD_ITERATIONS)
    return "pbkdf2_sha256${}${}${}".format(
        PASSWORD_ITERATIONS,
        base64.urlsafe_b64encode(actual_salt).decode("ascii"),
        base64.urlsafe_b64encode(derived).decode("ascii"),
    )


def _verify_password(password: str, encoded: str) -> bool:
    try:
        algorithm, rounds, salt, _expected = encoded.split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        actual = _hash_password(password, base64.urlsafe_b64decode(salt.encode("ascii")))
        _prefix, _rounds, _salt, derived = actual.split("$", 3)
        return int(rounds) == PASSWORD_ITERATIONS and secrets.compare_digest(derived, _expected)
    except (ValueError, TypeError):
        return False


def _user_payload(row: sqlite3.Row) -> dict[str, str]:
    return {"id": row["id"], "email": row["email"], "name": row["name"]}


def create_user(email: str, password: str, name: str) -> dict[str, str]:
    normalized_email = email.strip().lower()
    normalized_name = " ".join(name.split())
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if len(password) > 128:
        raise ValueError("Password must be 128 characters or fewer.")
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", normalized_email):
        raise ValueError("Enter a valid email address.")
    if not normalized_name:
        raise ValueError("Enter your name.")

    user_id = str(uuid.uuid4())
    try:
        with connection() as conn:
            conn.execute(
                "INSERT INTO users(id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)",
                (user_id, normalized_email, normalized_name[:100], _hash_password(password), _now()),
            )
            row = conn.execute("SELECT id, email, name FROM users WHERE id = ?", (user_id,)).fetchone()
    except sqlite3.IntegrityError as exc:
        raise ValueError("An account with this email already exists. Sign in instead.") from exc
    return _user_payload(row)


def _new_session(user_id: str) -> tuple[str, int]:
    token = secrets.token_urlsafe(40)
    expires_at = int((datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)).timestamp())
    with connection() as conn:
        conn.execute(
            "INSERT INTO sessions(token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
            (hashlib.sha256(token.encode("utf-8")).hexdigest(), user_id, expires_at, _now()),
        )
        conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(datetime.now(timezone.utc).timestamp()),))
    return token, expires_at


def register(email: str, password: str, name: str) -> dict[str, Any]:
    user = create_user(email, password, name)
    token, expires_at = _new_session(user["id"])
    return {"access_token": token, "token_type": "bearer", "expires_at": expires_at, "user": user}


def login(email: str, password: str) -> dict[str, Any] | None:
    with connection() as conn:
        row = conn.execute(
            "SELECT id, email, name, password_hash FROM users WHERE email = ? COLLATE NOCASE",
            (email.strip(),),
        ).fetchone()
    if row is None or not _verify_password(password, row["password_hash"]):
        return None
    token, expires_at = _new_session(row["id"])
    return {"access_token": token, "token_type": "bearer", "expires_at": expires_at, "user": _user_payload(row)}


def user_for_session(token: str) -> dict[str, str] | None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = int(datetime.now(timezone.utc).timestamp())
    with connection() as conn:
        row = conn.execute(
            """SELECT u.id, u.email, u.name
               FROM sessions s JOIN users u ON u.id = s.user_id
               WHERE s.token_hash = ? AND s.expires_at > ?""",
            (token_hash, now),
        ).fetchone()
    return _user_payload(row) if row else None


def revoke_session(token: str) -> None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with connection() as conn:
        conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))


def normalize_internship(raw: dict[str, Any]) -> dict[str, Any]:
    def clean(value: Any) -> str | None:
        if value is None:
            return None
        text = " ".join(str(value).split())
        return text if text and text.lower() not in {"n/a", "na", "none", "not disclosed", "not specified"} else None

    title = clean(raw.get("title"))
    company = clean(raw.get("company"))
    if not title or not company:
        raise ValueError("Internship requires a title and company.")
    raw_link = clean(raw.get("apply_link") or raw.get("link"))
    apply_link = None
    if raw_link:
        try:
            parsed = urlsplit(raw_link)
            if parsed.scheme in {"http", "https"} and parsed.hostname:
                apply_link = raw_link
        except ValueError:
            pass
    skills = raw.get("skills") or raw.get("requirements") or []
    if isinstance(skills, str):
        skills = re.split(r"[,;|]", skills)
    skills = [clean(skill) for skill in skills] if isinstance(skills, list) else []
    skills = list(dict.fromkeys(skill for skill in skills if skill))
    location = clean(raw.get("location")) or ""
    mode = clean(raw.get("mode")) or ("Remote" if raw.get("remote") is True or "remote" in location.lower() else "")
    posted_date = clean(raw.get("posted_date"))
    deadline = clean(raw.get("deadline"))
    for field, value in (("posted_date", posted_date), ("deadline", deadline)):
        if value:
            try:
                date.fromisoformat(value[:10])
            except ValueError:
                if field == "posted_date":
                    posted_date = None
                else:
                    deadline = None
    source = clean(raw.get("source")) or "Unknown"
    dedupe_key = f"link:{apply_link.lower()}" if apply_link else "composite:" + "|".join((title, company, source)).lower()
    return {
        "title": title,
        "company": company,
        "location": location,
        "mode": mode,
        "stipend": clean(raw.get("stipend")) or "",
        "skills": skills,
        "source": source,
        "apply_link": apply_link,
        "posted_date": posted_date[:10] if posted_date else None,
        "deadline": deadline[:10] if deadline else None,
        "description": clean(raw.get("description")) or "",
        "dedupe_key": dedupe_key,
    }


def _internship_payload(row: sqlite3.Row) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "company": row["company"],
        "location": row["location"],
        "mode": row["mode"],
        "stipend": row["stipend"],
        "skills": json.loads(row["skills_json"]),
        "source": row["source"],
        "apply_link": row["apply_link"],
        "posted_date": row["posted_date"],
        "deadline": row["deadline"],
        "last_seen_at": row["last_seen_at"],
        "description": row["description"],
    }


def upsert_internship(raw: dict[str, Any]) -> dict[str, Any]:
    item = normalize_internship(raw)
    now = _now()
    with connection() as conn:
        existing = conn.execute("SELECT id, first_seen_at FROM internships WHERE dedupe_key = ?", (item["dedupe_key"],)).fetchone()
        internship_id = existing["id"] if existing else str(uuid.uuid4())
        first_seen_at = existing["first_seen_at"] if existing else now
        conn.execute(
            """INSERT INTO internships(
                id, title, company, location, mode, stipend, skills_json, source, apply_link,
                posted_date, deadline, description, dedupe_key, first_seen_at, last_seen_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(dedupe_key) DO UPDATE SET
                title=excluded.title, company=excluded.company, location=excluded.location, mode=excluded.mode,
                stipend=excluded.stipend, skills_json=excluded.skills_json, source=excluded.source,
                apply_link=excluded.apply_link, posted_date=excluded.posted_date, deadline=excluded.deadline,
                description=excluded.description, last_seen_at=excluded.last_seen_at""",
            (internship_id, item["title"], item["company"], item["location"], item["mode"], item["stipend"],
             json.dumps(item["skills"]), item["source"], item["apply_link"], item["posted_date"],
             item["deadline"], item["description"], item["dedupe_key"], first_seen_at, now),
        )
        row = conn.execute("SELECT * FROM internships WHERE dedupe_key = ?", (item["dedupe_key"],)).fetchone()
    return _internship_payload(row)


STOP_WORDS = {"the", "and", "for", "with", "a", "an", "in", "on", "to", "of", "intern", "internship", "internships"}

def _tokens(text: str) -> list[str]:
    return [t for t in re.findall(r"[a-z0-9+#.]{2,}", str(text).lower()) if t not in STOP_WORDS]

def _score_internship(item: dict[str, Any], query_tokens: list[str], profile_skills: list[str]) -> dict[str, Any]:
    title = str(item.get("title") or "").lower()
    company = str(item.get("company") or "").lower()
    desc = str(item.get("description") or "").lower()
    skills = [str(s).lower() for s in (item.get("skills") or [])]
    skills_text = " ".join(skills)
    score = 0.0
    matched: list[str] = []
    if query_tokens:
        for tok in query_tokens:
            if tok in title:
                score += 3.0; matched.append(tok)
            elif tok in skills_text:
                score += 2.5; matched.append(tok)
            elif tok in company:
                score += 1.5; matched.append(tok)
            elif tok in desc:
                score += 1.0; matched.append(tok)
        # phrase bonus
        if " ".join(query_tokens) in title:
            score += 2.0
    matched_skills: list[str] = []
    for ps in profile_skills:
        pl = str(ps).lower().strip()
        if pl and (pl in skills_text or pl in title or pl in desc):
            matched_skills.append(str(ps))
            score += 1.5
    # Freshness and deadline urgency only break ties; they must never make a
    # non-matching posting look relevant to the query.
    tiebreak = 0.0
    try:
        seen = datetime.fromisoformat(str(item.get("last_seen_at") or "").replace("Z", "+00:00"))
        age_days = max(0, (datetime.now(timezone.utc) - seen).days)
        tiebreak += max(0.0, 1.0 - age_days / 30.0)
    except Exception:
        pass
    deadline = item.get("deadline")
    if deadline:
        try:
            days = (date.fromisoformat(str(deadline)[:10]) - date.today()).days
            if 0 <= days <= 7:
                tiebreak += 0.5
        except Exception:
            pass
    if score > 0:
        score += tiebreak * 0.001
    return {"score": round(score, 4), "matched_terms": list(dict.fromkeys(matched)), "matched_skills": matched_skills}

def list_internships(limit: int = 100, offset: int = 0, **filters: Any) -> list[dict[str, Any]]:
    clauses = ["(deadline IS NULL OR deadline >= date('now'))", "last_seen_at >= ?"]
    values: list[Any] = [(datetime.now(timezone.utc) - timedelta(days=30)).isoformat()]
    query = str(filters.get("query") or "").strip()
    # Broad candidate fetch when searching; ranking happens in Python (hybrid scoring).
    # Keep SQL filters for location/source/mode as hard constraints.
    for field in ("location", "source", "mode"):
        value = str(filters.get(field) or "").strip()
        if value and value != "All":
            clauses.append(f"lower({field}) LIKE ?")
            values.append(f"%{value.lower()}%")
    profile_skills = [str(s) for s in (filters.get("profile_skills") or []) if str(s).strip()]
    query_tokens = _tokens(query)
    sql = f"SELECT * FROM internships WHERE {' AND '.join(clauses)}"
    with connection() as conn:
        rows = conn.execute(sql, values).fetchall()
    items = [_internship_payload(row) for row in rows]
    for item in items:
        scored = _score_internship(item, query_tokens, profile_skills)
        item["score"] = scored["score"]
        item["matched_terms"] = scored["matched_terms"]
        item["matched_skills"] = scored["matched_skills"]
    if query_tokens:
        items = [i for i in items if i["score"] > 0]
    sort = filters.get("sort", "relevance")
    if sort == "deadline":
        items.sort(key=lambda i: (i.get("deadline") is None, i.get("deadline") or "9999", -i.get("score", 0)))
    elif sort == "recent":
        items.sort(key=lambda i: (i.get("posted_date") or i.get("last_seen_at") or ""), reverse=True)
    else:
        items.sort(key=lambda i: (i.get("score", 0), len(i.get("matched_skills") or [])), reverse=True)
    lim = max(1, min(int(limit), 500)); off = max(0, int(offset))
    return items[off:off+lim]

def get_internship(internship_id: str) -> dict[str, Any] | None:
    with connection() as conn:
        row = conn.execute("SELECT * FROM internships WHERE id = ?", (str(internship_id),)).fetchone()
    return _internship_payload(row) if row else None


ROLE_CONCEPTS = (
    ("software engineering", "software engineer", "developer", "programmer", "frontend", "backend", "full stack", "programming"),
    ("data analyst analytics data science machine learning", "data analyst", "data analysis", "analytics", "data science", "machine learning", "statistics"),
    ("product manager product operations", "product manager", "product management", "product operations", "roadmap", "user research"),
    ("designer design ui ux user experience", "product design", "ui design", "ux design", "user experience", "figma", "prototyping"),
    ("marketing growth seo content social media", "marketing", "growth", "seo", "content", "social media", "campaign"),
    ("finance accounting investment banking", "finance", "accounting", "investment", "financial analysis", "excel"),
    ("research scientist laboratory", "research", "research assistant", "scientist", "laboratory", "experiment"),
)
SEARCH_STOPWORDS = {"about", "after", "also", "and", "any", "are", "can", "for", "from", "how", "intern", "internship", "looking", "role", "the", "this", "want", "with"}


def smart_search_internships(
    query: str,
    *,
    location: str | None = None,
    source: str | None = None,
    mode: str | None = None,
    sort: str = "relevance",
    limit: int = 24,
    offset: int = 0,
    user_id: str | None = None,
) -> list[dict[str, Any]]:
    """Offline role/skill query expansion with transparent lexical relevance."""
    normalized_query = " ".join(query.lower().split())
    terms = {term for term in re.findall(r"[a-z0-9+#.-]{2,}", normalized_query) if term not in SEARCH_STOPWORDS}
    expanded_terms = set(terms)
    for concepts in ROLE_CONCEPTS:
        if any(concept in normalized_query or concept in terms for concept in concepts):
            expanded_terms.update(concepts)
    profile_skills: list[str] = []
    if user_id:
        profile = get_profile(user_id)
        profile_skills = [str(skill).strip() for skill in (profile.get("skills") or []) if str(skill).strip()]
        expanded_terms.update(str(value).strip().lower() for key in ("skills", "interests", "target_role")
                              for value in (profile.get(key) if isinstance(profile.get(key), list) else [profile.get(key)])
                              if value)

    candidates = list_internships(
        limit=500,
        offset=0,
        location=location,
        source=source,
        mode=mode,
        sort="recent",
    )
    ranked = []
    for item in candidates:
        title = item["title"].lower()
        skills = " ".join(item["skills"]).lower()
        description = item["description"].lower()
        company_location = f"{item['company']} {item['location']}".lower()
        score = 0.0
        matched = []
        for term in expanded_terms:
            if len(term) < 2:
                continue
            term_score = (4 if term in title else 0) + (3 if term in skills else 0) + (1 if term in description else 0) + (0.5 if term in company_location else 0)
            if term_score:
                score += term_score
                matched.append(term)
        if score <= 0:
            continue
        item["matched_terms"] = sorted(matched)
        # Explainable profile fit: the skills from the student's own profile that
        # this posting actually mentions (original casing preserved for display).
        item["matched_skills"] = [
            skill for skill in profile_skills
            if skill.lower() in title or skill.lower() in skills or skill.lower() in description
        ]
        ranked.append((score, item))
    if sort == "recent":
        ranked.sort(key=lambda pair: (pair[1].get("posted_date") or "", pair[1]["last_seen_at"]), reverse=True)
    elif sort == "deadline":
        ranked.sort(key=lambda pair: (pair[1].get("deadline") is None, pair[1].get("deadline") or "9999-12-31", -pair[0]))
    else:
        ranked.sort(key=lambda pair: (pair[0], pair[1].get("posted_date") or "", pair[1]["last_seen_at"]), reverse=True)

    # Normalize similarity against this result set's best match so the number
    # differentiates postings instead of compressing every hit into one value.
    top_score = ranked[0][0] if ranked else 0.0
    for score, item in ranked:
        item["similarity"] = round(min(0.99, score / top_score), 3) if top_score else 0.0

    window = ranked[max(0, offset):max(0, offset) + max(1, min(limit, 100))]
    return [item for _score, item in window]


def _require_internship(conn: sqlite3.Connection, internship_id: str) -> sqlite3.Row:
    row = conn.execute("SELECT * FROM internships WHERE id = ?", (str(internship_id),)).fetchone()
    if row is None:
        raise LookupError("Referenced internship was not found.")
    return row


def save_internship(user_id: str, internship_id: str) -> dict[str, Any]:
    now = _now()
    with connection() as conn:
        _require_internship(conn, internship_id)
        conn.execute(
            "INSERT INTO saved_internships(id,user_id,internship_id,saved_at) VALUES (?,?,?,?) ON CONFLICT(user_id,internship_id) DO NOTHING",
            (str(uuid.uuid4()), user_id, str(internship_id), now),
        )
        row = conn.execute("SELECT * FROM saved_internships WHERE user_id = ? AND internship_id = ?", (user_id, str(internship_id))).fetchone()
    return {"id": row["id"], "user_id": row["user_id"], "internship_id": row["internship_id"], "saved_at": row["saved_at"]}


def remove_saved_internship(user_id: str, internship_id: str) -> bool:
    with connection() as conn:
        cursor = conn.execute("DELETE FROM saved_internships WHERE user_id = ? AND internship_id = ?", (user_id, str(internship_id)))
    return cursor.rowcount > 0


def list_saved_internships(user_id: str) -> list[dict[str, Any]]:
    with connection() as conn:
        rows = conn.execute(
            "SELECT i.* FROM saved_internships s JOIN internships i ON i.id=s.internship_id WHERE s.user_id=? ORDER BY s.saved_at DESC",
            (user_id,),
        ).fetchall()
    return [_internship_payload(row) for row in rows]


def track_application(user_id: str, internship_id: str, status: str, notes: str | None) -> dict[str, Any]:
    now = _now()
    with connection() as conn:
        _require_internship(conn, internship_id)
        existing = conn.execute("SELECT id, applied_at FROM applications WHERE user_id=? AND internship_id=?", (user_id, str(internship_id))).fetchone()
        application_id = existing["id"] if existing else str(uuid.uuid4())
        applied_at = existing["applied_at"] if existing else now
        conn.execute(
            """INSERT INTO applications(id,user_id,internship_id,status,notes,applied_at,updated_at)
               VALUES (?,?,?,?,?,?,?) ON CONFLICT(user_id,internship_id) DO UPDATE SET
               status=excluded.status, notes=excluded.notes, updated_at=excluded.updated_at""",
            (application_id, user_id, str(internship_id), status, notes, applied_at, now),
        )
        row = conn.execute("SELECT * FROM applications WHERE id=?", (application_id,)).fetchone()
    return {"id": row["id"], "user_id": row["user_id"], "internship_id": row["internship_id"], "status": row["status"], "notes": row["notes"], "applied_at": row["applied_at"], "updated_at": row["updated_at"]}


def list_applications(user_id: str) -> list[dict[str, Any]]:
    with connection() as conn:
        rows = conn.execute(
            """SELECT a.id AS application_id,a.status,a.notes,a.applied_at,a.updated_at,i.*
               FROM applications a JOIN internships i ON i.id=a.internship_id
               WHERE a.user_id=? ORDER BY a.updated_at DESC""",
            (user_id,),
        ).fetchall()
    return [{"id": row["application_id"], "status": row["status"], "notes": row["notes"], "applied_at": row["applied_at"], "updated_at": row["updated_at"], "internship": _internship_payload(row)} for row in rows]


def dashboard_summary(user_id: str) -> dict[str, int]:
    with connection() as conn:
        row = conn.execute(
            """SELECT
               (SELECT COUNT(*) FROM applications WHERE user_id=?) AS applications_tracked,
               (SELECT COUNT(*) FROM applications WHERE user_id=? AND status='interviewing') AS interviewing,
               (SELECT COUNT(*) FROM applications WHERE user_id=? AND status='offer') AS offers,
               (SELECT COUNT(*) FROM saved_internships WHERE user_id=?) AS saved_internships""",
            (user_id, user_id, user_id, user_id),
        ).fetchone()
    return {key: int(row[key]) for key in ("applications_tracked", "interviewing", "offers", "saved_internships")}


def get_checklist(user_id: str) -> list[str]:
    with connection() as conn:
        row = conn.execute("SELECT completed_task_ids_json FROM user_checklists WHERE user_id=?", (user_id,)).fetchone()
    return json.loads(row["completed_task_ids_json"]) if row else []


def save_checklist(user_id: str, task_ids: list[str]) -> list[str]:
    unique_ids = list(dict.fromkeys(task_ids))
    with connection() as conn:
        conn.execute(
            """INSERT INTO user_checklists(user_id,completed_task_ids_json,updated_at) VALUES (?,?,?)
               ON CONFLICT(user_id) DO UPDATE SET completed_task_ids_json=excluded.completed_task_ids_json,updated_at=excluded.updated_at""",
            (user_id, json.dumps(unique_ids), _now()),
        )
    return unique_ids


def get_profile(user_id: str) -> dict[str, Any]:
    with connection() as conn:
        row = conn.execute("SELECT profile_json FROM user_profiles WHERE user_id=?", (user_id,)).fetchone()
    return json.loads(row["profile_json"]) if row else {}


def save_profile(user_id: str, profile: dict[str, Any]) -> dict[str, Any]:
    with connection() as conn:
        display_name = str(profile.get("name") or "").strip()
        if display_name:
            conn.execute("UPDATE users SET name = ? WHERE id = ?", (display_name[:100], user_id))
        conn.execute(
            """INSERT INTO user_profiles(user_id,profile_json,updated_at) VALUES (?,?,?)
               ON CONFLICT(user_id) DO UPDATE SET profile_json=excluded.profile_json,updated_at=excluded.updated_at""",
            (user_id, json.dumps(profile, ensure_ascii=False), _now()),
        )
    return get_profile(user_id)


# --- Resume drafts (server-persisted, survives devices) ---
def get_resume_draft(user_id: str) -> dict[str, Any]:
    with connection() as conn:
        row = conn.execute("SELECT draft_json FROM resume_drafts WHERE user_id=?", (user_id,)).fetchone()
    return json.loads(row["draft_json"]) if row else {}

def save_resume_draft(user_id: str, draft: dict[str, Any]) -> dict[str, Any]:
    with connection() as conn:
        conn.execute("INSERT INTO resume_drafts(user_id,draft_json,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET draft_json=excluded.draft_json, updated_at=excluded.updated_at", (user_id, json.dumps(draft, ensure_ascii=False), _now()))
    return get_resume_draft(user_id)

def _notify(conn, user_id, kind, title, body="", link="", dedupe_key=None):
    conn.execute(
        "INSERT OR IGNORE INTO notifications(id,user_id,kind,title,body,link,dedupe_key,created_at) VALUES (?,?,?,?,?,?,?,?)",
        (str(uuid.uuid4()), user_id, kind, title, body, link, dedupe_key, _now()),
    )


ALERT_COOLDOWN_MINUTES = 60
ALERT_MATCH_WINDOW_DAYS = 7
ALERT_DEADLINE_WINDOW_DAYS = 3
ALERT_MAX_MATCHES = 3


def generate_user_alerts(user_id: str, force: bool = False) -> int:
    """Create match and deadline notifications for one student.

    Runs at most once per cooldown window so a polling client cannot rebuild the
    same alerts. Dedupe keys make repeated runs idempotent as well.
    """
    now = datetime.now(timezone.utc)
    with connection() as conn:
        if not force:
            state = conn.execute("SELECT generated_at FROM notification_state WHERE user_id=?", (user_id,)).fetchone()
            if state:
                try:
                    generated_at = datetime.fromisoformat(str(state["generated_at"]).replace("Z", "+00:00"))
                    if (now - generated_at) < timedelta(minutes=ALERT_COOLDOWN_MINUTES):
                        return 0
                except ValueError:
                    pass

        profile = get_profile(user_id)
        skills = [str(skill).strip() for skill in (profile.get("skills") or []) if str(skill).strip()]
        target_role = str(profile.get("target_role") or "")
        created = 0

        # Deadline alerts for applications the student is still waiting on.
        deadline_rows = conn.execute(
            """SELECT i.id, i.title, i.company, i.deadline
               FROM applications a JOIN internships i ON i.id = a.internship_id
               WHERE a.user_id = ? AND a.status IN ('applied', 'interviewing')
                 AND i.deadline IS NOT NULL AND date(i.deadline) >= date('now')
                 AND date(i.deadline) <= date('now', ?)""",
            (user_id, f"+{ALERT_DEADLINE_WINDOW_DAYS} days"),
        ).fetchall()
        for row in deadline_rows:
            try:
                days_left = (date.fromisoformat(str(row["deadline"])[:10]) - now.date()).days
            except ValueError:
                continue
            when = "today" if days_left == 0 else "tomorrow" if days_left == 1 else f"in {days_left} days"
            _notify(
                conn,
                user_id,
                "deadline",
                f"Deadline {when}: {row['title']}",
                f"{row['company']} · your application is tracked. Check the posting before it closes.",
                "/applications",
                dedupe_key=f"deadline:{row['id']}:{row['deadline']}",
            )
            created += 1

        if skills or target_role:
            rows = conn.execute(
                """SELECT * FROM internships
                   WHERE (deadline IS NULL OR date(deadline) >= date('now'))
                     AND last_seen_at >= ?
                   ORDER BY coalesce(posted_date, first_seen_at) DESC, last_seen_at DESC
                   LIMIT 300""",
                ((now - timedelta(days=ALERT_MATCH_WINDOW_DAYS)).isoformat(),),
            ).fetchall()
            query_tokens = _tokens(target_role)
            ranked = []
            for row in rows:
                item = _internship_payload(row)
                judged = _score_internship(item, query_tokens, skills)
                overlap = len(judged["matched_skills"])
                if overlap >= 2 or (overlap >= 1 and judged["score"] >= 4):
                    ranked.append((overlap, judged["score"], item, judged["matched_skills"]))
            ranked.sort(key=lambda entry: (entry[0], entry[1]), reverse=True)
            for overlap, _score, item, matched_skills in ranked[:ALERT_MAX_MATCHES]:
                matched = ", ".join(matched_skills[:3])
                _notify(
                    conn,
                    user_id,
                    "new_match",
                    f"New match: {item['title']}",
                    f"{item['company']} · matches {matched or 'your target role'}",
                    "/internships",
                    dedupe_key=f"match:{item['id']}",
                )
                created += 1

        conn.execute(
            "INSERT INTO notification_state(user_id,generated_at) VALUES (?,?) "
            "ON CONFLICT(user_id) DO UPDATE SET generated_at=excluded.generated_at",
            (user_id, _now()),
        )
    return created

# --- Communities / events / notifications ---
def create_community(user_id: str, name: str, description: str = "") -> dict[str, Any]:
    cid = str(uuid.uuid4())
    with connection() as conn:
        conn.execute("INSERT INTO communities(id,name,description,created_by,created_at) VALUES (?,?,?,?,?)", (cid, name.strip()[:120], description.strip()[:500], user_id, _now()))
        conn.execute("INSERT OR IGNORE INTO community_members(community_id,user_id,joined_at) VALUES (?,?,?)", (cid, user_id, _now()))
    return {"id": cid, "name": name.strip(), "description": description.strip()}

def list_communities(user_id: str | None = None) -> list[dict[str, Any]]:
    with connection() as conn:
        rows = conn.execute("SELECT c.*, (SELECT COUNT(*) FROM community_members m WHERE m.community_id=c.id) AS member_count, (SELECT COUNT(*) FROM community_posts p WHERE p.community_id=c.id) AS post_count FROM communities c ORDER BY c.created_at DESC").fetchall()
        joined = set()
        if user_id:
            joined = {r[0] for r in conn.execute("SELECT community_id FROM community_members WHERE user_id=?", (user_id,)).fetchall()}
    return [{"id": r["id"], "name": r["name"], "description": r["description"], "member_count": r["member_count"], "post_count": r["post_count"], "joined": r["id"] in joined} for r in rows]

def join_community(user_id: str, community_id: str) -> dict[str, Any]:
    with connection() as conn:
        if not conn.execute("SELECT id FROM communities WHERE id=?", (community_id,)).fetchone():
            raise LookupError("Community not found.")
        conn.execute("INSERT OR IGNORE INTO community_members(community_id,user_id,joined_at) VALUES (?,?,?)", (community_id, user_id, _now()))
    return {"joined": True, "community_id": community_id}

def list_posts(community_id: str, limit: int = 50) -> list[dict[str, Any]]:
    with connection() as conn:
        rows = conn.execute("SELECT p.id,p.body,p.created_at,u.name AS author FROM community_posts p JOIN users u ON u.id=p.user_id WHERE p.community_id=? ORDER BY p.created_at DESC LIMIT ?", (community_id, max(1, min(limit, 100)))).fetchall()
    return [{"id": r["id"], "body": r["body"], "created_at": r["created_at"], "author": r["author"]} for r in rows]

def create_post(user_id: str, community_id: str, body: str) -> dict[str, Any]:
    body = body.strip()
    if not body:
        raise ValueError("Post body is required.")
    pid = str(uuid.uuid4())
    with connection() as conn:
        if not conn.execute("SELECT id FROM communities WHERE id=?", (community_id,)).fetchone():
            raise LookupError("Community not found.")
        conn.execute("INSERT OR IGNORE INTO community_members(community_id,user_id,joined_at) VALUES (?,?,?)", (community_id, user_id, _now()))
        conn.execute("INSERT INTO community_posts(id,community_id,user_id,body,created_at) VALUES (?,?,?,?,?)", (pid, community_id, user_id, body[:2000], _now()))
        members = [r[0] for r in conn.execute("SELECT user_id FROM community_members WHERE community_id=? AND user_id != ?", (community_id, user_id)).fetchall()]
        for mid in members:
            _notify(conn, mid, "community_post", "New community post", body[:120], f"/community?community={community_id}")
    return {"id": pid, "body": body, "community_id": community_id}

def create_event(user_id: str, title: str, starts_at: str, description: str = "", location: str = "", community_id: str | None = None) -> dict[str, Any]:
    eid = str(uuid.uuid4())
    with connection() as conn:
        conn.execute("INSERT INTO events(id,title,description,starts_at,location,community_id,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)", (eid, title.strip()[:160], description.strip()[:1000], starts_at, location.strip()[:200], community_id, user_id, _now()))
        conn.execute("INSERT OR IGNORE INTO event_rsvps(event_id,user_id,rsvp_at) VALUES (?,?,?)", (eid, user_id, _now()))
    return {"id": eid, "title": title.strip(), "starts_at": starts_at}

def list_events(user_id: str | None = None) -> list[dict[str, Any]]:
    with connection() as conn:
        rows = conn.execute("SELECT e.*, (SELECT COUNT(*) FROM event_rsvps r WHERE r.event_id=e.id) AS rsvp_count FROM events e ORDER BY e.starts_at ASC").fetchall()
        rsvped = {r[0] for r in conn.execute("SELECT event_id FROM event_rsvps WHERE user_id=?", (user_id,)).fetchall()} if user_id else set()
    return [{"id": r["id"], "title": r["title"], "description": r["description"], "starts_at": r["starts_at"], "location": r["location"], "community_id": r["community_id"], "rsvp_count": r["rsvp_count"], "rsvped": r["id"] in rsvped} for r in rows]

def rsvp_event(user_id: str, event_id: str) -> dict[str, Any]:
    with connection() as conn:
        if not conn.execute("SELECT id FROM events WHERE id=?", (event_id,)).fetchone():
            raise LookupError("Event not found.")
        conn.execute("INSERT OR IGNORE INTO event_rsvps(event_id,user_id,rsvp_at) VALUES (?,?,?)", (event_id, user_id, _now()))
    return {"rsvped": True, "event_id": event_id}

def list_notifications(user_id: str, unread_only: bool = False) -> list[dict[str, Any]]:
    sql = "SELECT * FROM notifications WHERE user_id=?" + (" AND read_at IS NULL" if unread_only else "") + " ORDER BY created_at DESC LIMIT 50"
    with connection() as conn:
        rows = conn.execute(sql, (user_id,)).fetchall()
        unread = conn.execute("SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL", (user_id,)).fetchone()[0]
    return [{"id": r["id"], "kind": r["kind"], "title": r["title"], "body": r["body"], "link": r["link"], "read_at": r["read_at"], "created_at": r["created_at"]} for r in rows] if not unread_only else [{"id": r["id"], "kind": r["kind"], "title": r["title"], "body": r["body"], "link": r["link"], "read_at": r["read_at"], "created_at": r["created_at"], "unread_count": unread} for r in rows]

def unread_count(user_id: str) -> int:
    with connection() as conn:
        return int(conn.execute("SELECT COUNT(*) FROM notifications WHERE user_id=? AND read_at IS NULL", (user_id,)).fetchone()[0])

def mark_notifications_read(user_id: str) -> dict[str, Any]:
    with connection() as conn:
        conn.execute("UPDATE notifications SET read_at=? WHERE user_id=? AND read_at IS NULL", (_now(), user_id))
    return {"unread_count": 0}
