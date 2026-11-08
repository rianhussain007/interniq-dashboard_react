
import os
import requests
from dotenv import load_dotenv

from db import get_db_connection
from internships_store import upsert_internships

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
load_dotenv(os.path.join(PROJECT_ROOT, ".env"))

def fetch_internships_from_api():
    api_key = os.getenv("INTERNSHIP_API_KEY")
    if not api_key:
        raise ValueError("INTERNSHIP_API_KEY not found in .env file")

    url = "https://jsearch.p.rapidapi.com/search"
    querystring = {"query":"internship in USA","num_pages":"1"}
    headers = {
        "X-RapidAPI-Key": api_key,
        "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
    }

    response = requests.get(url, headers=headers, params=querystring)
    data = response.json()

    normalized_data = []
    for job in data.get('data', []):
        normalized_data.append({
            "title": job.get("job_title"),
            "company": job.get("employer_name"),
            "location": f"{job.get('job_city', '')}, {job.get('job_state', '')}, {job.get('job_country', '')}",
            "mode": "Remote" if job.get("job_is_remote") else "On-site",
            "link": job.get("job_apply_link")
        })

    with get_db_connection() as conn:
        summary = upsert_internships(conn, normalized_data)

    return summary["upserted"]

if __name__ == '__main__':
    fetch_internships_from_api()
