"""Public job-board API clients. No login-gated job-board scraping is used."""

from __future__ import annotations

import html
import os
import re
from datetime import datetime, timezone
from typing import Any
from urllib.parse import quote

import requests
from bs4 import BeautifulSoup


TIMEOUT_SECONDS = 18
USER_AGENT = "InternIQ Local Job Feed/1.0 (public career board API consumer)"
INTERNSHIP_TITLE = re.compile(r"\b(intern(?:ship)?|co[ -]?op)\b", re.IGNORECASE)

# Verified public ATS board identifiers. Each refresh asks the employer's public
# board for its currently published jobs and only stores live internship roles.
DEFAULT_BOARDS = {
    "INTERNSHIP_GREENHOUSE_BOARDS": (
        "stripe:Stripe,datadog:Datadog,figma:Figma,roblox:Roblox,duolingo:Duolingo,"
        "coinbase:Coinbase,scaleai:Scale AI,mongodb:MongoDB,affirm:Affirm,"
        "pinterest:Pinterest,cloudflare:Cloudflare"
    ),
    "INTERNSHIP_LEVER_BOARDS": "palantir:Palantir",
    "INTERNSHIP_ASHBY_BOARDS": "ramp:Ramp,perplexity:Perplexity,sentry:Sentry,notion:Notion",
}


def configured_boards(variable: str) -> list[tuple[str, str]]:
    """Read comma-separated board-token[:employer-name] entries."""
    results = []
    configured = os.getenv(variable, "").strip()
    if configured.lower() == "none":
        return []
    entries = (configured or DEFAULT_BOARDS.get(variable, "")).split(",")
    for entry in entries:
        entry = entry.strip()
        if not entry:
            continue
        token, separator, label = entry.partition(":")
        token = token.strip()
        if token:
            results.append((token, label.strip() if separator and label.strip() else token.replace("-", " ").title()))
    return results


def _client() -> requests.Session:
    session = requests.Session()
    session.headers.update({"Accept": "application/json", "User-Agent": USER_AGENT})
    return session


def _date(value: Any) -> str | None:
    if value is None or value == "":
        return None
    try:
        if isinstance(value, (int, float)):
            timestamp = float(value)
            if timestamp > 10_000_000_000:
                timestamp /= 1000
            return datetime.fromtimestamp(timestamp, tz=timezone.utc).date().isoformat()
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed.date().isoformat()
    except (ValueError, OverflowError, OSError):
        return None


def _plain_text(value: Any) -> str:
    if not value:
        return ""
    soup = BeautifulSoup(html.unescape(str(value)), "html.parser")
    return " ".join(soup.get_text(" ", strip=True).split())


def _is_internship(title: str, employment_type: str = "") -> bool:
    return bool(INTERNSHIP_TITLE.search(title) or "intern" in employment_type.lower() or "co-op" in employment_type.lower())


def _base_record(*, title: str, company: str, location: str, mode: str, source: str,
                 apply_link: str, posted_date: str | None, description: str,
                 stipend: str = "", skills: list[str] | None = None) -> dict[str, Any]:
    return {
        "title": title,
        "company": company,
        "location": location,
        "mode": mode,
        "source": source,
        "apply_link": apply_link,
        "posted_date": posted_date,
        "description": description[:8000],
        "stipend": stipend,
        "skills": skills or [],
    }


