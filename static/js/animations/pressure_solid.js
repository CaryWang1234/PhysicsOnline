/* ============================================
   pressure_solid.js —— 砖块压强变变变
   交互：切换砖块平放/侧放/立放、增减砖块数量，
         观察海绵凹陷程度，理解 p = F / S
   规律：压力一定时，受力面积越小，压强越大
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.pressure_solid = (function () {
  var BRICK_G = 15;   // 每块砖重 15 N
  // 三种放法的受力面积（m²）与绘制宽高比例
  var MODES = {
    flat: { name: '平放', area: 0.030, w: 130, h: 40 },
    side: { name: '侧放', area: 0.015, w: 90, h: 58 },
    up:   { name: '立放', area: 0.005, w: 44, h: 118 }
  };

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="psF">压力 F = 15 N（1 块砖）</span>' +
      '<span class="chip" id="psS">受力面积 S = 0.030 m²</span>' +
      '<span class="chip" id="psP">压强 p = 500 Pa</span>' +
      '<span class="chip" id="psNote">📌 压力一定时，受力面积越小，压强越大</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<button type="button" data-mode="flat" id="psFlat">🧱 平放</button>' +
      '<button type="button" data-mode="side" id="psSide">🧱 侧放</button>' +
      '<button type="button" data-mode="up" id="psUp">🧱 立放</button>' +
      '<span style="flex:1"></span>' +
      '<button type="button" id="psMinus">➖ 减一块</button>' +
      '<button type="button" id="psPlus">➕ 加一块</button>';
    stage.appendChild(ui);

    var W = 0, H = 0, dpr = 1;
    var mode = 'flat', bricks = 1;
    var depthShown = 0;             // 凹陷动画过渡
    var rafId = null;

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); draw(); });

    var chF = readout.querySelector('#psF');
    var chS = readout.querySelector('#psS');
    var chP = readout.querySelector('#psP');

    function pressure() { return bricks * BRICK_G / MODES[mode].area; }
    function depthOf() { return Math.min(30, Math.sqrt(pressure()) / 2.1); }

    ui.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
    });
    ui.querySelector('#psPlus').addEventListener('click', function () { setBricks(bricks + 1); });
    ui.querySelector('#psMinus').addEventListener('click', function () { setBricks(bricks - 1); });

    function setMode(m) {
      mode = m;
      ui.querySelectorAll('[data-mode]').forEach(function (b) {
        b.classList.toggle('is-on', b.getAttribute('data-mode') === m);
      });
      update();
    }
    function setBricks(n) {
      bricks = Math.max(1, Math.min(3, n));
      update();
    }

    function update() {
      chF.textContent = '压力 F = ' + (bricks * BRICK_G) + ' N（' + bricks + ' 块砖）';
      chS.textContent = '受力面积 S = ' + MODES[mode].area.toFixed(3) + ' m²';
      chP.textContent = '压强 p = ' + Math.round(pressure()) + ' Pa';
      if (!rafId) rafId = requestAnimationFrame(anim);
    }

    function anim() {
      var target = depthOf();
      depthShown += (target - depthShown) * 0.15;
      draw();
      if (Math.abs(target - depthShown) > 0.15) {
        rafId = requestAnimationFrame(anim);
      } else {
        depthShown = target;
        draw();
        rafId = null;
      }
    }

    // ---- 绘制 ----
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var cx = W / 2;
      var groundY = H - 74;

      // 海绵
      var sw = Math.min(W - 60, 330), sh = 54;
      ctx.fillStyle = '#f2c9a0';
      roundRect(cx - sw / 2, groundY, sw, sh, 8);
      ctx.fill();

      // 凹陷（压力越大越深）
      var m = MODES[mode];
      var d = depthShown;
      ctx.fillStyle = '#d9a878';
      ctx.beginPath();
      ctx.moveTo(cx - m.w / 2 - 6, groundY);
      ctx.quadraticCurveTo(cx, groundY + d * 2 + 6, cx + m.w / 2 + 6, groundY);
      ctx.closePath();
      ctx.fill();

      // 砖块堆叠
      var stackTop = groundY + d * 0.4;
      for (var i = 0; i < bricks; i++) {
        var by = stackTop - m.h * (i + 1);
        ctx.fillStyle = i % 2 ? '#c96f52' : '#b85c41';
        roundRect(cx - m.w / 2, by, m.w, m.h - 3, 4);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,253,247,.35)';
        ctx.lineWidth = 1.5;
        roundRect(cx - m.w / 2, by, m.w, m.h - 3, 4);
        ctx.stroke();
      }

      // 压力箭头
      var topY = stackTop - m.h * bricks;
      ctx.strokeStyle = '#e2694f';
      ctx.fillStyle = '#e2694f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, topY - 46);
      ctx.lineTo(cx, topY - 10);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 7, topY - 16);
      ctx.lineTo(cx, topY - 4);
      ctx.lineTo(cx + 7, topY - 16);
      ctx.closePath();
      ctx.fill();
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('F = ' + (bricks * BRICK_G) + ' N', cx + 12, topY - 26);

      // 地面与标注
      ctx.strokeStyle = '#8fa597';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(20, groundY + sh);
      ctx.lineTo(W - 20, groundY + sh);
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = '#d9e8d5';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('p = F ÷ S = ' + Math.round(pressure()) + ' Pa（' + m.name + '）', cx, 26);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = '#a9c4ae';
      ctx.fillText('凹陷越深说明压强越大——试试立放再加一块砖', cx, H - 8);
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

    setMode('flat');
    update();
  }

  return { init: init };
})();
