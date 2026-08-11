/* ============================================
   spring.js —— 弹簧测力计模拟（胡克定律）· 打样动画
   交互：拖拽挂钩 / 滑块 / ±按钮改变拉力
   规律：弹性限度内 F = k·Δx，伸长量与拉力成正比
   超量程（5 N）弹簧被拉坏并警告
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.spring = (function () {
  var MAX_N = 5;          // 量程 5 N
  var PX_PER_N = 42;      // 每 1 N 伸长 42 px（可视化比例）
  var L0 = 90;            // 弹簧自然长度 px

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    // ---- 读数面板 ----
    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="spF">拉力 F = 0.0 N</span>' +
      '<span class="chip" id="spX">伸长量 Δx = 0.0 cm</span>' +
      '<span class="chip" id="spLaw">胡克定律：F = k·Δx ✓</span>';
    stage.appendChild(readout);

    // ---- 控制面板 ----
    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<button type="button" id="spMinus">− 1 N</button>' +
      '<label>拉力 <input type="range" id="spSlider" min="0" max="8" step="0.1" value="0"> <span id="spSliderVal">0.0 N</span></label>' +
      '<button type="button" id="spPlus">+ 1 N</button>' +
      '<button type="button" id="spReset">↺ 归零</button>' +
      '<span style="flex:1"></span>' +
      '<span>提示：也可以直接向下拖拽挂钩</span>';
    stage.appendChild(ui);

    var F = 0;            // 当前拉力 N
    var broken = false;   // 是否超量程损坏
    var W = 0, H = 0, dpr = 1;
    var dragging = false;

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); draw(); });

    var slider = ui.querySelector('#spSlider');
    var sliderVal = ui.querySelector('#spSliderVal');
    var chF = readout.querySelector('#spF');
    var chX = readout.querySelector('#spX');
    var chLaw = readout.querySelector('#spLaw');

    function setForce(v, fromSlider) {
      v = Math.max(0, Math.min(8, Math.round(v * 10) / 10));
      F = v;
      if (!broken && v > MAX_N) broken = true;   // 一旦超量程即损坏（演示用）
      if (broken && v <= MAX_N) { /* 损坏后保持损坏状态，需点“换新弹簧”恢复 */ }
      if (!fromSlider) slider.value = v;
      sliderVal.textContent = v.toFixed(1) + ' N';
      draw();
    }

    function newSpring() { broken = false; setForce(0); }

    slider.addEventListener('input', function () { setForce(parseFloat(slider.value), true); });
    ui.querySelector('#spMinus').addEventListener('click', function () { setForce(F - 1); });
    ui.querySelector('#spPlus').addEventListener('click', function () { setForce(F + 1); });
    ui.querySelector('#spReset').addEventListener('click', newSpring);

    // ---- 几何参数 ----
    function geom() {
      var cx = W * 0.42;                 // 弹簧中心线 x
      var topY = 70;                     // 吊环顶部
      var ext = broken ? L0 * 2.2 : L0 + F * PX_PER_N;   // 当前弹簧长度
      var hookY = topY + 14 + ext;       // 挂钩位置
      return { cx: cx, topY: topY, ext: ext, hookY: hookY };
    }

    // ---- 拖拽挂钩 ----
    function pointerY(e) {
      var r = canvas.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return t.clientY - r.top;
    }
    function hitHook(e) {
      var g = geom(), p = pointerY(e);
      return Math.abs(p - (g.hookY + 20)) < 34;
    }
    canvas.addEventListener('mousedown', function (e) { if (hitHook(e)) dragging = true; });
    canvas.addEventListener('touchstart', function (e) { if (hitHook(e)) { dragging = true; e.preventDefault(); } }, { passive: false });
    window.addEventListener('mousemove', dragMove);
    window.addEventListener('touchmove', dragMove, { passive: false });
    window.addEventListener('mouseup', function () { dragging = false; });
    window.addEventListener('touchend', function () { dragging = false; });
    function dragMove(e) {
      if (!dragging) return;
      var g = geom();
      var targetLen = pointerY(e) - 20 - (g.topY + 14);      // 期望弹簧长度
      var f = (targetLen - L0) / PX_PER_N;
      setForce(f);
      if (e.touches) e.preventDefault();
    }

    // ---- 绘制 ----
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var g = geom();

      // 背板：纸面标尺区
      drawScale(g);

      // 顶部吊环
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(g.cx, g.topY - 6, 10, 0, Math.PI * 2);
      ctx.stroke();

      // 外壳（测力计圆筒）
      var shellX = g.cx - 34, shellW = 68;
      ctx.fillStyle = 'rgba(250, 247, 239, .95)';
      ctx.strokeStyle = '#8fa597';
      ctx.lineWidth = 3;
      roundRect(shellX, g.topY + 6, shellW, L0 + MAX_N * PX_PER_N + 26, 12);
      ctx.fill(); ctx.stroke();

      // 刻度（0~5 N）
      ctx.fillStyle = '#3b4a3f';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      for (var n = 0; n <= MAX_N; n++) {
        var y = tickY(n, g);
        ctx.strokeStyle = '#3b4a3f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(shellX + shellW - 26, y);
        ctx.lineTo(shellX + shellW - 8, y);
        ctx.stroke();
        ctx.fillText(n + ' N', shellX + shellW + 8, y + 4);
        // 半刻度
        if (n < MAX_N) {
          var y2 = tickY(n + 0.5, g);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(shellX + shellW - 18, y2);
          ctx.lineTo(shellX + shellW - 8, y2);
          ctx.stroke();
        }
      }

      // 弹簧
      drawSpring(g);

      // 指针（指示当前读数）
      var py = tickY(Math.min(F, MAX_N), g);
      ctx.fillStyle = broken ? '#e2694f' : '#f2b356';
      ctx.beginPath();
      ctx.moveTo(shellX + 6, py);
      ctx.lineTo(shellX + 22, py - 7);
      ctx.lineTo(shellX + 22, py + 7);
      ctx.closePath();
      ctx.fill();

      // 挂钩与重物
      drawHookAndWeight(g);

      // 状态文本
      drawStatus(g);
    }

    function tickY(n, g) { return g.topY + 14 + L0 + n * PX_PER_N; }

    function drawScale(g) {
      // 左侧说明性标尺：伸长量对照
      var x = 26;
      ctx.fillStyle = 'rgba(255,253,247,.10)';
      roundRect(x, g.topY, 118, L0 + MAX_N * PX_PER_N + 40, 10);
      ctx.fill();
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('📌 伸长量与拉力成正比', x + 10, g.topY + 22);
      ctx.fillText('0 N → 0.0 cm', x + 10, g.topY + 48);
      ctx.fillText('1 N → 1.0 cm', x + 10, g.topY + 48 + 22);
      ctx.fillText('2 N → 2.0 cm', x + 10, g.topY + 48 + 44);
      ctx.fillText('… …', x + 10, g.topY + 48 + 66);
      ctx.fillText('5 N → 5.0 cm', x + 10, g.topY + 48 + 88);
      ctx.fillText('（量程 0 ~ 5 N）', x + 10, g.topY + 48 + 116);
    }

    function drawSpring(g) {
      var coils = 9;
      var y0 = g.topY + 14, y1 = y0 + g.ext;
      ctx.strokeStyle = broken ? '#e2694f' : '#cfd8d2';
      ctx.lineWidth = broken ? 3 : 4;
      ctx.beginPath();
      ctx.moveTo(g.cx, y0);
      var segH = (y1 - y0) / coils;
      for (var i = 0; i < coils; i++) {
        var yy = y0 + segH * (i + 0.5);
        var dir = (i % 2 === 0) ? 1 : -1;
        ctx.lineTo(g.cx + dir * 20, yy);
      }
      ctx.lineTo(g.cx, y1);
      ctx.stroke();
      if (broken) {
        // 损坏标记：断裂缝
        ctx.strokeStyle = '#ffd9cf';
        ctx.lineWidth = 2;
        var midY = (y0 + y1) / 2;
        ctx.beginPath();
        ctx.moveTo(g.cx - 26, midY - 5);
        ctx.lineTo(g.cx + 26, midY + 5);
        ctx.stroke();
      }
    }

    function drawHookAndWeight(g) {
      var hy = g.hookY;
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(g.cx, hy + 14, 12, -Math.PI * 0.5, Math.PI * 0.9);
      ctx.stroke();
      // 重物盒（随拉力变大，表示挂的钩码更多）
      if (F > 0.05) {
        var size = 34 + Math.min(F, 8) * 5;
        var wy = hy + 30;
        ctx.fillStyle = '#f2b356';
        ctx.strokeStyle = '#b98236';
        ctx.lineWidth = 2;
        roundRect(g.cx - size / 2, wy, size, size * 0.8, 8);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#5c4318';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(F.toFixed(1) + ' N', g.cx, wy + size * 0.45);
        // 拖拽提示箭头
        if (!broken) {
          ctx.fillStyle = '#d9e8d5';
          ctx.font = '16px sans-serif';
          ctx.fillText('⬇', g.cx, wy + size * 0.8 + 22);
        }
      }
    }

    function drawStatus(g) {
      var x = W - 210, y = g.topY;
      ctx.textAlign = 'left';
      if (broken) {
        ctx.fillStyle = '#ffb4a2';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('⚠ 超过量程 5 N！', x, y + 16);
        ctx.font = '14px sans-serif';
        ctx.fillText('弹簧被拉坏，示数失效。', x, y + 40);
        ctx.fillText('点击“↺ 归零”换新弹簧。', x, y + 62);
        chF.textContent = '⚠ 超量程！F > 5 N';
        chX.textContent = '弹簧已损坏 ✗';
        chLaw.textContent = '超过弹性限度，胡克定律不再成立';
        chLaw.className = 'chip warn';
      } else {
        var xcm = F * 1.0;   // 比例 1 N = 1.0 cm
        chF.textContent = '拉力 F = ' + F.toFixed(1) + ' N';
        chX.textContent = '伸长量 Δx = ' + xcm.toFixed(1) + ' cm';
        chLaw.textContent = '胡克定律：F = k·Δx（k = 1 N/cm）✓';
        chLaw.className = 'chip';
        ctx.fillStyle = '#d9e8d5';
        ctx.font = '14px sans-serif';
        ctx.fillText('✅ 弹性限度内，', x, y + 16);
        ctx.fillText('伸长量与拉力成正比', x, y + 38);
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

    draw();
  }

  return { init: init };
})();
