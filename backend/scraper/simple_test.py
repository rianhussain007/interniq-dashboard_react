import requests

# Very simple test
url = "https://internships-api.p.rapidapi.com/active-jb-7d"
headers = {
    "x-rapidapi-host": "internships-api.p.rapidapi.com",
    "x-rapidapi-key": "test-key"
}

print("Making simple request...")
try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status: {response.status_code}")
    print(f"Content-Type: {response.headers.get('content-type')}")
    print("Raw response (first 50 bytes):", repr(response.content[:50]))
except Exception as e:
    print(f"Error: {e}")
    print(f"Error type: {type(e)}")
