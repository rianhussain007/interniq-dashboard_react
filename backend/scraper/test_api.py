import requests

# Test API call without API key to see what happens
url = "https://jsearch.p.rapidapi.com/search"
querystring = {"query": "internship in USA", "num_pages": "1"}
headers = {
    "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
}

print("Testing API without API key...")
response = requests.get(url, headers=headers, params=querystring)
print(f"Status code: {response.status_code}")
print(f"Response headers: {dict(response.headers)}")
if response.status_code == 401:
    print("API key is required")
elif response.status_code == 200:
    print("API call successful")
    print(f"Response length: {len(response.text)}")
    print(f"First 200 chars: {response.text[:200]}")
else:
    print(f"Other error: {response.text}")
