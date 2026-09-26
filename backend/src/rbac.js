/**
 * 基于「角色 + 权限点」的可扩展权限模型（RBAC）。
 *
 * 扩展方式：
 *   - 新增功能模块：在 PERMISSION_DEFS 里加一条权限点，后端路由用 requirePerm() 校验即可；
 *   - 新增角色：往 users.role 写入新角色名，并在 role_permissions 里配置该角色的权限点
 *     （未知角色默认没有任何权限，必须显式授权，避免越权）；
 *   - 给单个账号开小灶：往 user_permissions 写入覆盖记录，优先级高于角色配置。
 */
import { fail } from './http.js';

/** 权限点清单：group 用于前端分组展示 */
export const PERMISSION_DEFS = [
  { key: 'application:read', group: '综测申请', label: '查看加分申请' },
  { key: 'application:review', group: '综测申请', label: '审核加分申请' },
  { key: 'class:read', group: '班级', label: '查看班级' },
  { key: 'class:write', group: '班级', label: '管理班级（增删改）' },
  { key: 'student:read', group: '学生', label: '查看学生信息' },
  { key: 'student:write', group: '学生', label: '管理学生信息与成绩' },
  { key: 'attendance:read', group: '考勤', label: '查看考勤' },
  { key: 'attendance:write', group: '考勤', label: '登记 / 修改考勤' },
  { key: 'teacher:read', group: '教师', label: '查看教师信息' },
  { key: 'teacher:write', group: '教师', label: '管理教师账号' },
  { key: 'user:manage', group: '账号', label: '管理账号（新增 / 停用）' },
  { key: 'permission:manage', group: '系统', label: '管理角色权限' },
];

export const PERMISSION_KEYS = PERMISSION_DEFS.map(p => p.key);

export const ROLE_LABELS = {
  student: '学生',
  teacher: '辅导员 / 教师',
  admin: '超级管理员',
};

/** 角色默认权限：表内无配置时的兜底值 */
export const ROLE_DEFAULTS = {
  student: ['application:read'],
  teacher: [
    'application:read', 'application:review',
    'class:read', 'class:write',
    'student:read', 'student:write',
    'attendance:read', 'attendance:write',
  ],
  admin: [...PERMISSION_KEYS],
};

/**
 * 计算某账号的最终权限集合。
 * 优先级：账号级覆盖(user_permissions) > 角色配置(role_permissions) > 代码默认值(ROLE_DEFAULTS)
 */
export async function loadPermissions(db, user) {
  const perms = new Set(ROLE_DEFAULTS[user.role] || []);

  const roleRows = await db.query('SELECT permission_key, granted FROM role_permissions WHERE role = ?', [user.role]);
  for (const r of roleRows) {
    if (r.granted) perms.add(r.permission_key); else perms.delete(r.permission_key);
  }

  const userRows = await db.query('SELECT permission_key, granted FROM user_permissions WHERE user_id = ?', [user.id]);
  for (const r of userRows) {
    if (r.granted) perms.add(r.permission_key); else perms.delete(r.permission_key);
  }

  // 安全兜底：超级管理员的权限管理能力不可被剥夺，避免系统被锁死
  if (user.role === 'admin') perms.add('permission:manage');

  return perms;
}

/** 是否有某项权限 */
export function can(ctx, key) {
  return !!ctx.perms && ctx.perms.has(key);
}

/** 权限不足时返回 403 响应，否则返回 null */
export function requirePerm(ctx, key) {
  return can(ctx, key) ? null : fail('无权限执行该操作', 403, ctx.env);
}

/**
 * 管理员给单个账号分配权限：只把「与角色默认值不一致」的项写成覆盖记录，
 * 保持一致时不写记录，这样后续调整角色权限时该账号仍能自动继承。
 */
export async function applyPermissionOverrides(db, user, selectedKeys) {
  const selected = new Set(selectedKeys || []);
  const inherited = new Set(ROLE_DEFAULTS[user.role] || []);

  const roleRows = await db.query('SELECT permission_key, granted FROM role_permissions WHERE role = ?', [user.role]);
  for (const r of roleRows) {
    if (r.granted) inherited.add(r.permission_key); else inherited.delete(r.permission_key);
  }

  await db.run('DELETE FROM user_permissions WHERE user_id = ?', [user.id]);
  for (const key of PERMISSION_KEYS) {
    const want = selected.has(key);
    if (want !== inherited.has(key)) {
      await db.run('INSERT INTO user_permissions (user_id, permission_key, granted) VALUES (?, ?, ?)', [user.id, key, want ? 1 : 0]);
    }
  }
}
