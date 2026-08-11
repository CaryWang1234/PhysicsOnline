/* ============================================
   plane_mirror.js —— 平面镜成像实验
   拖动蜡烛，像始终与物等大、到镜面距离相等
   展示对称连线与距离读数，验证平面镜成像特点
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.plane_mirror = (function () {
  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="pmDo">物到镜面距离 = 0 cm</span>' +
      '<span class="chip" id="pmDi">像到镜面距离 = 0 cm</span>' +
      '<span class="chip" id="pmEq">像与物大小相等 ✓</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML = '<span>👉 按住蜡烛左右拖动，观察像的变化；像总是与物关于镜面对称。</span>';
    stage.appendChild(ui);

    var W = 0, H = 0, dpr = 1;
    var objX = 0;                       // 蜡烛 x
    var PX = 6;                         // 每 cm 像素
    var dragging = false;

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      objX = mirrorX() - 18 * PX;
    }
    fit();
    window.addEventListener('resize', function () { fit(); });

    function mirrorX() { return W * 0.5; }
    function baseY() { return H * 0.78; }

    canvas.addEventListener('mousedown', function (e) { if (hit(e)) dragging = true; });
    canvas.addEventListener('touchstart', function (e) { if (hit(e)) { dragging = true; e.preventDefault(); } }, { passive: false });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', function () { dragging = false; });
    window.addEventListener('touchend', function () { dragging = false; });
    function evX(e) {
      var r = canvas.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return t.clientX - r.left;
    }
    function hit(e) { return Math.abs(evX(e) - objX) < 40; }
    function move(e) {
      if (!dragging) return;
      objX = Math.max(30, Math.min(mirrorX() - 2 * PX, evX(e)));
      if (e.touches) e.preventDefault();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var mx = mirrorX(), by = baseY();
      var imgX = mx + (mx - objX);      // 对称像位置

      // 桌面
      ctx.strokeStyle = '#8fa597';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(20, by);
      ctx.lineTo(W - 20, by);
      ctx.stroke();

      // 玻璃板（镜面）
      ctx.fillStyle = 'rgba(159,208,232,.30)';
      ctx.fillRect(mx - 6, H * 0.16, 12, by - H * 0.16);
      ctx.strokeStyle = '#9fd0e8';
      ctx.lineWidth = 2;
      ctx.strokeRect(mx - 6, H * 0.16, 12, by - H * 0.16);
      ctx.fillStyle = '#9fd0e8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('玻璃板（镜面）', mx, H * 0.13);

      // 对称连线（虚线）
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(255,233,176,.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(objX, by - 66);
      ctx.lineTo(imgX, by - 66);
      ctx.stroke();
      ctx.setLineDash([]);
      // 垂直标记
      ctx.fillStyle = '#ffe9b0';
      ctx.font = '12px sans-serif';
      ctx.fillText('⊥', mx, by - 74);

      // 蜡烛（物）
      drawCandle(objX, by, 1, false);
      // 像（半透明、左右翻转效果用透明度表示“虚像”）
      drawCandle(imgX, by, 1, true);

      // 距离标注
      var dCm = (mx - objX) / PX;
      drawDim(objX, mx, by + 26, dCm.toFixed(1) + ' cm', '#f2b356');
      drawDim(mx, imgX, by + 26, dCm.toFixed(1) + ' cm', '#7fd8a0');

      readout.querySelector('#pmDo').textContent = '物到镜面距离 = ' + dCm.toFixed(1) + ' cm';
      readout.querySelector('#pmDi').textContent = '像到镜面距离 = ' + dCm.toFixed(1) + ' cm';
      readout.querySelector('#pmEq').textContent = '像与物大小相等，连线⊥镜面 ✓';

      requestAnimationFrame(draw);
    }

    function drawCandle(x, by, scale, isImage) {
      ctx.save();
      ctx.globalAlpha = isImage ? 0.45 : 1;
      // 烛身
      ctx.fillStyle = '#f2b356';
      ctx.fillRect(x - 10, by - 58, 20, 58);
      // 火焰
      ctx.fillStyle = '#ff9c4a';
      ctx.beginPath();
      ctx.ellipse(x, by - 70, 8, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffe9b0';
      ctx.beginPath();
      ctx.ellipse(x, by - 68, 4, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      // 标签
      ctx.fillStyle = isImage ? '#d9e8d5' : '#ffe9b0';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isImage ? '像（虚像）' : '蜡烛（物）', x, by + 18);
      ctx.restore();
    }

    function drawDim(x1, x2, y, text, color) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x1, y); ctx.lineTo(x2, y);
      ctx.moveTo(x1, y - 5); ctx.lineTo(x1, y + 5);
      ctx.moveTo(x2, y - 5); ctx.lineTo(x2, y + 5);
      ctx.stroke();
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(text, (x1 + x2) / 2, y + 22);
    }

    requestAnimationFrame(draw);
  }

  return { init: init };
})();
