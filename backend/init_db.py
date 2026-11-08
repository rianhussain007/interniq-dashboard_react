import os

from dotenv import load_dotenv

from db import get_db_connection, is_sqlite_backend
from local_store import connection as get_local_db_connection


BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BACKEND_DIR)
SCHEMA_FILE = os.path.join(BACKEND_DIR, "schema.sql")
APP_PERMISSIONS_FILE = os.path.join(BACKEND_DIR, "app_permissions.sql")


def init_db() -> None:
    load_dotenv(os.path.join(PROJECT_ROOT, ".env"))
    if is_sqlite_backend():
        with get_local_db_connection():
            pass
        return
    with open(SCHEMA_FILE, "r", encoding="utf-8") as f:
        schema_sql = f.read()
    with open(APP_PERMISSIONS_FILE, "r", encoding="utf-8") as f:
        app_permissions_sql = f.read()

    with get_db_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(schema_sql)
            cur.execute(app_permissions_sql)


if __name__ == "__main__":
    init_db()
    print("Database schema initialized.")
