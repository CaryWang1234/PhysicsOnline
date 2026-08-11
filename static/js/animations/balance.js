/* ============================================
   balance.js —— 天平测质量 · 密度计算
   左盘放未知金属块（体积已知 10 cm³），
   右盘加减砝码 + 移动游码使天平平衡，
   读数 m = 砝码 + 游码，再用 ρ = m/V 鉴定材质
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.balance = (function () {
  var MATERIALS = [
    { name: '铝块', rho: 2.7 },
    { name: '铁块', rho: 7.9 },
    { name: '铜块', rho: 8.9 }
  ];
  var VOLUME = 10;                              // cm³
  var WEIGHTS = [100, 50, 20, 20, 10, 5];       // 砝码盒

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="baL">左盘：金属块 m = ?</span>' +
      '<span class="chip" id="baR">右盘：0 g + 游码 0.0 g</span>' +
      '<span class="chip" id="baS">状态：未平衡</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<span id="baBtns"></span>' +
      '<label>游码 <input type="range" id="baRider" min="0" max="5" step="0.1" value="0"> <span id="baRiderV">0.0 g</span></label>' +
      '<button type="button" id="baNew">🎲 换一块</button>';
    stage.appendChild(ui);

    // 砝码按钮：每个砝码可加上/取下
    var onPan = WEIGHTS.map(function () { return false; });
    var rider = 0;
    var target = null;      // { name, rho, mass }
    var tilt = 0;           // 当前指针偏角

    var btnWrap = ui.querySelector('#baBtns');
    WEIGHTS.forEach(function (w, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = w + 'g';
      b.addEventListener('click', function () {
        onPan[i] = !onPan[i];
        b.style.opacity = onPan[i] ? '1' : '.55';
      });
      b.style.opacity = '.55';
      btnWrap.appendChild(b);
    });

    var riderEl = ui.querySelector('#baRider');
    riderEl.addEventListener('input', function () {
      rider = parseFloat(riderEl.value);
      ui.querySelector('#baRiderV').textContent = rider.toFixed(1) + ' g';
    });

    function newBlock() {
      var m = MATERIALS[Math.floor(Math.random() * MATERIALS.length)];
      target = { name: m.name, rho: m.rho, mass: Math.round(m.rho * VOLUME * 10) / 10 };
    }
    ui.querySelector('#baNew').addEventListener('click', newBlock);
    newBlock();

    var W = 0, H = 0, dpr = 1;
    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); });

    function rightMass() {
      var s = rider;
      onPan.forEach(function (on, i) { if (on) s += WEIGHTS[i]; });
      return s;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2, beamY = H * 0.40;

      // 底座与立柱
      ctx.fillStyle = '#b98d5a';
      ctx.fillRect(cx - 90, H * 0.80, 180, 14);
      ctx.fillStyle = '#8fa597';
      ctx.fillRect(cx - 8, beamY, 16, H * 0.80 - beamY);

      // 横梁倾角：右盘重 → 右端下沉
      var diff = rightMass() - target.mass;
      var ta = Math.max(-0.14, Math.min(0.14, diff * 0.02));
      tilt += (ta - tilt) * 0.1;

      ctx.save();
      ctx.translate(cx, beamY);
      ctx.rotate(tilt);

      // 横梁
      ctx.fillStyle = '#f2e3c2';
      ctx.strokeStyle = '#b98d5a';
      ctx.lineWidth = 2;
      ctx.fillRect(-190, -8, 380, 16);
      ctx.strokeRect(-190, -8, 380, 16);

      // 游码标尺（0~5g）
      ctx.strokeStyle = '#5c4318';
      ctx.lineWidth = 1;
      for (var i = 0; i <= 5; i++) {
        var gx = -40 + i * 16;
        ctx.beginPath();
        ctx.moveTo(gx, -8); ctx.lineTo(gx, -2);
        ctx.stroke();
      }
      // 游码
      var riderX = -40 + rider * 16;
      ctx.fillStyle = '#e2694f';
      ctx.beginPath();
      ctx.moveTo(riderX, -14);
      ctx.lineTo(riderX - 6, -26);
      ctx.lineTo(riderX + 6, -26);
      ctx.closePath();
      ctx.fill();

      // 左右吊盘
      drawPan(-170, '#f2b356', 'left');
      drawPan(170, '#7fb8d8', 'right');
      ctx.restore();

      // 指针（底座上，随横梁偏转）
      ctx.save();
      ctx.translate(cx, beamY);
      ctx.rotate(-tilt * 3);
      ctx.strokeStyle = '#e2694f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0); ctx.lineTo(0, 58);
      ctx.stroke();
      ctx.restore();
      // 分度盘
      ctx.strokeStyle = 'rgba(217,232,213,.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, beamY, 70, Math.PI * 0.35, Math.PI * 0.65);
      ctx.stroke();

      // 左盘物体 & 右盘砝码（随横梁倾斜后的近似位置）
      var lx = cx - 170 * Math.cos(tilt), ly = beamY - 170 * Math.sin(tilt) + 44;
      var rx = cx + 170 * Math.cos(tilt), ry = beamY + 170 * Math.sin(tilt) + 44;
      ctx.fillStyle = '#aebac2';
      ctx.fillRect(lx - 16, ly, 32, 24);
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('金属块', lx, ly + 40);
      ctx.fillText('V = ' + VOLUME + ' cm³', lx, ly + 56);
      // 右盘砝码堆
      var yy = ry;
      onPan.forEach(function (on, i) {
        if (!on) return;
        var w = WEIGHTS[i];
        ctx.fillStyle = '#f2b356';
        ctx.strokeStyle = 'rgba(0,0,0,.3)';
        ctx.fillRect(rx - 24, yy - 10, 48, 10);
        ctx.strokeRect(rx - 24, yy - 10, 48, 10);
        ctx.fillStyle = '#5c4318';
        ctx.font = '10px sans-serif';
        ctx.fillText(w + 'g', rx, yy - 2);
        yy -= 11;
      });

      // 读数与结论
      var r = rightMass();
      readout.querySelector('#baL').textContent = '左盘：金属块（V = ' + VOLUME + ' cm³）m = ?';
      readout.querySelector('#baR').textContent = '右盘：砝码 ' + Math.round(r - rider) + ' g + 游码 ' + rider.toFixed(1) + ' g';
      var sEl = readout.querySelector('#baS');
      if (Math.abs(diff) < 0.05) {
        var rho = r / VOLUME;
        var found = MATERIALS.filter(function (m) { return Math.abs(m.rho - rho) < 0.15; })[0];
        sEl.textContent = '✅ 平衡！m = ' + r.toFixed(1) + ' g，ρ = ' + rho.toFixed(1) + ' g/cm³ → 这是' + (found ? found.name : '未知材料');
        sEl.className = 'chip';
      } else {
        sEl.textContent = diff > 0 ? '⚖ 右盘偏重，减砝码或左移游码' : '⚖ 左盘偏重，加砝码或右移游码';
        sEl.className = 'chip warn';
      }

      requestAnimationFrame(draw);
    }

    function drawPan(x, color, side) {
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 8); ctx.lineTo(x, 36);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, 36, 34, 0, Math.PI);
      ctx.fill();
    }

    requestAnimationFrame(draw);
  }

  return { init: init };
})();
