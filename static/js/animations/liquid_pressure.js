/* ============================================
   liquid_pressure.js —— 液体压强探测器
   U 形压强计 + 可上下移动的探头
   规律：p = ρgh，同一液体压强随深度增大；密度越大压强越大
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.liquid_pressure = (function () {
  var LIQUIDS = [
    { name: '酒精', rho: 0.8, color: '#d8c9ef' },
    { name: '水', rho: 1.0, color: '#7fb8d8' },
    { name: '盐水', rho: 1.1, color: '#7fd8c4' }
  ];

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="lpH">探头深度 h = 0 cm</span>' +
      '<span class="chip" id="lpP">压强 p = ρgh = 0 Pa</span>' +
      '<span class="chip" id="lpD">压强计液面差 = 0 格</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<label>液体 <select id="lpLiq"></select></label>' +
      '<label>探头深度 <input type="range" id="lpDepth" min="0" max="30" step="0.5" value="0"> <span id="lpDepthV">0 cm</span></label>' +
      '<span style="opacity:.85">也可以直接在杯中拖动探头</span>';
    stage.appendChild(ui);

    var sel = ui.querySelector('#lpLiq');
    LIQUIDS.forEach(function (l, i) {
      var op = document.createElement('option');
      op.value = i;
      op.textContent = l.name + '（ρ = ' + l.rho + ' g/cm³）';
      if (i === 1) op.selected = true;
      sel.appendChild(op);
    });

    var depth = 0;                 // cm（探头膜到液面距离）
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

    function geom() {
      var cupX = W * 0.10, cupW = W * 0.34;
      var waterTop = H * 0.30, bottom = H * 0.80;
      var pxPerCm = (bottom - waterTop - 16) / 30;   // 30 cm 满量程
      return { cupX: cupX, cupW: cupW, waterTop: waterTop, bottom: bottom, pxPerCm: pxPerCm };
    }

    function setDepth(v) {
      depth = Math.max(0, Math.min(30, v));
      ui.querySelector('#lpDepth').value = depth;
      ui.querySelector('#lpDepthV').textContent = depth.toFixed(1) + ' cm';
    }
    ui.querySelector('#lpDepth').addEventListener('input', function () { setDepth(parseFloat(this.value)); });
    sel.addEventListener('change', function () { });

    // 拖拽探头
    function probePos() {
      var g = geom();
      return { x: g.cupX + g.cupW * 0.55, y: g.waterTop + depth * g.pxPerCm };
    }
    canvas.addEventListener('mousedown', function (e) { if (nearProbe(e)) dragging = true; });
    canvas.addEventListener('touchstart', function (e) { if (nearProbe(e)) { dragging = true; e.preventDefault(); } }, { passive: false });
    window.addEventListener('mousemove', move);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('mouseup', function () { dragging = false; });
    window.addEventListener('touchend', function () { dragging = false; });
    function evY(e) {
      var r = canvas.getBoundingClientRect();
      var t = e.touches ? e.touches[0] : e;
      return t.clientY - r.top;
    }
    function nearProbe(e) {
      var p = probePos();
      return Math.abs(evY(e) - p.y) < 30;
    }
    function move(e) {
      if (!dragging) return;
      var g = geom();
      setDepth((evY(e) - g.waterTop) / g.pxPerCm);
      if (e.touches) e.preventDefault();
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var g = geom();
      var liq = LIQUIDS[+sel.value];

      // ---- 左侧：液体杯 ----
      ctx.fillStyle = liq.color + '66';
      ctx.fillRect(g.cupX, g.waterTop, g.cupW, g.bottom - g.waterTop);
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 3;
      ctx.strokeRect(g.cupX, g.waterTop - 6, g.cupW, g.bottom - g.waterTop + 10);
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(liq.name + ' ρ = ' + liq.rho + ' g/cm³', g.cupX + 8, g.waterTop + 20);

      // 深度刻度
      ctx.strokeStyle = 'rgba(217,232,213,.4)';
      ctx.lineWidth = 1;
      for (var c = 0; c <= 30; c += 10) {
        var y = g.waterTop + c * g.pxPerCm;
        ctx.beginPath();
        ctx.moveTo(g.cupX + g.cupW - 34, y);
        ctx.lineTo(g.cupX + g.cupW - 8, y);
        ctx.stroke();
        ctx.fillText(c + ' cm', g.cupX + g.cupW - 74, y + 4);
      }

      // ---- 探头 + 软管 ----
      var p = probePos();
      var manoX = W * 0.72;
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(p.x + 18, p.y);
      ctx.bezierCurveTo(p.x + 120, p.y, manoX - 80, H * 0.18, manoX, H * 0.20);
      ctx.stroke();
      // 探头（蒙皮圆盘）
      ctx.fillStyle = '#f2b356';
      ctx.strokeStyle = '#b98236';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#5c4318';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('探头', p.x, p.y + 4);

      // ---- 右侧：U 形压强计 ----
      var dh = depth * liq.rho * 0.9;            // 液面差“格数”（演示比例）
      var uTop = H * 0.22, uBot = H * 0.80;
      var lx = manoX - 34, rx = manoX + 34;
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(lx, uTop); ctx.lineTo(lx, uBot);
      ctx.arcTo(manoX, uBot + 20, rx, uBot, 30);
      ctx.lineTo(rx, uTop);
      ctx.stroke();
      // U 形管中红墨水：中位线 ± dh/2
      var midY = (uTop + uBot) / 2 + 20;
      var lLevel = midY + dh * 2.2;              // 左管下降
      var rLevel = midY - dh * 2.2;              // 右管上升
      ctx.strokeStyle = '#e2694f';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(lx, lLevel); ctx.lineTo(lx, uBot);
      ctx.arcTo(manoX, uBot + 20, rx, uBot, 30);
      ctx.lineTo(rx, rLevel);
      ctx.stroke();
      // 刻度格
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      for (var k = -5; k <= 5; k++) {
        var yy = midY + k * 14;
        ctx.strokeStyle = 'rgba(217,232,213,.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(rx + 14, yy);
        ctx.lineTo(rx + 26, yy);
        ctx.stroke();
      }
      ctx.fillText('U 形压强计', lx - 20, uTop - 10);

      // ---- 读数 ----
      var pPa = liq.rho * 1000 * 10 * (depth / 100);   // ρ g h
      readout.querySelector('#lpH').textContent = '探头深度 h = ' + depth.toFixed(1) + ' cm';
      readout.querySelector('#lpP').textContent = '压强 p = ρgh = ' + Math.round(pPa) + ' Pa';
      readout.querySelector('#lpD').textContent = '压强计液面差 = ' + dh.toFixed(1) + ' 格';

      requestAnimationFrame(draw);
    }

    requestAnimationFrame(draw);
  }

  return { init: init };
})();
