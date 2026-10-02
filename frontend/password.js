/**
 * 修改本人密码弹窗 —— 学生端 / 教师端 / 超级管理员端共用。
 *
 * 用法：
 *   ZCPassword.open({ token: TOKEN, apiBase: API, onSuccess: msg=>toast(msg,'ok') });
 *
 * 自带内联样式的模态框，因此不依赖各页面的 .overlay / .dialog 样式。
 */
(function (global) {
  var MIN_LEN = 6;
  var el = null;

  function ensureDialog() {
    if (el) return el;
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(16,28,44,.5);display:none;align-items:center;justify-content:center;z-index:9999';
    wrap.innerHTML =
      '<div style="background:#fff;border-radius:12px;width:min(420px,92vw);box-shadow:0 18px 50px rgba(16,28,44,.28);overflow:hidden">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #e3e9f0">'
      + '<h3 style="margin:0;font-size:15px;color:#1b5fa8">修改密码</h3>'
      + '<button data-pwd-close style="border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:#93a2b3">×</button>'
      + '</div>'
      + '<div style="padding:16px 18px">'
      + '<label style="display:block;font-size:12.5px;color:#5a6b7f;margin-bottom:4px">原密码</label>'
      + '<input type="password" data-pwd-old autocomplete="current-password" style="width:100%;border:1px solid #c9d4e0;border-radius:8px;padding:8px 10px;font-size:14px;margin-bottom:10px">'
      + '<label style="display:block;font-size:12.5px;color:#5a6b7f;margin-bottom:4px">新密码</label>'
      + '<input type="password" data-pwd-new autocomplete="new-password" style="width:100%;border:1px solid #c9d4e0;border-radius:8px;padding:8px 10px;font-size:14px;margin-bottom:10px">'
      + '<label style="display:block;font-size:12.5px;color:#5a6b7f;margin-bottom:4px">确认新密码</label>'
      + '<input type="password" data-pwd-new2 autocomplete="new-password" style="width:100%;border:1px solid #c9d4e0;border-radius:8px;padding:8px 10px;font-size:14px">'
      + '<div data-pwd-err style="display:none;margin-top:10px;font-size:12.5px;color:#c0354e"></div>'
      + '<div style="margin-top:6px;font-size:12px;color:#93a2b3">新密码至少 ' + MIN_LEN + ' 位，修改后用新密码登录。</div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end;padding:12px 18px;border-top:1px solid #e3e9f0;background:#f7fafd">'
      + '<button data-pwd-cancel style="border:1px solid #c9d4e0;background:#fff;color:#1b5fa8;border-radius:8px;padding:7px 16px;font-size:13px;cursor:pointer">取消</button>'
      + '<button data-pwd-save style="border:0;background:#1b5fa8;color:#fff;border-radius:8px;padding:7px 16px;font-size:13px;cursor:pointer">保存</button>'
      + '</div>'
      + '</div>';
    document.body.appendChild(wrap);
    el = wrap;
    return wrap;
  }

  function showError(msg) {
    var box = el.querySelector('[data-pwd-err]');
    box.textContent = msg || '';
    box.style.display = msg ? 'block' : 'none';
  }

  function close() {
    if (!el) return;
    el.style.display = 'none';
    ['[data-pwd-old]', '[data-pwd-new]', '[data-pwd-new2]'].forEach(function (sel) {
      el.querySelector(sel).value = '';
    });
    showError('');
  }

  /**
   * @param {{token:string, apiBase?:string, onSuccess?:Function}} opt
   */
  function open(opt) {
    opt = opt || {};
    var dlg = ensureDialog();
    dlg.style.display = 'flex';
    dlg.querySelector('[data-pwd-old]').focus();

    dlg.querySelector('[data-pwd-close]').onclick = close;
    dlg.querySelector('[data-pwd-cancel]').onclick = close;

    dlg.querySelector('[data-pwd-save]').onclick = async function () {
      var oldPwd = dlg.querySelector('[data-pwd-old]').value;
      var newPwd = dlg.querySelector('[data-pwd-new]').value;
      var newPwd2 = dlg.querySelector('[data-pwd-new2]').value;
      var btn = this;

      showError('');
      if (!oldPwd || !newPwd) { showError('请输入原密码与新密码'); return; }
      if (newPwd.length < MIN_LEN) { showError('新密码至少 ' + MIN_LEN + ' 位'); return; }
      if (newPwd !== newPwd2) { showError('两次输入的新密码不一致'); return; }
      if (oldPwd === newPwd) { showError('新密码不能与原密码相同'); return; }

      btn.disabled = true;
      btn.textContent = '保存中...';
      try {
        var res = await fetch((opt.apiBase || '') + '/api/auth/password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (opt.token || '') },
          body: JSON.stringify({ oldPassword: oldPwd, newPassword: newPwd })
        });
        var out = await res.json();
        if (out.code !== 0) throw new Error(out.msg || '修改失败');
        close();
        if (typeof opt.onSuccess === 'function') opt.onSuccess('密码修改成功');
      } catch (e) {
        showError(e.message || '修改失败');
      } finally {
        btn.disabled = false;
        btn.textContent = '保存';
      }
    };
  }

  global.ZCPassword = { open: open, close: close };
})(window);
