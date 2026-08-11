/* ============================================
   phase_change.js —— 冰的熔化/沸腾曲线实验（八上·物态变化）
   持续加热冰块，记录温度-时间图像：
   晶体熔化与沸腾时吸热但温度保持不变（平台段）
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.phase_change = (function () {
  // 各阶段时长（模拟秒）：升温冰 → 熔化平台 → 升温水 → 沸腾平台 → 水蒸气升温
  var SEGS = [
    { name: '冰（固态）', dur: 3, t0: -20, t1: 0 },
    { name: '熔化中（冰水混合）', dur: 4, t0: 0, t1: 0 },
    { name: '水（液态）', dur: 5, t0: 0, t1: 100 },
    { name: '沸腾中（水→水蒸气）', dur: 4, t0: 100, t1: 100 },
    { name: '水蒸气（气态）', dur: 3, t0: 100, t1: 130 }
  ];
  var TOTAL = SEGS.reduce(function (s, x) { return s + x.dur; }, 0);

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="pcT">温度 = -20 ℃</span>' +
      '<span class="chip" id="pcP">状态：冰（固态）</span>' +
      '<span class="chip" id="pcH">加热中吸热</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<button type="button" id="pcHeat">🔥 开始加热</button>' +
      '<button type="button" id="pcReset">↺ 重置</button>' +
      '<span style="opacity:.85">观察 0℃ 和 100℃ 处的“平台”：吸热但温度不变</span>';
    stage.appendChild(ui);

    var simT = 0, heating = false, done = false;
    var last = performance.now();

    ui.querySelector('#pcHeat').addEventListener('click', function () {
      if (done) return;
      heating = !heating;
      this.textContent = heating ? '⏸ 暂停加热' : '🔥 开始加热';
    });
    ui.querySelector('#pcReset').addEventListener('click', function () {
      simT = 0; done = false; heating = false;
      ui.querySelector('#pcHeat').textContent = '🔥 开始加热';
    });

    var W = 0, H = 0, dpr = 1;
    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); });

    function stateAt(t) {
      var acc = 0;
      for (var i = 0; i < SEGS.length; i++) {
        if (t <= acc + SEGS[i].dur || i === SEGS.length - 1) {
          var p = Math.max(0, Math.min(1, (t - acc) / SEGS[i].dur));
          var T = SEGS[i].t0 + (SEGS[i].t1 - SEGS[i].t0) * p;
          return { seg: SEGS[i], T: T, p: p };
        }
        acc += SEGS[i].dur;
      }
    }

    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (heating && !done) {
        simT += dt;
        if (simT >= TOTAL) { simT = TOTAL; done = true; heating = false; ui.querySelector('#pcHeat').textContent = '🔥 开始加热'; }
      }

      ctx.clearRect(0, 0, W, H);
      var st = stateAt(simT);

      // ---- 左侧：烧杯与物质状态 ----
      var bx = W * 0.16, by = H * 0.30, bw = 110, bh = 120;
      // 烧杯
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh);
      ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by);
      ctx.stroke();
      // 内容物
      var segName = st.seg.name;
      if (segName.indexOf('冰') === 0) {
        ctx.fillStyle = 'rgba(191,227,240,.8)';
        ctx.fillRect(bx + 6, by + 30, bw - 12, bh - 36);
        ctx.fillStyle = '#fff';
        ctx.font = '26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🧊', bx + bw / 2, by + bh / 2 + 16);
      } else if (segName.indexOf('熔化') === 0) {
        ctx.fillStyle = 'rgba(191,227,240,.55)';
        ctx.fillRect(bx + 6, by + 50, bw - 12, bh - 56);
        ctx.fillStyle = '#fff';
        ctx.font = '22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🧊💧', bx + bw / 2, by + bh / 2 + 12);
      } else if (segName.indexOf('沸腾') === 0 || segName.indexOf('水') === 0) {
        ctx.fillStyle = 'rgba(127,184,216,.55)';
        ctx.fillRect(bx + 6, by + 42, bw - 12, bh - 48);
        if (segName.indexOf('沸腾') === 0) {
          ctx.fillStyle = '#fff';
          ctx.font = '18px sans-serif';
          ctx.textAlign = 'center';
          var bub = (Date.now() / 200) % 40;
          ctx.fillText('○ ○ ○', bx + bw / 2, by + bh - 20 - bub * 0.6);
          ctx.fillText('♨ 沸腾', bx + bw / 2, by + 34);
        } else {
          ctx.fillStyle = '#d9e8d5';
          ctx.font = '22px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('💧', bx + bw / 2, by + bh / 2 + 12);
        }
      } else {
        ctx.fillStyle = '#d9e8d5';
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☁ 水蒸气上升', bx + bw / 2, by + 50);
      }
      // 酒精灯
      if (heating) {
        ctx.font = '26px sans-serif';
        ctx.fillText('🔥', bx + bw / 2, by + bh + 34);
      }
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(heating ? '持续加热中…' : (done ? '加热完成' : '未加热'), bx + bw / 2, by + bh + 58);

      // ---- 右侧：温度-时间图像 ----
      var gx = W * 0.40, gy = H * 0.82, gw = W * 0.52, gh = H * 0.58;
      ctx.strokeStyle = '#d9e8d5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy - gh - 16); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
      ctx.stroke();
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('温度/℃', gx - 8, gy - gh - 22);
      ctx.fillText('时间', gx + gw - 26, gy + 18);
      // 纵轴刻度 -20 / 0 / 100 /130
      function tY(T) { return gy - (T + 20) / 150 * gh; }
      [-20, 0, 100].forEach(function (T) {
        var y = tY(T);
        ctx.fillText(T, gx - 30, y + 4);
        ctx.strokeStyle = (T === 0 || T === 100) ? 'rgba(242,179,86,.4)' : 'rgba(217,232,213,.2)';
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      });
      // 曲线
      ctx.strokeStyle = '#f2b356';
      ctx.lineWidth = 3;
      ctx.beginPath();
      var N = 120;
      for (var i = 0; i <= N; i++) {
        var tt = simT * i / N;
        var s2 = stateAt(tt);
        var x = gx + tt / TOTAL * gw;
        var y = tY(s2.T);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // 当前点
      var cx2 = gx + simT / TOTAL * gw, cy2 = tY(st.T);
      ctx.fillStyle = '#ff9c4a';
      ctx.beginPath();
      ctx.arc(cx2, cy2, 5, 0, Math.PI * 2);
      ctx.fill();
      // 平台标注
      ctx.fillStyle = 'rgba(242,179,86,.9)';
      ctx.font = '12px sans-serif';
      ctx.fillText('熔化平台（熔点 0℃）', gx + gw * (3 / TOTAL) * 0.55, tY(0) - 8);
      ctx.fillText('沸腾平台（沸点 100℃）', gx + gw * ((3 + 4 + 5) / TOTAL) * 0.72, tY(100) - 8);

      readout.querySelector('#pcT').textContent = '温度 = ' + st.T.toFixed(0) + ' ℃';
      readout.querySelector('#pcP').textContent = '状态：' + segName;
      readout.querySelector('#pcH').textContent = heating
        ? (st.seg.t0 === st.seg.t1 ? '吸热但温度不变！' : '吸热，温度升高')
        : (done ? '实验完成 ✓' : '点击“开始加热”');

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  return { init: init };
})();
