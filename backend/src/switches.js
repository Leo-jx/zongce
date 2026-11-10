/**
 * 填报权限开关（system_switches）统一读取与判定。
 *
 * 权限项（缺行视为开启，默认全开）：
 *   apply_submit     学生填报申请 —— 学生提交加分申请、上传证明材料
 *   apply_review     教师审核申请 —— 辅导员/教师通过或驳回申请
 *   apply_edit       数据编辑维护 —— 学生信息/成绩编辑、批量操作、班级管理、学生导入
 *   attendance_write 考勤登记     —— 考勤登记与修改
 *
 * 规则：
 *   - 关闭仅限制「写操作」，查询 / 导出等只读功能不受影响；
 *   - 超级管理员不受开关限制（管理行为必须始终可用）；
 *   - 与「填报时间窗口」叠加生效：两道闸门均放行时操作才被允许；
 *   - 关闭不影响已提交申请、已审核结果等存量数据，恢复开启后流程无缝继续。
 */
import { now } from './db.js';
import { fail } from './http.js';

export const SWITCH_DEFS = [
  { key: 'apply_submit', label: '学生填报申请', scope: '学生端', desc: '学生提交加分申请与上传证明材料' },
  { key: 'apply_review', label: '教师审核申请', scope: '教师端', desc: '辅导员 / 教师对申请进行通过或驳回' },
  { key: 'apply_edit', label: '数据编辑维护', scope: '教师端', desc: '学生信息 / 成绩编辑、批量操作、班级管理与学生导入' },
  { key: 'attendance_write', label: '考勤登记', scope: '教师端', desc: '考勤登记与修改' },
];

const SWITCH_KEYS = SWITCH_DEFS.map(s => s.key);

/** 读取全部开关状态（缺行视为开启） */
export async function getSwitches(db) {
  const rows = await db.query('SELECT * FROM system_switches');
  const map = {};
  for (const def of SWITCH_DEFS) {
    const row = rows.find(r => r.key === def.key);
    map[def.key] = {
      ...def,
      enabled: row ? Number(row.enabled) === 1 : true,
      updated_by: row ? row.updated_by : '',
      updated_at: row ? row.updated_at : '',
    };
  }
  return map;
}

/** 单项判定：开关是否放行（管理员始终放行） */
export async function allow(ctx, key) {
  if (ctx.user.role === 'admin') return true;
  const map = await getSwitches(ctx.db);
  const sw = map[key];
  return !sw || sw.enabled;
}

/**
 * 开关闸门：未放行时返回 403 响应，放行返回 null。
 * @param {object} ctx  请求上下文（需含 user / db / env）
 * @param {string} key  开关 key
 * @param {string} actionName  被拒绝时提示的操作名（如「提交申请」「审核」）
 */
export async function gate(ctx, key, actionName) {
  if (ctx.user.role === 'admin') return null;
  const map = await getSwitches(ctx.db);
  const sw = map[key];
  if (!sw || sw.enabled) return null;
  return fail(`管理员已关闭「${sw.label}」功能，${actionName}暂不可用，如有疑问请联系管理员`, 403, ctx.env);
}

/** 写入单项开关 */
export async function setSwitch(db, key, enabled, by) {
  await db.run(
    `INSERT INTO system_switches (key, enabled, updated_by, updated_at) VALUES (?, ?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET enabled = excluded.enabled, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
    [key, enabled ? 1 : 0, by, now()]
  );
}

/** 一键全开 / 全关 */
export async function setAllSwitches(db, enabled, by) {
  for (const key of SWITCH_KEYS) await setSwitch(db, key, enabled, by);
}
