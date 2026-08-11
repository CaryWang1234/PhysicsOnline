/* ============================================
   avg_speed.js —— 测平均速度实验台
   交互：小车从斜面滑下（匀加速），用户用停表在终点手动按停，
         练习 v = s / t，分别测全程与上半程并比较
   规律：变速运动越滑越快，下半程平均速度 > 上半程
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.avg_speed = (function () {
  var S_FULL = 1.2, S_HALF = 0.6;   // 路程 m
  var A = 0.55;                     // 演示加速度 m/s²（约 2.1 s 滑完全程）

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="asSec">路程 s = 1.2 m（全程）</span>' +
      '<span class="chip" id="asStop">停表 t = 0.00 s</span>' +
      '<span class="chip" id="asV">平均速度 v = —— </span>' +
      '<span class="chip" id="asBest">📋 记录：暂无</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<button type="button" id="asFull">📏 选全程（1.2 m）</button>' +
      '<button type="button" id="asHalf">📏 选上半程（0.6 m）</button>' +
      '<button type="button" id="asGo">🚀 释放小车</button>' +
      '<button type="button" id="asStopBtn" disabled>⏹ 到点了，按停！</button>' +
      '<button type="button" id="asReset">↺ 重置</button>' +
      '<span id="asFb" class="anim-fb"></span>';
    stage.appendChild(ui);

    var W = 0, H = 0, dpr = 1;
    var seg = S_FULL;               // 当前路程
    var state = 'idle';             // idle | running | done
    var simT = 0, stopT = 0;
    var rafId = null, lastTs = 0;
    var recFull = null, recHalf = null;

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); draw(); });

    var chSec = readout.querySelector('#asSec');
    var chStop = readout.querySelector('#asStop');
    var chV = readout.querySelector('#asV');
    var chBest = readout.querySelector('#asBest');
    var btnGo = ui.querySelector('#asGo');
    var btnStop = ui.querySelector('#asStopBtn');
    var fb = ui.querySelector('#asFb');

    function posOf(t) { return 0.5 * A * t * t; }              // 路程 m
    function timeOf(s) { return Math.sqrt(2 * s / A); }        // 理论用时

    function setSeg(s) {
      if (state === 'running') return;
      seg = s;
      reset(false);
      chSec.textContent = '路程 s = ' + s.toFixed(1) + ' m（' + (s === S_FULL ? '全程' : '上半程') + '）';
      ui.querySelector('#asFull').classList.toggle('is-on', s === S_FULL);
      ui.querySelector('#asHalf').classList.toggle('is-on', s === S_HALF);
    }
    ui.querySelector('#asFull').addEventListener('click', function () { setSeg(S_FULL); });
    ui.querySelector('#asHalf').addEventListener('click', function () { setSeg(S_HALF); });

    function reset(msg) {
      state = 'idle';
      simT = 0; stopT = 0;
      if (rafId) cancelAnimationFrame(rafId);
      btnGo.disabled = false;
      btnStop.disabled = true;
      chStop.textContent = '停表 t = 0.00 s';
      chV.textContent = '平均速度 v = —— ';
      if (msg === false) fb.textContent = '';
      draw();
    }
    ui.querySelector('#asReset').addEventListener('click', function () { reset(true); });

    btnGo.addEventListener('click', function () {
      if (state === 'running') return;
      state = 'running';
      simT = 0; lastTs = performance.now();
      btnGo.disabled = true;
      btnStop.disabled = false;
      fb.textContent = '⏱ 小车滑到 ' + (seg === S_FULL ? '终点 B' : '中点 C') + ' 的瞬间快按停！';
      fb.className = 'anim-fb';
      rafId = requestAnimationFrame(tick);
    });

    btnStop.addEventListener('click', function () {
      if (state !== 'running') return;
      state = 'done';
      stopT = simT;
      btnStop.disabled = true;
      btnGo.disabled = false;
      var v = seg / stopT;
      var vt = seg / timeOf(seg);
      var err = Math.round(Math.abs(stopT - timeOf(seg)) / timeOf(seg) * 100);
      chV.textContent = '平均速度 v = ' + v.toFixed(2) + ' m/s';
      if (seg === S_FULL) recFull = v; else recHalf = v;
      updateRecord();
      fb.textContent = '✔ 计时 ' + stopT.toFixed(2) + ' s（理论 ' + timeOf(seg).toFixed(2) +
        ' s，误差 ' + err + '%），v = ' + seg + ' ÷ ' + stopT.toFixed(2) + ' = ' + v.toFixed(2) + ' m/s';
      fb.className = 'anim-fb is-right';
      draw();
    });

    function updateRecord() {
      var parts = [];
      if (recHalf !== null) parts.push('上半程 ' + recHalf.toFixed(2) + ' m/s');
      if (recFull !== null) parts.push('全程 ' + recFull.toFixed(2) + ' m/s');
      var extra = (recHalf !== null && recFull !== null)
        ? ' → 全程比上半程快！' : '';
      chBest.textContent = '📋 记录：' + (parts.join('，') || '暂无') + extra;
    }

    function tick(ts) {
      if (state !== 'running') return;
      simT += Math.min((ts - lastTs) / 1000, 0.1);
      lastTs = ts;
      chStop.textContent = '停表 t = ' + simT.toFixed(2) + ' s';
      // 小车滑过终点后自动结束（没按停视为超时）
      if (posOf(simT) > S_FULL + 0.15) {
        state = 'done';
        btnStop.disabled = true;
        btnGo.disabled = false;
        fb.textContent = '✘ 没来得及按停，小车已滑出终点——再试一次，眼睛盯住终点线！';
        fb.className = 'anim-fb is-wrong';
      }
      draw();
      if (state === 'running') rafId = requestAnimationFrame(tick);
    }

    // ---- 绘制 ----
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var x0 = 60, x1 = W - 60;
      var yTop = 60, yBot = H - 56;
      var slopeLen = x1 - x0;

      // 斜面（从左上到右下）
      function pt(s) {   // 路程 s(m) → 斜面坐标
        var k = s / S_FULL;
        return [x0 + k * slopeLen, yTop + k * (yBot - yTop)];
      }
      ctx.strokeStyle = '#cfd8d2';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x0, yTop);
      ctx.lineTo(x1, yBot);
      ctx.stroke();

      // 标记点：起点 A / 中点 C / 终点 B
      drawMark(pt(0), 'A·起点');
      drawMark(pt(S_HALF), 'C·中点');
      drawMark(pt(S_FULL), 'B·终点');

      // 目标段高亮
      var pEnd = pt(seg);
      ctx.strokeStyle = '#f2c14e';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x0, yTop);
      ctx.lineTo(pEnd[0], pEnd[1]);
      ctx.stroke();

      // 小车
      var p = pt(Math.min(posOf(simT), S_FULL + 0.12));
      var ang = Math.atan2(yBot - yTop, slopeLen);
      ctx.save();
      ctx.translate(p[0], p[1] - 14);
      ctx.rotate(ang);
      ctx.fillStyle = '#8ecae6';
      roundRect(-24, -12, 48, 16, 5);
      ctx.fill();
      ctx.fillStyle = '#3d5a6c';
      ctx.beginPath(); ctx.arc(-13, 8, 6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(13, 8, 6, 0, Math.PI * 2); ctx.fill();
      ctx.restore();

      // 停表大字
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fffdf7';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('⏱ ' + (state === 'running' ? simT : stopT).toFixed(2) + ' s', W / 2, 30);

      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#a9c4ae';
      ctx.fillText('原理 v = s ÷ t：眼睛盯住终点，小车一到就按停', W / 2, H - 12);
    }

    function drawMark(p, label) {
      ctx.fillStyle = '#f2c14e';
      ctx.beginPath();
      ctx.arc(p[0], p[1], 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, p[0], p[1] + 22);
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

    setSeg(S_FULL);
    draw();
  }

  return { init: init };
})();
