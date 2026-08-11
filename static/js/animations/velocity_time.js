/* ============================================
   velocity_time.js —— 小车快慢实验室（八上·机械运动）
   滑块改变速度，小车匀速运动，
   实时绘制 v-t 图像（水平直线）并累计路程 s = v·t
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.velocity_time = (function () {
  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="vtV">速度 v = 3.0 m/s</span>' +
      '<span class="chip" id="vtT">时间 t = 0.0 s</span>' +
      '<span class="chip" id="vtS">路程 s = v·t = 0.0 m</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<label>小车速度 <input type="range" id="vtSlider" min="0" max="10" step="0.5" value="3"> <span id="vtSliderV">3.0 m/s</span></label>' +
      '<button type="button" id="vtPause">⏸ 暂停</button>' +
      '<button type="button" id="vtReset">↺ 重新计时</button>';
    stage.appendChild(ui);

    var v = 3, t = 0, paused = false;
    var carX = 0;
    var trail = [];            // v-t 图像采样
    var last = performance.now();

    var slider = ui.querySelector('#vtSlider');
    slider.addEventListener('input', function () {
      v = parseFloat(slider.value);
      ui.querySelector('#vtSliderV').textContent = v.toFixed(1) + ' m/s';
    });
    ui.querySelector('#vtPause').addEventListener('click', function () {
      paused = !paused;
      this.textContent = paused ? '▶ 继续' : '⏸ 暂停';
    });
    ui.querySelector('#vtReset').addEventListener('click', function () {
      t = 0; carX = 0; trail = [];
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

    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!paused) {
        t += dt;
        carX += v * 42 * dt;                     // 像素速度
        var trackW = W - 40;
        if (carX > trackW + 60) { carX = -50; }  // 循环跑圈
        if (t % 0.2 < dt) trail.push({ t: t, v: v });
        if (trail.length > 300) trail.shift();
      }

      ctx.clearRect(0, 0, W, H);

      // ---- 上半：跑道与小车 ----
      var trackY = H * 0.30;
      ctx.strokeStyle = 'rgba(217,232,213,.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, trackY + 26);
      ctx.lineTo(W - 20, trackY + 26);
      ctx.stroke();
      // 跑道刻度
      ctx.fillStyle = 'rgba(217,232,213,.55)';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      for (var i = 0; i <= 10; i++) {
        var x = 20 + i * (W - 40) / 10;
        ctx.fillRect(x, trackY + 26, 2, 8);
      }
      drawCar(20 + carX, trackY);

      // ---- 下半：v-t 图像 ----
      var gx = 70, gy = H * 0.90, gw = W - 110, gh = H * 0.38;
      ctx.strokeStyle = '#d9e8d5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(gx, gy - gh - 10); ctx.lineTo(gx, gy); ctx.lineTo(gx + gw, gy);
      ctx.stroke();
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('v/(m/s)', gx - 54, gy - gh - 2);
      ctx.fillText('t/s', gx + gw - 20, gy + 18);
      // 纵轴刻度 0/5/10
      [0, 5, 10].forEach(function (vv) {
        var y = gy - vv / 10 * gh;
        ctx.fillText(vv, gx - 22, y + 4);
        ctx.strokeStyle = 'rgba(217,232,213,.2)';
        ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx + gw, y); ctx.stroke();
      });
      // 轨迹线
      if (trail.length > 1) {
        var t0 = trail[0].t, tMax = Math.max(t0 + 10, t);
        ctx.strokeStyle = '#f2b356';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        trail.forEach(function (p, i) {
          var x = gx + (p.t - t0) / (tMax - t0) * gw;
          var y = gy - p.v / 10 * gh;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      readout.querySelector('#vtV').textContent = '速度 v = ' + v.toFixed(1) + ' m/s';
      readout.querySelector('#vtT').textContent = '时间 t = ' + t.toFixed(1) + ' s';
      readout.querySelector('#vtS').textContent = '路程 s = v·t = ' + (v * t).toFixed(1) + ' m';

      requestAnimationFrame(loop);
    }

    function drawCar(x, y) {
      if (x < -60 || x > W + 60) return;
      ctx.fillStyle = '#7fd8a0';
      ctx.strokeStyle = '#4d8a5c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 30, y + 20);
      ctx.lineTo(x - 30, y + 4);
      ctx.lineTo(x - 12, y + 4);
      ctx.lineTo(x - 4, y - 10);
      ctx.lineTo(x + 16, y - 10);
      ctx.lineTo(x + 24, y + 4);
      ctx.lineTo(x + 30, y + 4);
      ctx.lineTo(x + 30, y + 20);
      ctx.closePath();
      ctx.fill(); ctx.stroke();
      // 轮子
      ctx.fillStyle = '#3b4a3f';
      ctx.beginPath();
      ctx.arc(x - 16, y + 22, 7, 0, Math.PI * 2);
      ctx.arc(x + 16, y + 22, 7, 0, Math.PI * 2);
      ctx.fill();
      // 速度线
      if (v > 0.2 && !paused) {
        ctx.strokeStyle = 'rgba(255,233,176,.6)';
        ctx.lineWidth = 2;
        for (var k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.moveTo(x - 40 - k * 12 - v * 2, y + k * 8 - 4);
          ctx.lineTo(x - 34 - v * 2, y + k * 8 - 4);
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(loop);
  }

  return { init: init };
})();
