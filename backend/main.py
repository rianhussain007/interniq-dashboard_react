import os
from typing import Any

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import json
import subprocess

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

app = FastAPI()

origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def read_root():
    return {"status": "ok"}


class MentorMessage(BaseModel):
    role: str
    content: str


class MentorChatRequest(BaseModel):
    message: str
    history: list[MentorMessage] = Field(default_factory=list)


def load_mentor_memory() -> list[dict[str, str]]:
    memory_path = os.path.join(os.path.dirname(__file__), "data", "mentor_memory.json")
    try:
        with open(memory_path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return []


def retrieve_memory_context(message: str, limit: int = 3) -> str:
    query_terms = {term.strip(".,!?;:").lower() for term in message.split() if len(term) > 2}
    scored_memory: list[tuple[int, dict[str, str]]] = []

    for item in load_mentor_memory():
        searchable_text = f"{item.get('title', '')} {item.get('content', '')}".lower()
        score = sum(1 for term in query_terms if term in searchable_text)
        if score:
            scored_memory.append((score, item))

    if not scored_memory:
        scored_memory = [(1, item) for item in load_mentor_memory()[:limit]]

    top_items = [item for _, item in sorted(scored_memory, key=lambda pair: pair[0], reverse=True)[:limit]]
    return "\n".join(f"- {item.get('title')}: {item.get('content')}" for item in top_items)


@app.post("/api/mentor-chat")
def mentor_chat(payload: MentorChatRequest) -> dict[str, str]:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured on the backend.")

    user_message = payload.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message is required.")

    memory_context = retrieve_memory_context(user_message)
    history_messages: list[dict[str, str]] = [
        {"role": message.role, "content": message.content}
        for message in payload.history[-8:]
        if message.role in {"user", "assistant", "system"} and message.content.strip()
    ]

    messages: list[dict[str, str]] = [
        {
            "role": "system",
            "content": (
                "You are InternIQ Mentor, a concise and practical AI career coach for a student "
                "data scientist/developer. Give specific next actions, avoid generic motivation, "
                "and keep answers under 120 words unless asked for depth.\n\n"
                f"Local memory context:\n{memory_context}"
            ),
        },
        *history_messages,
        {"role": "user", "content": user_message},
    ]

    try:
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": os.getenv("GROQ_MODEL", "llama-3.1-8b-instant"),
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 260,
            },
            timeout=20,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Groq request failed: {exc}") from exc

    data: dict[str, Any] = response.json()
    answer = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    if not answer:
        raise HTTPException(status_code=502, detail="Groq returned an empty response.")

    return {"answer": answer}

@app.get("/api/internships")
def get_internships():
    with open('backend/data/internships.json', 'r') as f:
        internships = json.load(f)
    return internships

@app.post("/api/internships/update")
def update_internships():
    subprocess.run(["python", "backend/scraper/update_internships.py"])
    return {"message": "Internships updated successfully"}
