# -*- coding: utf-8 -*-
"""db.py —— SQLite 用户与学习进度存储（Python 内置 sqlite3，零依赖）

users    用户表：用户名 + werkzeug 加盐哈希密码
progress 进度表：每用户每章最好成绩（correct/total/pass）
数据库文件 data.db 与 app.py 同级，首次运行自动建表。
"""
import os
import sqlite3
from datetime import datetime

from flask import g

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.db")


def get_db():
    """当前请求内的数据库连接（自动复用，请求结束关闭）。"""
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


def close_db(_e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """建表（幂等），旧库自动补列（attempts / last_chapter）。"""
    con = sqlite3.connect(DB_PATH)
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL,
            last_chapter  TEXT
        );
        CREATE TABLE IF NOT EXISTS progress (
            user_id    INTEGER NOT NULL REFERENCES users(id),
            chapter_id TEXT NOT NULL,
            correct    INTEGER NOT NULL,
            total      INTEGER NOT NULL,
            pass       INTEGER NOT NULL,
            attempts   INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (user_id, chapter_id)
        );
        """
    )
    # 旧版本建的表缺新列，按需补齐
    cols_user = {r[1] for r in con.execute("PRAGMA table_info(users)")}
    if "last_chapter" not in cols_user:
        con.execute("ALTER TABLE users ADD COLUMN last_chapter TEXT")
    cols_prog = {r[1] for r in con.execute("PRAGMA table_info(progress)")}
    if "attempts" not in cols_prog:
        con.execute("ALTER TABLE progress ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0")
    con.commit()
    con.close()


# ---------- 用户 ----------

def find_user(username):
    return get_db().execute(
        "SELECT * FROM users WHERE username = ?", (username,)
    ).fetchone()


def create_user(username, password_hash):
    db = get_db()
    cur = db.execute(
        "INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)",
        (username, password_hash, datetime.now().isoformat(timespec="seconds")),
    )
    db.commit()
    return cur.lastrowid


def set_last_chapter(user_id, chapter_id):
    """记录用户最近学习的章节（首页“继续学习”用）。"""
    db = get_db()
    db.execute("UPDATE users SET last_chapter = ? WHERE id = ?",
               (chapter_id, user_id))
    db.commit()


def get_last_chapter(user_id):
    row = get_db().execute(
        "SELECT last_chapter FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    return row["last_chapter"] if row else None


# ---------- 进度 ----------

def _row_to_dict(row):
    return {
        "correct": row["correct"],
        "total": row["total"],
        "pass": bool(row["pass"]),
        "attempts": row["attempts"],
    }


def get_progress(user_id, chapter_id):
    row = get_db().execute(
        "SELECT * FROM progress WHERE user_id = ? AND chapter_id = ?",
        (user_id, chapter_id),
    ).fetchone()
    return _row_to_dict(row) if row else None


def get_all_progress(user_id):
    """返回 {chapter_id: {correct, total, pass}}。"""
    rows = get_db().execute(
        "SELECT * FROM progress WHERE user_id = ?", (user_id,)
    ).fetchall()
    return {r["chapter_id"]: _row_to_dict(r) for r in rows}


def upsert_progress(user_id, chapter_id, correct, total, passed):
    """写入成绩，保留历史最好成绩；交卷次数 attempts 每次 +1。返回最终记录。"""
    db = get_db()
    old = get_progress(user_id, chapter_id)
    now = datetime.now().isoformat(timespec="seconds")
    if old is None:
        db.execute(
            """INSERT INTO progress
               (user_id, chapter_id, correct, total, pass, attempts, updated_at)
               VALUES (?, ?, ?, ?, ?, 1, ?)""",
            (user_id, chapter_id, correct, total, int(passed), now),
        )
        db.commit()
        return get_progress(user_id, chapter_id)
    # 已有记录：尝试次数 +1；成绩更好才覆盖
    if old["correct"] >= correct:
        db.execute("UPDATE progress SET attempts = attempts + 1, updated_at = ? "
                   "WHERE user_id = ? AND chapter_id = ?",
                   (now, user_id, chapter_id))
        db.commit()
        return get_progress(user_id, chapter_id)
    db.execute(
        """UPDATE progress SET correct = ?, total = ?, pass = ?,
               attempts = attempts + 1, updated_at = ?
           WHERE user_id = ? AND chapter_id = ?""",
        (correct, total, int(passed), now, user_id, chapter_id),
    )
    db.commit()
    return get_progress(user_id, chapter_id)
