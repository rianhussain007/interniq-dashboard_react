import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def fetch_internships_from_api():
    api_key = os.getenv("INTERNSHIP_API_KEY")
    if not api_key or api_key == "YOUR_RAPIDAPI_KEY_HERE" or api_key == "YOUR_ACTUAL_RAPIDAPI_KEY_HERE":
        raise ValueError("Please set a valid INTERNSHIP_API_KEY in backend/.env file")

    url = "https://internships-api.p.rapidapi.com/active-jb-7d"
    headers = {
        "x-rapidapi-host": "internships-api.p.rapidapi.com",
        "x-rapidapi-key": api_key
    }

    try:
        # Make the request
        response = requests.get(url, headers=headers, timeout=30)

        # Check status code
        if response.status_code != 200:
            error_msg = f"API request failed with status {response.status_code}"
            try:
                error_text = response.text
                print(f"{error_msg}: {error_text}")
            except UnicodeDecodeError:
                print(f"{error_msg}: Unable to decode response (likely binary data)")
            raise ValueError(error_msg)

        # Try to decode response content safely
        try:
            response_text = response.content.decode('utf-8')
        except UnicodeDecodeError:
            # If UTF-8 fails, try other encodings
            try:
                response_text = response.content.decode('latin-1')
            except UnicodeDecodeError:
                print("Unable to decode API response in any encoding")
                print(f"Raw response (first 100 bytes): {response.content[:100]}")
                raise ValueError("API returned undecodable content")

        # Check if it's JSON
        if 'application/json' not in response.headers.get('content-type', '').lower():
            print(f"Non-JSON content type: {response.headers.get('content-type')}")
            print(f"Response preview: {response_text[:200]}")
            raise ValueError("API returned non-JSON content")

        # Parse JSON
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError as e:
            print(f"Failed to parse JSON: {e}")
            print(f"Response preview: {response_text[:200]}")
            raise

        # Extract and normalize data
        normalized_data = []
        for job in data.get('data', []):
            normalized_data.append({
                "title": job.get("title", ""),
                "company": job.get("company", ""),
                "location": job.get("location", ""),
                "mode": "Remote" if job.get("remote") else "On-site",
                "link": job.get("link", "")
            })

        # Save to file
        os.makedirs('backend/data', exist_ok=True)
        with open('backend/data/internships.json', 'w', encoding='utf-8') as f:
            json.dump(normalized_data, f, indent=4, ensure_ascii=False)

        print(f"✅ Successfully saved {len(normalized_data)} internships to data/internships.json")
        return len(normalized_data)

    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        raise

if __name__ == "__main__":
    try:
        fetch_internships_from_api()
    except Exception as e:
        print(f"\n💡 To fix this error:")
        print(f"   1. Get a valid API key from https://rapidapi.com/")
        print(f"   2. Update backend/.env with: INTERNSHIP_API_KEY=your_actual_key")
        print(f"   3. Run the script again")
        exit(1)
