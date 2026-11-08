import os
import requests
from dotenv import load_dotenv

load_dotenv()

# Test API key directly
api_key = os.getenv("INTERNSHIP_API_KEY")
if not api_key:
    raise RuntimeError("INTERNSHIP_API_KEY is required to run this test.")
url = "https://internships-api.p.rapidapi.com/active-jb-7d"
headers = {
    "x-rapidapi-host": "internships-api.p.rapidapi.com",
    "x-rapidapi-key": api_key
}

print("Testing API endpoint...")
try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status Code: {response.status_code}")
    print("Response Headers:", response.headers)
    print("Response Content (first 200 chars):", response.text[:200])
except Exception as e:
    print(f"Error: {e}")
