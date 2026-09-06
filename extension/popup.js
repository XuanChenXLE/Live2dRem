// 总开关：MV3 禁止内联脚本，逻辑放独立文件
var box = document.getElementById('en');
chrome.storage.local.get('remEnabled', function (r) {
  box.checked = !(r && r.remEnabled === false);
});
box.addEventListener('change', function () {
  chrome.storage.local.set({ remEnabled: box.checked });
});
document.getElementById('reset').addEventListener('click', function () {
  chrome.storage.local.remove('remPosV3'); // 各页面 content.js 收到后回右下角
  window.close();
});
