# Live2dRem

https://xuanchenxle.github.io/Live2dRem/

基于 [eeg1412/Live2dRem](https://github.com/eeg1412/Live2dRem) 二次修改。
原模型为《Re：从零开始的异世界生活》蕾姆，版权归官方所有，仅供学习交流，禁止商用。

## 相对原版改了什么

- 路径全部相对化（`./live2d/`），GitHub Pages 子路径可用
- jQuery 换 cdnjs 3.7.1；一言换 `v1.hitokoto.cn` + 本地兜底
- 只拦 IE，手机可看；移动端默认全宽，窄屏 CSS 不再隐藏
- 聊天默认本地规则引擎（离线可用，50+ 意图 / 120+ 条回复），保留老 `talkAPI`（图灵 `{code:100000,text}`）兼容，另预留 `puter / gemini / groq / openrouter` 直连开关
- 无互动时每 15 秒自动说话（语气词 / 微动作 / 碎碎念），说话与闲聊都会触发模型动作
- 右下角手柄拖动调大小（0.5~2.5 倍，记忆尺寸）；`⛶` 按钮一键全宽（contain 适配，横屏也完整可见）
- 去掉失效 BGM 链接（无地址时音乐按钮自动隐藏）、修位置 `px` 叠加 bug、加触屏拖动

## 目录

```
index.html            # 入口（空白页 + 看板娘）
live2d/css/           # 样式
live2d/js/live2d.js   # Live2D Cubism 2 渲染（原样保留）
live2d/js/message.js  # 交互逻辑（本版主要修改）
live2d/message.json   # 悬停 / 点击文案
live2d/model/rem/     # 蕾姆模型（.moc + 35 个 .mtn 动作）
extension/            # Chrome 扩展（任意网页 summon 蕾姆，iframe 隔离）
```

## 本地运行

起个 http 服务：

```
python -m http.server 8000
```

浏览器开 `http://127.0.0.1:8000`。

## 嵌入到自己的网页（和原版一样）

1. 把 `live2d/` 整个目录拷到网站根目录（和原版一样改名叫 `live2d` 就行）。
2. 在页面的 `<head>` 里加样式：
```html
<link rel="stylesheet" href="/live2d/css/live2d.css" />
```
3. 在 `<body>` 里找个位置放看板娘 DOM（和 `index.html` 里同一份）：
```html
<div id="landlord" style="left:5px;bottom:0px;">
  <div class="message" style="opacity:0"></div>
  <canvas id="live2d" width="500" height="560" class="live2d"></canvas>
  <div class="live_talk_input_body">
    <div class="live_talk_input_name_body">
      <input name="name" type="text" class="live_talk_name white_input" id="AIuserName" autocomplete="off" placeholder="你的名字" />
    </div>
    <div class="live_talk_input_text_body">
      <input name="talk" type="text" class="live_talk_talk white_input" id="AIuserText" autocomplete="off" placeholder="要和我聊什么呀？" />
      <button type="button" class="live_talk_send_btn" id="talk_send">发送</button>
    </div>
  </div>
  <input name="live_talk" id="live_talk" value="1" type="hidden" />
  <div class="live_ico_box">
    <div class="live_ico_item type_info" id="showInfoBtn"></div>
    <div class="live_ico_item type_talk" id="showTalkBtn"></div>
    <div class="live_ico_item type_music" id="musicButton"></div>
    <div class="live_ico_item type_youdu" id="youduButton"></div>
    <div class="live_ico_item type_full" id="fullButton" title="全宽/还原"></div>
    <div class="live_ico_item type_quit" id="hideButton"></div>
    <input name="live_statu_val" id="live_statu_val" value="0" type="hidden" />
    <audio src="" style="display:none;" id="live2d_bgm" data-bgm="0" preload="none"></audio>
    <input id="duType" value="douqilai,l2d_caihong" type="hidden">
  </div>
  <div id="remResize" title="拖动调整大小"></div>
</div>
<div id="open_live2d">召唤蕾姆</div>
```
4. 在 `</body>` 前加脚本（`message_Path` 指到 `live2d/` 目录即可，子路径站点用相对路径）：
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.7.1/jquery.min.js"></script>
<script>
var message_Path = '/live2d/';
var talkAPI = "";
var freeChatMode = "local";
var freeChatConfig = {};
</script>
<script src="/live2d/js/live2d.js"></script>
<script src="/live2d/js/message.js"></script>
```

注意：必须 http(s) 访问（`file://` 下模型 XHR 会被拦）；jQuery 必需；`message.json` 里 `.itemarticle-tips a` / `.searchbox` 两个选择器按自己页面改，其他开箱即用。

## 聊天配置（`index.html`）

```js
var talkAPI = "";          // 老接口优先，为空走下面
var freeChatMode = "local";// local | puter | gemini | groq | openrouter
var freeChatConfig = {};   // 各家 key 按需填，见 index.html 注释
```


## 技术文档

实现原理、文件分工、待办见 [docs/TECH.md](docs/TECH.md)。

## Chrome 扩展（任意网页 summon 蕾姆）

`extension/` 即源码，无需编译：`chrome://extensions` → 开发者模式 → 加载已解压的扩展程序 → 选 `extension/` 文件夹。

行为：默认右下角小窗（非全屏），拖身体全屏可走、位置跨站记忆；点工具栏图标可开关蕾姆（关掉即移除，已开页面实时生效），另有“复位到右下角”按钮。

主站改了话术/模型后，两步生效（缺一不可，Chrome 不会自动重载未打包扩展）：

1. 同步文件到插件目录（`content.js / config.js / rem.html / manifest.json` 是插件独有，原地改，不用同步）：
```
powershell -ExecutionPolicy Bypass -File extension\sync.ps1
```
2. `chrome://extensions` 点本插件的刷新按钮，再回页面验证。

发给别人：把 `extension/` 里面的文件打包成 ZIP 即可，对方解压后同样加载。
