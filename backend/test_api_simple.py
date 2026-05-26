import requests
import json

# Test API endpoint with timeout
url = "https://internships-api.p.rapidapi.com/active-jb-7d"
headers = {
    "x-rapidapi-host": "internships-api.p.rapidapi.com",
    "x-rapidapi-key": "a5b3ee4f9bmshca746057e17b35cp12273bjsn793f63ebf22e"
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
