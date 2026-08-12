# -*- coding: utf-8 -*-
"""db.py —— SQLite 用户与学习进度存储（Python 内置 sqlite3，零依赖）

users    用户表：用户名 + werkzeug 加盐哈希密码 + XP/连续天数/成就
progress 进度表：每用户每章最好成绩（correct/total/pass）
数据库文件 data.db 与 app.py 同级，首次运行自动建表。
"""
import json
import os
import sqlite3
from datetime import datetime, date

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
    """建表（幂等），旧库自动补列。"""
    con = sqlite3.connect(DB_PATH)
    con.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            username      TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at    TEXT NOT NULL,
            last_chapter  TEXT,
            xp            INTEGER NOT NULL DEFAULT 0,
            streak        INTEGER NOT NULL DEFAULT 0,
            last_study_date TEXT,
            achievements  TEXT NOT NULL DEFAULT '[]'
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
    # 旧版本建的表缺列，按需补齐
    cols_user = {r[1] for r in con.execute("PRAGMA table_info(users)")}
    if "last_chapter" not in cols_user:
        con.execute("ALTER TABLE users ADD COLUMN last_chapter TEXT")
    if "xp" not in cols_user:
        con.execute("ALTER TABLE users ADD COLUMN xp INTEGER NOT NULL DEFAULT 0")
    if "streak" not in cols_user:
        con.execute("ALTER TABLE users ADD COLUMN streak INTEGER NOT NULL DEFAULT 0")
    if "last_study_date" not in cols_user:
        con.execute("ALTER TABLE users ADD COLUMN last_study_date TEXT")
    if "achievements" not in cols_user:
        con.execute("ALTER TABLE users ADD COLUMN achievements TEXT NOT NULL DEFAULT '[]'")
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


# ---------- XP / 等级 / 成就 / 连续天数 ----------

def add_xp(user_id, amount):
    """加经验值，返回新的总 XP。"""
    db = get_db()
    db.execute("UPDATE users SET xp = xp + ? WHERE id = ?", (amount, user_id))
    db.commit()
    row = db.execute("SELECT xp FROM users WHERE id = ?", (user_id,)).fetchone()
    return row["xp"] if row else 0


def get_user_stats(user_id):
    """返回 {xp, streak, achievements:list}。"""
    row = get_db().execute(
        "SELECT xp, streak, achievements FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    if row is None:
        return {"xp": 0, "streak": 0, "achievements": []}
    return {
        "xp": row["xp"],
        "streak": row["streak"],
        "achievements": json.loads(row["achievements"] or "[]"),
    }


def update_streak(user_id):
    """更新连续学习天数，返回 (new_streak, is_new_day)。同一天重复访问不重复计数。"""
    db = get_db()
    row = db.execute(
        "SELECT streak, last_study_date FROM users WHERE id = ?", (user_id,)
    ).fetchone()
    today = date.today().isoformat()
    if row is None:
        return 0, False
    last = row["last_study_date"]
    old_streak = row["streak"]
    if last == today:
        return old_streak, False  # 同一天重复访问
    # 计算是否连续
    if last:
        try:
            last_date = date.fromisoformat(last)
            diff = (date.today() - last_date).days
        except ValueError:
            diff = 99
    else:
        diff = 99
    if diff == 1:
        new_streak = old_streak + 1
    else:
        new_streak = 1
    db.execute("UPDATE users SET streak = ?, last_study_date = ? WHERE id = ?",
               (new_streak, today, user_id))
    db.commit()
    return new_streak, True


def unlock_achievement(user_id, ach_id):
    """解锁成就（幂等），返回是否新解锁。"""
    db = get_db()
    row = db.execute("SELECT achievements FROM users WHERE id = ?", (user_id,)).fetchone()
    if row is None:
        return False
    achs = json.loads(row["achievements"] or "[]")
    if ach_id in achs:
        return False
    achs.append(ach_id)
    db.execute("UPDATE users SET achievements = ? WHERE id = ?",
               (json.dumps(achs), user_id))
    db.commit()
    return True


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
