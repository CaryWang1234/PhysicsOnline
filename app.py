# -*- coding: utf-8 -*-
"""PhysicsOnline —— 初中物理自学网站（沪科版五四学制八上+八下）"""
from flask import (
    Flask, abort, jsonify, redirect, render_template, request, session, url_for
)
from werkzeug.security import check_password_hash, generate_password_hash

import db
from data.chapters_8a import CHAPTERS_8A
from data.chapters_8b import CHAPTERS_8B
from data.quiz import QUIZZES
from data.quiz_b import QUIZZES_B

app = Flask(__name__)
# 本地教学站点用固定密钥即可；如需部署可改用环境变量
app.secret_key = "physics-online-dev-key-2026"

PASS_LINE = 8          # 学会判定：10 题答对 8 道及以上

# 两册数据汇总
VOLUMES = [
    {"key": "8a", "name": "八年级上册", "icon": "📘", "chapters": CHAPTERS_8A},
    {"key": "8b", "name": "八年级下册", "icon": "📗", "chapters": CHAPTERS_8B},
]
ALL_CHAPTERS = CHAPTERS_8A + CHAPTERS_8B
CHAPTER_BY_ID = {c["id"]: c for c in ALL_CHAPTERS}

# 多套题库：每章 A 卷（基础巩固）+ B 卷（实战拔高），按交卷次数轮换
PAPERS = {}
for _cid, _qz in QUIZZES.items():
    _papers = [{"name": "A 卷·基础巩固", "questions": _qz["questions"]}]
    if _cid in QUIZZES_B:
        assert len(QUIZZES_B[_cid]) == len(_qz["questions"]), _cid
        _papers.append({"name": "B 卷·实战拔高", "questions": QUIZZES_B[_cid]})
    PAPERS[_cid] = _papers

app.teardown_appcontext(db.close_db)


def current_uid():
    """当前登录用户 id，未登录返回 None。"""
    return session.get("uid")


def user_records():
    """当前登录用户的全部章节成绩，未登录返回 None（前端降级用 localStorage）。"""
    uid = current_uid()
    return db.get_all_progress(uid) if uid else None


def chapter_nav(cid):
    """返回 (上一章, 下一章)，跨册连续衔接，边界为 None。"""
    idx = next(i for i, c in enumerate(ALL_CHAPTERS) if c["id"] == cid)
    prev_ch = ALL_CHAPTERS[idx - 1] if idx > 0 else None
    next_ch = ALL_CHAPTERS[idx + 1] if idx < len(ALL_CHAPTERS) - 1 else None
    return prev_ch, next_ch


@app.route("/")
def home():
    uid = current_uid()
    last_cid = db.get_last_chapter(uid) if uid else None
    return render_template(
        "index.html", volumes=VOLUMES, total=len(ALL_CHAPTERS),
        records=user_records(), last_ch=CHAPTER_BY_ID.get(last_cid),
        chapters_all=ALL_CHAPTERS
    )


@app.route("/volume/<vol_key>")
def volume(vol_key):
    vol = next((v for v in VOLUMES if v["key"] == vol_key), None)
    if vol is None:
        abort(404)
    return render_template("volume.html", vol=vol, volumes=VOLUMES,
                           records=user_records())


@app.route("/chapter/<cid>")
def chapter(cid):
    ch = CHAPTER_BY_ID.get(cid)
    if ch is None:
        abort(404)
    vol = next(v for v in VOLUMES if v["key"] == ch["id"][:2])
    prev_ch, next_ch = chapter_nav(cid)
    quiz = QUIZZES.get(cid)
    uid = current_uid()
    my_quiz = db.get_progress(uid, cid) if uid else None
    return render_template(
        "chapter.html", ch=ch, vol=vol, prev_ch=prev_ch, next_ch=next_ch,
        has_quiz=bool(quiz), total_q=len(quiz["questions"]) if quiz else 0,
        paper_count=len(PAPERS[cid]) if quiz else 0,
        quiz_tip=quiz["tip"] if quiz else "", my_quiz=my_quiz
    )


