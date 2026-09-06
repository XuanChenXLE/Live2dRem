# Live2dRem 技术文档

## 1. 架构（一句话）

纯静态站，无后端：`index.html`（空白页 + 挂件 DOM）+ `live2d.js`（Live2D Cubism 2 渲染运行时，原样保留）+ `message.js`（全部交互逻辑，本项目主要改动）+ `message.json`（悬停/点击文案）+ `model/rem/`（蕾姆 `.moc` + 35 个 `.mtn` 动作）。

```
index.html
 ├─ live2d/css/live2d.css      定位 / 气泡 / 图标 / 全宽模式
 ├─ live2d/js/live2d.js        渲染：建模 → 物理 → 动作队列 → WebGL 绘制（勿动）
 ├─ live2d/js/message.js       交互：问候 / 一言 / 聊天 / 拖动 / 缩放 / 全宽 / 闲聊
 ├─ live2d/message.json        mouseover / click 文案（改字只改这里）
 └─ live2d/model/rem/rem.json  模型入口：motions 分组 idle / flick_head / tap_body / talk / sleepy / rest
```

## 2. 关键机制

- **路径**：`message_Path = './live2d/'` 相对路径，Pages 子路径可用；`loadlive2d('live2d', message_Path + 'model/rem/rem.json')`。
- **说话→动作**：`pokeLive2d()` 把 `#live_talk` 置 `1`，`live2d.js` 的 `update()` 下一帧播一段 `talk` 组随机动作（26 个），播完回到 `idle` 循环。聊天回复、一言、自动闲聊都会 poke。
- **点触动作**：点 canvas 头部 → `setRandomExpression()`（本模型无 expressions 字段，实际空转）；点头部命中区 → `flick_head` 随机（10 个）；点身体 → `tap_body` 随机（15 个）。
- **闲聊**：`idleTick()` 每 15 秒，聊天窗口开着时跳过；一半概率一言（`v1.hitokoto.cn`，挂了走本地 `localQuotes`），一半 `IDLE_ACTS`（语气词/微动作/碎碎念）；鼠标键盘触摸重置计时，挂机 3 分钟降频。
- **聊天三路**（`doSend`，按顺序）：① `talkAPI` 老接口（POST `{info,userid}` → `{code:100000,text}`，图灵 v1 格式）；② `freeChatMode` 直连（`puter/gemini/groq/openrouter`，失败回落）；③ 本地规则 `localRemReply()`（关键词 + `pick()` 多写法，`who` 代入用户名）。
- **尺寸/全宽**：右下 `#remResize` 手柄拖动 0.5~2.5 倍；`⛶` 切全宽 = contain（`min(屏宽, 屏高×500/560)`，横屏按高收并居中），全宽时对话框变顶部叠加字幕条；旋转/窗口变化重排。
- **存储**：`localStorage`：`live2dhidden`（显隐）、`remScale`（尺寸）、`remFull`（全宽偏好）；`sessionStorage`：`historywidth/height`（位置）、`live2duser`（名字）。

## 3. 改字/改话术去哪改

- 悬停/点击气泡 → `live2d/message.json`
- 聊天意图/回复 → `message.js` 的 `localRemReply()`（`has(关键词)` + `pick([写法])`，注意具体意图放前面，防子串截胡）
- 名言 → `REM_QUOTES`；闲聊 → `localQuotes` / `IDLE_ACTS`
- 人设（给 AI 用）→ `REM_SYSTEM` / `index.html` 的 `freeChatConfig.systemPrompt`

## 4. TODO

- [ ] **接入真实聊天 API（未做）**：hooks 已留（`talkAPI` + 四种直连），但都没填 key 联调。需要的：要么拿免费 key（Gemini/Groq/OpenRouter）填 `freeChatConfig` 切 `freeChatMode` 实测；要么启用 Puter（`index.html` 解注释 `js.puter.com/v2`，切 `puter`）；生产环境建议再做一个 Worker/Serverless 代理藏 key，前端只调代理。
- [ ] 表情变化：当前模型无 `expressions`，想做脸红/闭眼笑需换 Cubism 3+ 带 `.exp3.json` 的模型。
- [ ] BGM：`index.html` 取消注释填 https 直链即可。
- [ ] 睡眠模式：`Sleepy` 读多写少，可接“长时间无互动自动睡觉/回来唤醒”。
