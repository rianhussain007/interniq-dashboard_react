import os
import requests

# Test API key directly
api_key = "a5b3ee4f9bmshca746057e17b35cp12273bjsn793f63ebf22e"
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
