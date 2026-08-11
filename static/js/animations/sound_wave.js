/* ============================================
   sound_wave.js —— 声波波形观察器（八上·声现象）
   调节频率 → 音调变化（波形变密）
   调节振幅 → 响度变化（波形变高）
   可用 WebAudio 听真实音调
   ============================================ */
window.Anim = window.Anim || {};

window.Anim.sound_wave = (function () {
  function init(stage) {
    var canvas = document.createElement('canvas');
    stage.appendChild(canvas);
    var ctx = canvas.getContext('2d');

    var readout = document.createElement('div');
    readout.className = 'anim-readout';
    readout.innerHTML =
      '<span class="chip" id="swF">频率 f = 440 Hz</span>' +
      '<span class="chip" id="swA">振幅：中</span>' +
      '<span class="chip" id="swD">音调：中 · 响度：中</span>';
    stage.appendChild(readout);

    var ui = document.createElement('div');
    ui.className = 'anim-ui';
    ui.innerHTML =
      '<label>频率 <input type="range" id="swFreq" min="150" max="1200" step="10" value="440"> <span id="swFreqV">440 Hz</span></label>' +
      '<label>振幅 <input type="range" id="swAmp" min="10" max="100" step="1" value="55"> <span id="swAmpV">55</span></label>' +
      '<button type="button" id="swPlay">🔊 听一听</button>';
    stage.appendChild(ui);

    var freq = 440, amp = 55;
    var phase = 0;
    var audioCtx = null, osc = null, gain = null;

    ui.querySelector('#swFreq').addEventListener('input', function () {
      freq = +this.value;
      ui.querySelector('#swFreqV').textContent = freq + ' Hz';
      if (osc) osc.frequency.value = freq;
    });
    ui.querySelector('#swAmp').addEventListener('input', function () {
      amp = +this.value;
      ui.querySelector('#swAmpV').textContent = amp;
      if (gain) gain.gain.value = amp / 100 * 0.25;
    });

    var playBtn = ui.querySelector('#swPlay');
    playBtn.addEventListener('click', function () {
      if (osc) { stopTone(); return; }
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        osc = audioCtx.createOscillator();
        gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.value = amp / 100 * 0.25;
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start();
        playBtn.textContent = '🔇 停止';
      } catch (e) { /* 浏览器不支持音频时静默降级 */ }
    });
    function stopTone() {
      if (osc) { try { osc.stop(); } catch (e) { } osc = null; }
      playBtn.textContent = '🔊 听一听';
    }

    var W = 0, H = 0, dpr = 1;
    function fit() {
      dpr = window.devicePixelRatio || 1;
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    fit();
    window.addEventListener('resize', function () { fit(); });

    function loop() {
      phase += freq / 900;
      ctx.clearRect(0, 0, W, H);

      var midY = H * 0.44;

      // 音叉（振动源）
      var shake = Math.sin(phase) * amp / 22;
      ctx.strokeStyle = '#c9d4ce';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(56 + shake, midY - 60);
      ctx.lineTo(56 + shake, midY + 16);
      ctx.moveTo(76 + shake, midY - 60);
      ctx.lineTo(76 + shake, midY + 16);
      ctx.moveTo(66 + shake, midY + 16);
      ctx.lineTo(66 + shake, midY + 46);
      ctx.stroke();
      ctx.fillStyle = '#d9e8d5';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('音叉', 66, midY + 66);

      // 声波波形
      ctx.strokeStyle = '#ffe9b0';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      var x0 = 120, x1 = W - 24;
      var waveLen = 26000 / freq;                 // 频率越高，波长越短
      for (var x = x0; x <= x1; x += 2) {
        var atten = 1 - (x - x0) / (x1 - x0) * 0.55;   // 随距离衰减（响度减弱）
        var y = midY + Math.sin((x - x0) / waveLen * Math.PI * 2 + phase) * amp * 1.25 * atten;
        if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 中线
      ctx.strokeStyle = 'rgba(217,232,213,.3)';
      ctx.setLineDash([5, 6]);
      ctx.beginPath();
      ctx.moveTo(x0, midY); ctx.lineTo(x1, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 振幅标注
      ctx.strokeStyle = '#7fd8a0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x0 + 8, midY);
      ctx.lineTo(x0 + 8, midY - amp * 1.25);
      ctx.stroke();
      ctx.fillStyle = '#7fd8a0';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('振幅', x0 + 14, midY - amp * 1.25 / 2);

      ctx.fillStyle = 'rgba(217,232,213,.7)';
      ctx.font = '13px sans-serif';
      ctx.fillText('→ 波传播方向（离音叉越远，响度越小）', x0 + 60, H * 0.80);

      // 读数
      var pitch = freq < 300 ? '低' : (freq > 700 ? '高' : '中');
      var loud = amp < 40 ? '小' : (amp > 70 ? '大' : '中');
      readout.querySelector('#swF').textContent = '频率 f = ' + freq + ' Hz';
      readout.querySelector('#swA').textContent = '振幅：' + loud;
      readout.querySelector('#swD').textContent = '频率决定音调（' + pitch + '），振幅决定响度（' + loud + '）';

      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  return { init: init };
})();
