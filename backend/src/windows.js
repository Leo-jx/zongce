/**
 * 申报填报时间窗口（apply_windows）统一校验。
 *
 * 约定：窗口时间统一存北京时间字符串（YYYY-MM-DD HH:MM:SS），校验时按 UTC+8 计算当前时间
 * （D1 中 created_at 等其余字段仍为 UTC，互不影响）。
 *
 * 规则：
 *   - 按账号配置与按角色配置相互独立，命中任一启用窗口即可填报；
 *   - 同一角色 / 账号可配置多条窗口，当前时间落入任意一条启用窗口即视为开放；
 *   - 完全没有启用中的窗口配置时，不做限制（保持系统原有行为，配置即生效）。
 */
import { now } from './db.js';

/** 北京时间（UTC+8）当前时刻，格式与 now() 一致：YYYY-MM-DD HH:MM:SS */
export function bjNow() {
  return new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

export function windowTermLabel(w) {
  const t = Number(w.term);
  if (t === 0) return (w.academic_year || '?') + '学年（整学年）';
  return (w.academic_year || '?') + '学年第' + (t === 2 ? '二' : '一') + '学期';
}

/** 查询某账号（含其角色）当前所有启用中的窗口（role='all' 的窗口对所有角色生效） */
export async function activeWindows(db, account, role) {
  return db.query(
    `SELECT * FROM apply_windows
      WHERE enabled = 1 AND ((scope = 'role' AND (role = ? OR role = 'all')) OR (scope = 'account' AND account = ?))
      ORDER BY start_at ASC`,
    [role, account]
  );
}

/**
 * 校验当前是否可填报。
 * 返回 { allowed, reason, current, windows }
 *   allowed=true            —— 未配置窗口（不限时）或当前时间落在某条窗口内
 *   allowed=false + reason  —— 受限说明文案（前端可直接展示）
 *   current                 —— 当前正处的窗口（若有）
 */
export async function checkApplyWindow(db, account, role) {
  const windows = await activeWindows(db, account, role);
  if (!windows.length) return { allowed: true, reason: '', current: null, windows: [] };
  const ts = bjNow();
  const current = windows.find(w => w.start_at <= ts && ts <= w.end_at) || null;
  if (current) return { allowed: true, reason: '', current, windows };
  const fmt = s => String(s || '').slice(0, 16);
  const next = windows.find(w => w.start_at > ts) || null;
  let reason;
  if (next) {
    reason = '当前不在可填报时间窗口内。下一窗口：' + windowTermLabel(next)
      + '（' + fmt(next.start_at) + ' ~ ' + fmt(next.end_at) + '），如有疑问请联系管理员';
  } else {
    const last = windows[windows.length - 1];
    reason = '本' + (last.scope === 'account' ? '账号' : '角色') + '的填报窗口均已截止'
      + '（最近窗口 ' + windowTermLabel(last) + ' 于 ' + fmt(last.end_at) + ' 结束），如有疑问请联系管理员';
  }
  return { allowed: false, reason, current: null, windows };
}
