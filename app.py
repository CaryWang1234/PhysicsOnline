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

# ---------- XP / 等级 / 成就配置 ----------
XP_VISIT = 5
XP_PASS = 20
XP_PERFECT_BONUS = 10
XP_STREAK_BONUS = 2

LEVELS = [
    (0, "物理探索者"), (60, "力学学徒"), (150, "光学研究员"),
    (280, "热学工程师"), (450, "电磁学者"), (660, "物理大师"),
]

ACHIEVEMENTS = {
    "first_read": {"name": "初来乍到", "desc": "完成第一次章节阅读", "icon": "📖"},
    "first_pass": {"name": "初露锋芒", "desc": "首次测验及格（8+分）", "icon": "✨"},
    "perfect_score": {"name": "满分制霸", "desc": "任意测验得到满分", "icon": "🏆"},
    "streak_7": {"name": "七日坚持", "desc": "连续学习 7 天", "icon": "🔥"},
    "all_pass": {"name": "全科通关", "desc": "11 章测验全部及格", "icon": "🎯"},
    "max_level": {"name": "物理大师", "desc": "达到最高等级 Lv6", "icon": "🚀"},
}


def get_level(xp):
    """返回 (level_number, title, xp_for_next, xp_current_threshold)。"""
    lv = 1
    for i, (threshold, title) in enumerate(LEVELS):
        if xp >= threshold:
            lv = i + 1
    if lv >= len(LEVELS):
        return lv, LEVELS[-1][1], None, LEVELS[-1][0]
    next_threshold = LEVELS[lv][0]
    current_threshold = LEVELS[lv - 1][0]
    return lv, LEVELS[lv - 1][1], next_threshold, current_threshold

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
    user_stats = None
    if uid:
        stats = db.get_user_stats(uid)
        lv, title, next_xp, cur_xp = get_level(stats["xp"])
        user_stats = {
            "xp": stats["xp"], "level": lv, "title": title,
            "streak": stats["streak"], "achievements": stats["achievements"],
            "next_xp": next_xp, "cur_xp": cur_xp,
            "ach_detail": [ACHIEVEMENTS[a] for a in stats["achievements"] if a in ACHIEVEMENTS],
        }
    return render_template(
        "index.html", volumes=VOLUMES, total=len(ALL_CHAPTERS),
        records=user_records(), last_ch=CHAPTER_BY_ID.get(last_cid),
        chapters_all=ALL_CHAPTERS, user_stats=user_stats,
        ach_defs=ACHIEVEMENTS
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

    # --- XP 与成就 ---
    xp_gained = 0
    new_achs = []
    if correct >= PASS_LINE:
        xp_gained += XP_PASS
        if db.unlock_achievement(uid, "first_pass"):
            new_achs.append("first_pass")
    if correct == total:
        xp_gained += XP_PERFECT_BONUS
        if db.unlock_achievement(uid, "perfect_score"):
            new_achs.append("perfect_score")
    if xp_gained:
        db.add_xp(uid, xp_gained)
    # 检查全科通关
    all_prog = db.get_all_progress(uid)
    if len(all_prog) == len(ALL_CHAPTERS) and all(r["pass"] for r in all_prog.values()):
        if db.unlock_achievement(uid, "all_pass"):
            new_achs.append("all_pass")
    # 检查最高等级
    stats = db.get_user_stats(uid)
    lv, _, _, _ = get_level(stats["xp"])
    if lv >= len(LEVELS):
        if db.unlock_achievement(uid, "max_level"):
            new_achs.append("max_level")
    return jsonify({"ok": True, "record": rec, "xp_gained": xp_gained,
                    "new_achievements": new_achs})


@app.route("/api/visit", methods=["POST"])
def api_visit():
    """记录最近章节 + 更新连续天数 + 加 XP + 检查成就。"""
    uid = current_uid()
    if uid is None:
        return jsonify({"ok": False, "error": "请先登录"}), 401
    cid = (request.get_json(silent=True) or {}).get("cid")
    if cid not in CHAPTER_BY_ID:
        return jsonify({"ok": False, "error": "参数不合法"}), 400
    db.set_last_chapter(uid, cid)

    # 更新 streak 并加 XP
    streak, is_new_day = db.update_streak(uid)
    xp_gained = 0
    new_achs = []
    if is_new_day:
        xp_gained = XP_VISIT + (streak - 1) * XP_STREAK_BONUS
        db.add_xp(uid, xp_gained)
    # 检查成就
    if db.unlock_achievement(uid, "first_read"):
        new_achs.append("first_read")
    if streak >= 7:
        if db.unlock_achievement(uid, "streak_7"):
            new_achs.append("streak_7")
    stats = db.get_user_stats(uid)
    return jsonify({"ok": True, "xp": stats["xp"], "xp_gained": xp_gained,
                    "streak": streak, "new_achievements": new_achs})


@app.errorhandler(404)
def not_found(_e):
    return render_template("404.html", volumes=VOLUMES), 404


if __name__ == "__main__":
    db.init_db()
    app.run(debug=True, host="0.0.0.0", port=5000)