@app.route("/chapter/<cid>/quiz")
def quiz(cid):
    ch = CHAPTER_BY_ID.get(cid)
    qz = QUIZZES.get(cid)
    if ch is None or qz is None:
        abort(404)
    vol = next(v for v in VOLUMES if v["key"] == ch["id"][:2])
    # 选卷：指定 ?p=n 优先；否则按交卷次数轮换（登录用户），游客默认 A 卷
    papers = PAPERS[cid]
    uid = current_uid()
    rec = db.get_progress(uid, cid) if uid else None
    attempts = rec["attempts"] if rec else 0
    n = len(papers)
    p_arg = request.args.get("p")
    if p_arg is not None and p_arg.isdigit():
        idx = int(p_arg) % n
    else:
        idx = attempts % n
    qz_paper = {"tip": qz["tip"], "questions": papers[idx]["questions"]}
    return render_template("quiz.html", ch=ch, vol=vol, qz=qz_paper,
                           pass_line=PASS_LINE, papers=papers, paper_idx=idx,
                           attempts=attempts)


# ---------- 用户：注册 / 登录 / 登出 ----------

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "GET":
        return render_template("register.html", volumes=VOLUMES, error=None)
    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""
    confirm = request.form.get("confirm") or ""
    if not (2 <= len(username) <= 16):
        error = "用户名需要 2～16 个字符"
    elif len(password) < 4:
        error = "密码至少 4 位"
    elif password != confirm:
        error = "两次输入的密码不一致"
    elif db.find_user(username):
        error = "这个用户名已经被注册啦，换一个或直接登录吧"
    else:
        uid = db.create_user(username, generate_password_hash(password))
        session["uid"], session["username"] = uid, username
        return redirect(url_for("home"))
    return render_template("register.html", volumes=VOLUMES, error=error)


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "GET":
        return render_template("login.html", volumes=VOLUMES, error=None)
    username = (request.form.get("username") or "").strip()
    password = request.form.get("password") or ""
    user = db.find_user(username)
    if user is None or not check_password_hash(user["password_hash"], password):
        return render_template("login.html", volumes=VOLUMES,
                               error="用户名或密码不对，再试试？")
    session["uid"], session["username"] = user["id"], username
    return redirect(url_for("home"))


@app.route("/logout")
def logout():
    session.pop("uid", None)
    session.pop("username", None)
    return redirect(url_for("home"))


# ---------- 成绩 API（仅登录用户） ----------

@app.route("/api/quiz", methods=["POST"])
def api_quiz():
    uid = current_uid()
    if uid is None:
        return jsonify({"ok": False, "error": "请先登录"}), 401
    data = request.get_json(silent=True) or {}
    cid = data.get("cid")
    correct, total = data.get("correct"), data.get("total")
    qz = QUIZZES.get(cid)
    if qz is None or not isinstance(correct, int) or not isinstance(total, int) \
            or isinstance(correct, bool) or isinstance(total, bool):
        return jsonify({"ok": False, "error": "参数不合法"}), 400
    if total != len(qz["questions"]) or not (0 <= correct <= total):
        return jsonify({"ok": False, "error": "参数不合法"}), 400
    rec = db.upsert_progress(uid, cid, correct, total, correct >= PASS_LINE)
    return jsonify({"ok": True, "record": rec})


@app.route("/api/visit", methods=["POST"])
def api_visit():
    """记录最近学习的章节（首页“继续学习”），仅登录用户。"""
    uid = current_uid()
    if uid is None:
        return jsonify({"ok": False, "error": "请先登录"}), 401
    cid = (request.get_json(silent=True) or {}).get("cid")
    if cid not in CHAPTER_BY_ID:
        return jsonify({"ok": False, "error": "参数不合法"}), 400
    db.set_last_chapter(uid, cid)
    return jsonify({"ok": True})


@app.errorhandler(404)
def not_found(_e):
    return render_template("404.html", volumes=VOLUMES), 404


if __name__ == "__main__":
    db.init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)
