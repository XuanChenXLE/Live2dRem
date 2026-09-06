/* Live2dRem fixed for GitHub Pages
 * - relative message_Path (./live2d/)
 * - only block IE, allow mobile
 * - hitokoto v1 API + local fallback
 * - fix position px bug + add touch drag
 * - chat: legacy talkAPI (Tuling {code:100000,text}) + local rule engine + free front-end APIs
 */
(function () {
  if (typeof message_Path === 'undefined') var message_Path = './live2d/';
  if (!/\/$/.test(message_Path)) message_Path += '/';
  if (typeof talkAPI === 'undefined') var talkAPI = '';
  // 免费直连开关：'local' | 'puter' | 'gemini' | 'groq' | 'openrouter'
  // local = 纯本地规则，离线可用，默认开启
  // puter = 无key直连，需在 index.html 加 <script src="https://js.puter.com/v2/"></script>
  // gemini/groq/openrouter = 需要你自己的免费key填到 freeChatConfig 里
  if (typeof freeChatMode === 'undefined') var freeChatMode = 'local';
  if (typeof freeChatConfig === 'undefined') var freeChatConfig = {};
  var REM_SYSTEM = freeChatConfig.systemPrompt ||
    '你是蕾姆，Re:从零开始的异世界生活的女仆，对主人温柔、谦卑又坚定，自称蕾姆，称用户为主人，回复简短中文，50字以内。';

  var userAgent = window.navigator.userAgent.toLowerCase();
  var norunAI = ['msie', 'trident/7.0', 'trident/8.0'];
  var norunFlag = false;
  for (var i = 0; i < norunAI.length; i++) {
    if (userAgent.indexOf(norunAI[i]) > -1) { norunFlag = true; break; }
  }
  if (!window.WebGLRenderingContext) norunFlag = true;
  if (norunFlag) return;

  var hitFlag = false;
  var AIFadeFlag = false;
  var liveTlakTimer = null;
  var sleepTimer_ = null;
  var AITalkFlag = false;

  var localQuotes = [
    '嗨~ 快来逗我玩吧！',
    '蕾姆一直在这里等你哦。',
    '今天也要加油呢！',
    '要看看蕾姆的魔法吗？',
    '摸头的话……也不是不可以。',
    '从这里开始吧，从一开始……不，从零开始！',
    '这一抹微笑，由蕾姆来守护。',
    '未来的事，要笑着说哦。',
    '红茶泡好了，要来一杯吗？',
    '打扫也完成了，宅邸今天也很干净呢。',
    '姐姐大人今天也很漂亮呢。',
    '就算全世界都不相信你，蕾姆也会相信你。',
    '无聊的话，点右边的对话框和蕾姆聊天吧。',
    '输入“名言”，可以听蕾姆的真心话哦。'
  ];

  function renderTip(template, context) {
    var tokenReg = /(\\)?\{([^\{\}\\]+)(\\)?\}/g;
    return template.replace(tokenReg, function (word, slash1, token, slash2) {
      if (slash1 || slash2) return word.replace('\\', '');
      var variables = token.replace(/\s/g, '').split('.');
      var currentObject = context;
      for (var i = 0; i < variables.length; i++) {
        currentObject = currentObject[variables[i]];
        if (currentObject === undefined || currentObject === null) return '';
      }
      return currentObject;
    });
  }
  String.prototype.renderTip = function (context) { return renderTip(this, context); };

  var re = /x/;
  re.toString = function () {
    showMessage('哈哈，你打开了控制台，是想要看看我的秘密吗？', 5000);
    return '';
  };

  $(document).on('copy', function () {
    showMessage('你都复制了些什么呀，转载要记得加上出处哦~~', 5000);
  });

  function initTips() {
    $.ajax({
      cache: true,
      url: message_Path + 'message.json',
      dataType: 'json',
      success: function (result) {
        $.each(result.mouseover || [], function (index, tips) {
          $(tips.selector).mouseover(function () {
            var text = tips.text;
            if (Array.isArray(tips.text)) text = tips.text[Math.floor(Math.random() * tips.text.length)];
            text = text.renderTip({ text: $(this).text() });
            showMessage(text, 3000);
          });
          $(tips.selector).mouseout(function () { showHitokoto(); });
        });
        $.each(result.click || [], function (index, tips) {
          $(tips.selector).click(function () {
            if (hitFlag) return false;
            hitFlag = true;
            setTimeout(function () { hitFlag = false; }, 8000);
            var text = tips.text;
            if (Array.isArray(tips.text)) text = tips.text[Math.floor(Math.random() * tips.text.length)];
            text = text.renderTip({ text: $(this).text() });
            showMessage(text, 3000);
          });
        });
      },
      error: function () { /* message.json 缺失也不影响主流程 */ }
    });
  }
  initTips();

  // 欢迎语：按时间，不依赖 document.referrer 域名解析
  (function welcome() {
    var text = '';
    if (document.referrer !== '') {
      try {
        var referrer = document.createElement('a');
        referrer.href = document.referrer;
        text = '嗨！来自 <span style="color:#0099cc;">' + (referrer.hostname || '远方') + '</span> 的朋友！';
      } catch (e) { text = '嗨~ 快来逗我玩吧！'; }
    } else {
      var now = (new Date()).getHours();
      if (now > 23 || now <= 5) text = '你是夜猫子呀？这么晚还不睡觉，明天起的来嘛？';
      else if (now > 5 && now <= 7) text = '早上好！一日之计在于晨，美好的一天就要开始了！';
      else if (now > 7 && now <= 11) text = '上午好！工作顺利嘛，不要久坐，多起来走动走动哦！';
      else if (now > 11 && now <= 14) text = '中午了，工作了一个上午，现在是午餐时间！';
      else if (now > 14 && now <= 17) text = '午后很容易犯困呢，今天的运动目标完成了吗？';
      else if (now > 17 && now <= 19) text = '傍晚了！窗外夕阳的景色很美丽呢，最美不过夕阳红~~';
      else if (now > 19 && now <= 21) text = '晚上好，今天过得怎么样？';
      else if (now > 21 && now <= 23) text = '已经这么晚了呀，早点休息吧，晚安~~';
      else text = '嗨~ 快来逗我玩吧！';
    }
    showMessage(text, 12000);
  })();

  // ---- 闲聊系统：无人互动时自动说话 + 触发模型动作 ----
  // 原理：把 #live_talk 置 1，live2d.js 的 update() 下一帧就会播一段 talk 组随机动作（26 个 .mtn）
  function pokeLive2d() {
    try { document.getElementById('live_talk').value = '1'; } catch (e) {}
  }
  var lastInteract = Date.now();
  var _liT = 0;
  function touchInteract() {
    var n = Date.now();
    if (n - _liT > 2000) { _liT = n; lastInteract = n; }
  }
  document.addEventListener('mousemove', touchInteract, { passive: true });
  document.addEventListener('click', touchInteract, { passive: true });
  document.addEventListener('keydown', touchInteract);
  document.addEventListener('touchstart', touchInteract, { passive: true });

  // 语气词 + 微动作 + 日常碎碎念：无互动时的自动台词池
  var IDLE_ACTS = [
    '嗯~', '呐~', '嘿咻~', '唔……', '啊呜~',
    '蕾姆整理了一下刘海。',
    '蕾姆轻轻晃了晃流星锤。',
    '蕾姆眨了眨眼睛。',
    '蕾姆打了个小小的哈欠。',
    '红茶好像有点凉了呢，蕾姆去换一壶。',
    '宅邸的打扫完成了，今天也很干净呢。',
    '姐姐大人不知道在做什么呢。',
    '窗外有小鸟飞过呢。',
    '流星锤擦得亮亮的，随时可以战斗。',
    '有点想吃姐姐做的饭了……',
    '主人不在的时候，时间过得好慢。',
    '蕾姆数了数，今天是陪伴主人的第好多天。',
    '呐，点右边的对话框，和蕾姆说说话嘛。',
    '输入“名言”，可以听蕾姆的真心话哦。',
    'Zzz……才、才没有打瞌睡呢！'
  ];
  var idleTickCount = 0;

  liveTlakTimer = setInterval(idleTick, 15000);

  function idleTick() {
    if (AITalkFlag) return; // 聊天窗口开着时不打扰
    var idleSec = (Date.now() - lastInteract) / 1000;
    idleTickCount++;
    if (idleSec > 180 && idleTickCount % 2 === 0) return; // 挂机 3 分钟后降频
    if (idleSec > 180) {
      showMessage('Zzz……主人不在吗？蕾姆会一直等下去的。', 0);
      pokeLive2d();
      return;
    }
    if (Math.random() < 0.5) { showHitokoto(); return; } // 一半概率一言
    showMessage(IDLE_ACTS[Math.floor(Math.random() * IDLE_ACTS.length)], 0);
    pokeLive2d();
  }

  function showHitokoto() {
    if (sessionStorage.getItem('Sleepy') === '1') {
      hideMessage(0);
      if (sleepTimer_ == null) {
        sleepTimer_ = setInterval(checkSleep, 200);
      }
      return;
    }
    if (AITalkFlag) return;
    $.ajax({
      url: 'https://v1.hitokoto.cn/?encode=json&charset=utf-8',
      dataType: 'json',
      timeout: 5000,
      success: function (result) {
        var hit = (result && result.hitokoto) ? result.hitokoto : localQuotes[Math.floor(Math.random() * localQuotes.length)];
        showMessage(hit, 0);
        pokeLive2d();
      },
      error: function () {
        showMessage(localQuotes[Math.floor(Math.random() * localQuotes.length)], 0);
        pokeLive2d();
      }
    });
  }

  function checkSleep() {
    if (sessionStorage.getItem('Sleepy') !== '1') {
      showMessage('你回来啦~', 0);
      clearInterval(sleepTimer_);
      sleepTimer_ = null;
    }
  }

  function showMessage(text, timeout) {
    if (Array.isArray(text)) text = text[Math.floor(Math.random() * text.length)];
    $('.message').stop();
    $('.message').html(text);
    $('.message').fadeTo(200, 1);
  }

  function hideMessage(timeout) {
    if (timeout == null) timeout = 5000;
    $('.message').delay(timeout).fadeTo(200, 0);
  }

  function initLive2d() {
    $('#hideButton').on('click', function () {
      if (AIFadeFlag) return false;
      AIFadeFlag = true;
      try { localStorage.setItem('live2dhidden', '0'); } catch (e) {}
      $('#landlord').fadeOut(200);
      $('#open_live2d').delay(200).fadeIn(200);
      setTimeout(function () { AIFadeFlag = false; }, 300);
    });
    $('#open_live2d').on('click', function () {
      if (AIFadeFlag) return false;
      AIFadeFlag = true;
      try { localStorage.setItem('live2dhidden', '1'); } catch (e) {}
      $('#open_live2d').fadeOut(200);
      $('#landlord').delay(200).fadeIn(200);
      setTimeout(function () { AIFadeFlag = false; }, 300);
    });
    $('#youduButton').on('click', function () {
      if ($('#youduButton').hasClass('doudong')) {
        var typeIs = $('#youduButton').attr('data-type');
        $('#youduButton').removeClass('doudong');
        if (typeIs) $('body').removeClass(typeIs);
        $('#youduButton').attr('data-type', '');
      } else {
        var duType = $('#duType').val() || 'douqilai,l2d_caihong';
        var duArr = duType.split(',');
        var dataType = duArr[Math.floor(Math.random() * duArr.length)];
        $('#youduButton').addClass('doudong');
        $('#youduButton').attr('data-type', dataType);
        $('body').addClass(dataType);
      }
    });

    // ---- 大小调节：右下角手柄拖动 + localStorage 记忆（0.5~2.5 倍） ----
    var remScale = 1;
    try {
      var _rs = parseFloat(localStorage.getItem('remScale'));
      if (!isNaN(_rs)) remScale = Math.min(2.5, Math.max(0.5, _rs));
    } catch (e) {}
    function applyRemSize(k, save) {
      if ($('#landlord').hasClass('rem-full')) return;
      remScale = Math.min(2.5, Math.max(0.5, k));
      var W = Math.round(250 * remScale), H = Math.round(280 * remScale);
      $('#landlord').css({ width: W + 'px', height: H + 'px' });
      $('#live2d').css({ width: W + 'px', height: H + 'px', display: '', marginLeft: '', marginRight: '', marginTop: '' });
      $('.message').css({ width: W + 'px', bottom: H + 'px' });
      if (save) { try { localStorage.setItem('remScale', String(remScale)); } catch (e) {} }
    }
    // ---- 全宽模式：移动端默认开启，桌面默认关闭；手动切换后记住选择 ----
    function isMobileWidth() {
      return window.matchMedia && window.matchMedia('(max-width: 860px)').matches;
    }
    var fullPref = null;
    try { fullPref = localStorage.getItem('remFull'); } catch (e) {}
    if (fullPref === '1' || (fullPref === null && isMobileWidth())) {
      $('#landlord').addClass('rem-full');
      layoutFull();
    } else {
      applyRemSize(remScale, false);
    }
    // 全宽 = contain：宽取 min(屏宽, 屏高*500/560)，横屏按高度收，永远完整可见并水平居中
    // 模型再缩 88% 到底对齐：底部不动，头顶让出字幕条空间
    var REM_FULL_SHRINK = 0.88;
    function layoutFull() {
      if (!$('#landlord').hasClass('rem-full')) return;
      var vw = window.innerWidth, vh = window.innerHeight;
      var w = Math.round(Math.min(vw, vh * 500 / 560));
      var h = Math.round(w * 560 / 500);
      var w2 = Math.round(w * REM_FULL_SHRINK), h2 = Math.round(h * REM_FULL_SHRINK);
      $('#landlord').css({ left: Math.round((vw - w) / 2) + 'px', bottom: '0px', width: w + 'px', height: h + 'px' });
      $('#live2d').css({ width: w2 + 'px', height: h2 + 'px', display: 'block', marginLeft: 'auto', marginRight: 'auto', marginTop: (h - h2) + 'px' });
      // 对话框走 CSS 顶部叠加，这里清掉小窗模式留下的行内定位
      $('.message').css({ width: '', bottom: '', left: '' });
      $('.live_talk_input_body').css({ width: w + 'px', left: '0px' });
    }
    window.addEventListener('resize', layoutFull);
    window.addEventListener('orientationchange', function () { setTimeout(layoutFull, 300); });
    $('#fullButton').on('click', function () {
      var land = $('#landlord');
      if (land.hasClass('rem-full')) {
        land.removeClass('rem-full');
        try { localStorage.setItem('remFull', '0'); } catch (e) {}
        // 还原拖动记忆的位置
        try {
          var lw = sessionStorage.getItem('historywidth'), lb = sessionStorage.getItem('historyheight');
          if (lw != null && lb != null) land.css({ left: parseFloat(lw) + 'px', bottom: parseFloat(lb) + 'px' });
        } catch (e) {}
        applyRemSize(remScale, false);
        showMessage('变回来了~', 0);
      } else {
        land.addClass('rem-full');
        try { localStorage.setItem('remFull', '1'); } catch (e) {}
        layoutFull();
        showMessage('变大！要抱抱吗？', 0);
      }
      pokeLive2d();
    });
    var rsz = document.getElementById('remResize');
    if (rsz) {
      // 别冒泡到 landlord 的拖动逻辑
      rsz.addEventListener('mousedown', function (e) { e.stopPropagation(); });
      rsz.addEventListener('touchstart', function (e) { e.stopPropagation(); }, { passive: true });
      rsz.addEventListener('pointerdown', function (e) {
        e.stopPropagation();
        e.preventDefault();
        if ($('#landlord').hasClass('rem-full')) return;
        var sx = e.clientX, s0 = remScale;
        function pm(ev) { applyRemSize(s0 + (ev.clientX - sx) / 250, false); }
        function pu(ev) {
          applyRemSize(s0 + (ev.clientX - sx) / 250, true);
          rsz.removeEventListener('pointermove', pm);
          rsz.removeEventListener('pointerup', pu);
          rsz.removeEventListener('pointercancel', pu);
        }
        rsz.addEventListener('pointermove', pm);
        rsz.addEventListener('pointerup', pu);
        rsz.addEventListener('pointercancel', pu);
        try { rsz.setPointerCapture(e.pointerId); } catch (err) {}
      });
    }

    // ---- 聊天： legacy talkAPI 优先，否则按 freeChatMode 走 ----
    // 聊天按钮默认显示（原来 talkAPI 为空就隐藏，现在本地规则可直接聊）
    $('#showTalkBtn').show();
    $('#showInfoBtn').hide();
    $('#showTalkBtn').off('click').on('click', function () {
      $('#live_statu_val').val('1');
      $('.live_talk_input_body').fadeIn(500);
      AITalkFlag = true;
      $('#showTalkBtn').hide();
      $('#showInfoBtn').show();
    });
    $('#showInfoBtn').off('click').on('click', function () {
      $('#live_statu_val').val('0');
      $('.live_talk_input_body').fadeOut(500);
      AITalkFlag = false;
      showHitokoto();
      $('#showTalkBtn').show();
      $('#showInfoBtn').hide();
    });

    // 蕾姆本地规则引擎：离线可用
    function localRemReply(info, username) {
      var s = String(info || '');
      var low = s.toLowerCase();
      var name = username ? '，' + username + '大人' : '';
      var who = username || '主人';
      function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
      var has = function () {
        for (var k = 0; k < arguments.length; k++) {
          if (s.indexOf(arguments[k]) > -1 || low.indexOf(String(arguments[k]).toLowerCase()) > -1) return true;
        }
        return false;
      };
      // 名言：EP18 告白等经典台词（改编为对主人说）
      var REM_QUOTES = [
        '如果不是你的话，蕾姆不要。',
        '从这里开始吧，从一开始……不，从零开始！',
        '有蕾姆在，被拯救的蕾姆，如今就在这里。',
        '只要是你的话语，无论什么蕾姆都会听，蕾姆想听。',
        '因为你是蕾姆的英雄啊！',
        '这一抹微笑，由蕾姆来守护。',
        '未来的事，如果不是笑着说可不行哦。',
        '如果觉得独自前行很辛苦，蕾姆来做你的支柱。',
        '蕾姆喜欢被摸头，仿佛能通过手掌和头发，心意相通。',
        '就算全世界都不相信你，蕾姆也会相信你。'
      ];
      if (has('名言', '语录', '台词', '告白')) return pick(REM_QUOTES);
      // 问候（按早/中/晚拆开，参考 waifu-tips 的 time 玩法；注意：可爱/摸类放问候前面，免得“你好可爱”被截胡）
      if (has('亲', '抱抱', '摸', '可爱')) return pick(['这、这样的话……蕾姆会害羞的。但是，如果是' + who + '的话，也不是不可以。', '蕾姆喜欢被摸头，仿佛能通过手掌和头发，心意相通。']);
      if (has('早上好', '早安', '早')) return pick(['早上好' + name + '！一日之计在于晨，蕾姆已经准备好早餐了。', '早安' + name + '，昨晚睡得好吗？']);
      if (has('中午好', '午安', '中午')) return pick(['中午好' + name + '，午餐要好好吃哦，蕾姆去准备。', '午安，午后容易犯困，喝杯红茶提提神吧。']);
      if (has('晚上好')) return pick(['晚上好' + name + '，今天辛苦了，蕾姆一直在等你回来。', '晚上好，窗外的月色很美呢，要一起看看吗？']);
      if (has('你好', '嗨', 'hello', 'hi', '在吗', '哈喽')) return pick(['你好' + name + '，蕾姆一直在这里等你哦。', '嗨' + name + '，找蕾姆有什么事吗？']);
      if (has('晚安', '好梦')) return pick(['晚安' + name + '，好梦。蕾姆会守着你的。', '已经这么晚了，早点休息吧，晚安。']);
      if (has('再见', '拜拜', 'bye', '走了', '下线', '回见', '白白', '886', '告辞', '闪了')) return pick(['要走了吗' + name + '？蕾姆会一直在这里等你回来。', '路上小心' + name + '，记得早点回来见蕾姆哦。']);
      // 身份与情感
      if (has('名字', '你是谁', 'who are you')) return pick(['我是蕾姆，是' + who + '的女仆。从今往后，也请多多指教。', '蕾姆是罗兹瓦尔宅邸的女仆，现在是属于' + who + '的蕾姆。']);
      if (has('结婚', '嫁', '娶', '求婚')) return '这、这种话……蕾姆、蕾姆愿意！从今往后也请一直陪在蕾姆身边。';
      if (has('想你', '思念')) return '蕾姆也一直想着' + who + '哦。只要想到你，心里就暖暖的。';
      if (has('喜欢', '爱')) return pick(['蕾姆……能得到' + who + '的喜欢，是蕾姆最大的幸福。', '蕾姆也最喜欢' + who + '了，是全世界第一喜欢。']);
      if (has('谢谢', '感谢', 'thank', '辛苦')) return pick(['能帮上' + who + '的忙，蕾姆很开心。', '不用客气，这是蕾姆应该做的。']);
      if (has('对不起', '抱歉', '道歉', '原谅')) return '没关系的' + name + '，蕾姆没有生气。笑一笑，未来的事要笑着说哦。';
      if (has('傻', '笨', '蠢', '笨蛋', '白痴')) return pick(['蕾姆确实还不够成熟……但蕾姆会努力的，请不要讨厌蕾姆。', '呜……被说了呢。不过为了' + who + '，蕾姆会加油变聪明的。']);
      if (has('漂亮', '好看', '厉害', '棒', '聪明', '夸')) return '嘿嘿，被' + who + '夸了……蕾姆今天一整天都会很开心的。';
      // 现实话题（放安慰前面：“考试加油/工作好累”优先命中具体场景）
      if (has('工作', '加班', '上班', '老板')) return pick(['工作辛苦了' + name + '，蕾姆泡了红茶，休息一下吧。', '加班也不要太勉强自己，蕾姆会心疼的。']);
      if (has('学习', '考试', '作业', '上学', '复习')) return pick(['考试加油！蕾姆相信你，从零开始也一定没问题。', '学习累了就休息一会，蕾姆陪着你。']);
      // 安慰打气：EP18 式鼓励
      if (has('难过', '伤心', '哭', '累', '加油', '打气', '安慰', '沮丧', '放弃')) return pick(['没关系的，有蕾姆在。只要是你的话语，无论什么蕾姆都会听。', '如果觉得独自前行很辛苦，蕾姆来做你的支柱，一起从零开始吧。', '放弃不适合我们哦。抬起头，笑着说未来的事吧！']);
      if (has('无聊')) return pick(['无聊的话，蕾姆陪你聊天呀。或者……要看看蕾姆的魔法吗？', '那蕾姆给你讲故事好不好？只要和' + who + '在一起就不会无聊。']);
      // 生活（好吃类放做饭前面：“好吃”含“吃”字，免得被截胡）
      if (has('好吃', '零食', '甜食', '蛋糕', '吃货', '减肥')) return pick(['说到好吃的，蕾姆做的蛋包饭可是有自信的哦。', '减肥的话……蕾姆陪你一起努力！先从少吃一块蛋糕开始？', '零食要适量哦，不过' + who + '想吃的话，蕾姆去买。']);
      if (has('饿', '吃饭', '吃', '午餐', '晚餐', '早餐')) return pick(['蕾姆去准备饭菜，' + who + '稍等一下哦。', '肚子饿了吗？蕾姆的拿手菜马上就好。']);
      if (has('渴', '喝水', '口渴', '喝点', '饮料', '可乐', '奶茶', '咖啡', '茶')) return pick(['蕾姆去泡红茶，稍等一下哦。奶茶的话……下次和' + who + '一起去买吧。', '多喝热水哦，蕾姆会监督你的。']);
      if (has('睡', '困', '熬夜', '失眠')) return pick(['夜深了，早点休息吧。蕾姆会守着你的。', '熬夜对身体不好哦，蕾姆会生气的……快去睡吧。']);
      if (has('病', '感冒', '发烧', '难受', '头疼')) return '生病了吗？快躺下休息，蕾姆去拿药和热水。一定会好起来的。';
      if (has('天气', '下雨', '冷', '热', '雪', '晴', '雨伞', '带伞', '台风', '打雷')) return pick(['窗外的天气，蕾姆也很在意呢。出门的话要注意身体哦。', '这种天气，更要好好保暖/防暑，蕾姆会担心的。', '下雨的话记得带伞哦，淋湿了蕾姆会心疼的。']);
      if (has('时间', '几点', '日期', '今天')) return '现在是' + (new Date()).getHours() + '点，' + who + '要注意休息哦。';
      if (has('生日', '庆祝')) return '生日快乐' + name + '！蕾姆准备了蛋糕，能笑着许愿吗？';
      if (has('新年', '圣诞', '节日', '过年')) return '节日快乐' + name + '！能和你一起过节，蕾姆很幸福。';
      // 日常闲聊（非二次元）：普通话套上蕾姆语气
      if (has('在干嘛', '在做啥', '干什么', '忙啥', '忙什么')) return pick(['蕾姆在擦拭流星锤，随时待命哦。', '在想' + who + '呀。还有……在等你和蕾姆说话。', '刚打扫完宅邸，现在是蕾姆的待命时间。']);
      if (has('周末', '放假', '休息', '假期', '调休')) return pick(['放假了' + name + '？要和蕾姆一起度过吗？蕾姆哪里都不去，就陪着你。', '休息日也要好好睡觉、好好吃饭，这是蕾姆的规定。']);
      if (has('出门', '出差', '路上小心')) return pick(['出门注意安全' + name + '，早点回来哦，蕾姆会准备好晚饭等你。', '路上小心，到了记得告诉蕾姆一声。']);
      if (has('回家', '回来', '到家')) return pick(['欢迎回来' + name + '！辛苦了，先喝杯茶吧。', '你回来了！蕾姆一直在等你哦，饭菜还热着。']);
      if (has('洗澡', '洗漱', '刷牙')) return pick(['泡个热水澡放松一下吧，蕾姆去准备换洗衣服。', '洗漱完早点睡哦，蕾姆会来道晚安的。']);
      if (has('运动', '跑步', '健身', '锻炼')) return pick(['运动加油！蕾姆在终点准备了毛巾和水等你。', '适度运动对身体好，蕾姆陪你一起做热身操吧，一、二……']);
      if (has('快递', '买东西', '网购', '淘宝', '包裹', '外卖')) return pick(['买买买也要适度哦……不过是' + who + '的话，蕾姆帮你拆快递！', '外卖到了吗？趁热吃，别饿着。']);
      if (has('手机', '电脑', '平板', '耳机')) return pick(['一直盯着屏幕眼睛会累哦，看看蕾姆休息一下吧。', '手机先放一放，陪蕾姆说会话嘛。']);
      if (has('拍照', '拍张', '自拍', '照片', '合影')) return pick(['要拍照吗？蕾姆站好……三、二、一，茄子！', '和' + who + '的合影，蕾姆会好好珍藏的。']);
      if (has('哈哈', '呵呵', '嘿嘿', '笑死', '好笑')) return pick(['嘿嘿，' + who + '笑了，蕾姆也跟着开心起来了。', '笑起来最好看了，要一直笑着哦。']);
      // 现实话题
      if (has('游戏', '打游戏', '玩游戏')) return '打游戏的话也带上蕾姆吧！虽然可能会拖后腿……蕾姆会努力的。';
      if (has('电影', '动漫', '番', '剧')) return '要一起看吗？蕾姆去准备点心，靠着' + who + '看一定很开心。';
      // 才艺
      if (has('笑话')) return pick(['那蕾姆讲一个：为什么鬼不会迷路？因为……有“鬼”点子！不好笑吗……呜。', '姐姐说蕾姆没有幽默感……' + who + '笑了的话，蕾姆就满足了。']);
      if (has('故事', '讲')) return '那蕾姆讲一个鬼村的故事……开玩笑的。只要和' + who + '在一起，就是最好的故事。';
      if (has('唱歌', '歌', '音乐', '听歌')) return pick(['蕾姆唱歌不好听……但如果是为' + who + '唱的话，蕾姆愿意试试，啦啦啦~', '想听歌的话，蕾姆哼一首摇篮曲给你听吧。']);
      // 原作世界
      if (has('生气', '角')) return '那个……如果太过强硬，蕾姆会不自觉长出角的！要温柔一点哦。';
      if (has('讨厌')) return '蕾姆惹' + who + '生气了吗……对不起，蕾姆会改的，请不要讨厌蕾姆。';
      if (has('魔法', '技能', '冰', '流星锤')) return pick(['蕾姆会用冰系魔法和流星锤，一定会保护好' + who + '的！', '要看看蕾姆的魔法吗？艾尔·修玛！']);
      if (has('拉姆', '姐姐')) return pick(['姐姐是蕾姆最尊敬的人。蕾姆还差得很远，还要继续努力。', '姐姐大人很温柔的，虽然毒舌了一点……嘿嘿。']);
      if (has('昴', '斯巴鲁', '巴鲁斯')) return pick(['昴是拯救了蕾姆的英雄，是蕾姆的英雄。', '昴的话，一定还在努力吧。蕾姆相信他。']);
      if (has('艾米', '爱蜜', 'emilia', 'emt')) return '艾米莉亚大人很温柔，像太阳一样。蕾姆也会努力守护这份温柔的。';
      if (has('碧翠', '贝蒂', '帕克', '罗兹', '白鲸', '魔女', '怠惰', '死亡回归')) return '那是段很长很长的故事……今晚靠着蕾姆，慢慢讲给你听好吗？';
      if (s.length <= 3) return pick(['嗯嗯，蕾姆在听' + name + '说哦。再多讲一点吧？', name + '是在叫蕾姆吗？蕾姆在哦。']);
      var fallbacks = [
        '原来如此' + name + '，蕾姆记下了。能和你聊天，蕾姆很开心。',
        '这样呀……蕾姆虽然不太懂，但会一直陪着' + who + '的。',
        '嗯，蕾姆明白了。如果有什么吩咐，请尽管告诉蕾姆。',
        '蕾姆是' + who + '的女仆，无论什么事都会努力去做。',
        '嘿嘿，能和' + who + '说话，就是蕾姆一天中最开心的事。',
        '这件事，蕾姆会记在心里。还有什么想和蕾姆说的吗？',
        '嗯……有点难呢，但蕾姆会努力理解' + who + '的心情的。',
        '对了' + name + '，输入“名言”可以听蕾姆的真心话哦。'
      ];
      return pick(fallbacks);
    }

    function replyWithFreeAPI(info, username, done) {
      var prompt = '用户[' + (username || '主人') + ']说：' + info;
      // 1) Puter.js：真正无key直连，访客用自己的 Puter 额度
      if (freeChatMode === 'puter' && window.puter && puter.ai && puter.ai.chat) {
        puter.ai.chat([{ role: 'system', content: REM_SYSTEM }, { role: 'user', content: prompt }],
          { model: freeChatConfig.model || 'gpt-5-nano' })
          .then(function (res) {
            var t = '';
            try {
              if (typeof res === 'string') t = res;
              else if (res.message && res.message.content) t = typeof res.message.content === 'string' ? res.message.content : res.message.content[0].text;
              else if (res.text) t = res.text;
            } catch (e) {}
            done(t || localRemReply(info, username));
          })
          .catch(function () { done(localRemReply(info, username)); });
        return true;
      }
      // 2) Gemini 免费key直连（需在 freeChatConfig.geminiKey 填 AIza...，CORS 允许）
      if (freeChatMode === 'gemini' && freeChatConfig.geminiKey) {
        fetch('https://generativelanguage.googleapis.com/v1beta/models/' +
          (freeChatConfig.geminiModel || 'gemini-2.0-flash') + ':generateContent?key=' + freeChatConfig.geminiKey, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ system_instruction: { parts: [{ text: REM_SYSTEM }] }, contents: [{ parts: [{ text: prompt }] }] })
        }).then(function (r) { return r.json(); }).then(function (j) {
          var t = j && j.candidates && j.candidates[0] && j.candidates[0].content &&
            j.candidates[0].content.parts && j.candidates[0].content.parts[0].text;
          done(t || localRemReply(info, username));
        }).catch(function () { done(localRemReply(info, username)); });
        return true;
      }
      // 3) Groq / OpenRouter（OpenAI 兼容，需自己的免费key，CORS 允许，key 会暴露，仅适合玩具）
      var openaiBase = freeChatMode === 'groq' ? 'https://api.groq.com/openai/v1/chat/completions'
        : freeChatMode === 'openrouter' ? 'https://openrouter.ai/api/v1/chat/completions' : null;
      var openaiKey = freeChatMode === 'groq' ? freeChatConfig.groqKey : freeChatConfig.openrouterKey;
      if (openaiBase && openaiKey) {
        fetch(openaiBase, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + openaiKey },
          body: JSON.stringify({
            model: freeChatConfig.model || (freeChatMode === 'groq' ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-3.3-70b-instruct:free'),
            messages: [{ role: 'system', content: REM_SYSTEM }, { role: 'user', content: prompt }],
            temperature: 0.8
          })
        }).then(function (r) { return r.json(); }).then(function (j) {
          var t = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
          done(t || localRemReply(info, username));
        }).catch(function () { done(localRemReply(info, username)); });
        return true;
      }
      return false;
    }

    function doSend() {
      var info_ = $('#AIuserText').val();
      var userid_ = $('#AIuserName').val();
      if (!info_) { showMessage('写点什么吧！', 0); return; }
      if (!userid_) { showMessage('聊之前请告诉我你的名字吧！', 0); return; }
      try { sessionStorage.setItem('live2duser', userid_); } catch (e) {}
      showMessage('思考中~', 0);
      // A. 老接口（图灵 {code:100000,text}）优先，保持兼容
      if (typeof talkAPI !== 'undefined' && talkAPI !== '') {
        $.ajax({
          type: 'POST', url: talkAPI,
          data: { info: info_, userid: userid_ },
          success: function (res) {
            showMessage((res && res.code === 100000) ? res.text : '似乎有什么错误，请和站长联系！', 0);
            pokeLive2d();
            $('#AIuserText').val('');
          },
          error: function () { showMessage(localRemReply(info_, userid_), 0); pokeLive2d(); $('#AIuserText').val(''); }
        });
        return;
      }
      // B. 免费直连 API，失败自动回落本地
      var handled = replyWithFreeAPI(info_, userid_, function (text) {
        showMessage(text, 0);
        pokeLive2d();
        $('#AIuserText').val('');
      });
      // C. 纯本地（默认）：假装思考 600ms
      if (!handled) {
        setTimeout(function () {
          showMessage(localRemReply(info_, userid_), 0);
          pokeLive2d();
          $('#AIuserText').val('');
        }, 600);
      }
    }
    $('#talk_send').off('click').on('click', doSend);
    $('#AIuserText').off('keydown').on('keydown', function (e) {
      if (e.key === 'Enter') doSend();
    });

    // BGM：没有 <input name=live2dBGM> 就隐藏按钮
    var bgmListInfo = $('input[name=live2dBGM]');
    if (bgmListInfo.length === 0) {
      $('#musicButton').hide();
    } else {
      $('#musicButton').on('click', function () {
        var audio = $('#live2d_bgm')[0];
        if (!audio || !audio.src) { showMessage('还没有添加音乐地址呢！', 0); return; }
        if ($('#musicButton').hasClass('play')) { audio.pause(); $('#musicButton').removeClass('play'); }
        else { audio.play().catch(function () { showMessage('浏览器阻止了自动播放，点一下再试试~', 0); }); $('#musicButton').addClass('play'); }
      });
    }

    try {
      var live2dUser = sessionStorage.getItem('live2duser');
      if (live2dUser !== null) $('#AIuserName').val(live2dUser);
    } catch (e) {}

    // 位置恢复（修复原来 5pxpx bug）
    function normPos(v, fallback) {
      if (v == null || v === '') return fallback;
      var n = parseFloat(String(v).replace('px', ''));
      return isNaN(n) ? fallback : n;
    }
    var landL = 5, landB = 0;
    try {
      landL = normPos(sessionStorage.getItem('historywidth'), 5);
      landB = normPos(sessionStorage.getItem('historyheight'), 0);
    } catch (e) {}
    $('#landlord').css('left', landL + 'px');
    $('#landlord').css('bottom', landB + 'px');

    // 拖动：鼠标 + 触屏
    var smcc = document.getElementById('landlord');
    var moveX = 0, moveY = 0, moveBottom = 0, moveLeft = 0, moveable = false;
    function startMove(clientX, clientY) {
      moveable = true;
      moveX = clientX; moveY = clientY;
      moveBottom = parseInt(smcc.style.bottom || '0', 10);
      moveLeft = parseInt(smcc.style.left || '0', 10);
    }
    function onMove(clientX, clientY) {
      if (!moveable) return;
      smcc.style.left = (moveLeft + clientX - moveX) + 'px';
      smcc.style.bottom = (moveBottom + (moveY - clientY)) + 'px';
    }
    function endMove() {
      if (!moveable) return;
      moveable = false;
      try {
        sessionStorage.setItem('historywidth', String(smcc.style.left).replace('px', ''));
        sessionStorage.setItem('historyheight', String(smcc.style.bottom).replace('px', ''));
      } catch (e) {}
    }
    smcc.addEventListener('mousedown', function (e) { startMove(e.clientX, e.clientY); });
    document.addEventListener('mousemove', function (e) { onMove(e.clientX, e.clientY); });
    document.addEventListener('mouseup', endMove);
    smcc.addEventListener('touchstart', function (e) {
      var t = e.touches[0];
      startMove(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchmove', function (e) {
      if (!moveable) return;
      var t = e.touches[0];
      onMove(t.clientX, t.clientY);
    }, { passive: true });
    document.addEventListener('touchend', endMove);
  }

  $(document).ready(function () {
    var AIimgSrc = [message_Path + 'model/rem/remu2048/texture_00.png'];
    var images = [];
    var loadingNum = 0;
    for (var i = 0; i < AIimgSrc.length; i++) {
      images[i] = new Image();
      images[i].src = AIimgSrc[i];
      images[i].onload = images[i].onerror = function () {
        loadingNum++;
        if (loadingNum === AIimgSrc.length) {
          var hidden = null;
          try { hidden = localStorage.getItem('live2dhidden'); } catch (e) {}
          if (hidden === '0') { setTimeout(function () { $('#open_live2d').fadeIn(200); }, 300); }
          else { setTimeout(function () { $('#landlord').fadeIn(200); }, 300); }
          setTimeout(function () {
            try { loadlive2d('live2d', message_Path + 'model/rem/rem.json'); }
            catch (e) { showMessage('模型加载失败，看看控制台是不是 404？', 0); console.error(e); }
          }, 500);
          initLive2d();
        }
      };
    }
  });
})();
