from __future__ import annotations

import re
from datetime import date
from datetime import datetime
from typing import Any
from uuid import UUID

from psycopg import Connection


DATE_PATTERNS = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%m/%d/%Y")


def clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"n/a", "na", "none", "not specified", "not disclosed"}:
        return None
    return re.sub(r"\s+", " ", text)


def parse_date(value: Any) -> date | None:
    text = clean_text(value)
    if not text:
        return None

    for pattern in DATE_PATTERNS:
        try:
            return datetime.strptime(text, pattern).date()
        except ValueError:
            continue
    return None


def normalize_skills(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [skill for item in value if (skill := clean_text(item))]
    if isinstance(value, str):
        return [skill for item in re.split(r"[,;|]", value) if (skill := clean_text(item))]
    return []


def infer_mode(raw: dict[str, Any]) -> str | None:
    mode = clean_text(raw.get("mode"))
    if mode:
        return mode
    remote = raw.get("remote")
    if isinstance(remote, bool):
        return "Remote" if remote else "On-site"
    location = clean_text(raw.get("location"))
    if location and ("remote" in location.lower() or "work from home" in location.lower()):
        return "Remote"
    return None


def build_dedupe_key(raw: dict[str, Any]) -> str:
    apply_link = clean_text(raw.get("apply_link") or raw.get("link"))
    if apply_link and apply_link != "#":
        return f"link:{apply_link.lower()}"

    title = clean_text(raw.get("title")) or ""
    company = clean_text(raw.get("company")) or ""
    source = clean_text(raw.get("source")) or "Unknown"
    composite = "|".join([title, company, source]).lower()
    return f"composite:{composite}"


def normalize_internship(raw: dict[str, Any]) -> dict[str, Any]:
    title = clean_text(raw.get("title"))
    company = clean_text(raw.get("company"))
    if not title or not company:
        raise ValueError("Internship requires title and company.")

    skills = normalize_skills(raw.get("skills") or raw.get("requirements") or raw.get("domain"))
    return {
        "title": title,
        "company": company,
        "location": clean_text(raw.get("location")),
        "mode": infer_mode(raw),
        "stipend": clean_text(raw.get("stipend")),
        "skills": skills,
        "source": clean_text(raw.get("source")) or "Unknown",
        "apply_link": clean_text(raw.get("apply_link") or raw.get("link")),
        "posted_date": parse_date(raw.get("posted_date")),
        "deadline": parse_date(raw.get("deadline")),
        "description": clean_text(raw.get("description")),
        "dedupe_key": build_dedupe_key(raw),
    }


def row_to_internship(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "company": row["company"],
        "location": row.get("location") or "",
        "mode": row.get("mode") or "",
        "stipend": row.get("stipend") or "",
        "skills": row.get("skills") or [],
        "source": row["source"],
        "apply_link": row.get("apply_link") or "#",
        "posted_date": row["posted_date"].isoformat() if row.get("posted_date") else None,
        "deadline": row["deadline"].isoformat() if row.get("deadline") else None,
        "description": row.get("description") or "",
    }


def upsert_internship(conn: Connection, raw: dict[str, Any]) -> dict[str, Any]:
    internship = normalize_internship(raw)
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into internships (
                title, company, location, mode, stipend, skills, source,
                apply_link, posted_date, deadline, description, dedupe_key
            )
            values (
                %(title)s, %(company)s, %(location)s, %(mode)s, %(stipend)s, %(skills)s, %(source)s,
                %(apply_link)s, %(posted_date)s, %(deadline)s, %(description)s, %(dedupe_key)s
            )
            on conflict (dedupe_key) do update set
                title = excluded.title,
                company = excluded.company,
                location = excluded.location,
                mode = excluded.mode,
                stipend = excluded.stipend,
                skills = excluded.skills,
                source = excluded.source,
                apply_link = excluded.apply_link,
                posted_date = excluded.posted_date,
                deadline = excluded.deadline,
                description = excluded.description,
                updated_at = now()
            returning *
            """,
            internship,
        )
        return row_to_internship(cur.fetchone())


def upsert_internships(conn: Connection, raw_items: list[dict[str, Any]]) -> dict[str, int]:
    upserted = 0
    skipped = 0
    for item in raw_items:
        try:
            upsert_internship(conn, item)
            upserted += 1
        except ValueError:
            skipped += 1
    return {"upserted": upserted, "skipped": skipped}


def list_internships(conn: Connection, limit: int = 100, offset: int = 0) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select * from internships
            order by coalesce(posted_date, created_at::date) desc, created_at desc
            limit %s offset %s
            """,
            (limit, offset),
        )
        return [row_to_internship(row) for row in cur.fetchall()]


