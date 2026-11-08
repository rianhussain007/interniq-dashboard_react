import os
from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row


def get_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured.")
    return database_url


@contextmanager
def get_db_connection() -> Iterator[psycopg.Connection]:
    conn = psycopg.connect(
        get_database_url(),
        row_factory=dict_row,
        connect_timeout=int(os.getenv("DB_CONNECT_TIMEOUT_SECONDS", "10")),
    )
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
