/* ============================================
   lever.js —— 杠杆平衡调节台（F₁l₁ = F₂l₂）
   左右两侧各可调：钩码个数（力）、悬挂格数（力臂）
   杠杆倾角平滑动画，平衡时水平
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.lever = (function () {
  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="lvL">左侧 F₁l₁ = 0</span>' +
      '<span class="chip" id="lvR">右侧 F₂l₂ = 0</span>' +
      '<span class="chip" id="lvS">状态：调节中…</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<label>左钩码数 <input type="range" id="lvFN1" min="0" max="6" step="1" value="2"> <span id="lvFN1v">2</span></label>' +
      '<label>左力臂(格) <input type="range" id="lvL1" min="1" max="5" step="1" value="3"> <span id="lvL1v">3</span></label>' +
      '<label>右钩码数 <input type="range" id="lvFN2" min="0" max="6" step="1" value="3"> <span id="lvFN2v">3</span></label>' +
      '<label>右力臂(格) <input type="range" id="lvL2" min="1" max="5" step="1" value="2"> <span id="lvL2v">2</span></label>';
    stage.appendChild(ui);

    var W = 0, H = 0, dpr = 1;
    var angle = 0;                     // 当前倾角（弧度）
    var state = { f1: 2, l1: 3, f2: 3, l2: 2 };   // 每个钩码 1 N，每格 5 cm

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); });

    ['lvFN1', 'lvL1', 'lvFN2', 'lvL2'].forEach(function (id) {
      var el = ui.querySelector('#' + id);
      el.addEventListener('input', function () {
        ui.querySelector('#' + id + 'v').textContent = el.value;
        state = {
          f1: +ui.querySelector('#lvFN1').value,
          l1: +ui.querySelector('#lvL1').value,
          f2: +ui.querySelector('#lvFN2').value,
          l2: +ui.querySelector('#lvL2').value
        };
      });
    });

    var CELL = 46;   // 每格像素

    function targetAngle() {
      var t = state.f1 * state.l1 - state.f2 * state.l2;  // 力矩差
      return Math.max(-0.35, Math.min(0.35, t * 0.06));   // 左力矩大 → 左端下沉
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, cy = H * 0.42;

      // 支架
      ctx.fillStyle = '#b98d5a';
      ctx.beginPath();
      ctx.moveTo(cx - 46, H * 0.78);
      ctx.lineTo(cx + 46, H * 0.78);
      ctx.lineTo(cx, cy + 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#8fa597';
      ctx.fillRect(cx - 70, H * 0.78, 140, 10);

      // 目标倾角缓动
      var ta = targetAngle();
      angle += (ta - angle) * 0.08;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);

      // 杠杆杆身
      ctx.fillStyle = '#f2e3c2';
      ctx.strokeStyle = '#b98d5a';
      ctx.lineWidth = 2;
      roundRect(-5.4 * CELL, -9, 10.8 * CELL, 18, 8);
      ctx.fill(); ctx.stroke();

      // 刻度格
      ctx.fillStyle = '#5c4318';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      for (var i = -5; i <= 5; i++) {
        ctx.strokeStyle = '#8a6a2f';
        ctx.beginPath();
        ctx.moveTo(i * CELL, -9);
        ctx.lineTo(i * CELL, 9);
        ctx.stroke();
        if (i !== 0) ctx.fillText(Math.abs(i), i * CELL, 4);
      }

      // 左右钩码串
      drawWeights(-state.l1 * CELL, state.f1, '#f2b356');
      drawWeights(state.l2 * CELL, state.f2, '#7fb8d8');

      ctx.restore();

      // 支点
      ctx.fillStyle = '#e2694f';
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.fill();

      // 水平参考虚线
      ctx.strokeStyle = 'rgba(217,232,213,.35)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(cx - 5.6 * CELL, cy);
      ctx.lineTo(cx + 5.6 * CELL, cy);
      ctx.stroke();
      ctx.setLineDash([]);

      // 读数
      var m1 = state.f1 * state.l1, m2 = state.f2 * state.l2;
      readout.querySelector('#lvL').textContent = '左侧 F₁l₁ = ' + state.f1 + 'N × ' + state.l1 + '格 = ' + m1;
      readout.querySelector('#lvR').textContent = '右侧 F₂l₂ = ' + state.f2 + 'N × ' + state.l2 + '格 = ' + m2;
      var sEl = readout.querySelector('#lvS');
      if (m1 === m2) { sEl.textContent = '✅ 平衡！F₁l₁ = F₂l₂'; sEl.className = 'chip'; }
      else if (m1 > m2) { sEl.textContent = '⬇ 左端下沉（左力矩更大）'; sEl.className = 'chip warn'; }
      else { sEl.textContent = '⬇ 右端下沉（右力矩更大）'; sEl.className = 'chip warn'; }

      requestAnimationFrame(draw);
    }

    function drawWeights(x, n, color) {
      if (n <= 0) return;
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 9);
      ctx.lineTo(x, 26);
      ctx.stroke();
      for (var k = 0; k < n; k++) {
        var y = 26 + k * 15;
        ctx.fillStyle = color;
        ctx.strokeStyle = 'rgba(0,0,0,.25)';
        roundRect(x - 17, y, 34, 12, 4);
        ctx.fill(); ctx.stroke();
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

    requestAnimationFrame(draw);
  }

  return { init: init };
})();
