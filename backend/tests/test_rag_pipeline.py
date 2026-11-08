from rag_store import search_internships_semantic, upsert_knowledge_documents


class FakeCursor:
    def __init__(self, connection):
        self.connection = connection

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, traceback):
        return False

    def execute(self, query, params=None):
        self.connection.queries.append((query, params))

    def fetchall(self):
        return self.connection.existing_chunks


class FakeConnection:
    def __init__(self):
        self.queries = []
        self.existing_chunks = []

    def cursor(self):
        return FakeCursor(self)


class FakeEmbedder:
    model = "fake-embedding-model"
    dimensions = 768

    def __init__(self):
        self.batches = []

    def embed_documents(self, texts):
        self.batches.append(texts)
        return [[0.01] * self.dimensions for _ in texts]

    def embed(self, text, task, title=None):
        assert task == "query"
        return [0.01] * self.dimensions


def test_scrape_chunks_and_embeds_only_changed_content(monkeypatch):
    monkeypatch.setenv("RAG_CHUNK_SIZE", "200")
    monkeypatch.setenv("RAG_CHUNK_OVERLAP", "20")
    connection = FakeConnection()
    embedder = FakeEmbedder()
    sources = [
        {
            "source_type": "internship",
            "source_id": "internship-1",
            "title": "Data Engineering Intern",
            "content": "Build data pipelines and analyze product events. " * 50,
            "metadata": {"company": "Example Labs"},
        }
    ]

    chunk_count = upsert_knowledge_documents(connection, embedder, sources)
    inserts = [
        params
        for query, params in connection.queries
        if query.lstrip().lower().startswith("insert into knowledge_documents")
    ]

    assert chunk_count > 1
    assert len(inserts) == chunk_count
    assert len(embedder.batches) == 1
    assert len(embedder.batches[0]) == chunk_count
    assert all(len(params[5]) <= 200 for params in inserts)
    assert {params[3] for params in inserts} == set(range(chunk_count))

    connection.existing_chunks = [
        {
            "source_id": params[1],
            "chunk_index": params[3],
            "content_hash": params[6],
            "embedding_model": embedder.model,
        }
        for params in inserts
    ]
    previous_insert_count = len(inserts)

    upsert_knowledge_documents(connection, embedder, sources)

    current_insert_count = sum(
        query.lstrip().lower().startswith("insert into knowledge_documents")
        for query, _ in connection.queries
    )
    assert current_insert_count == previous_insert_count
    assert len(embedder.batches) == 1


def test_semantic_sorts_are_applied_inside_a_nearest_chunk_shortlist():
    connection = FakeConnection()
    embedder = FakeEmbedder()

    results = search_internships_semantic(
        connection,
        embedder,
        "data engineering internship",
        sort="deadline",
        limit=24,
        offset=0,
    )

    query, params = connection.queries[0]
    assert results == []
    assert "order by kd.embedding <=> %s::vector" in query
    assert "deadline asc nulls last, distance" in query
    assert params[-3:] == (480, 24, 0)
