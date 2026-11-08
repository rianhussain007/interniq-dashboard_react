from __future__ import annotations

import os
from typing import Literal

from langchain_google_genai import GoogleGenerativeAIEmbeddings


EmbeddingTask = Literal["query", "document"]
SCHEMA_EMBEDDING_DIMENSIONS = 768


def embedding_dimensions() -> int:
    dimensions = int(os.getenv("RAG_EMBEDDING_DIMENSIONS", str(SCHEMA_EMBEDDING_DIMENSIONS)))
    if dimensions != SCHEMA_EMBEDDING_DIMENSIONS:
        raise RuntimeError(
            "RAG_EMBEDDING_DIMENSIONS must be 768 to match the pgvector column. "
            "Change backend/schema.sql and reindex all knowledge documents to use another size."
        )
    return dimensions


def embedding_model() -> str:
    model = os.getenv("GEMINI_EMBEDDING_MODEL", "gemini-embedding-2-preview").strip()
    return model.removeprefix("models/")


def format_embedding_text(text: str, task: EmbeddingTask, title: str | None = None) -> str:
    trimmed = " ".join(text.split())
    if task == "query":
        return trimmed
    safe_title = " ".join((title or "").split())
    return f"Title: {safe_title}\n{trimmed}" if safe_title else trimmed


class GeminiEmbeddingClient:
    """LangChain adapter for Gemini's document and query embedding interface."""

    def __init__(self) -> None:
        self.dimensions = embedding_dimensions()
        self.model = embedding_model()
        self.api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if not self.api_key:
            raise RuntimeError("GEMINI_API_KEY (or GOOGLE_API_KEY) is required for RAG embeddings.")

        self.client = GoogleGenerativeAIEmbeddings(
            model=self.model,
            google_api_key=self.api_key,
            output_dimensionality=self.dimensions,
            request_options={"timeout": int(os.getenv("EMBEDDING_REQUEST_TIMEOUT_SECONDS", "20"))},
        )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        vectors: list[list[float]] = []
        for start in range(0, len(texts), 100):
            batch = texts[start : start + 100]
            batch_vectors = self.client.embed_documents(batch)
            vectors.extend(self._validate(vector) for vector in batch_vectors)
        return vectors

    def embed(self, text: str, task: EmbeddingTask, title: str | None = None) -> list[float]:
        formatted_text = format_embedding_text(text, task=task, title=title)
        vector = (
            self.client.embed_query(formatted_text)
            if task == "query"
            else self.client.embed_documents([formatted_text])[0]
        )
        return self._validate(vector)

    def _validate(self, vector: list[float]) -> list[float]:
        if len(vector) != self.dimensions:
            raise RuntimeError(
                f"Embedding dimension mismatch: expected {self.dimensions}, got {len(vector)}."
            )
        return [float(value) for value in vector]
