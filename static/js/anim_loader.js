/* ============================================
   anim_loader.js —— 按章节动态加载实验模拟脚本（支持多个动画）
   约定：页面内每个 .anim-stage[data-anim] 对应一个动画，
         动画文件注册 window.Anim[<key>] = { init(stageEl, meta) }
   ============================================ */
(function () {
  var stages = Array.prototype.slice.call(
    document.querySelectorAll('.anim-stage[data-anim]'));
  if (!stages.length) return;

  stages.forEach(function (stage) {
    var key = stage.getAttribute('data-anim');
    if (!key) return;
    var meta = {};
    try { meta = JSON.parse(stage.getAttribute('data-meta') || '{}'); } catch (e) {}

    var script = document.createElement('script');
    script.src = '/static/js/animations/' + key + '.js';
    script.onload = function () {
      if (window.Anim && typeof window.Anim[key] !== 'undefined' && window.Anim[key].init) {
        window.Anim[key].init(stage, meta);
      } else {
        stage.textContent = '动画加载失败，请刷新重试。';
      }
    };
    script.onerror = function () {
      stage.textContent = '动画脚本未找到：' + key + '.js';
    };
    document.head.appendChild(script);
  });
})();
