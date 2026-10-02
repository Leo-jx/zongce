/**
 * POST /api/auth/login  —— 学生 / 教师 / 管理员统一登录入口。
 * POST /api/auth/password —— 已登录用户修改本人密码（三种角色通用）。
 */
import { ok, fail } from '../http.js';
import { verifyPassword, hashPassword, signToken } from '../auth.js';
import { loadPermissions } from '../rbac.js';

const MIN_PASSWORD_LEN = 6;

export async function handleLogin(method, ctx) {
  if (method !== 'POST') return null;
  const { request, env, db } = ctx;

  const { account, password } = await request.json();
  if (!account || !password) return fail('请输入账号和密码', 400, env);

  const user = await db.queryOne('SELECT * FROM users WHERE account = ?', [account]);
  if (!user) return fail('账号不存在', 400, env);
  if (!verifyPassword(password, user.password_hash)) return fail('密码错误', 400, env);
  if (Number(user.status) === 0) return fail('账号已停用，请联系管理员', 403, env);

  const token = await signToken(env, user);
  const permissions = [...(await loadPermissions(db, user))];

  // 学生额外返回班级/专业，便于前端直接展示
  let extra = {};
  if (user.role === 'student') {
    const stu = await db.queryOne('SELECT bj, zhuanye FROM students WHERE xh = ?', [user.account]);
    if (stu) extra = { bj: stu.bj, zhuanye: stu.zhuanye };
  }

  return ok({ token, role: user.role, name: user.name, account: user.account, permissions, ...extra }, env);
}

/**
 * POST /api/auth/password —— 修改本人密码。
 * 需登录；必须校验原密码，避免会话被冒用后直接改密。
 */
export async function handleChangePassword(path, method, ctx) {
  if (path !== '/api/auth/password' || method !== 'POST') return null;
  const { request, env, db, user } = ctx;

  const d = await request.json();
  const oldPwd = String(d.oldPassword || '');
  const newPwd = String(d.newPassword || '');

  if (!oldPwd || !newPwd) return fail('请输入原密码与新密码', 400, env);
  if (newPwd.length < MIN_PASSWORD_LEN) return fail('新密码至少 ' + MIN_PASSWORD_LEN + ' 位', 400, env);
  if (oldPwd === newPwd) return fail('新密码不能与原密码相同', 400, env);

  const row = await db.queryOne('SELECT id, password_hash FROM users WHERE id = ?', [user.id]);
  if (!row) return fail('账号不存在', 404, env);
  if (!verifyPassword(oldPwd, row.password_hash)) return fail('原密码不正确', 400, env);

  await db.update('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(newPwd), user.id]);
  return ok(null, env);
}
