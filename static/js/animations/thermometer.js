/* ============================================
   thermometer.js —— 温度计读数练习室
   交互：随机给出一个温度（含零下），练习读取液柱位置对应的温度
   考点：视线与液柱上表面相平；零下温度从上往下数刻度
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.thermometer = (function () {
  var T_MIN = -10, T_MAX = 110;   // 量程

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="tmLevel">⭐ 连对 0 题</span>' +
      '<span class="chip" id="tmTip">📌 视线要与液柱上表面相平，零下从 0 往下数</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<input type="number" step="1" id="tmInput" placeholder="读数（℃）" style="max-width:140px">' +
      '<button type="button" id="tmCheck">✅ 提交读数</button>' +
      '<button type="button" id="tmNext">🎲 换一个温度</button>' +
      '<span id="tmFb" class="anim-fb"></span>';
    stage.appendChild(ui);

    var W = 0, H = 0, dpr = 1;
    var target = 0, streak = 0, answered = false;

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); draw(); });

    var chLevel = readout.querySelector('#tmLevel');
    var chTip = readout.querySelector('#tmTip');
    var input = ui.querySelector('#tmInput');
    var fb = ui.querySelector('#tmFb');

    function newRound() {
      // 30% 概率出零下温度，难度升级后温度取到 0.5 的倍数（仍要求整数读数，分度值 1℃）
      target = streak >= 3
        ? Math.round((Math.random() * (T_MAX - T_MIN) + T_MIN))
        : Math.round(Math.random() * 60 - 5);
      if (streak >= 3 && Math.random() < 0.3) target = Math.round(Math.random() * 10 - 10);
      answered = false;
      fb.textContent = '';
      input.value = '';
      input.disabled = false;
      chTip.textContent = streak >= 3
        ? '🔥 进阶模式：全量程随机出题'
        : '📌 视线要与液柱上表面相平，零下从 0 往下数';
      draw();
    }

    ui.querySelector('#tmCheck').addEventListener('click', check);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });
    ui.querySelector('#tmNext').addEventListener('click', newRound);

    function check() {
      if (answered) return;
      var v = parseFloat(input.value);
      if (isNaN(v)) { fb.textContent = '✏️ 先输入读数再提交'; fb.className = 'anim-fb is-wrong'; return; }
      answered = true;
      input.disabled = true;
      if (Math.abs(v - target) < 0.01) {
        streak++;
        fb.textContent = '✔ 正确！液柱上表面指在 ' + target + ' ℃，连对 ' + streak + ' 题';
        fb.className = 'anim-fb is-right';
      } else {
        streak = 0;
        fb.textContent = '✘ 正确答案 ' + target + ' ℃：' +
          (target < 0 ? '零下温度从 0 ℃ 刻度往下数，一格 1 ℃' : '从零上刻度一格 1 ℃ 往上数');
        fb.className = 'anim-fb is-wrong';
      }
      chLevel.textContent = '⭐ 连对 ' + streak + ' 题';
      draw();
    }

    // ---- 绘制 ----
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2;
      var top = 34, bottom = H - 46;
      var tubeH = bottom - top;

      function yOf(T) { return bottom - (T - T_MIN) / (T_MAX - T_MIN) * tubeH; }

      // 玻璃管外壁
      ctx.fillStyle = 'rgba(255,253,247,.10)';
      roundRect(cx - 16, top - 18, 32, tubeH + 34, 12);
      ctx.fill();
      ctx.strokeStyle = '#cfd8d2';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 7, top);
      ctx.lineTo(cx - 7, bottom);
      ctx.moveTo(cx + 7, top);
      ctx.lineTo(cx + 7, bottom);
      ctx.stroke();

      // 液泡
      ctx.fillStyle = '#e2694f';
      ctx.beginPath();
      ctx.arc(cx, bottom + 12, 14, 0, Math.PI * 2);
      ctx.fill();

      // 液柱
      var y = yOf(target);
      ctx.strokeStyle = '#e2694f';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(cx, bottom + 4);
      ctx.lineTo(cx, y);
      ctx.stroke();

      // 刻度：每 1 ℃ 短线，每 10 ℃ 长线 + 数字
      ctx.textAlign = 'left';
      ctx.font = '12px sans-serif';
      for (var T = T_MIN; T <= T_MAX; T++) {
        var yy = yOf(T);
        var big = T % 10 === 0;
        ctx.strokeStyle = big ? '#fffdf7' : 'rgba(255,253,247,.55)';
        ctx.lineWidth = big ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + 7, yy);
        ctx.lineTo(cx + (big ? 22 : 14), yy);
        ctx.stroke();
        if (big) {
          ctx.fillStyle = '#fffdf7';
          ctx.fillText(T + '', cx + 26, yy + 4);
        }
      }

      // 液面指示（提交后显示）
      if (answered) {
        ctx.strokeStyle = '#f2c14e';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(cx - 60, y);
        ctx.lineTo(cx - 10, y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f2c14e';
        ctx.textAlign = 'right';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText(target + ' ℃', cx - 64, y + 5);
      }

      // 标题与单位
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d9e8d5';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('实验室温度计（分度值 1 ℃）', cx, 18);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#a9c4ae';
      ctx.fillText('量程 ' + T_MIN + ' ℃ ~ ' + T_MAX + ' ℃', cx, H - 10);
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    newRound();
  }

  return { init: init };
})();
