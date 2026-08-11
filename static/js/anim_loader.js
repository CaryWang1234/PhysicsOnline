/* ============================================
   anim_loader.js —— 按章节动态加载对应动画脚本
   约定：每个动画文件注册 window.Anim[<key>] = { init(stageEl, meta) }
   ============================================ */
(function () {
  var stage = document.getElementById('animStage');
  if (!stage) return;
  var key = stage.getAttribute('data-anim');
  if (!key) return;

  var script = document.createElement('script');
  script.src = '/static/js/animations/' + key + '.js';
  script.onload = function () {
    if (window.Anim && typeof window.Anim[key] !== 'undefined' && window.Anim[key].init) {
      window.Anim[key].init(stage, window.AnimMeta || {});
    } else {
      stage.textContent = '动画加载失败，请刷新重试。';
    }
  };
  script.onerror = function () {
    stage.textContent = '动画脚本未找到：' + key + '.js';
  };
  document.head.appendChild(script);
})();
