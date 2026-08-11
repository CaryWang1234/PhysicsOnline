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
    """建表（幂等）。"""
    con = sqlite3.connect(DB_PATH)
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS progress (
            user_id    INTEGER NOT NULL REFERENCES users(id),
            chapter_id TEXT NOT NULL,
            correct    INTEGER NOT NULL,
            total      INTEGER NOT NULL,
            pass       INTEGER NOT NULL,
            updated_at TEXT NOT NULL,
            PRIMARY KEY (user_id, chapter_id)
        );
        """
    )
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


# ---------- 进度 ----------

def _row_to_dict(row):
    return {
        "correct": row["correct"],
        "total": row["total"],
        "pass": bool(row["pass"]),
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
    """写入成绩，保留历史最好成绩。返回最终记录。"""
    db = get_db()
    old = get_progress(user_id, chapter_id)
    if old and old["correct"] >= correct:
        return old
    db.execute(
        """INSERT INTO progress (user_id, chapter_id, correct, total, pass, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(user_id, chapter_id) DO UPDATE SET
             correct = excluded.correct,
             total = excluded.total,
             pass = excluded.pass,
             updated_at = excluded.updated_at""",
        (user_id, chapter_id, correct, total, int(passed),
         datetime.now().isoformat(timespec="seconds")),
    )
    db.commit()
    return get_progress(user_id, chapter_id)
