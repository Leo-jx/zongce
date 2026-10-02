/**
 * 综测加分申报与审核系统 · Cloudflare Worker 入口。
 *
 * 仅负责 HTTP 层：跨域处理 → 路由分发 → 统一 JSON 包装。
 * 业务逻辑分布在 ./src/routes 下，数据访问在 ./src/db.js，计分口径在 ./src/calc.js。
 */
import { json, fail, notFound, preflight } from './http.js';
import { createDb } from './db.js';
import { getUserFromRequest } from './auth.js';
import { loadPermissions } from './rbac.js';
import { handleLogin, handleChangePassword } from './routes/auth.js';
import { handleStudent } from './routes/student.js';
import { handleTeacher } from './routes/teacher.js';
import { handleAdmin } from './routes/admin.js';
import { handleUpload, handleFileDownload } from './routes/files.js';

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return preflight(env);

    const url = new URL(request.url);
    const { pathname: path, searchParams } = url;
    const method = request.method;
    const ctx = { request, env, url, searchParams, db: null };

    try {
      ctx.db = createDb(env.DB);
      // 1) 公开接口：登录、证明材料下载
      if (path.startsWith('/api/files/')) {
        const res = await handleFileDownload(path, method, ctx);
        if (res) return res;
      }
      if (path === '/api/auth/login') {
        const res = await handleLogin(method, ctx);
        if (res) return res;
      }

      // 2) 其余接口要求登录
      const user = await getUserFromRequest(request, env);
      if (!user) return fail('未登录或登录已过期', 401, env);

      // 账号可能已被停用：重新查库确认状态
      const account = await ctx.db.queryOne('SELECT id, role, account, name, status FROM users WHERE id = ?', [user.id]);
      if (!account || Number(account.status) === 0) return fail('账号已停用，请联系管理员', 403, env);

      ctx.user = account;
      ctx.perms = await loadPermissions(ctx.db, account);

      // 修改本人密码：三种角色通用，仅校验原密码，不涉及权限点
      if (path === '/api/auth/password') {
        return (await handleChangePassword(path, method, ctx)) || notFound(env);
      }

      if (path.startsWith('/api/student/')) {
        if (account.role !== 'student') return fail('无权限', 403, env);
        return (await handleStudent(path, method, ctx)) || notFound(env);
      }

      if (path.startsWith('/api/teacher/')) {
        if (account.role !== 'teacher' && account.role !== 'admin') return fail('无权限', 403, env);
        return (await handleTeacher(path, method, ctx)) || notFound(env);
      }

      // 管理端：仅超级管理员可进入，接口内部再按权限点细分
      if (path.startsWith('/api/admin/')) {
        if (account.role !== 'admin') return fail('无权限', 403, env);
        return (await handleAdmin(path, method, ctx)) || notFound(env);
      }

      if (path === '/api/upload') {
        return (await handleUpload(path, method, ctx)) || notFound(env);
      }

      return notFound(env);
    } catch (e) {
      return json({ code: 1, msg: e.message || '服务器内部错误', data: null }, 500, env);
    }
  },
};