def fetch_greenhouse_boards() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    boards = configured_boards("INTERNSHIP_GREENHOUSE_BOARDS")
    if not boards:
        return [], {"source": "Greenhouse", "status": "not_configured", "count": 0}
    client = _client()
    records: list[dict[str, Any]] = []
    errors = []
    for token, company in boards:
        try:
            response = client.get(f"https://boards-api.greenhouse.io/v1/boards/{quote(token, safe='')}/jobs", params={"content": "true"}, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            payload = response.json()
            jobs = payload.get("jobs", []) if isinstance(payload, dict) else []
            for job in jobs:
                title = str(job.get("title") or "").strip()
                if not title or not _is_internship(title):
                    continue
                location = str((job.get("location") or {}).get("name") or "").strip()
                departments = job.get("departments") or []
                skills = [str(item.get("name", "")).strip() for item in departments if item.get("name")]
                records.append(_base_record(
                    title=title,
                    company=company,
                    location=location,
                    mode="Remote" if "remote" in location.lower() else "Hybrid" if "hybrid" in location.lower() else "",
                    source="Greenhouse",
                    apply_link=job.get("absolute_url") or "",
                    posted_date=_date(job.get("updated_at")),
                    description=_plain_text(job.get("content")),
                    skills=skills,
                ))
        except (requests.RequestException, ValueError, TypeError) as exc:
            errors.append(f"{token}: {type(exc).__name__}: {exc}")
    status = "ok" if records and not errors else "partial" if records else "failed" if errors else "empty"
    result = {"source": "Greenhouse", "status": status, "count": len(records)}
    if errors:
        result["errors"] = errors[:5]
    return records, result


def fetch_lever_boards() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    boards = configured_boards("INTERNSHIP_LEVER_BOARDS")
    if not boards:
        return [], {"source": "Lever", "status": "not_configured", "count": 0}
    client = _client()
    records: list[dict[str, Any]] = []
    errors = []
    for site, company in boards:
        try:
            response = client.get(f"https://api.lever.co/v0/postings/{quote(site, safe='')}", params={"mode": "json"}, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            jobs = response.json()
            if not isinstance(jobs, list):
                raise ValueError("Expected a list of job postings.")
            for job in jobs:
                title = str(job.get("text") or "").strip()
                categories = job.get("categories") or {}
                employment_type = str(categories.get("commitment") or "")
                if not title or not _is_internship(title, employment_type):
                    continue
                location = str(categories.get("location") or "").strip()
                description = _plain_text(job.get("descriptionPlain") or job.get("description"))
                records.append(_base_record(
                    title=title,
                    company=company,
                    location=location,
                    mode="Remote" if "remote" in location.lower() else "Hybrid" if "hybrid" in location.lower() else "",
                    source="Lever",
                    apply_link=job.get("hostedUrl") or job.get("applyUrl") or "",
                    posted_date=_date(job.get("createdAt")),
                    description=description,
                ))
        except (requests.RequestException, ValueError, TypeError) as exc:
            errors.append(f"{site}: {type(exc).__name__}: {exc}")
    status = "ok" if records and not errors else "partial" if records else "failed" if errors else "empty"
    result = {"source": "Lever", "status": status, "count": len(records)}
    if errors:
        result["errors"] = errors[:5]
    return records, result


def fetch_ashby_boards() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    boards = configured_boards("INTERNSHIP_ASHBY_BOARDS")
    if not boards:
        return [], {"source": "Ashby", "status": "not_configured", "count": 0}
    client = _client()
    records: list[dict[str, Any]] = []
    errors = []
    for board, company in boards:
        try:
            response = client.get(f"https://api.ashbyhq.com/posting-api/job-board/{quote(board, safe='')}", params={"includeCompensation": "true"}, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            payload = response.json()
            jobs = payload.get("jobs", []) if isinstance(payload, dict) else []
            for job in jobs:
                title = str(job.get("title") or "").strip()
                if not title or job.get("isListed") is False or not _is_internship(title, str(job.get("employmentType") or "")):
                    continue
                location = str(job.get("location") or "").strip()
                workplace = str(job.get("workplaceType") or "").replace("OnSite", "On-site")
                compensation = job.get("compensation") or {}
                stipend = str(compensation.get("compensationTierSummary") or compensation.get("scrapeableCompensationSalarySummary") or "")
                records.append(_base_record(
                    title=title,
                    company=company,
                    location=location,
                    mode=workplace,
                    source="Ashby",
                    apply_link=job.get("applyUrl") or job.get("jobUrl") or "",
                    posted_date=_date(job.get("publishedAt")),
                    description=_plain_text(job.get("descriptionPlain") or job.get("descriptionHtml")),
                    stipend=stipend,
                ))
        except (requests.RequestException, ValueError, TypeError) as exc:
            errors.append(f"{board}: {type(exc).__name__}: {exc}")
    status = "ok" if records and not errors else "partial" if records else "failed" if errors else "empty"
    result = {"source": "Ashby", "status": status, "count": len(records)}
    if errors:
        result["errors"] = errors[:5]
    return records, result


def fetch_jobicy_internships() -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Jobicy's public feed allows job-board/aggregator use; keep its source URL and attribution."""
    try:
        response = _client().get("https://jobicy.com/api/jobs", params={"count": 100}, timeout=TIMEOUT_SECONDS)
        response.raise_for_status()
        payload = response.json()
        jobs = payload.get("jobs", []) if isinstance(payload, dict) else []
        records = []
        for job in jobs:
            title = str(job.get("jobTitle") or "").strip()
            if not title or not _is_internship(title, str(job.get("jobType") or "")):
                continue
            company = str(job.get("companyName") or "").strip()
            if not company:
                continue
            location = str(job.get("jobGeo") or "Remote").strip()
            records.append(_base_record(
                title=title,
                company=company,
                location=location,
                mode="Remote",
                source="Jobicy",
                apply_link=job.get("url") or "",
                posted_date=_date(job.get("pubDate")),
                description=_plain_text(job.get("jobDescription") or job.get("jobExcerpt")),
                stipend=str(job.get("annualSalaryMin") or "") if job.get("annualSalaryMin") else "",
            ))
        status = "ok" if records else "empty"
        return records, {"source": "Jobicy", "status": status, "count": len(records)}
    except (requests.RequestException, ValueError, TypeError) as exc:
        return [], {"source": "Jobicy", "status": "failed", "count": 0, "error": f"{type(exc).__name__}: {exc}"}


def scrape_all_public_sources() -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    records: list[dict[str, Any]] = []
    results = []
    for fetch in (fetch_jobicy_internships, fetch_greenhouse_boards, fetch_lever_boards, fetch_ashby_boards):
        try:
            items, result = fetch()
            records.extend(items)
            results.append(result)
        except Exception as exc:
            results.append({"source": fetch.__name__, "status": "failed", "count": 0, "error": f"{type(exc).__name__}: {exc}"})
    return records, results
