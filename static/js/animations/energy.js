/* ============================================
   energy.js —— 滚摆与能量转化观察器（八下·功和机械能）
   释放滚摆：高处势能大 → 下落势能转动能 → 低处动能最大
   能量条实时显示 Ek / Ep 的转化，机械能总量（近似）守恒
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.energy = (function () {
  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="enH">高度：最高点</span>' +
      '<span class="chip" id="enEk">动能 Ek ▮ 0%</span>' +
      '<span class="chip" id="enEp">势能 Ep ▮ 100%</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<button type="button" id="enGo">🖐 释放滚摆</button>' +
      '<button type="button" id="enStop">✋ 拉回顶端</button>' +
      '<span style="opacity:.85">观察：下降时势能→动能，上升时动能→势能</span>';
    stage.appendChild(ui);

    var theta0 = 1.15;             // 初始摆角（rad）
    var theta = theta0;            // 当前摆角
    var t = 0;
    var running = false;
    var OMEGA = 1.9;               // 角频率（演示用）

    ui.querySelector('#enGo').addEventListener('click', function () { running = true; });
    ui.querySelector('#enStop').addEventListener('click', function () { running = false; t = 0; theta = theta0; });

    var W = 0, H = 0, dpr = 1;
    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); });

    var last = performance.now();
    function loop(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (running) t += dt;
      theta = running ? theta0 * Math.cos(OMEGA * t) : theta0;

      ctx.clearRect(0, 0, W, H);

      var px = W * 0.38, py = H * 0.14;        // 悬挂点
      var L = H * 0.52;                        // 摆长
      var bx = px + L * Math.sin(theta);
      var by = py + L * Math.cos(theta);

      // 支架
      ctx.strokeStyle = '#b98d5a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(px - 70, py); ctx.lineTo(px + 70, py);
      ctx.stroke();

      // 摆线
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py); ctx.lineTo(bx, by);
      ctx.stroke();

      // 滚摆圆盘
      var grad = ctx.createRadialGradient(bx - 8, by - 8, 4, bx, by, 34);
      grad.addColorStop(0, '#ffd28a');
      grad.addColorStop(1, '#f2b356');
      ctx.fillStyle = grad;
      ctx.strokeStyle = '#b98236';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(bx, by, 32, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // 转动指示线（随摆动旋转，模拟滚摆自转）
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(t * OMEGA * 3);
      ctx.strokeStyle = 'rgba(92,67,24,.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-22, 0); ctx.lineTo(22, 0);
      ctx.moveTo(0, -22); ctx.lineTo(0, 22);
      ctx.stroke();
      ctx.restore();

      // 最低点参考线
      var lowY = py + L;
      ctx.strokeStyle = 'rgba(217,232,213,.3)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(px - 150, lowY + 34);
      ctx.lineTo(px + 150, lowY + 34);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(217,232,213,.6)';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('最低点：动能最大', px, lowY + 54);

      // 能量条（右侧）
      var hFrac = (lowY - by) / (L * (1 - Math.cos(theta0)));   // 相对高度 0~1
      hFrac = Math.max(0, Math.min(1, hFrac));
      var ep = hFrac, ek = 1 - hFrac;
      drawBar(W * 0.72, H * 0.22, '动能 Ek', ek, '#7fd8a0');
      drawBar(W * 0.72, H * 0.46, '势能 Ep', ep, '#7fb8d8');
      drawBar(W * 0.72, H * 0.70, '机械能总量', 1, '#f2b356');

      // 转化方向提示
      ctx.fillStyle = '#ffe9b0';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      if (!running) {
        ctx.fillText('点“释放滚摆”开始实验', W * 0.5, H * 0.92);
      } else {
        var goingDown = Math.abs(theta) > 0.05 && ((theta > 0 && Math.sin(OMEGA * t) > 0) || (theta < 0 && Math.sin(OMEGA * t) < 0));
        ctx.fillText(goingDown ? '⬇ 下降：重力势能 → 动能' : '⬆ 上升：动能 → 重力势能', W * 0.5, H * 0.92);
      }

      readout.querySelector('#enH').textContent = '相对高度 = ' + Math.round(hFrac * 100) + '%';
      readout.querySelector('#enEk').textContent = '动能 Ek ▮ ' + Math.round(ek * 100) + '%';
      readout.querySelector('#enEp').textContent = '势能 Ep ▮ ' + Math.round(ep * 100) + '%';

      requestAnimationFrame(loop);
    }

    function drawBar(x, y, label, frac, color) {
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x, y - 8);
      ctx.fillStyle = 'rgba(255,255,255,.14)';
      ctx.fillRect(x, y, 190, 22);
      ctx.fillStyle = color;
      ctx.fillRect(x, y, 190 * frac, 22);
      ctx.strokeStyle = 'rgba(217,232,213,.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, 190, 22);
    }

    requestAnimationFrame(loop);
  }

  return { init: init };
})();
