import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("INTERNSHIP_API_KEY")
if not api_key:
    raise RuntimeError("INTERNSHIP_API_KEY is required to run this test.")

# Test API endpoint with timeout
url = "https://internships-api.p.rapidapi.com/active-jb-7d"
headers = {
    "x-rapidapi-host": "internships-api.p.rapidapi.com",
    "x-rapidapi-key": api_key
}

print("Testing API endpoint with 10-second timeout...")
try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print("Response Headers:", json.dumps(dict(response.headers), indent=2))
    print("Response Content (first 200 chars):")
    print(response.text[:200])
except requests.exceptions.Timeout:
    print("Error: Request timed out after 10 seconds")
except requests.exceptions.RequestException as e:
    print(f"Request failed: {e}")
except Exception as e:
    print(f"Unexpected error: {e}")
