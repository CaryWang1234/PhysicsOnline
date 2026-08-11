# -*- coding: utf-8 -*-
"""临时：清理测试账号 + 全路由巡检（跑完即删）"""
import sqlite3
import urllib.request
import urllib.error

con = sqlite3.connect("data.db")
con.execute("DELETE FROM progress WHERE user_id IN (SELECT id FROM users WHERE username LIKE '测试%')")
con.execute("DELETE FROM users WHERE username LIKE '测试%'")
con.commit()
print("users left:", con.execute("SELECT COUNT(*) FROM users").fetchone()[0])
con.close()

BASE = "http://localhost:5000"
IDS = ["8a0", "8a1", "8a2", "8a3", "8a4", "8a5",
       "8b1", "8b2", "8b3", "8b4", "8b5"]
ok200 = ["/", "/login", "/register", "/volume/8a", "/volume/8b"]
ok200 += ["/chapter/" + i for i in IDS]
ok200 += ["/chapter/" + i + "/quiz" for i in IDS]
ok404 = ["/chapter/zzz", "/volume/9x", "/logout-x", "/api/quiz"]

fails = []
for p in ok200:
    try:
        with urllib.request.urlopen(BASE + p, timeout=5) as r:
            if r.status != 200:
                fails.append((p, r.status))
    except Exception as e:
        fails.append((p, str(e)))
for p in ok404:
    try:
        with urllib.request.urlopen(BASE + p, timeout=5) as r:
            fails.append((p, "want404 got " + str(r.status)))
    except urllib.error.HTTPError as e:
        if e.code != 404 and e.code != 405:
            fails.append((p, "want404 got " + str(e.code)))

print("checked:", len(ok200), "x200 +", len(ok404), "x404")
print("ALL PASS" if not fails else ("FAILS: " + str(fails)))
