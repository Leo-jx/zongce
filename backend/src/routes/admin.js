/**
 * 超级管理员端接口（/api/admin/**）。
 *
 * 班级 / 学生 / 考勤 / 综测申请等数据管理复用 /api/teacher/** 接口
 * （管理员不受数据归属限制，可跨班级操作），本文件只负责：
 *   1. 角色权限配置  2. 账号（教师 / 管理员 / 学生）管理  3. 全局概览
 */
import bcrypt from 'bcryptjs';
import { ok, fail } from '../http.js';
import { now } from '../db.js';
import { requirePerm, PERMISSION_DEFS, PERMISSION_KEYS, ROLE_LABELS, ROLE_DEFAULTS, loadPermissions, applyPermissionOverrides } from '../rbac.js';

const PERM_PATH = '/api/admin/permissions';
const ACCOUNTS_PATH = '/api/admin/accounts';
const ACCOUNT_RE = /^\/api\/admin\/accounts\/(\d+)$/;

const DEFAULT_PASSWORD = '123456';

/** 角色默认权限（含 role_permissions 覆盖后的结果） */
async function rolePermissions(db, role) {
  const set = new Set(ROLE_DEFAULTS[role] || []);
  const rows = await db.query('SELECT permission_key, granted FROM role_permissions WHERE role = ?', [role]);
  for (const r of rows) {
    if (r.granted) set.add(r.permission_key); else set.delete(r.permission_key);
  }
  return [...set];
}

/** 系统中出现过的所有角色（含新增角色） */
async function allRoles(db) {
  const rows = await db.query('SELECT DISTINCT role FROM users');
  const roles = new Set(rows.map(r => r.role));
  for (const r of Object.keys(ROLE_LABELS)) roles.add(r);
  return [...roles];
}

/** 是否最后一个可用超级管理员 */
async function isLastAdmin(db, userId) {
  const row = await db.queryOne("SELECT COUNT(*) AS c FROM users WHERE role = 'admin' AND status = 1", []);
  const target = await db.queryOne('SELECT role, status FROM users WHERE id = ?', [userId]);
  if (!target) return false;
  return target.role === 'admin' && target.status === 1 && (!row || row.c <= 1);
}

