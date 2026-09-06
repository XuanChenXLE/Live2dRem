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
```

## 本地运行

起个 http 服务：

```
python -m http.server 8000
```

浏览器开 `http://127.0.0.1:8000`。

## 部署到 GitHub Pages

1. 新建仓库 `Live2dRem`（不勾 README），把本目录推上去：
```
git remote add origin https://github.com/<你>/Live2dRem.git
git branch -M main
git push -u origin main
```
2. `Settings → Pages → Deploy from a branch → main → /(root) → Save`
3. 等 1~2 分钟，访问 `https://<你>.github.io/Live2dRem/`

## 聊天配置（`index.html`）

```js
var talkAPI = "";          // 老接口优先，为空走下面
var freeChatMode = "local";// local | puter | gemini | groq | openrouter
var freeChatConfig = {};   // 各家 key 按需填，见 index.html 注释
```


## 技术文档

实现原理、文件分工、待办见 [docs/TECH.md](docs/TECH.md)。
