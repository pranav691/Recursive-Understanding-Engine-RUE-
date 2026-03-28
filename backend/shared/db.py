import sqlite3

DB_PATH = "rue_history.db"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            question      TEXT    NOT NULL,
            timestamp     TEXT    NOT NULL,
            depth         INTEGER NOT NULL,
            stack         TEXT    NOT NULL,
            is_branch     INTEGER NOT NULL DEFAULT 0,
            root_question TEXT    NOT NULL DEFAULT ''
        )
    """)
    for col, definition in [
        ("is_branch",        "INTEGER NOT NULL DEFAULT 0"),
        ("root_question",    "TEXT NOT NULL DEFAULT ''"),
        ("weighted_clarity", "REAL NOT NULL DEFAULT 0.0"),
        ("depth_clarity",    "REAL NOT NULL DEFAULT 0.0"),
    ]:
        try:
            conn.execute(f"ALTER TABLE sessions ADD COLUMN {col} {definition}")
        except Exception:
            pass
    conn.execute("""
        CREATE TABLE IF NOT EXISTS feynman_results (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL DEFAULT 0,
            mode       TEXT    NOT NULL,
            concept    TEXT    NOT NULL,
            timestamp  TEXT    NOT NULL,
            results    TEXT    NOT NULL
        )
    """)
    conn.commit()
    conn.close()