export async function handleAdmin(path, method, ctx) {
  const { request, env, db } = ctx;

  // ===================== 全局概览 =====================
  if (path === '/api/admin/overview' && method === 'GET') {
    const denied = requirePerm(ctx, 'user:manage'); if (denied) return denied;
    const one = async (sql, params = []) => (await db.queryOne(sql, params) || {}).c || 0;
    return ok({
      classes: await one('SELECT COUNT(*) AS c FROM classes'),
      students: await one('SELECT COUNT(*) AS c FROM students'),
      teachers: await one("SELECT COUNT(*) AS c FROM users WHERE role = 'teacher'"),
      pendingApplications: await one("SELECT COUNT(*) AS c FROM applications WHERE status = 'pending'"),
      attendanceToday: await one('SELECT COUNT(*) AS c FROM attendance WHERE date = ?', [now().slice(0, 10)]),
    }, env);
  }

  // ===================== 角色权限 =====================
  if (path === PERM_PATH && method === 'GET') {
    const denied = requirePerm(ctx, 'permission:manage'); if (denied) return denied;
    const roles = [];
    for (const role of await allRoles(db)) {
      roles.push({
        key: role,
        label: ROLE_LABELS[role] || role,
        permissions: await rolePermissions(db, role),
      });
    }
    return ok({ permissions: PERMISSION_DEFS, roles }, env);
  }

  if (path === PERM_PATH && method === 'PUT') {
    const denied = requirePerm(ctx, 'permission:manage'); if (denied) return denied;
    const { role, permissions } = await request.json();
    if (!role) return fail('缺少角色', 400, env);

    const next = new Set((permissions || []).filter(k => PERMISSION_KEYS.includes(k)));
    // 安全兜底：不允许把超级管理员的权限管理能力关掉，避免系统锁死
    if (role === 'admin') next.add('permission:manage');

    await db.run('DELETE FROM role_permissions WHERE role = ?', [role]);
    for (const key of PERMISSION_KEYS) {
      await db.run('INSERT INTO role_permissions (role, permission_key, granted) VALUES (?, ?, ?)', [role, key, next.has(key) ? 1 : 0]);
    }
    return ok({ role, permissions: [...next] }, env);
  }

  // ===================== 账号管理 =====================
  if (path === ACCOUNTS_PATH && method === 'GET') {
    const denied = requirePerm(ctx, 'user:manage'); if (denied) return denied;
    const role = ctx.searchParams.get('role');
    let sql = 'SELECT id, role, account, name, status, created_at FROM users WHERE 1=1';
    const params = [];
    if (role) { sql += ' AND role = ?'; params.push(role); }
    sql += ' ORDER BY role, account';

    const users = await db.query(sql, params);
    const withPerms = [];
    for (const u of users) {
      withPerms.push({ ...u, role_label: ROLE_LABELS[u.role] || u.role, permissions: [...(await loadPermissions(db, u))] });
    }
    return ok(withPerms, env);
  }

  if (path === ACCOUNTS_PATH && method === 'POST') {
    const denied = requirePerm(ctx, 'user:manage'); if (denied) return denied;
    const d = await request.json();
    if (!d.account || !d.name || !d.role) return fail('账号、姓名、角色必填', 400, env);
    if (await db.queryOne('SELECT id FROM users WHERE account = ?', [d.account])) return fail('账号已存在', 400, env);

    const hash = bcrypt.hashSync(d.password || DEFAULT_PASSWORD, 10);
    const r = await db.insert(
      'INSERT INTO users (role, account, password_hash, name, status, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      [d.role, d.account, hash, d.name, now()]
    );

    // 管理员分配了权限则写入覆盖记录，未分配则继承角色默认权限
    if (Array.isArray(d.permissions)) {
      await applyPermissionOverrides(db, { id: r.insertId, role: d.role }, d.permissions);
    }
    return ok({ id: r.insertId }, env);
  }

  const am = path.match(ACCOUNT_RE);
  if (am && method === 'PUT') {
    const denied = requirePerm(ctx, 'user:manage'); if (denied) return denied;
    const id = am[1];
    const target = await db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!target) return fail('账号不存在', 404, env);

    const d = await request.json();
    const nextRole = d.role || target.role;
    const nextStatus = d.status === undefined ? target.status : (Number(d.status) ? 1 : 0);

    if ((nextRole !== 'admin' || nextStatus === 0) && await isLastAdmin(db, id)) {
      return fail('系统必须保留至少一个可用的超级管理员', 400, env);
    }

    const sets = [];
    const params = [];
    if (d.name !== undefined) { sets.push('name = ?'); params.push(d.name); }
    if (d.role !== undefined) { sets.push('role = ?'); params.push(d.role); }
    if (d.status !== undefined) { sets.push('status = ?'); params.push(nextStatus); }
    if (d.password) { sets.push('password_hash = ?'); params.push(bcrypt.hashSync(d.password, 10)); }
    if (sets.length > 0) {
      params.push(id);
      await db.update('UPDATE users SET ' + sets.join(', ') + ' WHERE id = ?', params);
    }

    if (Array.isArray(d.permissions)) {
      await applyPermissionOverrides(db, { id: Number(id), role: nextRole }, d.permissions);
    }
    return ok(null, env);
  }

  if (am && method === 'DELETE') {
    const denied = requirePerm(ctx, 'user:manage'); if (denied) return denied;
    const id = am[1];
    const target = await db.queryOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!target) return fail('账号不存在', 404, env);
    if (await isLastAdmin(db, id)) return fail('系统必须保留至少一个可用的超级管理员', 400, env);

    await db.run('DELETE FROM user_permissions WHERE user_id = ?', [id]);
    await db.run('DELETE FROM users WHERE id = ?', [id]);
    return ok(null, env);
  }

  return null;
}
