from __future__ import annotations

import hashlib
import json
import os
from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from psycopg import Connection

from embeddings import GeminiEmbeddingClient, embedding_model, format_embedding_text
from internships_store import row_to_internship


def vector_literal(values: list[float]) -> str:
    return "[" + ",".join(str(value) for value in values) + "]"


def internship_document_text(row: dict[str, Any]) -> str:
    skills = ", ".join(row.get("skills") or [])
    parts = [
        f"Title: {row['title']}",
        f"Company: {row['company']}",
        f"Location: {row.get('location') or 'Not specified'}",
        f"Mode: {row.get('mode') or 'Not specified'}",
        f"Stipend: {row.get('stipend') or 'Not specified'}",
        f"Skills: {skills or 'Not specified'}",
        f"Source: {row['source']}",
        f"Deadline: {row.get('deadline') or 'Not specified'}",
        f"Description: {row.get('description') or 'Not specified'}",
    ]
    return "\n".join(parts)


def _splitter() -> RecursiveCharacterTextSplitter:
    chunk_size = int(os.getenv("RAG_CHUNK_SIZE", "900"))
    chunk_overlap = int(os.getenv("RAG_CHUNK_OVERLAP", "120"))
    if chunk_size < 200 or chunk_size > 4000:
        raise RuntimeError("RAG_CHUNK_SIZE must be between 200 and 4000 characters.")
    if chunk_overlap < 0 or chunk_overlap >= chunk_size:
        raise RuntimeError("RAG_CHUNK_OVERLAP must be non-negative and smaller than RAG_CHUNK_SIZE.")
    return RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        add_start_index=True,
    )


