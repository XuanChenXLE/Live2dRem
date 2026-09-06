/* Rem 看板娘 content script (MV3, all_urls)
 * iframe 隔离：rem.html 跑在扩展域内，不受宿主页 CSP / jQuery 冲突 / CSS 污染影响。
 * 本文件拥有 iframe 本体：
 * - 默认右下角小窗（看板娘站位）；拖模型 = 移动 iframe，全屏可拖；
 * - 位移经 rAF 合批后应用，60Hz 下不抖；
 * - iframe 尺寸贴合模型+气泡（frame 消息），气泡不再被裁、拖动不再出框；
 * - ⛶ 全宽时铺满视口；位置跨站记忆（chrome.storage.local remPosV3）；
 * - 总开关 remEnabled（插件 popup），关掉即移除，已开页面实时生效。
 */
(function () {
  if (window.__remInjected) return;
  window.__remInjected = true;

  var DEF_W = 300, DEF_H = 430;
  var POS_KEY = 'remPosV3'; // 右下角默认值，旧坐标一律作废
  var EN_KEY = 'remEnabled';
  var pos = null; // {left, bottom}，null = 用默认右下角
  var size = { w: DEF_W, h: DEF_H };
  var isFull = false;
  var dragging = false; // 拖动中忽略尺寸上报，位置只跟手走
  var iframe = null;

  function defaultPos() {
    return {
      left: Math.max(window.innerWidth - DEF_W - 12, 0),
      bottom: 10
    };
  }
  function clamp() {
    var vw = window.innerWidth, vh = window.innerHeight;
    size.w = Math.min(Math.max(size.w, 80), Math.max(vw, 80));
    size.h = Math.min(Math.max(size.h, 80), Math.max(vh, 80));
    if (!pos) pos = defaultPos();
    // 至少留 60px 在屏内，拖不丢
    pos.left = Math.min(Math.max(pos.left, -(size.w - 60)), vw - 60);
    pos.bottom = Math.min(Math.max(pos.bottom, -(size.h - 60)), vh - 60);
  }
  function paint() {
    iframe.style.left = Math.round(pos.left) + 'px';
    iframe.style.bottom = Math.round(pos.bottom) + 'px';
    iframe.style.width = Math.round(size.w) + 'px';
    iframe.style.height = Math.round(size.h) + 'px';
  }
  function apply() {
    if (!iframe || isFull) return;
    clamp();
    paint();
  }
  function applyFull() {
    iframe.style.left = '0px';
    iframe.style.bottom = '0px';
    iframe.style.width = '100vw';
    iframe.style.height = '100vh';
  }
  // 拖动位移同步直写（只动 left/bottom，不碰宽高）：消息投递已约一帧，
  // 再经 rAF 合批反而多加一帧延迟，手感发飘，所以收到即画
  function moveBy(dx, dy) {
    if (!iframe || isFull) return;
    if (!pos) pos = defaultPos();
    pos.left += dx;
    pos.bottom -= dy;
    clamp();
    iframe.style.left = Math.round(pos.left) + 'px';
    iframe.style.bottom = Math.round(pos.bottom) + 'px';
  }
  function save() {
    try {
      var o = {};
      o[POS_KEY] = pos;
      chrome.storage.local.set(o);
    } catch (e) {}
  }

  function inject() {
    if (iframe) return;
    if (!pos) pos = defaultPos();
    iframe = document.createElement('iframe');
    iframe.id = '__rem_live2d_iframe__';
    iframe.src = chrome.runtime.getURL('rem.html');
    iframe.setAttribute('frameborder', '0');
    iframe.setAttribute('scrolling', 'no');
    iframe.style.cssText =
      'position:fixed;border:0;background:transparent;z-index:2147483647;';
    (document.documentElement || document.body || document).appendChild(iframe);
    clamp();
    paint();
  }
  function remove() {
    if (!iframe) return;
    iframe.remove();
    iframe = null;
    dragging = false;
  }

  window.addEventListener('message', function (e) {
    var d = e.data;
    if (!d || d.__rem !== true || !iframe) return;
    try {
      if (e.source !== iframe.contentWindow) return;
    } catch (err) { return; }
    if (d.type === 'dragstart') {
      dragging = true;
    } else if (d.type === 'drag') {
      moveBy(d.dx || 0, d.dy || 0);
    } else if (d.type === 'dragend') {
      dragging = false;
      save();
    } else if (d.type === 'frame') {
      var wasFull = isFull;
      isFull = !!d.full;
      if (isFull) { applyFull(); return; }
      if (dragging) return; // 拖动中不收尺寸，松手后的 frame 会校准
      if (wasFull) { size.w = DEF_W; size.h = DEF_H; apply(); return; }
      if (typeof d.width === 'number') size.w = d.width;
      if (typeof d.height === 'number') size.h = d.height;
      apply();
    }
  });
  window.addEventListener('resize', function () {
    if (!iframe) return;
    if (isFull) applyFull(); else apply();
  });

  // 初始：读总开关 + 记忆位置；开关变化实时生效，不用刷新页面
  try {
    chrome.storage.local.get([EN_KEY, POS_KEY], function (r) {
      if (r && r[POS_KEY] && typeof r[POS_KEY].left === 'number') {
        pos = { left: r[POS_KEY].left, bottom: r[POS_KEY].bottom };
      }
      if (!r || r[EN_KEY] !== false) inject();
    });
    chrome.storage.onChanged.addListener(function (chg, area) {
      if (area !== 'local') return;
      if (chg[EN_KEY]) {
        if (chg[EN_KEY].newValue === false) remove();
        else inject();
      }
      if (chg[POS_KEY] && !chg[POS_KEY].newValue && iframe && !isFull) {
        pos = defaultPos(); // popup 点了复位：回右下角
        apply();
      }
    });
  } catch (e) {
    inject();
  }
})();
