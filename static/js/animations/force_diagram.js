/* ============================================
   force_diagram.js —— 物理语言热身：力的示意图
   交互：滑块改变力的大小与方向，观察带箭头的线段如何表达一个力
   规律：线段起点=作用点，长度∝大小，箭头指向=方向，旁标符号与数值
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.force_diagram = (function () {
  var PRESETS = [
    { name: '重力 G', dir: 'down', color: '#f2b356', fixDir: true,
      note: '重力方向永远竖直向下，作用点画在物体重心。' },
    { name: '拉力 F', dir: 'up-right', color: '#8fd0a0', fixDir: false,
      note: '拉力的方向沿绳子/手的方向，可以自由改变。' },
    { name: '支持力 N', dir: 'up', color: '#9ec9f0', fixDir: true,
      note: '支持力垂直于接触面向上（水平面上竖直向上）。' }
  ];

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="fdName">当前力：重力 G</span>' +
      '<span class="chip" id="fdVal">大小 F = 4.0 N</span>' +
      '<span class="chip" id="fdHint">方向：竖直向下</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<button type="button" class="fd-pre" data-i="0">重力 G</button>' +
      '<button type="button" class="fd-pre" data-i="1">拉力 F</button>' +
      '<button type="button" class="fd-pre" data-i="2">支持力 N</button>' +
      '<label>大小 <input type="range" id="fdMag" min="1" max="10" step="0.5" value="4"> <span id="fdMagVal">4.0 N</span></label>' +
      '<label id="fdAngWrap">方向角 <input type="range" id="fdAng" min="0" max="360" step="5" value="315"> <span id="fdAngVal">45°斜向上</span></label>';
    stage.appendChild(ui);

    var W = 0, H = 0, dpr = 1;
    var preset = 0, mag = 4, angDeg = 315;   // angDeg：数学角度，0=向右，90=向上

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); draw(); });

    var chName = readout.querySelector('#fdName');
    var chVal = readout.querySelector('#fdVal');
    var chHint = readout.querySelector('#fdHint');
    var magSlider = ui.querySelector('#fdMag');
    var angSlider = ui.querySelector('#fdAng');
    var angWrap = ui.querySelector('#fdAngWrap');

    function applyPreset(i) {
      preset = i;
      var p = PRESETS[i];
      if (p.fixDir) {
        angDeg = p.dir === 'down' ? 270 : p.dir === 'up' ? 90 : 45;
        angWrap.style.opacity = '.45';
        angSlider.disabled = true;
      } else {
        angWrap.style.opacity = '1';
        angSlider.disabled = false;
      }
      if (p.dir === 'up-right') angDeg = 45;
      angSlider.value = angDeg;
      ui.querySelectorAll('.fd-pre').forEach(function (b, bi) {
        b.style.background = bi === i ? '#6fae7c' : '';
        b.style.color = bi === i ? '#fff' : '';
      });
      draw();
    }

    ui.querySelectorAll('.fd-pre').forEach(function (b) {
      b.addEventListener('click', function () { applyPreset(parseInt(b.getAttribute('data-i'), 10)); });
    });
    magSlider.addEventListener('input', function () { mag = parseFloat(magSlider.value); draw(); });
    angSlider.addEventListener('input', function () { angDeg = parseFloat(angSlider.value); draw(); });

    function angText() {
      var a = ((angDeg % 360) + 360) % 360;
      if (a === 90) return '竖直向上';
      if (a === 270) return '竖直向下';
      if (a === 0) return '水平向右';
      if (a === 180) return '水平向左';
      var base = a < 90 ? '右偏上 ' + a + '°' : a < 180 ? '左偏上 ' + (180 - a) + '°'
        : a < 270 ? '左偏下 ' + (a - 180) + '°' : '右偏下 ' + (360 - a) + '°';
      return base;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      var p = PRESETS[preset];

      var bx = W * 0.42, by = H * 0.52;          // 物体中心
      var bw = 96, bh = 78;

      // 地面
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(30, by + bh / 2 + 2);
      ctx.lineTo(W - 30, by + bh / 2 + 2);
      ctx.stroke();
      ctx.lineWidth = 1;
      for (var gx = 40; gx < W - 40; gx += 22) {
        ctx.beginPath();
        ctx.moveTo(gx, by + bh / 2 + 3);
        ctx.lineTo(gx - 10, by + bh / 2 + 14);
        ctx.stroke();
      }

      // 物体
      ctx.fillStyle = '#f5e3c0';
      ctx.strokeStyle = '#b98d5a';
      ctx.lineWidth = 2.5;
      roundRect(bx - bw / 2, by - bh / 2, bw, bh, 10);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8a6a35';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('物体', bx, by + 5);
      // 重心点
      ctx.fillStyle = '#3b4a3f';
      ctx.beginPath();
      ctx.arc(bx, by, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // 力的箭头：长度 ∝ 大小（比例尺 1 N = 14 px）
      var rad = angDeg * Math.PI / 180;
      var len = mag * 14;
      var tipX = bx + Math.cos(rad) * len;
      var tipY = by - Math.sin(rad) * len;

      ctx.strokeStyle = p.color;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      // 箭头
      var ah = 14, aw = 9;
      var ux = Math.cos(rad), uy = -Math.sin(rad);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(tipX + ux * ah, tipY + uy * ah);
      ctx.lineTo(tipX - uy * aw, tipY + ux * aw);
      ctx.lineTo(tipX + uy * aw, tipY - ux * aw);
      ctx.closePath();
      ctx.fill();

      // 力符号标注（箭头旁）
      var label = p.name.split(' ')[0];
      ctx.fillStyle = p.color;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label + ' = ' + mag.toFixed(1) + ' N', tipX + ux * 30, tipY + uy * 30 + 6);

      // 比例尺
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('比例尺：1 N = 14 px', 26, 30);
      ctx.strokeStyle = '#d9e8d5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(26, 42);
      ctx.lineTo(26 + 14, 42);
      ctx.stroke();

      // 要点提示
      ctx.font = '14px sans-serif';
      ctx.fillText('✔ 起点 = 作用点（重心）', 26, H - 58);
      ctx.fillText('✔ 线段长短 ∝ 力的大小', 26, H - 36);
      ctx.fillText('✔ 箭头指向 = 力的方向', 26, H - 14);

      chName.textContent = '当前力：' + p.name;
      chVal.textContent = '大小 F = ' + mag.toFixed(1) + ' N';
      chHint.textContent = '方向：' + angText() + ' · ' + p.note;
      document.getElementById('fdMagVal').textContent = mag.toFixed(1) + ' N';
      document.getElementById('fdAngVal').textContent = angText();
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

    applyPreset(0);
    draw();
  }

  return { init: init };
})();
