# -*- coding: utf-8 -*-
"""临时用户系统端到端测试（跑完即删）"""
import http.cookiejar
import json
import urllib.parse
import urllib.request

BASE = "http://localhost:5000"
fails = []


def client():
    jar = http.cookiejar.CookieJar()
    return urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))


def post_form(op, path, fields):
    data = urllib.parse.urlencode(fields).encode()
    return op.open(BASE + path, data, timeout=5)


def check(name, cond):
    if not cond:
        fails.append(name)
    print(("PASS " if cond else "FAIL ") + name)


# 用户 A：注册 -> 提交成绩 -> 页面可见
a = client()
r = post_form(a, "/register", {"username": "测试甲", "password": "1234", "confirm": "1234"})
check("A 注册成功并回首页", r.geturl() == BASE + "/" and "测试甲" in r.read().decode("utf-8"))

req = urllib.request.Request(
    BASE + "/api/quiz",
    data=json.dumps({"cid": "8a1", "correct": 9, "total": 10}).encode(),
    headers={"Content-Type": "application/json"})
resp = json.loads(a.open(req, timeout=5).read().decode())
check("A 提交成绩 ok 且学会", resp.get("ok") and resp["record"]["pass"] is True)

html = a.open(BASE + "/chapter/8a1", timeout=5).read().decode("utf-8")
check("A 章节页注入服务端成绩", '"correct": 9' in html)
home = a.open(BASE + "/", timeout=5).read().decode("utf-8")
check("A 首页注入服务端进度", '"8a1"' in home and '"pass": true' in home)

# 保留最好成绩：再交一次低分
req = urllib.request.Request(
    BASE + "/api/quiz",
    data=json.dumps({"cid": "8a1", "correct": 5, "total": 10}).encode(),
    headers={"Content-Type": "application/json"})
resp = json.loads(a.open(req, timeout=5).read().decode())
check("A 低分不覆盖高分", resp["record"]["correct"] == 9 and resp["record"]["pass"] is True)

# 用户 B：注册后看不到 A 的成绩
b = client()
post_form(b, "/register", {"username": "测试乙", "password": "abcd", "confirm": "abcd"})
html_b = b.open(BASE + "/chapter/8a1", timeout=5).read().decode("utf-8")
check("B 的章节页无 A 的成绩", "null || PO.getQuiz" in html_b and '"correct": 9' not in html_b)

# 匿名访问 API 被拒
try:
    c = client()
    req = urllib.request.Request(
        BASE + "/api/quiz",
        data=json.dumps({"cid": "8a1", "correct": 9, "total": 10}).encode(),
        headers={"Content-Type": "application/json"})
    code = c.open(req, timeout=5).status
    check("匿名提交被拒", False)
except urllib.error.HTTPError as e:
    check("匿名提交被拒 401", e.code == 401)

# 错误密码 / 重复注册 / 非法参数
r = post_form(client(), "/login", {"username": "测试甲", "password": "wrong"})
check("错误密码有提示", "用户名或密码不对" in r.read().decode("utf-8"))
r = post_form(client(), "/register", {"username": "测试甲", "password": "1234", "confirm": "1234"})
check("重复注册有提示", "已经被注册" in r.read().decode("utf-8"))
try:
    req = urllib.request.Request(
        BASE + "/api/quiz",
        data=json.dumps({"cid": "8a1", "correct": 99, "total": 10}).encode(),
        headers={"Content-Type": "application/json"})
    post_form_code = a.open(req, timeout=5).status
    check("非法成绩被拒", False)
except urllib.error.HTTPError as e:
    check("非法成绩被拒 400", e.code == 400)

# 正确登录 + 登出
d = client()
r = post_form(d, "/login", {"username": "测试甲", "password": "1234"})
check("A 重新登录成功", r.geturl() == BASE + "/")
r = d.open(BASE + "/logout", timeout=5)
check("登出回首页且无用户名", "测试甲" not in r.read().decode("utf-8"))

print("----")
print("ALL PASS" if not fails else ("FAILS: " + str(fails)))
