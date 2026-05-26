
import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

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

    with open('backend/data/internships.json', 'w') as f:
        json.dump(normalized_data, f, indent=4)

    return len(normalized_data)

if __name__ == '__main__':
    fetch_internships_from_api()
