import os
import sqlite3

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shuatibao.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys = ON')
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.executescript('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY,
            display_name TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS question_banks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            question_count INTEGER DEFAULT 0,
            single_count INTEGER DEFAULT 0,
            multiple_count INTEGER DEFAULT 0,
            truefalse_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bank_id INTEGER NOT NULL,
            type TEXT NOT NULL CHECK(type IN ('single', 'multiple', 'truefalse')),
            stem TEXT NOT NULL,
            options TEXT NOT NULL,
            answer TEXT NOT NULL,
            explanation TEXT DEFAULT '',
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS wrong_book (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            bank_id INTEGER NOT NULL,
            status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'removed')),
            added_at TEXT DEFAULT (datetime('now', 'localtime')),
            removed_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
            FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE,
            UNIQUE(user_id, question_id, bank_id)
        );

        CREATE TABLE IF NOT EXISTS study_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            bank_id INTEGER NOT NULL,
            is_correct INTEGER NOT NULL CHECK(is_correct IN (0, 1)),
            answered_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
            FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS practice_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            bank_id INTEGER NOT NULL,
            mode TEXT NOT NULL DEFAULT 'random',
            total_count INTEGER NOT NULL DEFAULT 0,
            correct_count INTEGER NOT NULL DEFAULT 0,
            wrong_count INTEGER NOT NULL DEFAULT 0,
            unanswered_count INTEGER NOT NULL DEFAULT 0,
            submitted_at TEXT DEFAULT (datetime('now', 'localtime')),
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (bank_id) REFERENCES question_banks(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS practice_answers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            question_id INTEGER NOT NULL,
            selected_answer TEXT,
            correct_answer TEXT NOT NULL,
            is_correct INTEGER,
            FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE
        );
    ''')

    # Seed users 0-99 if not present
    existing = cursor.execute('SELECT COUNT(*) FROM users').fetchone()[0]
    if existing == 0:
        for i in range(100):
            cursor.execute(
                'INSERT INTO users (id, display_name) VALUES (?, ?)',
                (i, f'用户 {i}')
            )

    conn.commit()
    conn.close()
