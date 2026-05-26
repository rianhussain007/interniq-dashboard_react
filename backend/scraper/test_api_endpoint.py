import requests

# Test the API endpoint with a placeholder key
url = "https://internships-api.p.rapidapi.com/active-jb-7d"
headers = {
    "x-rapidapi-host": "internships-api.p.rapidapi.com",
    "x-rapidapi-key": "YOUR_RAPIDAPI_KEY_HERE"
}

print(f"Testing API endpoint: {url}")
print(f"Headers: {headers}")

try:
    response = requests.get(url, headers=headers, timeout=10)
    print(f"Status code: {response.status_code}")
    print(f"Response headers: {dict(response.headers)}")

    if response.status_code == 200:
        print("API call successful")
        print(f"Response length: {len(response.text)}")
        print(f"First 200 chars: {response.text[:200]}")
    else:
        print(f"API returned error: {response.status_code}")
        print(f"Error response: {response.text}")

except Exception as e:
    print(f"Request failed: {e}")
    print(f"Error type: {type(e)}")
