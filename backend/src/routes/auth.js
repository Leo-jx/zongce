/**
 * POST /api/auth/login —— 学生 / 教师 / 管理员统一登录入口。
 */
import { ok, fail } from '../http.js';
import { verifyPassword, signToken } from '../auth.js';
import { loadPermissions } from '../rbac.js';

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