def search_internships(
    conn: Connection,
    query: str | None = None,
    location: str | None = None,
    source: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[dict[str, Any]]:
    filters = []
    params: list[Any] = []

    if query:
        filters.append(
            "(title ilike %s or company ilike %s or exists (select 1 from unnest(skills) skill where skill ilike %s))"
        )
        like_query = f"%{query}%"
        params.extend([like_query, like_query, like_query])
    if location:
        filters.append("location ilike %s")
        params.append(f"%{location}%")
    if source:
        filters.append("source = %s")
        params.append(source)

    where_clause = f"where {' and '.join(filters)}" if filters else ""
    params.extend([limit, offset])

    with conn.cursor() as cur:
        cur.execute(
            f"""
            select * from internships
            {where_clause}
            order by coalesce(posted_date, created_at::date) desc, created_at desc
            limit %s offset %s
            """,
            params,
        )
        return [row_to_internship(row) for row in cur.fetchall()]


def save_internship(conn: Connection, user_id: str, internship_id: UUID) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into saved_internships (user_id, internship_id)
            values (%s, %s)
            on conflict (user_id, internship_id) do update set saved_at = saved_internships.saved_at
            returning id, user_id, internship_id, saved_at
            """,
            (user_id, internship_id),
        )
        row = cur.fetchone()
        return {
            "id": str(row["id"]),
            "user_id": row["user_id"],
            "internship_id": str(row["internship_id"]),
            "saved_at": row["saved_at"].isoformat(),
        }


def list_saved_internships(conn: Connection, user_id: str) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select i.*
            from saved_internships s
            join internships i on i.id = s.internship_id
            where s.user_id = %s
            order by s.saved_at desc
            """,
            (user_id,),
        )
        return [row_to_internship(row) for row in cur.fetchall()]


def track_application(
    conn: Connection,
    user_id: str,
    internship_id: UUID,
    status: str,
    notes: str | None,
) -> dict[str, Any]:
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into applications (user_id, internship_id, status, notes)
            values (%s, %s, %s::application_status, %s)
            on conflict (user_id, internship_id) do update set
                status = excluded.status,
                notes = excluded.notes,
                updated_at = now()
            returning id, user_id, internship_id, status, notes, applied_at, updated_at
            """,
            (user_id, internship_id, status, notes),
        )
        row = cur.fetchone()
        return {
            "id": str(row["id"]),
            "user_id": row["user_id"],
            "internship_id": str(row["internship_id"]),
            "status": row["status"],
            "notes": row["notes"],
            "applied_at": row["applied_at"].isoformat(),
            "updated_at": row["updated_at"].isoformat(),
        }


def list_applications(conn: Connection, user_id: str) -> list[dict[str, Any]]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select
                a.id as application_id,
                a.status,
                a.notes,
                a.applied_at,
                a.updated_at,
                i.*
            from applications a
            join internships i on i.id = a.internship_id
            where a.user_id = %s
            order by a.updated_at desc
            """,
            (user_id,),
        )
        results = []
        for row in cur.fetchall():
            internship = row_to_internship(row)
            results.append(
                {
                    "id": str(row["application_id"]),
                    "status": row["status"],
                    "notes": row["notes"],
                    "applied_at": row["applied_at"].isoformat(),
                    "updated_at": row["updated_at"].isoformat(),
                    "internship": internship,
                }
            )
        return results


def get_dashboard_summary(conn: Connection, user_id: str) -> dict[str, int]:
    with conn.cursor() as cur:
        cur.execute(
            """
            select
                (select count(*) from applications where user_id = %s) as applications_tracked,
                (select count(*) from applications where user_id = %s and status = 'interviewing') as interviewing,
                (select count(*) from applications where user_id = %s and status = 'offer') as offers,
                (select count(*) from saved_internships where user_id = %s) as saved_internships
            """,
            (user_id, user_id, user_id, user_id),
        )
        row = cur.fetchone()
        return {
            key: int(row[key])
            for key in (
                "applications_tracked",
                "interviewing",
                "offers",
                "saved_internships",
            )
        }


def get_user_checklist(conn: Connection, user_id: str) -> list[str]:
    with conn.cursor() as cur:
        cur.execute(
            "select completed_task_ids from user_checklists where user_id = %s",
            (user_id,),
        )
        row = cur.fetchone()
        return list(row["completed_task_ids"]) if row else []


def save_user_checklist(
    conn: Connection,
    user_id: str,
    completed_task_ids: list[str],
) -> list[str]:
    unique_task_ids = list(dict.fromkeys(completed_task_ids))
    with conn.cursor() as cur:
        cur.execute(
            """
            insert into user_checklists (user_id, completed_task_ids)
            values (%s, %s)
            on conflict (user_id) do update set
                completed_task_ids = excluded.completed_task_ids,
                updated_at = now()
            returning completed_task_ids
            """,
            (user_id, unique_task_ids),
        )
        return list(cur.fetchone()["completed_task_ids"])
