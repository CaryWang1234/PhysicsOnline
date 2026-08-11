/* ============================================
   specific_heat.js —— 比热容对比加热实验
   交互：相同热源同时给等质量的水和食用油加热，观察升温快慢
   规律：Q = cmΔt；相同时间吸热相同，比热容大的升温慢
   c水 = 4.2×10³ J/(kg·℃)，c油 ≈ 2.0×10³ J/(kg·℃)
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.specific_heat = (function () {
  var C_WATER = 4200, C_OIL = 2000;   // J/(kg·℃)
  var MASS = 0.1;                     // 各 100 g
  var POWER = 60;                     // 热源功率 60 W（演示加速）
  var T0 = 20, T_MAX = 100;

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="shTime">加热时间 t = 0 s</span>' +
      '<span class="chip" id="shTw">水温 20.0 ℃</span>' +
      '<span class="chip" id="shTo">油温 20.0 ℃</span>' +
      '<span class="chip" id="shQ">吸热 Q = 0 J（两杯相同）</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<button type="button" id="shGo">🔥 开始加热</button>' +
      '<button type="button" id="shPause" disabled>⏸ 暂停</button>' +
      '<button type="button" id="shReset">↺ 重置</button>' +
      '<span style="flex:1"></span>' +
      '<span>相同热源 · 等质量，看谁升温快</span>';
    stage.appendChild(ui);

    var W = 0, H = 0, dpr = 1;
    var t = 0;                        // 加热时间 s
    var running = false, rafId = null, lastTs = 0;
    var hist = [];                    // [t, Tw, To]

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); draw(); });

    var chTime = readout.querySelector('#shTime');
    var chTw = readout.querySelector('#shTw');
    var chTo = readout.querySelector('#shTo');
    var chQ = readout.querySelector('#shQ');
    var btnGo = ui.querySelector('#shGo');
    var btnPause = ui.querySelector('#shPause');

    function temp(c) { return Math.min(T_MAX, T0 + POWER * t / (c * MASS)); }

    btnGo.addEventListener('click', function () {
      if (running) return;
      running = true;
      btnGo.disabled = true;
      btnPause.disabled = false;
      lastTs = performance.now();
      rafId = requestAnimationFrame(tick);
    });
    btnPause.addEventListener('click', function () {
      running = false;
      btnGo.disabled = false;
      btnPause.disabled = true;
      if (rafId) cancelAnimationFrame(rafId);
    });
    ui.querySelector('#shReset').addEventListener('click', function () {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      t = 0; hist = [];
      btnGo.disabled = false;
      btnPause.disabled = true;
      draw();
    });

    function tick(ts) {
      if (!running) return;
      var dt = Math.min((ts - lastTs) / 1000, 0.1) * 8;   // 8 倍速演示
      lastTs = ts;
      t += dt;
      if (t % 1 < dt) hist.push([t, temp(C_WATER), temp(C_OIL)]);   // 约每秒采样
      draw();
      if (temp(C_OIL) >= T_MAX && temp(C_WATER) >= T_MAX) { btnPause.click(); return; }
      rafId = requestAnimationFrame(tick);
    }

    // ---- 绘制 ----
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var Tw = temp(C_WATER), To = temp(C_OIL);
      var Q = POWER * t;

      drawBeaker(W * 0.22, '水', Tw, '#8ecae6', C_WATER);
      drawBeaker(W * 0.5, '食用油', To, '#f2c14e', C_OIL);
      drawCurve(W * 0.76);

      chTime.textContent = '加热时间 t = ' + Math.round(t) + ' s';
      chTw.textContent = '水温 ' + Tw.toFixed(1) + ' ℃';
      chTo.textContent = '油温 ' + To.toFixed(1) + ' ℃';
      chQ.textContent = '吸热 Q = ' + Math.round(Q) + ' J（两杯相同）';
    }

    function drawBeaker(cx, name, T, color, c) {
      var bw = 86, bh = 120;
      var top = H * 0.5 - bh / 2;

      // 酒精灯火焰（加热时更旺）
      ctx.fillStyle = running ? '#f2b356' : '#c9b48f';
      ctx.beginPath();
      var fy = top + bh + 26;
      ctx.ellipse(cx, fy, running ? 16 : 10, running ? 22 : 13, 0, 0, Math.PI * 2);
      ctx.fill();
      if (running) {
        ctx.fillStyle = '#e2694f';
        ctx.beginPath();
        ctx.ellipse(cx, fy + 6, 8, 11, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#8fa597';
      ctx.fillRect(cx - 22, fy + 16, 44, 10);

      // 烧杯
      ctx.strokeStyle = '#cfd8d2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - bw / 2, top);
      ctx.lineTo(cx - bw / 2, top + bh - 8);
      ctx.arcTo(cx - bw / 2, top + bh, cx, top + bh, 8);
      ctx.lineTo(cx + bw / 2 - 8, top + bh);
      ctx.arcTo(cx + bw / 2, top + bh, cx + bw / 2, top + bh - 8, 8);
      ctx.lineTo(cx + bw / 2, top);
      ctx.stroke();

      // 液体：温度越高颜色越偏暖红
      var heat = (T - T0) / (T_MAX - T0);
      ctx.fillStyle = mixColor(color, '#e2694f', heat * 0.55);
      var fillH = bh * 0.72;
      ctx.fillRect(cx - bw / 2 + 3, top + bh - fillH, bw - 6, fillH - 3);
      // 温度高时冒泡
      if (T > 60) {
        ctx.fillStyle = 'rgba(255,255,255,.75)';
        for (var i = 0; i < 5; i++) {
          var bx = cx - bw / 2 + 12 + ((i * 17 + Math.floor(t * 2) * 7) % (bw - 24));
          var by = top + bh - 10 - ((t * 30 + i * 23) % (fillH - 14));
          ctx.beginPath();
          ctx.arc(bx, by, 2.5 + (i % 3), 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 温度计
      ctx.strokeStyle = '#fffdf7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(cx + bw / 2 + 14, top - 14);
      ctx.lineTo(cx + bw / 2 + 14, top + bh - 10);
      ctx.stroke();
      ctx.strokeStyle = '#e2694f';
      ctx.lineWidth = 2;
      var merc = (T - T0) / (T_MAX - T0);
      ctx.beginPath();
      ctx.moveTo(cx + bw / 2 + 14, top + bh - 12);
      ctx.lineTo(cx + bw / 2 + 14, top + bh - 12 - merc * (bh - 6));
      ctx.stroke();

      // 标签
      ctx.textAlign = 'center';
      ctx.fillStyle = '#d9e8d5';
      ctx.font = 'bold 15px sans-serif';
      ctx.fillText(name + '（100 g）', cx, top - 26);
      ctx.font = '14px sans-serif';
      ctx.fillText(T.toFixed(1) + ' ℃', cx, top - 8);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#a9c4ae';
      ctx.fillText('c = ' + (c / 1000).toFixed(1) + '×10³ J/(kg·℃)', cx, top + bh + 58);
    }

    function drawCurve(cx) {
      // 右侧温度-时间曲线
      var x0 = cx - 58, y0 = H - 52, cw = 116, chh = H - 130;
      ctx.fillStyle = 'rgba(255,253,247,.08)';
      roundRect(x0 - 16, 44, cw + 34, chh + 40, 10);
      ctx.fill();

      ctx.strokeStyle = '#8fa597';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x0, 60);
      ctx.lineTo(x0, y0);
      ctx.lineTo(x0 + cw, y0);
      ctx.stroke();

      ctx.fillStyle = '#a9c4ae';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('温度-时间曲线', x0 + cw / 2, 58);

      var tMax = Math.max(60, t);
      function px(tt) { return x0 + tt / tMax * cw; }
      function py(T) { return y0 - (T - T0) / (T_MAX - T0) * (chh - 20); }

      function plot(ci, color) {
        if (hist.length < 2) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(px(hist[0][0]), py(hist[0][ci]));
        for (var i = 1; i < hist.length; i++) ctx.lineTo(px(hist[i][0]), py(hist[i][ci]));
        ctx.stroke();
      }
      plot(1, '#8ecae6');   // 水
      plot(2, '#f2c14e');   // 油

      ctx.fillStyle = '#8ecae6';
      ctx.textAlign = 'left';
      ctx.fillText('— 水（升温慢）', x0 + 4, y0 + 18);
      ctx.fillStyle = '#f2c14e';
      ctx.fillText('— 油（升温快）', x0 + 4, y0 + 34);
    }

    function mixColor(a, b, k) {
      var pa = hex(a), pb = hex(b);
      var r = Math.round(pa[0] + (pb[0] - pa[0]) * k);
      var g = Math.round(pa[1] + (pb[1] - pa[1]) * k);
      var bl = Math.round(pa[2] + (pb[2] - pa[2]) * k);
      return 'rgb(' + r + ',' + g + ',' + bl + ')';
    }
    function hex(s) {
      return [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
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
