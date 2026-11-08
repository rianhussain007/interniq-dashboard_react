import os

from dotenv import load_dotenv

from db import get_db_connection


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
SCHEMA_FILE = os.path.join(BACKEND_DIR, "schema.sql")


def init_db() -> None:
    load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        schema_sql = f.read()

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(schema_sql)


if __name__ == "__main__":
    init_db()
    print("Database schema initialized.")
