/* ============================================
   tone_bottle.js —— 水瓶琴音调实验室
   交互：调节 4 个瓶子的水位，点击瓶子发声
         吹气模式：空气柱振动，水越多 → 空气柱越短 → 音调越高
         敲击模式：瓶和水振动，水越多 → 质量越大 → 音调越低
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.tone_bottle = (function () {
  var N = 4;
  var F_BLOW0 = 220, F_HIT0 = 520;   // 空瓶基准频率

  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="tbMode">🎺 当前模式：吹气（振动物体：空气柱）</span>' +
      '<span class="chip" id="tbLast">🎵 点击瓶子听一听</span>' +
      '<span class="chip" id="tbRule">规律：水越多，空气柱越短，音调越高</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<button type="button" id="tbBlow">🎺 吹气模式</button>' +
      '<button type="button" id="tbHit">🔨 敲击模式</button>' +
      '<button type="button" id="tbDemo">▶ 从左到右听一遍</button>' +
      '<button type="button" id="tbReset">↺ 水位重置</button>' +
      '<span class="tb-note">拖动每个瓶子下方的滑块调水位，点瓶子发声</span>';
    stage.appendChild(ui);

    var sliders = document.createElement('div');
    sliders.className = 'anim-sliders';
    for (var i = 0; i < N; i++) {
      var row = document.createElement('label');
      row.className = 'slider-row';
      row.innerHTML = '<span>' + (i + 1) + '号瓶</span>' +
        '<input type="range" min="0" max="100" value="' + (i * 25 + 10) + '" data-bi="' + i + '">';
      sliders.appendChild(row);
    }
    ui.appendChild(sliders);

    var W = 0, H = 0, dpr = 1;
    var mode = 'blow';
    var levels = [];
    var flash = new Array(N).fill(0);   // 发声高亮计时
    var audioCtx = null;

    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); draw(); });

    var chMode = readout.querySelector('#tbMode');
    var chLast = readout.querySelector('#tbLast');
    var chRule = readout.querySelector('#tbRule');

    sliders.querySelectorAll('input[type=range]').forEach(function (inp) {
      inp.addEventListener('input', function () {
        levels[+inp.getAttribute('data-bi')] = +inp.value / 100;
        draw();
      });
    });

    function setMode(m) {
      mode = m;
      ui.querySelector('#tbBlow').classList.toggle('is-on', m === 'blow');
      ui.querySelector('#tbHit').classList.toggle('is-on', m === 'hit');
      chMode.textContent = m === 'blow'
        ? '🎺 当前模式：吹气（振动物体：空气柱）'
        : '🔨 当前模式：敲击（振动物体：瓶和水）';
      chRule.textContent = m === 'blow'
        ? '规律：水越多，空气柱越短，音调越高'
        : '规律：水越多，振动越慢，音调越低';
      draw();
    }
    ui.querySelector('#tbBlow').addEventListener('click', function () { setMode('blow'); });
    ui.querySelector('#tbHit').addEventListener('click', function () { setMode('hit'); });
    ui.querySelector('#tbReset').addEventListener('click', function () {
      sliders.querySelectorAll('input[type=range]').forEach(function (inp, i) {
        inp.value = i * 25 + 10;
        levels[i] = +inp.value / 100;
      });
      draw();
    });

    function freqOf(i) {
      var w = levels[i] || 0;
      if (mode === 'blow') {
        // 空气柱长度 ∝ (1 - w)，频率反比
        return F_BLOW0 / Math.max(1 - w, 0.15);
      }
      // 敲击：质量越大频率越低
      return F_HIT0 / (1 + 1.6 * w);
    }

    function play(i) {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        var osc = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        osc.type = mode === 'blow' ? 'sine' : 'triangle';
        osc.frequency.value = freqOf(i);
        gain.gain.setValueAtTime(0.28, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.62);
      } catch (e) { /* 无声环境不影响演示 */ }
      flash[i] = performance.now();
      var f = freqOf(i);
      chLast.textContent = '🎵 ' + (i + 1) + ' 号瓶 ' + Math.round(f) +
        ' Hz（' + (f > 400 ? '较高' : f > 280 ? '中等' : '较低') + '音调）';
      requestAnimationFrame(function loop() {
        draw();
        if (performance.now() - flash[i] < 400) requestAnimationFrame(loop);
      });
    }

    ui.querySelector('#tbDemo').addEventListener('click', function () {
      for (var i = 0; i < N; i++) (function (k) { setTimeout(function () { play(k); }, k * 500); })(i);
    });

    canvas.addEventListener('click', function (e) {
      var r = canvas.getBoundingClientRect();
      var x = e.clientX - r.left;
      var slot = bottleSlot();
      for (var i = 0; i < N; i++) {
        var cx = slot.x0 + slot.gap * i + slot.bw / 2;
        if (Math.abs(x - cx) < slot.bw / 2 + 8) { play(i); return; }
      }
    });

    function bottleSlot() {
      var bw = Math.min(72, (W - 80) / N - 16);
      var gap = (W - 80) / N;
      return { x0: 40 + (gap - bw) / 2, gap: gap, bw: bw };
    }

    // ---- 绘制 ----
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var slot = bottleSlot();
      var top = 46, bot = H - 150;   // 底部预留控制栏空间

      for (var i = 0; i < N; i++) {
        var x = slot.x0 + slot.gap * i;
        var bw = slot.bw, bh = bot - top;
        var w = levels[i] || 0;
        var lit = performance.now() - flash[i] < 400;

        // 瓶身
        ctx.strokeStyle = lit ? '#f2c14e' : '#cfd8d2';
        ctx.lineWidth = lit ? 3.5 : 2.5;
        ctx.beginPath();
        ctx.moveTo(x + bw * 0.36, top);
        ctx.lineTo(x + bw * 0.36, top + 14);
        ctx.lineTo(x, top + 30);
        ctx.lineTo(x, bot - 8);
        ctx.arcTo(x, bot, x + 8, bot, 8);
        ctx.lineTo(x + bw - 8, bot);
        ctx.arcTo(x + bw, bot, x + bw, bot - 8, 8);
        ctx.lineTo(x + bw, top + 30);
        ctx.lineTo(x + bw * 0.64, top + 14);
        ctx.lineTo(x + bw * 0.64, top);
        ctx.stroke();

        // 水
        var wh = (bh - 34) * w;
        ctx.fillStyle = lit ? 'rgba(142,202,230,.95)' : 'rgba(142,202,230,.7)';
        ctx.fillRect(x + 3, bot - wh - 2, bw - 6, wh);

        // 空气柱标注（吹气模式）
        if (mode === 'blow') {
          ctx.strokeStyle = 'rgba(242,193,78,.8)';
          ctx.setLineDash([4, 3]);
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(x + bw / 2, top + 4);
          ctx.lineTo(x + bw / 2, bot - wh - 4);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // 频率标签
        ctx.textAlign = 'center';
        ctx.fillStyle = '#d9e8d5';
        ctx.font = '12px sans-serif';
        ctx.fillText(Math.round(freqOf(i)) + ' Hz', x + bw / 2, top - 8);

        // 音高条：越高越长
        var f = freqOf(i);
        var barLen = Math.max(6, (f - 200) / 14);
        ctx.fillStyle = lit ? '#f2c14e' : '#8fa597';
        ctx.fillRect(x + bw / 2 - 3, bot - 4, 6, 0);
        ctx.save();
        ctx.translate(x + bw / 2, bot + 14);
        ctx.rotate(-Math.PI / 2);
        ctx.fillRect(0, -3, Math.min(barLen, 34), 6);
        ctx.restore();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = '#d9e8d5';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(mode === 'blow' ? '🎺 吹瓶口：空气柱越短，音调越高' : '🔨 敲瓶身：水越多，音调越低', W / 2, 22);
    }

    // 初始化水位
    sliders.querySelectorAll('input[type=range]').forEach(function (inp) {
      levels[+inp.getAttribute('data-bi')] = +inp.value / 100;
    });
    setMode('blow');
    draw();
  }

  return { init: init };
})();
