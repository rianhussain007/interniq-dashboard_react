"""Explainable resume-vs-job-description tailor (no LLM, no invented scores)."""
from __future__ import annotations
import re
from typing import Any

SKILL_TAXONOMY = ["Python","Java","JavaScript","TypeScript","C++","C#","React","Angular","Vue.js","Node.js","SQL","PostgreSQL","MongoDB","AWS","Azure","Docker","Kubernetes","Git","Machine Learning","Deep Learning","Data Analysis","Pandas","NumPy","TensorFlow","PyTorch","Figma","UX Research","Prototyping","Excel","Tableau","Communication","Leadership","Agile","REST","GraphQL","Linux","Kafka","Spark","Power BI"]

STOP = set("about after again against also among and any are because been before being between both but can could did does doing down each few for from further had has have having here how into its itself just more most other our out over own same should some such than that the their them then there these they this those through too under until very was were what when where which while who will with would your using used role internship intern experience required preferred learn team support".split())

def _terms(text: str) -> list[str]:
    return list(dict.fromkeys(re.findall(r"[a-z][a-z0-9+#.-]{2,}", text.lower())))

def _edge_is_word(character: str, term_edge: str) -> bool:
    """A boundary character only binds to the term when the term itself ends in it,
    so 'Docker.' matches 'Docker' while 'C++' keeps matching 'C++'."""
    if not character:
        return False
    if character in "+#":
        return True
    if character == ".":
        return term_edge == "."
    return character.isalnum()


def _has_whole(text_lower: str, term: str) -> bool:
    t = term.lower()
    idx = text_lower.find(t)
    while idx != -1:
        prev = text_lower[idx - 1] if idx > 0 else ""
        nxt = text_lower[idx + len(t)] if idx + len(t) < len(text_lower) else ""
        if not _edge_is_word(prev, t[:1]) and not _edge_is_word(nxt, t[-1:]):
            return True
        idx = text_lower.find(t, idx + len(t))
    return False

def tailor_resume(resume_text: str, job_description: str) -> dict[str, Any]:
    resume = (resume_text or "").strip()
    jd = (job_description or "").strip()
    if len(resume) < 80:
        raise ValueError("Resume text is too short to tailor. Paste your full resume text.")
    if len(jd) < 40:
        raise ValueError("Job description is too short. Paste the full posting or pick an internship.")
    resume_l, jd_l = resume.lower(), jd.lower()
    matched_skills = [s for s in SKILL_TAXONOMY if _has_whole(resume_l, s) and _has_whole(jd_l, s)]
    missing_skills = [s for s in SKILL_TAXONOMY if _has_whole(jd_l, s) and not _has_whole(resume_l, s)]
    jd_terms = [t for t in _terms(jd) if t not in STOP][:80]
    matched_terms = [t for t in jd_terms if t in resume_l]
    missing_terms = [t for t in jd_terms if t not in resume_l][:15]
    # Coverage is a transparent ratio, not an ATS prediction.
    coverage = round(len(matched_terms) / max(1, len(jd_terms)), 3)
    suggestions = []
    for s in missing_skills[:5]:
        suggestions.append(f"Add '{s}' only if you have real experience with it — add a project or bullet proving it.")
    for t in missing_terms[:5]:
        suggestions.append(f"Consider covering '{t}' in your summary or projects if it accurately describes your work.")
    if not suggestions:
        suggestions.append("Strong overlap on checked terms. Polish bullets with measurable results.")
    return {
        "coverage": coverage,
        "matched_terms": matched_terms[:30],
        "missing_terms": missing_terms,
        "matched_skills": matched_skills,
        "missing_skills": missing_skills,
        "suggestions": suggestions[:8],
        "note": "Coverage = share of job-description terms found in your resume text. It is a checklist aid, not an ATS score or hiring prediction.",
    }
