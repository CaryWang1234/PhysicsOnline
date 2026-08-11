/* ============================================
   inertia.js —— 运动和力综合演示（八上第5章）
   模式一·小车滑行：同一初速度在不同粗糙程度表面滑行
     阻力越小滑得越远 → 推理：无阻力将永远运动下去
   模式二·力的合成：调节两个同一直线上的力，求合力
     同向 F=F₁+F₂；反向 F=|F₁-F₂|，方向与大力相同
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.inertia = (function () {
  var SURFACES = [
    { name: '毛巾表面', mu: 2.2, color: '#b98d5a' },
    { name: '棉布表面', mu: 1.2, color: '#9d8ec7' },
    { name: '木板表面', mu: 0.5, color: '#f2e3c2' },
    { name: '理想光滑面', mu: 0, color: '#9fd0e8' }
  ];

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    stage.appendChild(ui);

    var W = 0, H = 0, dpr = 1;
    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); });

    var mode = 'slide';   // slide | compose
    buildSlideUI();
    setMode('slide');

    function setMode(m) {
      mode = m;
      ui.querySelectorAll('.mode-btn').forEach(function (b) {
        var on = b.getAttribute('data-mode') === m;
        b.style.background = on ? '#6fae7c' : '';
        b.style.color = on ? '#fff' : '';
      });
      if (m === 'slide') initSlide(); else initCompose();
    }

    /* ================= 模式一：小车滑行 ================= */
    var V0 = 5, PX = 34;
    var surface = 0, cartX = 0, cartV = 0, sliding = false;
    var best = [null, null, null, null];
    var btnWrap = null;

    function buildSlideUI() {
      readout.innerHTML =
        '<span class="chip" id="inD">滑行距离 = 0.0 m</span>' +
        '<span class="chip" id="inV">当前速度 = 0.0 m/s</span>' +
        '<span class="chip" id="inC">选择一个表面，让小车滑出去！</span>';
      ui.innerHTML =
        '<button type="button" class="mode-btn" data-mode="slide">🛞 小车滑行</button>' +
        '<button type="button" class="mode-btn" data-mode="compose">🧮 力的合成</button>' +
        '<span id="inBtns"></span>' +
        '<span style="opacity:.85">每次小车都从同一斜面、同一高度滑下（初速度相同）</span>';
      ui.querySelectorAll('.mode-btn').forEach(function (b) {
        b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
      });
      btnWrap = ui.querySelector('#inBtns');
      SURFACES.forEach(function (s, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = s.name;
        b.addEventListener('click', function () { launch(i); });
        btnWrap.appendChild(b);
      });
    }

    function launch(i) { surface = i; cartX = 0; cartV = V0; sliding = true; }

    function initSlide() {
      buildSlideUI();
      setModeStyle();
      cartX = 0; cartV = 0; sliding = false;
    }

    function trackX0() { return 130; }
    function trackY() { return H * 0.62; }

    function drawSlide(dt) {
      if (sliding) {
        var sf = SURFACES[surface];
        cartV -= sf.mu * 2.0 * dt;
        if (cartV <= 0) { cartV = 0; sliding = false; }
        cartX += cartV * dt;
        best[surface] = Math.max(best[surface] || 0, cartX);
        if (cartX * PX > W - trackX0() - 60 && sf.mu === 0) cartX = 0;
      }

      var ty = trackY(), x0 = trackX0();
      var s = SURFACES[surface];

      // 斜面
      ctx.fillStyle = '#8fa597';
      ctx.beginPath();
      ctx.moveTo(x0 - 90, ty - 74);
      ctx.lineTo(x0, ty);
      ctx.lineTo(x0 - 90, ty);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('同一高度', x0 - 60, ty - 82);

      // 水平面
      ctx.fillStyle = s.color;
      ctx.fillRect(x0, ty, W - x0 - 20, 14);
      ctx.strokeStyle = 'rgba(0,0,0,.2)';
      ctx.strokeRect(x0, ty, W - x0 - 20, 14);
      ctx.fillStyle = '#d9e8d5';
      ctx.textAlign = 'left';
      ctx.font = '13px sans-serif';
      ctx.fillText(s.name, x0 + 8, ty + 34);

      // 距离刻度
      ctx.fillStyle = 'rgba(217,232,213,.5)';
      for (var m = 0; m <= 12; m++) {
        var xx = x0 + m * PX;
        if (xx > W - 30) break;
        ctx.fillRect(xx, ty + 14, 2, 7);
        ctx.font = '10px sans-serif';
        ctx.fillText(m + 'm', xx + 2, ty + 30);
      }

      // 小车
      var cx = x0 + cartX * PX;
      ctx.fillStyle = '#7fd8a0';
      ctx.strokeStyle = '#4d8a5c';
      ctx.lineWidth = 2;
      ctx.fillRect(cx - 26, ty - 22, 52, 18);
      ctx.strokeRect(cx - 26, ty - 22, 52, 18);
      ctx.fillStyle = '#3b4a3f';
      ctx.beginPath();
      ctx.arc(cx - 14, ty - 2, 6, 0, Math.PI * 2);
      ctx.arc(cx + 14, ty - 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // 最远距离标记
      if (best[surface] !== null && !sliding) {
        var bx2 = x0 + best[surface] * PX;
        ctx.strokeStyle = '#f2b356';
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(bx2, ty - 46);
        ctx.lineTo(bx2, ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#f2b356';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('最远 ' + best[surface].toFixed(1) + ' m', bx2, ty - 54);
      }

      readout.querySelector('#inD').textContent = '滑行距离 = ' + cartX.toFixed(1) + ' m';
      readout.querySelector('#inV').textContent = '当前速度 = ' + cartV.toFixed(1) + ' m/s';
      var cEl = readout.querySelector('#inC');
      if (surface === 3 && sliding) {
        cEl.textContent = '✨ 推理：若不受阻力，小车将以 ' + V0 + ' m/s 永远运动下去！';
      } else if (!sliding && cartX > 0) {
        cEl.textContent = '阻力越小，小车滑得越远——运动不需要力来维持';
      } else if (!sliding) {
        cEl.textContent = '选择一个表面，让小车滑出去！';
      }
    }

    /* ================= 模式二：力的合成 ================= */
    var F1 = 6, F2 = 4, sameDir = true;
    var boxX = 0, boxV = 0;

    function buildComposeUI() {
      readout.innerHTML =
        '<span class="chip" id="cpF1">F₁ = 6.0 N →</span>' +
        '<span class="chip" id="cpF2">F₂ = 4.0 N →</span>' +
        '<span class="chip" id="cpR">合力 F = 10.0 N，方向向右</span>';
      ui.innerHTML =
        '<button type="button" class="mode-btn" data-mode="slide">🛞 小车滑行</button>' +
        '<button type="button" class="mode-btn" data-mode="compose">🧮 力的合成</button>' +
        '<label>F₁ <input type="range" id="cpS1" min="0" max="10" step="0.5" value="6"> <span id="cpV1">6.0 N</span></label>' +
        '<label>F₂ <input type="range" id="cpS2" min="0" max="10" step="0.5" value="4"> <span id="cpV2">4.0 N</span></label>' +
        '<button type="button" id="cpDir">🔁 切换：同向 / 反向</button>';
      ui.querySelectorAll('.mode-btn').forEach(function (b) {
        b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
      });
      ui.querySelector('#cpS1').addEventListener('input', function () { F1 = parseFloat(this.value); boxV = 0; boxX = 0; });
      ui.querySelector('#cpS2').addEventListener('input', function () { F2 = parseFloat(this.value); boxV = 0; boxX = 0; });
      ui.querySelector('#cpDir').addEventListener('click', function () { sameDir = !sameDir; boxV = 0; boxX = 0; });
    }

    function initCompose() {
      buildComposeUI();
      setModeStyle();
      boxX = 0; boxV = 0;
    }

    function drawCompose(dt) {
      var R = sameDir ? F1 + F2 : F1 - F2;          // 合力（右为正）
      var rMag = Math.abs(R);

      // 地面
      var ty = H * 0.62;
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(30, ty + 16);
      ctx.lineTo(W - 30, ty + 16);
      ctx.stroke();

      // 物体随合力加速滑动（演示）
      boxV += R * 0.25 * dt;
      boxV *= 0.995;
      boxX += boxV * 8 * dt;
      var span = W - 220;
      if (boxX > span / 2) { boxX = span / 2; boxV = 0; }
      if (boxX < -span / 2) { boxX = -span / 2; boxV = 0; }
      var cx = W / 2 + boxX;

      // 物体
      ctx.fillStyle = '#f5e3c0';
      ctx.strokeStyle = '#b98d5a';
      ctx.lineWidth = 2.5;
      roundRect(cx - 40, ty - 44, 80, 60, 10);
      ctx.fill(); ctx.stroke();

      // 两个分力箭头
      drawForceArrow(cx - 40, ty - 14, -1, F2, '#9ec9f0', 'F₂');
      drawForceArrow(cx + 40, ty - 14, 1, F1, '#8fd0a0', 'F₁');

      // 合力箭头（物体上方）
      if (rMag > 0.05) {
        drawForceArrow(cx, ty - 88, R > 0 ? 1 : -1, rMag, '#f2b356', 'F合');
      } else {
        ctx.fillStyle = '#d9e8d5';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('F合 = 0，二力平衡', cx, ty - 96);
      }

      // 公式
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'left';
      var formula = sameDir
        ? '同一直线·同向：F合 = F₁ + F₂ = ' + F1.toFixed(1) + ' + ' + F2.toFixed(1) + ' = ' + (F1 + F2).toFixed(1) + ' N'
        : '同一直线·反向：F合 = |F₁ − F₂| = |' + F1.toFixed(1) + ' − ' + F2.toFixed(1) + '| = ' + rMag.toFixed(1) + ' N' +
          (rMag > 0.05 ? '，方向与 ' + (F1 >= F2 ? 'F₁' : 'F₂') + ' 相同' : '，二力平衡');
      ctx.fillText(formula, 30, 40);
      ctx.font = '13px sans-serif';
      ctx.fillText('物体沿合力方向加速运动（演示效果）', 30, 62);

      readout.querySelector('#cpF1').textContent = 'F₁ = ' + F1.toFixed(1) + ' N →';
      readout.querySelector('#cpF2').textContent = 'F₂ = ' + F2.toFixed(1) + ' N ' + (sameDir ? '→' : '←');
      readout.querySelector('#cpR').textContent = rMag < 0.05
        ? '合力 F = 0 N（二力平衡）'
        : '合力 F = ' + rMag.toFixed(1) + ' N，方向向' + (R > 0 ? '右' : '左');
      ui.querySelector('#cpV1').textContent = F1.toFixed(1) + ' N';
      ui.querySelector('#cpV2').textContent = F2.toFixed(1) + ' N';
    }

    function drawForceArrow(x, y, dir, F, color, label) {
      if (F <= 0.05) return;
      var len = 30 + F * 9;
      var tipX = x + dir * len;
      ctx.strokeStyle = color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tipX, y);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(tipX + dir * 12, y);
      ctx.lineTo(tipX, y - 8);
      ctx.lineTo(tipX, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label + '=' + F.toFixed(1) + 'N', x + dir * len / 2, y - 14);
    }

    /* ================= 主循环 ================= */
    function setModeStyle() {
      ui.querySelectorAll('.mode-btn').forEach(function (b) {
        var on = b.getAttribute('data-mode') === mode;
        b.style.background = on ? '#6fae7c' : '';
        b.style.color = on ? '#fff' : '';
      });
    }

    var last = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);
      if (mode === 'slide') drawSlide(dt); else drawCompose(dt);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    function roundRect(x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }
  }

  return { init: init };
})();
