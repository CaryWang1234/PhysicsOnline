/* ============================================
   progress.js —— 游客模式学习进度（localStorage）
   学会判定：本章测验 10 道常考题答对 8 道及以上（≥8/10）
   登录用户的成绩由服务端存储（/api/quiz），本文件仅作游客降级
   ============================================ */
(function () {
  var KEY = 'po_quiz_records_v1';

  function getRecords() {
    try {
      var raw = localStorage.getItem(KEY);
      var obj = raw ? JSON.parse(raw) : {};
      return (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : {};
    } catch (e) { return {}; }
  }

  function save(rec) {
    try { localStorage.setItem(KEY, JSON.stringify(rec)); } catch (e) { /* 忽略隐私模式等异常 */ }
  }

  window.PO = {
    KEY: KEY,
    getRecords: getRecords,
    // 记录一次测验成绩（自动保留最好成绩）
    recordQuiz: function (cid, correct, total) {
      var rec = getRecords();
      var old = rec[cid];
      if (!old || correct > old.correct) {
        rec[cid] = { correct: correct, total: total, pass: correct >= 8, at: Date.now() };
        save(rec);
      }
      return rec[cid];
    },
    getQuiz: function (cid) { return getRecords()[cid] || null; },
    isPassed: function (cid) {
      var r = getRecords()[cid];
      return !!(r && r.pass);
    },
    passedIds: function () {
      var rec = getRecords();
      return Object.keys(rec).filter(function (k) { return rec[k] && rec[k].pass; });
    },
    reset: function () { save({}); }
  };
})();
