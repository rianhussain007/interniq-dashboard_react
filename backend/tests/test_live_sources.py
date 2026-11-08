from scraper import live_sources


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


class FakeSession:
    def __init__(self, payloads):
        self.payloads = payloads
        self.headers = {}
        self.urls = []

    def get(self, url, *, params=None, timeout=None):
        self.urls.append((url, params, timeout))
        return FakeResponse(self.payloads[url])


def install_session(monkeypatch, payloads):
    session = FakeSession(payloads)
    monkeypatch.setattr(live_sources.requests, "Session", lambda: session)
    return session


def test_greenhouse_maps_live_internships_and_skips_regular_roles(monkeypatch):
    monkeypatch.setenv("INTERNSHIP_GREENHOUSE_BOARDS", "example-board:Example Labs")
    url = "https://boards-api.greenhouse.io/v1/boards/example-board/jobs"
    install_session(monkeypatch, {url: {"jobs": [
        {"title": "Software Engineer", "absolute_url": "https://jobs.example.test/engineer"},
        {
            "title": "Data Science Intern",
            "absolute_url": "https://jobs.example.test/intern",
            "updated_at": "2026-11-08T10:00:00Z",
            "location": {"name": "Remote - India"},
            "content": "<p>Analyze datasets with Python and SQL.</p>",
            "departments": [{"name": "Data"}],
        },
    ]}})

    items, result = live_sources.fetch_greenhouse_boards()

    assert result["status"] == "ok"
    assert len(items) == 1
    assert items[0]["company"] == "Example Labs"
    assert items[0]["source"] == "Greenhouse"
    assert items[0]["apply_link"] == "https://jobs.example.test/intern"
    assert items[0]["posted_date"] == "2026-11-08"
    assert "Python and SQL" in items[0]["description"]


def test_lever_maps_internship_postings(monkeypatch):
    monkeypatch.setenv("INTERNSHIP_LEVER_BOARDS", "example:Example Company")
    url = "https://api.lever.co/v0/postings/example"
    install_session(monkeypatch, {url: [{
        "text": "Product Design Co-op",
        "hostedUrl": "https://jobs.lever.co/example/123",
        "createdAt": 1794132000000,
        "categories": {"location": "Toronto, Remote", "commitment": "Internship"},
        "descriptionPlain": "Work with the product design team.",
    }]})

    items, result = live_sources.fetch_lever_boards()

    assert result["count"] == 1
    assert items[0]["source"] == "Lever"
    assert items[0]["mode"] == "Remote"
    assert items[0]["apply_link"].endswith("/123")


def test_ashby_only_keeps_listed_internships_and_compensation(monkeypatch):
    monkeypatch.setenv("INTERNSHIP_ASHBY_BOARDS", "ExampleCo:Example Co")
    url = "https://api.ashbyhq.com/posting-api/job-board/ExampleCo"
    install_session(monkeypatch, {url: {"jobs": [
        {"title": "Finance Intern", "isListed": False, "applyUrl": "https://example.test/hidden"},
        {
            "title": "Engineering Intern",
            "isListed": True,
            "employmentType": "Intern",
            "workplaceType": "Hybrid",
            "location": "New York, NY",
            "publishedAt": "2026-11-01T12:00:00Z",
            "applyUrl": "https://jobs.ashbyhq.com/example/intern",
            "compensation": {"compensationTierSummary": "$40/hour"},
        },
    ]}})

    items, result = live_sources.fetch_ashby_boards()

    assert result["count"] == 1
    assert items[0]["source"] == "Ashby"
    assert items[0]["mode"] == "Hybrid"
    assert items[0]["stipend"] == "$40/hour"
    assert items[0]["posted_date"] == "2026-11-01"


def test_jobicy_public_api_keeps_source_link_and_filters_other_roles(monkeypatch):
    url = "https://jobicy.com/api/jobs"
    install_session(monkeypatch, {url: {"jobs": [
        {"jobTitle": "Senior Product Manager", "companyName": "Example Corp"},
        {
            "jobTitle": "Marketing Internship",
            "companyName": "Example Corp",
            "jobGeo": "Anywhere",
            "pubDate": "2026-11-07T08:00:00Z",
            "url": "https://jobicy.com/jobs/123",
            "jobDescription": "<p>Support a small growth team.</p>",
        },
    ]}})

    items, result = live_sources.fetch_jobicy_internships()

    assert result["count"] == 1
    assert items[0]["source"] == "Jobicy"
    assert items[0]["apply_link"] == "https://jobicy.com/jobs/123"
    assert items[0]["mode"] == "Remote"
