/* ============================================
   measure.js —— 刻度尺读数闯关
   交互：观察随机生成的刻度尺，输入被测物体的长度闯关
   规律：读数 = 准确值（分度值整数倍）+ 估读值（下一位）；
   左端不指零时：长度 = 右端刻度 − 左端刻度（常考易错点）
   连对计分，答错给出解析
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.measure = (function () {
  var LEVELS = [
    { div: 1, name: '分度值 1 cm', digits: 1 },   // 估读到 0.1 cm
    { div: 0.5, name: '分度值 0.5 cm', digits: 2 },
    { div: 0.1, name: '分度值 1 mm', digits: 2 }   // 估读到 0.01 cm
  ];

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="msScore">连对 0 把</span>' +
      '<span class="chip" id="msLevel">当前：分度值 1 cm</span>' +
      '<span class="chip" id="msMsg">读出被测物体的长度</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<label>我的读数 <input type="text" id="msInput" placeholder="如 2.35" style="width:90px"> cm</label>' +
      '<button type="button" id="msCheck">✅ 提交读数</button>' +
      '<button type="button" id="msNew">🎲 换一题</button>' +
      '<span style="flex:1"></span>' +
      '<span>提示：估读到分度值下一位；左端不指零时要两端相减</span>';
    stage.appendChild(ui);

    var W = 0, H = 0, dpr = 1;
    var level = 0, score = 0;
    var objStart = 2, objEnd = 5.3;   // 当前题目（cm）
    var locked = false;

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); draw(); });

    var chScore = readout.querySelector('#msScore');
    var chLevel = readout.querySelector('#msLevel');
    var chMsg = readout.querySelector('#msMsg');
    var input = ui.querySelector('#msInput');

    function rand(a, b) { return a + Math.random() * (b - a); }

    function newQuestion() {
      locked = false;
      // 随连对数升级难度
      level = Math.min(Math.floor(score / 3), LEVELS.length - 1);
      var lv = LEVELS[level];
      objStart = Math.floor(rand(0, 3));
      // 末端：准确值 + 随机估读位
      var span = rand(2, 9);
      var acc = Math.round(span / lv.div) * lv.div;
      var est = Math.floor(Math.random() * 9 + 1) * lv.div / 10;
      objEnd = Math.round((objStart + acc + est) * 1000) / 1000;
      input.value = '';
      input.disabled = false;
      chLevel.textContent = '当前：' + lv.name;
      chMsg.textContent = '读出被测物体的长度（单位 cm）';
      chMsg.className = 'chip';
      draw();
      input.focus();
    }

    function check() {
      if (locked) return;
      var v = parseFloat(input.value);
      if (isNaN(v)) {
        chMsg.textContent = '请先输入数字读数，如 2.35';
        chMsg.className = 'chip warn';
        return;
      }
      locked = true;
      var lv = LEVELS[level];
      var tol = lv.div / 20 + 1e-9;            // 估读允许半个最小估读位误差
      var ans = Math.round((objEnd - objStart) * 1000) / 1000;   // 长度 = 右端 − 左端
      var ok = Math.abs(v - ans) <= tol;
      var fmt = ans.toFixed(lv.digits);
      var calc = objEnd.toFixed(lv.digits) + ' − ' + objStart.toFixed(1) + ' = ' + fmt;
      if (ok) {
        score++;
        chScore.textContent = '连对 ' + score + ' 把 🔥';
        chMsg.textContent = '✔ 正确！长度 = ' + calc + ' cm（估读到位，漂亮！）';
        chMsg.className = 'chip';
        setTimeout(newQuestion, 1600);
      } else {
        score = 0;
        chScore.textContent = '连对 0 把';
        chMsg.textContent = '✘ 正确答案 ' + fmt + ' cm：左端不指零时，长度 = 右端刻度 − 左端刻度 = ' + calc + ' cm';
        chMsg.className = 'chip warn';
      }
      draw();
    }

    ui.querySelector('#msCheck').addEventListener('click', check);
    ui.querySelector('#msNew').addEventListener('click', newQuestion);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') check(); });

    // ---- 绘制 ----
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var lv = LEVELS[level];

      var x0 = 40, x1 = W - 40;                 // 尺子左右端
      var rulerY = H * 0.52, rulerH = 86;
      var range = 12;                            // 显示 0 ~ 12 cm
      var pxPerCm = (x1 - x0) / range;

      // 尺身
      ctx.fillStyle = '#f5e9c8';
      ctx.strokeStyle = '#b98d5a';
      ctx.lineWidth = 2.5;
      roundRect(x0 - 12, rulerY, x1 - x0 + 24, rulerH, 10);
      ctx.fill(); ctx.stroke();

      // 刻度线
      ctx.strokeStyle = '#3b4a3f';
      ctx.fillStyle = '#3b4a3f';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      var step = lv.div;
      for (var v = 0; v <= range + 1e-9; v += step) {
        var x = x0 + v * pxPerCm;
        var isCm = Math.abs(v - Math.round(v)) < 1e-9;
        var len = isCm ? 34 : (level === 2 ? (Math.abs(v * 10 % 5) < 1e-9 ? 26 : 16) : 22);
        ctx.lineWidth = isCm ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.moveTo(x, rulerY);
        ctx.lineTo(x, rulerY + len);
        ctx.stroke();
        if (isCm) {
          ctx.fillText(String(Math.round(v)), x, rulerY + 52);
        }
      }
      ctx.textAlign = 'left';
      ctx.fillText('单位：cm', x1 - 64, rulerY + 74);

      // 被测物体（末端对齐待读刻度）
      var xs = x0 + objStart * pxPerCm;
      var xe = x0 + objEnd * pxPerCm;
      var objY = rulerY - 46, objH = 40;
      ctx.fillStyle = 'rgba(111, 174, 124, .85)';
      ctx.strokeStyle = '#4d8a5c';
      ctx.lineWidth = 2;
      roundRect(xs, objY, xe - xs, objH, 6);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2f4a36';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      if (xe - xs > 60) ctx.fillText('被测物体', (xs + xe) / 2, objY + 24);

      // 末端对齐虚线
      ctx.strokeStyle = locked ? '#f2b356' : 'rgba(226,105,79,.75)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.moveTo(xe, objY - 10);
      ctx.lineTo(xe, rulerY + 34);
      ctx.stroke();
      ctx.setLineDash([]);

      // 起点提示
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📌 物体左端对齐 ' + objStart.toFixed(1) + ' cm：长度 = 右端刻度 − 左端刻度', 26, 32);

      // 提交后显示答案：右端读数 + 长度
      if (locked) {
        var ansLen = (objEnd - objStart).toFixed(LEVELS[level].digits);
        ctx.fillStyle = '#f2b356';
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('右端 ' + objEnd.toFixed(LEVELS[level].digits) + ' cm', xe, objY - 18);
        ctx.fillText('长度 = ' + ansLen + ' cm', (xs + xe) / 2, objY - 40);
      }
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

    newQuestion();
  }

  return { init: init };
})();
