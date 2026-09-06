// Rem 看板娘扩展配置（外置：MV3 extension_pages 禁止内联脚本，必须放独立文件）
var message_Path = './live2d/'; // 扩展内相对路径
window.__REM_EXTENSION__ = true; // 拖动/尺寸由父页面 content.js 接管（全屏可拖，气泡不裁）
var talkAPI = ""; // 老接口：POST {info,userid} -> {code:100000,text}，为空则走本地/免费API
var freeChatMode = "local"; // 'local' | 'puter' | 'gemini' | 'groq' | 'openrouter'
var freeChatConfig = {
  // systemPrompt: '你是蕾姆...',
  // model: 'gpt-5-nano',
  // geminiKey: 'AIza...', geminiModel: 'gemini-2.0-flash',
  // groqKey: 'gsk_...',
  // openrouterKey: 'sk-or-...'
};
