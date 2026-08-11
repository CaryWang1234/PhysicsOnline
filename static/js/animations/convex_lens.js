/* ============================================
   convex_lens.js —— 凸透镜成像实验室
   拖动蜡烛改变物距 u（f = 10 cm），
   实时成像：位置、大小、倒正、虚实 + 三条特殊光线
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.convex_lens = (function () {
  var F = 10;              // 焦距 cm
  var PX = 6.2;            // 每 cm 像素

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="clU">物距 u = 25 cm</span>' +
      '<span class="chip" id="clV">像距 v = -- cm</span>' +
      '<span class="chip" id="clP">像的性质：--</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<label>物距 u <input type="range" id="clSlider" min="4" max="45" step="0.5" value="25"> <span id="clSliderV">25 cm</span></label>' +
      '<span style="opacity:.85">提示：u=10cm 与 u=20cm 是两个重要分界点</span>';
    stage.appendChild(ui);

    var u = 25;
    var W = 0, H = 0, dpr = 1;
    var dragging = false;

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); });

    var slider = ui.querySelector('#clSlider');
    slider.addEventListener('input', function () { setU(parseFloat(slider.value)); });

    function setU(v) {
      u = Math.max(4, Math.min(45, v));
      slider.value = u;
      ui.querySelector('#clSliderV').textContent = u.toFixed(1) + ' cm';
    }

    function geom() {
      var axisY = H * 0.52;
      var lensX = W * 0.5;
      return { axisY: axisY, lensX: lensX };
    }

    // 拖拽蜡烛
    canvas.addEventListener('mousedown', function (e) { if (hitCandle(e)) dragging = true; });
    canvas.addEventListener('touchstart', function (e) { if (hitCandle(e)) { dragging = true; e.preventDefault(); } }, { passive: false });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', function () { dragging = false; });
    window.addEventListener('touchend', function () { dragging = false; });
    function evX(e) {
      var r = canvas.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return t.clientX - r.left;
    }
    function hitCandle(e) {
      var g = geom();
      var cx = g.lensX - u * PX;
      return Math.abs(evX(e) - cx) < 34;
    }
    function move(e) {
      if (!dragging) return;
      var g = geom();
      setU((g.lensX - evX(e)) / PX);
      if (e.touches) e.preventDefault();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var g = geom();
      var objH = 60;                        // 蜡烛（物）像素高度

      // 主光轴
      ctx.strokeStyle = 'rgba(217,232,213,.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(16, g.axisY); ctx.lineTo(W - 16, g.axisY);
      ctx.stroke();

      // 焦点/二倍焦点标记
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      [[-2, '2F'], [-1, 'F'], [1, 'F'], [2, '2F']].forEach(function (p) {
        var x = g.lensX + p[0] * F * PX;
        ctx.beginPath();
        ctx.arc(x, g.axisY, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f2b356';
        ctx.fill();
        ctx.fillStyle = '#d9e8d5';
        ctx.fillText(p[1], x, g.axisY + 22);
      });

      // 透镜
      ctx.strokeStyle = '#9fd0e8';
      ctx.fillStyle = 'rgba(159,208,232,.25)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(g.lensX, g.axisY, 12, 95, 0, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      // 箭头表示凸透镜
      ctx.beginPath();
      ctx.moveTo(g.lensX, g.axisY - 95); ctx.lineTo(g.lensX - 6, g.axisY - 85); ctx.moveTo(g.lensX, g.axisY - 95); ctx.lineTo(g.lensX + 6, g.axisY - 85);
      ctx.moveTo(g.lensX, g.axisY + 95); ctx.lineTo(g.lensX - 6, g.axisY + 85); ctx.moveTo(g.lensX, g.axisY + 95); ctx.lineTo(g.lensX + 6, g.axisY + 85);
      ctx.stroke();

      // 蜡烛（物）
      var objX = g.lensX - u * PX;
      drawCandle(objX, g.axisY, objH, false);

      // 成像计算
      var uEl = readout.querySelector('#clU');
      var vEl = readout.querySelector('#clV');
      var pEl = readout.querySelector('#clP');
      uEl.textContent = '物距 u = ' + u.toFixed(1) + ' cm';

      if (Math.abs(u - F) < 0.4) {
        vEl.textContent = '像距 v = ∞';
        pEl.textContent = 'u = f：不成像（出射光平行）';
        drawParallelRays(g, objX, objH);
      } else if (u > F) {
        var v = 1 / (1 / F - 1 / u);         // 实像像距
        var m = v / u;                        // 放大率
        var imgX = g.lensX + v * PX;
        var tipY = g.axisY + objH * m;        // 倒立，像尖在光轴下方
        // 特殊光线①：平行主光轴入射 → 折射后过焦点（必过像尖）
        drawRay(objX, g.axisY - objH, g.lensX, g.axisY - objH, '#ffe9b0');
        drawRay(g.lensX, g.axisY - objH, imgX, tipY, '#ffe9b0');
        // 特殊光线②：过光心方向不变（物尖-光心-像尖三点共线）
        drawRay(objX, g.axisY - objH, imgX, tipY, '#a8e6c7');
        drawScreen(imgX, g.axisY);
        drawImageArrow(imgX, g.axisY, objH * m, true);
        var kind = (u > 2 * F) ? '倒立、缩小的实像（照相机）'
          : (Math.abs(u - 2 * F) < 0.4 ? '倒立、等大的实像（u=2f）' : '倒立、放大的实像（投影仪）');
        vEl.textContent = '像距 v = ' + v.toFixed(1) + ' cm';
        pEl.textContent = kind;
      } else {
        // u < f：正立放大虚像（与物同侧）
        var v2 = 1 / (1 / u - 1 / F);        // 虚像距
        var m2 = v2 / u;
        var imgX2 = g.lensX - v2 * PX;
        var tipY2 = g.axisY - objH * m2;      // 正立，像尖在光轴上方
        // 光线①：平行入射 → 折射后过焦点；反向延长线（虚线）过虚像尖
        drawRay(objX, g.axisY - objH, g.lensX, g.axisY - objH, '#ffe9b0');
        var fx = g.lensX + F * PX;
        var ext = 1.4;   // 折射光延长系数
        drawRay(g.lensX, g.axisY - objH,
          g.lensX + (fx - g.lensX) * ext, (g.axisY - objH) + (g.axisY - (g.axisY - objH)) * ext, '#ffe9b0');
        ctx.setLineDash([6, 6]);
        drawRay(g.lensX, g.axisY - objH, imgX2, tipY2, 'rgba(255,233,176,.55)');
        // 光线②：过光心直线传播；反向延长线（虚线）过虚像尖
        drawRay(objX, g.axisY - objH, g.lensX + 170, g.axisY + 170 * objH / (g.lensX - objX), '#a8e6c7');
        drawRay(objX, g.axisY - objH, imgX2, tipY2, 'rgba(168,230,199,.55)');
        ctx.setLineDash([]);
        drawImageArrow(imgX2, g.axisY, objH * m2, false);
        vEl.textContent = '虚像距 = ' + v2.toFixed(1) + ' cm（同侧）';
        pEl.textContent = '正立、放大的虚像（放大镜）';
      }

      requestAnimationFrame(draw);
    }

    function drawRay(x1, y1, x2, y2, color) {
      if (color === 'transparent') return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    function drawParallelRays(g, objX, objH) {
      ctx.strokeStyle = '#ffe9b0';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(objX, g.axisY - objH);
      ctx.lineTo(W - 20, g.axisY - objH);
      ctx.stroke();
    }

    function drawCandle(x, axisY, h, isImage) {
      ctx.fillStyle = isImage ? 'rgba(242,179,86,.85)' : '#f2b356';
      ctx.fillRect(x - 7, axisY - h * 0.7, 14, h * 0.7);
      // 火焰
      ctx.fillStyle = '#ff9c4a';
      ctx.beginPath();
      ctx.ellipse(x, axisY - h * 0.82, 6, h * 0.18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('蜡烛', x, axisY + 18);
    }

    function drawImageArrow(x, axisY, h, inverted) {
      ctx.strokeStyle = 'rgba(127,216,160,.9)';
      ctx.fillStyle = 'rgba(127,216,160,.9)';
      ctx.lineWidth = 3;
      var tipY = inverted ? axisY + h : axisY - h;
      ctx.beginPath();
      ctx.moveTo(x, axisY); ctx.lineTo(x, tipY);
      ctx.stroke();
      var dir = inverted ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x, tipY + dir * 8);
      ctx.lineTo(x - 6, tipY);
      ctx.lineTo(x + 6, tipY);
      ctx.closePath();
      ctx.fill();
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(inverted ? '实像' : '虚像', x, inverted ? tipY + 24 : tipY - 12);
    }

    function drawScreen(x, axisY) {
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x, axisY - 100); ctx.lineTo(x, axisY + 100);
      ctx.stroke();
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('光屏', x, axisY + 118);
    }

    requestAnimationFrame(draw);
  }

  return { init: init };
})();
