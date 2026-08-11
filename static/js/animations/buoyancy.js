/* ============================================
   buoyancy.js —— 阿基米德浮力实验室
   选择不同密度的物块放入水中，观察上浮/悬浮/下沉
   实时显示 G、F浮 = ρ液 g V排 与浮沉状态
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.buoyancy = (function () {
  var RHO_WATER = 1.0;               // 水密度 g/cm³
  var MATERIALS = [
    { name: '木块', rho: 0.6, color: '#c98d4b' },
    { name: '冰块', rho: 0.9, color: '#bfe3f0' },
    { name: '塑料块', rho: 1.05, color: '#9d8ec7' },
    { name: '铝块', rho: 2.7, color: '#aebac2' },
    { name: '铁块', rho: 7.9, color: '#7a8288' }
  ];

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="buG">G = 0 N</span>' +
      '<span class="chip" id="buF">F浮 = 0 N</span>' +
      '<span class="chip" id="buS">状态：等待投放</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML = '<label>选择物块 <select id="buMat"></select></label>' +
      '<button type="button" id="buDrop">🫳 放入水中</button>' +
      '<span id="buInfo" style="opacity:.85"></span>';
    stage.appendChild(ui);

    var sel = ui.querySelector('#buMat');
    MATERIALS.forEach(function (m, i) {
      var op = document.createElement('option');
      op.value = i;
      op.textContent = m.name + '（ρ = ' + m.rho + ' g/cm³）';
      sel.appendChild(op);
    });

    var W = 0, H = 0, dpr = 1;
    var obj = null;   // { rho, color, y(物块顶 y), vy, settled }

    var V = 200;      // 物块体积 cm³（固定）
    var SIZE = 56;    // 物块像素边长

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); });

    ui.querySelector('#buDrop').addEventListener('click', drop);
    sel.addEventListener('change', drop);

    function geom() {
      var waterTop = H * 0.42;
      var bottom = H * 0.86;
      var tankX = W * 0.30, tankW = W * 0.40;
      return { waterTop: waterTop, bottom: bottom, tankX: tankX, tankW: tankW };
    }

    function drop() {
      var m = MATERIALS[+sel.value];
      var g = geom();
      obj = { rho: m.rho, color: m.color, name: m.name, y: g.waterTop - 150, vy: 0 };
    }

    function physics() {
      if (!obj) return;
      var g = geom();
      var sub = submergeDepth();              // 浸入深度 px
      var frac = Math.max(0, Math.min(1, sub / SIZE));   // V排/V物

      // 合力：重力向下，浮力向上（按密度比例）
      var a = 0.16 * (obj.rho - RHO_WATER * frac) / obj.rho;
      obj.vy += a;
      obj.vy *= 0.94;                         // 液体阻力
      obj.y += obj.vy;

      // 底部碰撞
      if (obj.y + SIZE > g.bottom) { obj.y = g.bottom - SIZE; obj.vy = 0; }
      // 漂浮平衡位置钳制（防止抖动）
      if (obj.rho <= RHO_WATER) {
        var eq = g.waterTop - SIZE * (1 - obj.rho / RHO_WATER);
        if (obj.y < eq - 0.5 && Math.abs(obj.vy) < 0.3 && obj.y > g.waterTop - SIZE) {
          obj.y += (eq - obj.y) * 0.1;
        }
      }
    }

    function submergeDepth() {
      var g = geom();
      if (!obj) return 0;
      return Math.max(0, Math.min(SIZE, obj.y + SIZE - g.waterTop));
    }

    function draw() {
      physics();
      ctx.clearRect(0, 0, W, H);
      var g = geom();

      // 水箱
      ctx.fillStyle = 'rgba(127,184,216,.35)';
      ctx.fillRect(g.tankX, g.waterTop, g.tankW, g.bottom - g.waterTop);
      ctx.strokeStyle = '#9fb8c6';
      ctx.lineWidth = 3;
      ctx.strokeRect(g.tankX, g.waterTop - 4, g.tankW, g.bottom - g.waterTop + 8);

      // 水面波浪线
      ctx.strokeStyle = '#bfe3f0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      var t = Date.now() / 600;
      for (var x = 0; x <= g.tankW; x += 6) {
        var yy = g.waterTop + Math.sin(x / 22 + t) * 2;
        if (x === 0) ctx.moveTo(g.tankX + x, yy); else ctx.lineTo(g.tankX + x, yy);
      }
      ctx.stroke();
      ctx.fillStyle = '#bfe3f0';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('水 ρ = 1.0 g/cm³', g.tankX + 8, g.waterTop + 22);

      // 物块
      var sub = submergeDepth();
      if (obj) {
        ctx.fillStyle = obj.color;
        ctx.strokeStyle = 'rgba(0,0,0,.3)';
        ctx.lineWidth = 2;
        var bx = g.tankX + g.tankW / 2 - SIZE / 2;
        ctx.fillRect(bx, obj.y, SIZE, SIZE);
        ctx.strokeRect(bx, obj.y, SIZE, SIZE);
        ctx.fillStyle = '#fff';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(obj.name, bx + SIZE / 2, obj.y + SIZE / 2 + 4);

        // 力箭头
        drawArrow(bx + SIZE / 2, obj.y + SIZE, 34, '#ff9c7a', 'G');
        var frac = sub / SIZE;
        if (frac > 0.02) drawArrow(bx + SIZE / 2, obj.y, -34 * frac * (RHO_WATER / obj.rho) * (obj.rho <= RHO_WATER ? 1 : 1), '#7fd8a0', 'F浮');
      } else {
        ctx.fillStyle = '#d9e8d5';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('👇 选择物块并点击“放入水中”', g.tankX + g.tankW / 2, g.waterTop - 40);
      }

      // 数据读数
      var m = V * (obj ? obj.rho : 0) / 1000;          // kg
      var G = m * 10;                                   // N
      var frac2 = sub / SIZE;
      var Fb = RHO_WATER * 10 * (V * frac2) / 1000;     // N
      readout.querySelector('#buG').textContent = 'G = ' + G.toFixed(1) + ' N';
      readout.querySelector('#buF').textContent = 'F浮 = ρ液gV排 = ' + Fb.toFixed(1) + ' N';
      var sEl = readout.querySelector('#buS');
      if (!obj) { sEl.textContent = '状态：等待投放'; sEl.className = 'chip'; }
      else if (obj.rho < RHO_WATER) { sEl.textContent = '🛟 漂浮：F浮 = G（V排 < V物）'; sEl.className = 'chip'; }
      else if (obj.rho === RHO_WATER) { sEl.textContent = '🫧 悬浮：F浮 = G'; sEl.className = 'chip'; }
      else { sEl.textContent = '⬇ 下沉：F浮 < G（ρ物 > ρ液）'; sEl.className = 'chip warn'; }
      ui.querySelector('#buInfo').textContent = obj
        ? ('物块体积 V = ' + V + ' cm³，浸入体积 V排 = ' + Math.round(V * frac2) + ' cm³')
        : '';

      requestAnimationFrame(draw);
    }

    function drawArrow(x, y, len, color, label) {
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + len);
      ctx.stroke();
      var dir = len > 0 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(x, y + len + dir * 8);
      ctx.lineTo(x - 5, y + len);
      ctx.lineTo(x + 5, y + len);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(label, x + 8, y + len / 2 + 4);
    }

    drop();   // 初始投一个木块
    requestAnimationFrame(draw);
  }

  return { init: init };
})();