def _content_hash(title: str, content: str, metadata: dict[str, Any]) -> str:
    serialized_metadata = json.dumps(metadata, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(f"{title}\n{content}\n{serialized_metadata}".encode("utf-8")).hexdigest()


def upsert_knowledge_documents(
    conn: Connection,
    embedder: GeminiEmbeddingClient,
    sources: list[dict[str, Any]],
) -> int:
    """Split, embed, and upsert a group of sources while reusing unchanged chunks."""
    if not sources:
        return 0

    source_type = sources[0]["source_type"]
    user_id = sources[0].get("user_id")
    if any(source["source_type"] != source_type or source.get("user_id") != user_id for source in sources):
        raise ValueError("A knowledge-document batch must share one source type and user scope.")

    sources_by_id = {str(source["source_id"]): source for source in sources}
    splitter = _splitter()
    chunks_by_source: dict[str, list[dict[str, Any]]] = {}
    source_ids = list(sources_by_id)

    for source_id, source in sources_by_id.items():
        content = str(source.get("content") or "").strip()
        documents = splitter.create_documents(
            [content] if content else [],
            metadatas=[source.get("metadata") or {}] if content else None,
        )
        chunks_by_source[source_id] = [
            {
                "source_type": source_type,
                "source_id": source_id,
                "user_id": user_id,
                "title": source["title"],
                "content": document.page_content,
                "metadata": source.get("metadata") or {},
                "chunk_index": index,
                "content_hash": _content_hash(source["title"], document.page_content, source.get("metadata") or {}),
                "embedding_text": format_embedding_text(
                    document.page_content,
                    task="document",
                    title=source["title"],
                ),
            }
            for index, document in enumerate(documents)
        ]

    with conn.cursor() as cur:
        cur.execute(
            """
            select source_id, chunk_index, content_hash, embedding_model
            from knowledge_documents
            where source_type = %s
              and user_id is not distinct from %s
              and source_id = any(%s)
            """,
            (source_type, user_id, source_ids),
        )
        existing = {
            (row["source_id"], row["chunk_index"]): (row["content_hash"], row["embedding_model"])
            for row in cur.fetchall()
        }

    pending_chunks = [
        chunk
        for source_id in source_ids
        for chunk in chunks_by_source[source_id]
        if existing.get((source_id, chunk["chunk_index"]))
        != (chunk["content_hash"], embedder.model)
    ]
    vectors = embedder.embed_documents([chunk["embedding_text"] for chunk in pending_chunks])

    for chunk, vector in zip(pending_chunks, vectors, strict=True):
        with conn.cursor() as cur:
            cur.execute(
                """
                insert into knowledge_documents (
                    source_type, source_id, user_id, chunk_index, title, content,
                    content_hash, metadata, embedding, embedding_model
                )
                values (%s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s::vector, %s)
                on conflict (source_type, source_id, (coalesce(user_id, '')), chunk_index) do update set
                    title = excluded.title,
                    content = excluded.content,
                    content_hash = excluded.content_hash,
                    metadata = excluded.metadata,
                    embedding = excluded.embedding,
                    embedding_model = excluded.embedding_model,
                    updated_at = now()
                """,
                (
                    chunk["source_type"],
                    chunk["source_id"],
                    chunk["user_id"],
                    chunk["chunk_index"],
                    chunk["title"],
                    chunk["content"],
                    chunk["content_hash"],
                    json.dumps(chunk["metadata"]),
                    vector_literal(vector),
                    embedder.model,
                ),
            )

    with conn.cursor() as cur:
        for source_id, chunks in chunks_by_source.items():
            cur.execute(
                """
                delete from knowledge_documents
                where source_type = %s
                  and source_id = %s
                  and user_id is not distinct from %s
                  and chunk_index >= %s
                """,
                (source_type, source_id, user_id, len(chunks)),
            )

    return sum(len(chunks) for chunks in chunks_by_source.values())


def index_internships(conn: Connection, embedder: GeminiEmbeddingClient) -> int:
    with conn.cursor() as cur:
        cur.execute(
            """
            select * from internships
            where last_seen_at >= now() - interval '30 days'
              and (deadline is null or deadline >= current_date)
            order by updated_at desc
            """
        )
        rows = cur.fetchall()

    sources = [
        {
            "source_type": "internship",
            "source_id": str(row["id"]),
            "title": f"{row['title']} at {row['company']}",
            "content": internship_document_text(row),
            "metadata": {
                "internship_id": str(row["id"]),
                "company": row["company"],
                "source": row["source"],
                "apply_link": row.get("apply_link"),
            },
        }
        for row in rows
    ]
    indexed = upsert_knowledge_documents(conn, embedder, sources)
    with conn.cursor() as cur:
        cur.execute(
            """
            delete from knowledge_documents as document
            where document.source_type = 'internship'
              and not exists (
                  select 1
                  from internships as internship
                  where internship.id::text = document.source_id
                    and internship.last_seen_at >= now() - interval '30 days'
                    and (internship.deadline is null or internship.deadline >= current_date)
              )
            """
        )
    return indexed


def search_internships_semantic(
    conn: Connection,
    embedder: GeminiEmbeddingClient,
    query: str,
    location: str | None = None,
    source: str | None = None,
    limit: int = 24,
    offset: int = 0,
) -> list[dict[str, Any]]:
    query_vector = vector_literal(embedder.embed(query, task="query"))
    filters = [
        "kd.source_type = 'internship'",
        "kd.user_id is null",
        "kd.embedding_model = %s",
        "internship.last_seen_at >= now() - interval '30 days'",
        "(internship.deadline is null or internship.deadline >= current_date)",
    ]
    params: list[Any] = [embedding_model()]

    if location:
        filters.append("internship.location ilike %s")
        params.append(f"%{location}%")
    if source:
        filters.append("internship.source = %s")
        params.append(source)

    params.extend([limit, offset])
    with conn.cursor() as cur:
        cur.execute(
            f"""
            with distances as (
                select
                    internship.*,
                    kd.embedding <=> %s::vector as distance
                from knowledge_documents as kd
                join internships as internship
                  on internship.id::text = kd.source_id
                where {' and '.join(filters)}
            ),
            best_matches as (
                select distinct on (id) *
                from distances
                order by id, distance
            )
            select *, 1 - distance as similarity
            from best_matches
            order by distance, coalesce(posted_date, created_at::date) desc, created_at desc
            limit %s offset %s
            """,
            (query_vector, *params),
        )
        rows = cur.fetchall()

    results = []
    for row in rows:
        internship = row_to_internship(row)
        internship["similarity"] = float(row["similarity"])
        results.append(internship)
    return results


def index_career_guidance(conn: Connection, embedder: GeminiEmbeddingClient) -> int:
    memory_path = os.path.join(os.path.dirname(__file__), "data", "mentor_memory.json")
    try:
        with open(memory_path, "r", encoding="utf-8") as file:
            items = json.load(file)
    except (FileNotFoundError, json.JSONDecodeError):
        items = []

    sources = [
        {
            "source_type": "career_guidance",
            "source_id": str(item.get("id") or f"guidance-{index}"),
            "title": item.get("title") or f"Career guidance {index + 1}",
            "content": item.get("content") or "",
            "metadata": {"origin": "mentor_memory"},
        }
        for index, item in enumerate(items)
        if (item.get("content") or "").strip()
    ]
    upsert_knowledge_documents(conn, embedder, sources)
    return len(sources)


def index_user_context(
    conn: Connection,
    embedder: GeminiEmbeddingClient,
    user_id: str | None,
    user_profile: dict[str, Any] | None = None,
) -> int:
    if not user_id:
        return 0

    sources: list[dict[str, Any]] = []
    if user_profile:
        profile_lines = [f"{key}: {value}" for key, value in user_profile.items() if value]
        if profile_lines:
            sources.append(
                {
                    "source_type": "user_profile",
                    "source_id": user_id,
                    "user_id": user_id,
                    "title": "User profile",
                    "content": "\n".join(profile_lines),
                    "metadata": {"user_id": user_id},
                }
            )

    with conn.cursor() as cur:
        cur.execute(
            """
            select i.*, s.saved_at
            from saved_internships s
            join internships i on i.id = s.internship_id
            where s.user_id = %s
            order by s.saved_at desc
            limit 50
            """,
            (user_id,),
        )
        saved_rows = cur.fetchall()

        cur.execute(
            """
            select i.*, a.id as application_id, a.status, a.notes, a.applied_at
            from applications a
            join internships i on i.id = a.internship_id
            where a.user_id = %s
            order by a.updated_at desc
            limit 50
            """,
            (user_id,),
        )
        application_rows = cur.fetchall()

    for row in saved_rows:
        internship = row_to_internship(row)
        sources.append(
            {
                "source_type": "saved_internship",
                "source_id": str(row["id"]),
                "user_id": user_id,
                "title": f"Saved: {internship['title']} at {internship['company']}",
                "content": f"User saved this internship.\n{internship_document_text(row)}",
                "metadata": {"internship_id": str(row["id"]), "user_id": user_id},
            }
        )

    for row in application_rows:
        sources.append(
            {
                "source_type": "application_history",
                "source_id": str(row["application_id"]),
                "user_id": user_id,
                "title": f"Application: {row['title']} at {row['company']}",
                "content": (
                    f"Application status: {row['status']}\n"
                    f"Notes: {row.get('notes') or 'None'}\n"
                    f"{internship_document_text(row)}"
                ),
                "metadata": {
                    "internship_id": str(row["id"]),
                    "status": row["status"],
                    "user_id": user_id,
                },
            }
        )

    for source_type in {source["source_type"] for source in sources}:
        scoped_sources = [source for source in sources if source["source_type"] == source_type]
        upsert_knowledge_documents(conn, embedder, scoped_sources)
    return len(sources)


def reindex_rag(
    conn: Connection,
    user_id: str | None = None,
    user_profile: dict[str, Any] | None = None,
) -> dict[str, int]:
    embedder = GeminiEmbeddingClient()
    return {
        "internships": index_internships(conn, embedder),
        "career_guidance": index_career_guidance(conn, embedder),
        "user_context": index_user_context(conn, embedder, user_id, user_profile),
    }


def retrieve_context(
    conn: Connection,
    embedder: GeminiEmbeddingClient,
    query: str,
    user_id: str | None = None,
    top_k: int = 6,
) -> list[dict[str, Any]]:
    query_embedding = embedder.embed(query, task="query")
    with conn.cursor() as cur:
        cur.execute(
            """
            select
                id, source_type, source_id, user_id, chunk_index, title, content, metadata,
                1 - (embedding <=> %s::vector) as similarity
            from knowledge_documents
            where embedding_model = %s
              and (user_id is null or user_id = %s)
              and (
                  source_type <> 'internship'
                  or exists (
                      select 1
                      from internships as internship
                      where internship.id::text = knowledge_documents.source_id
                        and internship.last_seen_at >= now() - interval '30 days'
                        and (internship.deadline is null or internship.deadline >= current_date)
                  )
              )
            order by embedding <=> %s::vector
            limit %s
            """,
            (
                vector_literal(query_embedding),
                embedding_model(),
                user_id,
                vector_literal(query_embedding),
                top_k,
            ),
        )
        return [
            {
                "id": str(row["id"]),
                "source_type": row["source_type"],
                "source_id": row["source_id"],
                "user_id": row["user_id"],
                "chunk_index": row["chunk_index"],
                "title": row["title"],
                "content": row["content"],
                "metadata": row["metadata"],
                "similarity": float(row["similarity"]),
            }
            for row in cur.fetchall()
        ]
