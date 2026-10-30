/**
 * AI 综测咨询助手（全站共用浮动组件）。
 * 依赖：config.js（window.API_BASE）、auth.js（window.ZCAuth 会话）。
 * 在 teacher.html / student.html 引入后自动挂载右下角浮动按钮与聊天面板，
 * 调用后端 POST /api/ai/ask（RAG 检索《学生综合素质测评实施办法》+ 联网参考 + glm-4-flash 作答）。
 */
(function () {
  var panel, msgs, input, sendBtn, webChk, fab, busy = false;
  var history = []; // [{role, content}]，仅保留最近 6 条随请求发送

  var QUICK = [
    '这个证书怎么加分？',
    '综测总分是怎么计算的？',
    '德育奖励分上限是多少？',
    '学科技能竞赛怎么加分？',
    '申报加分需要哪些材料？',
  ];

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /** 轻量 markdown 渲染（标题 / 粗体 / 列表 / 换行），先转义防注入 */
  function md(s) {
    var t = esc(s);
    t = t.replace(/```([\s\S]*?)```/g, function (_, c) { return '<pre>' + c.replace(/^\n+|\n+$/g, '') + '</pre>'; });
    t = t.replace(/^###\s?(.+)$/gm, '<b>$1</b>')
      .replace(/^##\s?(.+)$/gm, '<b>$1</b>')
      .replace(/^#\s?(.+)$/gm, '<b>$1</b>')
      .replace(/\*\*([^*\n]+)\*\*/g, '<b>$1</b>')
      .replace(/^\s*[-*·]\s+(.+)$/gm, '<span class="zcai-li">$1</span>')
      .replace(/^\s*(\d+)[.、]\s+(.+)$/gm, '<span class="zcai-li"><i>$1.</i> $2</span>');
    return t.split(/\n{2,}/).map(function (p) {
      return '<p>' + p.replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function inject() {
    var css = document.createElement('style');
    css.textContent = [
      '.zcai-fab{position:fixed;right:22px;bottom:22px;z-index:9998;width:56px;height:56px;border-radius:50%;',
      'border:none;cursor:pointer;color:#fff;font-size:24px;background:linear-gradient(135deg,#4f7cff,#8a5cff);',
      'box-shadow:0 6px 20px rgba(79,124,255,.45);transition:transform .15s}',
      '.zcai-fab:hover{transform:scale(1.08)}',
      '.zcai-panel{position:fixed;right:22px;bottom:88px;z-index:9999;width:392px;max-width:calc(100vw - 32px);',
      'height:600px;max-height:calc(100vh - 120px);display:none;flex-direction:column;border-radius:16px;overflow:hidden;',
      'background:#fff;border:1px solid #e3e8f5;box-shadow:0 16px 48px rgba(30,50,120,.22);font-family:inherit}',
      '.zcai-panel.open{display:flex}',
      '.zcai-head{display:flex;align-items:center;gap:10px;padding:14px 16px;color:#fff;background:linear-gradient(135deg,#4f7cff,#8a5cff)}',
      '.zcai-head .t{font-size:15px;font-weight:700;flex:1}',
      '.zcai-head .sub{font-size:11px;opacity:.85;margin-top:2px}',
      '.zcai-close{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;padding:2px 6px}',
      '.zcai-msgs{flex:1;overflow-y:auto;padding:14px;background:#f6f8fd;font-size:13px;line-height:1.65}',
      '.zcai-m{margin-bottom:12px;display:flex}',
      '.zcai-m .b{max-width:86%;padding:9px 12px;border-radius:12px;white-space:pre-wrap;word-break:break-word}',
      '.zcai-m.me{justify-content:flex-end}',
      '.zcai-m.me .b{background:#4f7cff;color:#fff;border-bottom-right-radius:4px}',
      '.zcai-m.ai .b{background:#fff;color:#1c2333;border:1px solid #e3e8f5;border-bottom-left-radius:4px}',
      '.zcai-m .b p{margin:0 0 6px}.zcai-m .b p:last-child{margin:0}',
      '.zcai-m .b pre{background:#f0f2f8;padding:8px;border-radius:8px;overflow-x:auto;font-size:12px;margin:4px 0}',
      '.zcai-li{display:block;padding-left:2px}',
      '.zcai-src{margin-top:6px;font-size:11px;color:#7a8699}',
      '.zcai-cursor{display:inline-block;color:#4f7cff;animation:zcai-blink 1s steps(2) infinite}',
      '@keyframes zcai-blink{50%{opacity:0}}',
      '.zcai-src b{color:#4f7cff;font-weight:600}',
      '.zcai-quick{padding:8px 12px;display:flex;flex-wrap:wrap;gap:6px;border-top:1px solid #eef1f8;background:#fff}',
      '.zcai-quick button{font-size:11px;padding:4px 9px;border-radius:999px;border:1px solid #cdd8f5;background:#f4f7ff;',
      'color:#3b62c4;cursor:pointer}.zcai-quick button:hover{background:#e6edff}',
      '.zcai-foot{display:flex;align-items:center;gap:8px;padding:10px 12px;border-top:1px solid #eef1f8;background:#fff}',
      '.zcai-foot input[type=text]{flex:1;border:1px solid #d8dfef;border-radius:10px;padding:9px 11px;font-size:13px;outline:none}',
      '.zcai-foot input[type=text]:focus{border-color:#4f7cff}',
      '.zcai-send{border:none;border-radius:10px;padding:9px 14px;color:#fff;font-size:13px;cursor:pointer;',
      'background:linear-gradient(135deg,#4f7cff,#8a5cff)}',
      '.zcai-send:disabled{opacity:.5;cursor:not-allowed}',
      '.zcai-web{font-size:11px;color:#7a8699;display:flex;align-items:center;gap:4px;white-space:nowrap}',
      '.zcai-hint{font-size:11px;color:#98a2b3;padding:0 12px 8px;background:#fff}',
      '@media(max-width:480px){.zcai-panel{right:16px;bottom:84px;height:calc(100vh - 140px)}}',
    ].join('');
    document.head.appendChild(css);

    fab = document.createElement('button');
    fab.className = 'zcai-fab';
    fab.title = 'AI 综测助手';
    fab.textContent = '🤖';
    fab.addEventListener('click', toggle);
    document.body.appendChild(fab);

    panel = document.createElement('div');
    panel.className = 'zcai-panel';
    panel.innerHTML =
      '<div class="zcai-head"><div style="font-size:22px">🤖</div><div style="flex:1">' +
      '<div class="t">AI 综测助手</div><div class="sub">依据《湖南民族职业学院学生综合素质测评实施办法》与联网检索作答</div></div>' +
      '<button class="zcai-close" title="收起">✕</button></div>' +
      '<div class="zcai-msgs"></div>' +
      '<div class="zcai-quick">' + QUICK.map(function (q) { return '<button data-q="' + esc(q) + '">' + esc(q) + '</button>'; }).join('') + '</div>' +
      '<div class="zcai-foot"><label class="zcai-web"><input type="checkbox" checked>联网</label>' +
      '<input type="text" placeholder="如：普通话二甲加几分？">' +
      '<button class="zcai-send">发送</button></div>' +
      '<div class="zcai-hint">AI 生成内容仅供参考，最终以学校文件与学院通知为准</div>';
    document.body.appendChild(panel);

    msgs = panel.querySelector('.zcai-msgs');
    input = panel.querySelector('.zcai-foot input[type=text]');
    sendBtn = panel.querySelector('.zcai-send');
    webChk = panel.querySelector('.zcai-web input');
    panel.querySelector('.zcai-close').addEventListener('click', toggle);
    sendBtn.addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
    panel.querySelectorAll('.zcai-quick button').forEach(function (b) {
      b.addEventListener('click', function () { ask(b.getAttribute('data-q')); });
    });
    bubble('ai', '你好，我是 AI 综测助手 🤖\n可以问我「某证书 / 奖项 / 活动怎么加分」「综测总分怎么算」等问题，我会依据《学生综合素质测评实施办法》给出参考建议。');
  }

  function toggle() { panel.classList.toggle('open'); if (panel.classList.contains('open')) input.focus(); }

  function bubble(role, html, sources) {
    var m = document.createElement('div');
    m.className = 'zcai-m ' + (role === 'me' ? 'me' : 'ai');
    var inner = role === 'me' ? esc(html) : md(html);
    if (sources && sources.length) {
      inner += '<div class="zcai-src">依据：<b>' + sources.map(function (s) { return esc(s.title); }).join('</b>、<b>') + '</b></div>';
    }
    m.innerHTML = '<div class="b">' + inner + '</div>';
    msgs.appendChild(m);
    msgs.scrollTop = msgs.scrollHeight;
    return m;
  }

  function thinking() {
    var m = bubble('ai', '正在查阅《测评办法》并分析…');
    m.classList.add('loading');
    return m;
  }

  /** 渲染最终回答（含依据条款与联网参考链接） */
  function renderFinal(tip, answer, sources, web) {
    tip.querySelector('.b').innerHTML = md(answer) +
      '<div class="zcai-src">依据：<b>' + (sources || []).map(function (x) { return esc(x.title); }).join('</b>、<b>') + '</b></div>' +
      ((web || []).length ? '<div class="zcai-src">联网参考：' + web.slice(0, 3).map(function (w) {
        return '<a href="' + esc(w.link) + '" target="_blank" rel="noopener" style="color:#4f7cff">' + esc(w.title || w.link) + '</a>';
      }).join('、') + '</div>' : '');
    msgs.scrollTop = msgs.scrollHeight;
  }

  function pushHistory(q, answer) {
    history.push({ role: 'user', content: q }, { role: 'assistant', content: answer });
    if (history.length > 12) history = history.slice(-12);
  }

  async function ask(question) {
    if (busy) return;
    var q = String(question || '').trim();
    if (!q) return;
    busy = true;
    sendBtn.disabled = true;
    bubble('me', q);
    input.value = '';
    var tip = thinking();
    try {
      var s = window.ZCAuth && window.ZCAuth.readSession();
      if (!s || !s.token) throw new Error('登录已失效，请重新登录');
      var resp = await fetch((window.API_BASE || '') + '/api/ai/ask/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.token },
        body: JSON.stringify({ question: q, history: history.slice(-6), web: webChk.checked }),
      });
      var ctype = resp.headers.get('content-type') || '';
      // 回退：后端未升级或参数错误时返回 JSON
      if (!resp.ok || ctype.indexOf('text/event-stream') < 0) {
        var jr = await resp.json();
        if (jr.code !== 0) throw new Error(jr.msg || '请求失败');
        renderFinal(tip, jr.data.answer, jr.data.sources, jr.data.web);
        pushHistory(q, jr.data.answer);
        return;
      }
      // 流式读取 SSE：data: {"meta":...} / {"delta":"片段"} / {"done":true} / {"error":...}
      var reader = resp.body.getReader();
      var dec = new TextDecoder();
      var buf = '', text = '', meta = null, done = false;
      var body = tip.querySelector('.b');
      for (;;) {
        var r = await reader.read();
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        var parts = buf.split('\n\n');
        buf = parts.pop();
        for (var i = 0; i < parts.length; i++) {
          var line = parts[i].trim();
          if (line.indexOf('data:') !== 0) continue;
          var payload = line.slice(5).trim();
          if (!payload || payload === '[DONE]') continue;
          var ev;
          try { ev = JSON.parse(payload); } catch (e) { continue; }
          if (ev.error) throw new Error(ev.error);
          if (ev.meta) { meta = ev.meta; continue; }
          if (ev.delta) {
            text += ev.delta;
            body.innerHTML = md(text) + '<span class="zcai-cursor">▍</span>';
            msgs.scrollTop = msgs.scrollHeight;
          }
          if (ev.done) done = true;
        }
      }
      if (!text && !done) throw new Error('未收到回答内容');
      renderFinal(tip, text || '（本次未生成内容，请重试）', meta && meta.sources, meta && meta.web);
      pushHistory(q, text);
    } catch (e) {
      tip.querySelector('.b').innerHTML = '<span style="color:#c0392b">出错了：' + esc(e.message) + '</span>';
    } finally {
      busy = false;
      sendBtn.disabled = false;
    }
  }

  function submit() { ask(input.value); }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }
})();
