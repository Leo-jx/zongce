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
import { rowScores } from '../calc.js';
import { requirePerm, PERMISSION_DEFS, PERMISSION_KEYS, ROLE_LABELS, ROLE_DEFAULTS, loadPermissions, applyPermissionOverrides } from '../rbac.js';

const PERM_PATH = '/api/admin/permissions';
const ACCOUNTS_PATH = '/api/admin/accounts';
const ACCOUNT_RE = /^\/api\/admin\/accounts\/(\d+)$/;
const PROOFS_PATH = '/api/admin/proofs';

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

  // ===================== 综测数据大屏（可视化聚合） =====================
  if (path === '/api/admin/dashboard' && method === 'GET') {
    const denied = requirePerm(ctx, 'student:read'); if (denied) return denied;

    // 筛选条件：年级（classes.grade）/ 专业 / 班级 / 学籍状态；学期仅作用于申报趋势区间
    const grade = String(ctx.searchParams.get('grade') || '').trim();
    const major = String(ctx.searchParams.get('major') || '').trim();
    const bj = String(ctx.searchParams.get('bj') || '').trim();
    const status = String(ctx.searchParams.get('status') || '').trim();
    const term = String(ctx.searchParams.get('term') || '').trim();

    const where = [];
    const params = [];
    if (status) { where.push('s.status = ?'); params.push(status); }
    if (major) { where.push('s.zhuanye = ?'); params.push(major); }
    if (bj) { where.push('s.bj = ?'); params.push(bj); }
    if (grade) { where.push('c.grade = ?'); params.push(grade); }
    const whereSql = where.length ? ' WHERE ' + where.join(' AND ') : '';

    // 学期 → 月份区间（1 学年 = 9 月~次年 8 月；1 学期 9~1 月，2 学期 2~8 月）
    const termRange = (() => {
      const m = term.match(/^(\d{4})-(\d{4})-(\d)$/);
      if (!m) return null;
      const y1 = Number(m[1]), y2 = Number(m[2]), t = Number(m[3]);
      return t === 1
        ? [`${y1}-09`, `${y2}-01`]
        : [`${y2}-02`, `${y2}-08`];
    })();

    // 取出筛选后的学生行（只取计分所需列），在 JS 内按统一口径算五维与总分
    const rows = await db.query(
      `SELECT s.id, s.xh, s.xm, s.bj, s.zhuanye, s.status, s.zhuanye_score,
              s.deyu_sixiang, s.deyu_biaozhang, s.deyu_ganbu, s.deyu_rongyu, s.deyu_custom,
              s.zhiyu_jingsai, s.zhiyu_jineng, s.zhiyu_chuangye, s.zhiyu_custom,
              s.tiyu_chengji, s.tiyu_tice, s.tiyu_jiangli, s.tiyu_custom,
              s.meiyu_jiangli, s.meiyu_custom,
              s.laoyu_zhiyuanCishu, s.laoyu_xianxue, s.laoyu_qinshi, s.laoyu_shehui, s.laoyu_custom,
              s.koufen_chufen, s.koufen_richang, c.grade AS grade
         FROM students s LEFT JOIN classes c ON s.class_id = c.id${whereSql}`,
      params
    );
    const scored = rows.map(r => Object.assign(r, rowScores(r)));

    // ---- 总体 KPI ----
    const n = scored.length;
    const totals = scored.map(s => s.zongce);
    const avgTotal = n ? totals.reduce((a, b) => a + b, 0) / n : 0;
    const round1 = v => Math.round(v * 10) / 10;
    const stats = {
      students: n,
      avgTotal: round1(avgTotal),
      maxTotal: n ? round1(Math.max(...totals)) : 0,
      minTotal: n ? round1(Math.min(...totals)) : 0,
      passRate: n ? Math.round(totals.filter(t => t >= 60).length / n * 1000) / 10 : 0,
      excellent: totals.filter(t => t >= 90).length,
      classes: new Set(scored.map(s => s.bj).filter(Boolean)).size,
      majors: new Set(scored.map(s => s.zhuanye).filter(Boolean)).size,
      pendingApps: 0, approvedTerm: 0, rejectedTerm: 0,
    };

    // ---- 成绩分布（直方图分桶） ----
    const buckets = [[0, 60, '60分以下'], [60, 70, '60~70'], [70, 80, '70~80'], [80, 90, '80~90'], [90, 101, '90~100']];
    const distribution = buckets.map(([lo, hi, label]) => ({ label, count: totals.filter(t => t >= lo && t < hi).length }));

    // ---- 班级 / 专业维度 ----
    const groupBy = (list, key) => {
      const map = new Map();
      for (const s of list) {
        const k = String(s[key] || '未分组');
        if (!map.has(k)) map.set(k, []);
        map.get(k).push(s);
      }
      return [...map.entries()]
        .map(([name, arr]) => ({ name, count: arr.length, avg: round1(arr.reduce((a, b) => a + b.zongce, 0) / arr.length) }))
        .sort((a, b) => b.avg - a.avg);
    };
    const byClass = groupBy(scored, 'bj').slice(0, 15);
    const byMajor = groupBy(scored, 'zhuanye').slice(0, 12);

    // ---- 综测排名前列的学生 ----
    const topStudents = scored.slice().sort((a, b) => b.zongce - a.zongce).slice(0, 10)
      .map((s, i) => ({ rank: i + 1, xh: s.xh, xm: s.xm, bj: s.bj, zhuanye: s.zhuanye, total: round1(s.zongce) }));

    // ---- 五维平均分与占比（对综测平均分的贡献） ----
    const DIMS = [
      { key: 'deyu', label: '德育', weight: 0.2 },
      { key: 'zhiyu', label: '智育', weight: 0.5 },
      { key: 'tiyu', label: '体育', weight: 0.1 },
      { key: 'meiyu', label: '美育', weight: 0.1 },
      { key: 'laoyu', label: '劳育', weight: 0.1 },
    ];
    const dimensions = DIMS.map(d => {
      const avg = n ? scored.reduce((a, b) => a + b[d.key], 0) / n : 0;
      const contrib = avgTotal > 0 ? avg * d.weight / avgTotal * 100 : 0;
      return { key: d.key, label: d.label, weight: d.weight, avg: round1(avg), contribPct: Math.round(contrib * 10) / 10 };
    });

    // ---- 年级平均分对比（时段趋势之一：不同年级梯队） ----
    const gradeAvg = groupBy(scored.filter(s => s.grade), 'grade')
      .map(g => ({ grade: g.name, avg: g.avg, count: g.count }))
      .sort((a, b) => a.grade.localeCompare(b.grade));

    // ---- 申报趋势（按月）：筛选同条件学生；学期筛选时限定区间，否则取近 12 个月 ----
    const appWhere = where.slice();
    const appParams = params.slice();
    let from, to;
    if (termRange) {
      [from, to] = termRange;
    } else {
      const d = new Date();
      const ym = v => `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}`;
      d.setMonth(d.getMonth() - 11);
      from = ym(d);
      d.setMonth(d.getMonth() + 11);
      to = ym(d);
    }
    appWhere.push('substr(a.created_at,1,7) >= ?', 'substr(a.created_at,1,7) <= ?');
    appParams.push(from, to);
    const trendRows = await db.query(
      `SELECT substr(a.created_at,1,7) AS month, COUNT(*) AS submitted,
              SUM(CASE WHEN a.status = 'approved' THEN 1 ELSE 0 END) AS approved,
              SUM(CASE WHEN a.status = 'rejected' THEN 1 ELSE 0 END) AS rejected
         FROM applications a JOIN students s ON a.student_id = s.id
         LEFT JOIN classes c ON s.class_id = c.id
        WHERE ${appWhere.join(' AND ')}
        GROUP BY month ORDER BY month`,
      appParams
    );
    // 补齐无申报的月份，保证折线连续
    const trendMap = new Map(trendRows.map(r => [r.month, r]));
    const trend = [];
    {
      const [fy, fm] = from.split('-').map(Number);
      const [ty, tm] = to.split('-').map(Number);
      let y = fy, m = fm;
      while (y < ty || (y === ty && m <= tm)) {
        const key = `${y}-${String(m).padStart(2, '0')}`;
        const r = trendMap.get(key) || { submitted: 0, approved: 0, rejected: 0 };
        trend.push({ month: key, submitted: Number(r.submitted) || 0, approved: Number(r.approved) || 0, rejected: Number(r.rejected) || 0 });
        m++; if (m > 12) { m = 1; y++; }
      }
    }
    stats.approvedTerm = trend.reduce((a, b) => a + b.approved, 0);
    stats.rejectedTerm = trend.reduce((a, b) => a + b.rejected, 0);
    const pendingRow = await db.queryOne(
      `SELECT COUNT(*) AS c FROM applications a JOIN students s ON a.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id WHERE a.status = 'pending'${whereSql ? ' AND ' + where.join(' AND ') : ''}`,
      params
    );
    stats.pendingApps = (pendingRow || {}).c || 0;

    // ---- 筛选下拉候选（不受筛选影响，取全库） ----
    const optRows = await db.query(
      `SELECT DISTINCT c.grade AS grade, s.zhuanye AS zhuanye, s.bj AS bj, s.status AS status
         FROM students s LEFT JOIN classes c ON s.class_id = c.id`
    );
    const uniq = k => [...new Set(optRows.map(r => r[k]).filter(v => v && String(v).trim()))].sort();
    const options = { grades: uniq('grade'), majors: uniq('zhuanye'), classes: uniq('bj'), statuses: uniq('status') };
    if (!options.statuses.includes('在读')) options.statuses.unshift('在读');

    // ---- 异常 / 预警 ----
    const alerts = [];
    const daysPending = await db.query(
      `SELECT a.id, s.xh, s.xm, s.bj, a.created_at,
              CAST((julianday(?) - julianday(a.created_at)) AS INTEGER) AS days
         FROM applications a JOIN students s ON a.student_id = s.id
         LEFT JOIN classes c ON s.class_id = c.id
        WHERE a.status = 'pending'${whereSql ? ' AND ' + where.join(' AND ') : ''}
        ORDER BY a.created_at ASC LIMIT 5`,
      params.concat(now())
    );
    const pendingCount = await db.queryOne(
      `SELECT COUNT(*) AS c FROM applications a JOIN students s ON a.student_id = s.id
        LEFT JOIN classes c ON s.class_id = c.id
        WHERE a.status = 'pending' AND a.created_at < ?${whereSql ? ' AND ' + where.join(' AND ') : ''}`,
      params.concat(new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 19).replace('T', ' '))
    );
    if ((pendingCount || {}).c > 0) {
      alerts.push({
        level: (pendingCount.c > 20 ? 'high' : 'mid'), type: 'pending',
        title: `加分申请待审核超 7 天：${pendingCount.c} 条`,
        items: daysPending.map(r => ({ text: `${r.xh} ${r.xm}（${r.bj || '未分班'}）已等待 ${r.days} 天` })),
      });
    }
    const lowScores = scored.filter(s => s.zongce < 60).sort((a, b) => a.zongce - b.zongce);
    if (lowScores.length) {
      alerts.push({
        level: 'high', type: 'lowscore',
        title: `综测总分低于 60 分：${lowScores.length} 人`,
        items: lowScores.slice(0, 5).map(s => ({ text: `${s.xh} ${s.xm}（${s.bj || '未分班'}）总分 ${round1(s.zongce)}` })),
      });
    }
    const deducted = scored.filter(s => (s.koufen_chufen || 0) + (s.koufen_richang || 0) >= 10)
      .sort((a, b) => (b.koufen_chufen + b.koufen_richang) - (a.koufen_chufen + a.koufen_richang));
    if (deducted.length) {
      alerts.push({
        level: 'mid', type: 'deduct',
        title: `累计扣分达 10 分及以上：${deducted.length} 人`,
        items: deducted.slice(0, 5).map(s => ({ text: `${s.xh} ${s.xm}（${s.bj || '未分班'}）扣 ${s.koufen_chufen + s.koufen_richang} 分` })),
      });
    }
    const missing = scored.filter(s => (Number(s.zhuanye_score) || 0) === 0);
    if (missing.length) {
      alerts.push({
        level: 'mid', type: 'missing',
        title: `专业成绩缺失（为 0 分）：${missing.length} 人`,
        items: missing.slice(0, 5).map(s => ({ text: `${s.xh} ${s.xm}（${s.bj || '未分班'}）` })),
      });
    }
    const offStatus = scored.filter(s => s.status && s.status !== '在读');
    if (offStatus.length) {
      const bySt = {};
      offStatus.forEach(s => { bySt[s.status] = (bySt[s.status] || 0) + 1; });
      alerts.push({
        level: 'mid', type: 'status',
        title: `非在读学籍学生：${offStatus.length} 人（${Object.entries(bySt).map(([k, v]) => k + ' ' + v).join('、')}）`,
        items: offStatus.slice(0, 5).map(s => ({ text: `${s.xh} ${s.xm}（${s.bj || '未分班'}）${s.status}` })),
      });
    }
    const totalSub = trend.reduce((a, b) => a + b.submitted, 0);
    if (totalSub >= 10 && stats.rejectedTerm / totalSub > 0.4) {
      alerts.push({
        level: 'mid', type: 'reject',
        title: `申报驳回率偏高：${Math.round(stats.rejectedTerm / totalSub * 100)}%（${stats.rejectedTerm}/${totalSub}）`,
        items: [{ text: `统计区间 ${from} ~ ${to}` }],
      });
    }

    return ok({
      generatedAt: now(),
      filters: { grade, major, bj, status, term },
      options,
      stats, distribution, byClass, byMajor, topStudents, dimensions, gradeAvg, trend,
      alerts,
    }, env);
  }

  // ===================== 证明材料占用（Workers KV） =====================
  // GET：统计可清理的证明材料；DELETE：实际删除 KV 值与 D1 记录
  if (path === PROOFS_PATH && method === 'GET') {
    const denied = requirePerm(ctx, 'file:manage'); if (denied) return denied;
    const stat = async (sql, params = []) => (await db.queryOne(sql, params)) || { c: 0, s: 0 };
    return ok({
      all: await stat('SELECT COUNT(*) AS c, COALESCE(SUM(size),0) AS s FROM proofs'),
      rejected: await stat(`SELECT COUNT(*) AS c, COALESCE(SUM(p.size),0) AS s FROM proofs p
                            JOIN applications a ON a.id = p.application_id WHERE a.status = 'rejected'`),
      orphan: await stat('SELECT COUNT(*) AS c, COALESCE(SUM(size),0) AS s FROM proofs WHERE application_id IS NULL'),
    }, env);
  }

  if (path === PROOFS_PATH && method === 'DELETE') {
    const denied = requirePerm(ctx, 'file:manage'); if (denied) return denied;
    const mode = String(ctx.searchParams.get('mode') || 'orphan').toLowerCase();
    let sql = 'SELECT id, file_path, size FROM proofs p';
    const params = [];
    if (mode === 'rejected') {
      sql += ' WHERE p.id IN (SELECT p2.id FROM proofs p2 JOIN applications a ON a.id = p2.application_id WHERE a.status = ?)';
      params.push('rejected');
    } else if (mode === 'orphan') {
      sql += ' WHERE p.application_id IS NULL';
    }
    const rows = await db.query(sql, params);

    const kv = env.FILES;
    let deleted = 0, kvDeleted = 0, bytes = 0;
    for (const r of rows) {
      if (kv && r.file_path) {
        try { await kv.delete(r.file_path); kvDeleted++; } catch (e) { /* 值可能已过期，忽略 */ }
      }
      await db.run('DELETE FROM proofs WHERE id = ?', [r.id]);
      deleted++;
      bytes += Number(r.size) || 0;
    }
    return ok({ mode, deleted, kvDeleted, bytes }, env);
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
