import os
import json
import requests
from dotenv import load_dotenv

load_dotenv(dotenv_path='.env')

def fetch_internships():
    api_key = os.getenv("INTERNSHIP_API_KEY")
    if not api_key:
        raise ValueError("Missing INTERNSHIP_API_KEY in .env")

    url = "https://internships-api.p.rapidapi.com/active-jb-7d"
    headers = {
        "x-rapidapi-host": "internships-api.p.rapidapi.com",
        "x-rapidapi-key": api_key
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        raise Exception(f"API request failed: {response.status_code} - {response.text}")

    try:
        data = response.json()
    except Exception:
        raise Exception("Invalid JSON response from API")

    internships = []
    for item in data:
        internships.append({
            "title": item.get("job_title", "N/A"),
            "company": item.get("company_name", "N/A"),
            "location": item.get("job_location", "N/A"),
            "mode": "Remote" if "remote" in item.get("job_type", "").lower() else "On-site",
            "link": item.get("job_link", "#")
        })

    os.makedirs("backend/data", exist_ok=True)
    with open("backend/data/internships.json", "w", encoding="utf-8") as f:
        json.dump(internships, f, indent=4, ensure_ascii=False)

    print(f"✅ Saved {len(internships)} internships to backend/data/internships.json")

if __name__ == "__main__":
    fetch_internships()
