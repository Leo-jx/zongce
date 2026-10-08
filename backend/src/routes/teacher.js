/**
 * 辅导员 / 教师端接口（/api/teacher/**）。
 *
 * 数据归属：辅导员只能查看和操作自己负责的班级（students.fdy = 自己的教师号）；
 * 超级管理员不受归属限制。每个接口都先校验权限点（见 src/rbac.js）。
 */
import bcrypt from 'bcryptjs';
import { ok, fail } from '../http.js';
import { now } from '../db.js';
import { hashPassword } from '../auth.js';
import { SCORE_FIELDS } from '../calc.js';
import { requirePerm } from '../rbac.js';

const APPS_PATH = '/api/teacher/applications';
const APP_RE = /^\/api\/teacher\/applications\/(\d+)$/;
const REVIEW_RE = /^\/api\/teacher\/applications\/(\d+)\/review$/;
const STUDENTS_PATH = '/api/teacher/students';
const STUDENT_RE = /^\/api\/teacher\/students\/([^/]+)$/;
const STUDENT_PWD_RE = /^\/api\/teacher\/students\/([^/]+)\/password$/;
const CLASSES_PATH = '/api/teacher/classes';
const CLASS_RE = /^\/api\/teacher\/classes\/(\d+)$/;
const ATTENDANCE_PATH = '/api/teacher/attendance';
const ATTENDANCE_RE = /^\/api\/teacher\/attendance\/(\d+)$/;
const PLANS_PATH = '/api/teacher/plans';
const PLAN_RE = /^\/api\/teacher\/plans\/(\d+)$/;

const DEFAULT_STUDENT_PASSWORD = '123456';
const ATTENDANCE_STATUS = ['present', 'late', 'absent', 'leave'];

/** 课程性质 → 必修 / 限选 */
const PLAN_PROP = {
  '公共必修课': '必修', '公共基础课': '必修', '学科基础课': '必修', '专业基础课': '必修', '专业核心课': '必修',
  '公共选修课': '限选', '专业任选课': '限选', '专业拓展课': '限选',
};
function planPropType(prop) {
  const s = String(prop || '').trim();
  if (PLAN_PROP[s]) return PLAN_PROP[s];
  if (/选修|任选|拓展/.test(s)) return '限选';
  return '必修';
}
function planNameKey(n) { return String(n || '').trim().replace(/\s+/g, ''); }
/** 合并课程列表：按标准化名称去重，后到的补充 / 覆盖学分与性质 */
function mergePlanCourses(...lists) {
  const out = [];
  const idx = new Map();
  for (const list of lists) {
    for (const c of (Array.isArray(list) ? list : [])) {
      const key = planNameKey(c.name);
      if (!key) continue;
      const credit = Number(c.credit);
      const prop = String(c.prop || '').trim();
      if (idx.has(key)) {
        const prev = idx.get(key);
        if (credit) prev.credit = credit;
        if (prop) prev.prop = prop;
        continue;
      }
      const item = { name: String(c.name).trim(), credit: Number.isFinite(credit) ? credit : 0, prop };
      idx.set(key, item);
      out.push(item);
    }
  }
  return out;
}
function countPlanProps(courses) {
  let nReq = 0, nSel = 0;
  for (const c of courses) { if (planPropType(c.prop) === '必修') nReq++; else nSel++; }
  return { nReq, nSel };
}
function planToApi(r) {
  let terms = [], courses = [];
  try { terms = JSON.parse(r.terms || '[]'); } catch (e) { terms = []; }
  try { courses = JSON.parse(r.courses || '[]'); } catch (e) { courses = []; }
  return {
    id: r.id, grade: r.grade || '', major: r.major || '', academic_year: r.academic_year || '',
    terms, courses, nReq: r.n_req || 0, nSel: r.n_sel || 0,
    source_files: r.source_files || '', created_by: r.created_by || '', updated_at: r.updated_at || ''
  };
}

/** 允许教师直接改写的数值字段 */
const NUM_FIELDS = [
  'zhuanye_score', 'tiyu_chengji', 'tiyu_tice', 'deyu_sixiang', 'deyu_biaozhang', 'deyu_custom',
  'zhiyu_jingsai', 'zhiyu_chuangye', 'zhiyu_custom', 'tiyu_jiangli', 'tiyu_custom',
  'meiyu_jiangli', 'meiyu_custom', 'laoyu_zhiyuanCishu', 'laoyu_xianxue', 'laoyu_qinshi',
  'laoyu_shehui', 'laoyu_custom', 'koufen_chufen', 'koufen_richang',
];

/** 学生基本信息字段 */
const INFO_FIELDS = ['xm', 'zhuanye', 'bj', 'status'];
const STUDENT_STATUS_ALLOWED = ['在读', '休学', '退学', '转学', '保留学籍', '毕业'];

/** 以 JSON 数组形式存储的字段 */
const JSON_FIELDS = ['deyu_ganbu', 'deyu_rongyu', 'zhiyu_jineng'];

/**
 * 辅导员可见的专业：由「其所带班级的专业」推导，而不是写死学院专业清单。
 * 即：教师能看见自己所带班级对应专业的全部学生 / 班级（含同专业其他辅导员所带的班级），
 * 非其所带专业一律不可见。所带班级未填专业时，退化为只能看见本人所管的学生。
 *
 * 写操作不受此影响，仍由 assertOwnClass / assertOwnStudent 限制为本人负责。
 */
const TAUGHT_MAJORS_SQL = `SELECT major FROM classes WHERE teacher_account = ? AND major <> ''`;

/**
 * 归属过滤：超级管理员看全部；辅导员看「所带班级专业的学生 + 本人负责的学生」。
 * @returns {{sql:string, params:any[]}} 追加到 WHERE 后的片段
 */
function ownerScope(ctx, alias = 's') {
  if (ctx.user.role === 'admin') return { sql: '', params: [] };
  return {
    sql: ` AND (${alias}.zhuanye IN (${TAUGHT_MAJORS_SQL}) OR ${alias}.fdy = ?)`,
    params: [ctx.user.account, ctx.user.account]
  };
}

/** 校验班级是否归属当前辅导员 */
async function assertOwnClass(ctx, classId) {
  const cls = await ctx.db.queryOne('SELECT * FROM classes WHERE id = ?', [classId]);
  if (!cls) return { error: fail('班级不存在', 404, ctx.env) };
  if (ctx.user.role !== 'admin' && cls.teacher_account !== ctx.user.account) {
    return { error: fail('只能操作自己负责的班级', 403, ctx.env) };
  }
  return { cls };
}

/** 校验学生是否归属当前辅导员 */
async function assertOwnStudent(ctx, xh) {
  const stu = await ctx.db.queryOne('SELECT * FROM students WHERE xh = ?', [xh]);
  if (!stu) return { error: fail('学生不存在', 404, ctx.env) };
  if (ctx.user.role !== 'admin' && stu.fdy !== ctx.user.account) {
    return { error: fail('只能操作自己负责的学生', 403, ctx.env) };
  }
  return { stu };
}

/** 解析 CSV：学号,姓名[,专业][,班级]，支持逗号/中文逗号/制表符分隔，首行表头自动跳过 */
function parseImportRows(csv) {
  return csv.split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => line.split(/[,，\t]/).map(s => s.trim()))
    .filter(cols => cols[0] && !/^学号/.test(cols[0]));
}

const num = (v, def = 0) => (v === undefined || v === null || v === '') ? def : (Number(v) || 0);
function arr(v) { return Array.isArray(v) ? v : []; }

/**
 * 将一条 JSON 学生记录（兼容「导出备份」的嵌套格式与扁平格式）规整为 students 表字段。
 * 备份格式：{xh,xm,zhuanye,bj,status,zhuanye_score,
 *   deyu:{sixiang,biaozhang,ganbu[],rongyu[],custom},
 *   zhiyu:{jingsai,jineng[],chuangye,custom},
 *   tiyu:{chengji,tice,jiangli,custom},
 *   meiyu:{jiangli,custom},
 *   laoyu:{zhiyuanCishu,xianxue,qinshi,shehui,custom},
 *   koufen:{chufen,richang}}
 * 扁平格式（直接给出字段名）：xh,xm,zhuanye,bj,status,zhuanye_score,deyu_sixiang,… 均可。
 */
function normalizeStudentRecord(rec) {
  const r = {};
  r.xh = String(rec.xh || '').trim();
  r.xm = String(rec.xm || rec.name || '').trim();
  r.zhuanye = String(rec.zhuanye || rec.major || '').trim();
  r.bj = String(rec.bj || rec.className || '').trim();
  r.status = STUDENT_STATUS_ALLOWED.includes(rec.status) ? rec.status : '在读';
  r.zhuanye_score = num(rec.zhuanye_score, 80);
  const de = rec.deyu || {};
  r.deyu_sixiang = num(de.sixiang ?? rec.deyu_sixiang);
  r.deyu_biaozhang = num(de.biaozhang ?? rec.deyu_biaozhang);
  r.deyu_ganbu = JSON.stringify(arr(de.ganbu ?? jsonSafe(rec.deyu_ganbu)));
  r.deyu_rongyu = JSON.stringify(arr(de.rongyu ?? jsonSafe(rec.deyu_rongyu)));
  r.deyu_custom = num(de.custom ?? rec.deyu_custom);
  const zh = rec.zhiyu || {};
  r.zhiyu_jingsai = num(zh.jingsai ?? rec.zhiyu_jingsai);
  r.zhiyu_jineng = JSON.stringify(arr(zh.jineng ?? jsonSafe(rec.zhiyu_jineng)));
  r.zhiyu_chuangye = num(zh.chuangye ?? rec.zhiyu_chuangye);
  r.zhiyu_custom = num(zh.custom ?? rec.zhiyu_custom);
  const ti = rec.tiyu || {};
  r.tiyu_chengji = num(ti.chengji ?? rec.tiyu_chengji);
  r.tiyu_tice = num(ti.tice ?? rec.tiyu_tice);
  r.tiyu_jiangli = num(ti.jiangli ?? rec.tiyu_jiangli);
  r.tiyu_custom = num(ti.custom ?? rec.tiyu_custom);
  const me = rec.meiyu || {};
  r.meiyu_jiangli = num(me.jiangli ?? rec.meiyu_jiangli);
  r.meiyu_custom = num(me.custom ?? rec.meiyu_custom);
  const la = rec.laoyu || {};
  r.laoyu_zhiyuanCishu = num(la.zhiyuanCishu ?? rec.laoyu_zhiyuanCishu);
  r.laoyu_xianxue = num(la.xianxue ?? rec.laoyu_xianxue);
  r.laoyu_qinshi = num(la.qinshi ?? rec.laoyu_qinshi);
  r.laoyu_shehui = num(la.shehui ?? rec.laoyu_shehui);
  r.laoyu_custom = num(la.custom ?? rec.laoyu_custom);
  const ko = rec.koufen || {};
  r.koufen_chufen = num(ko.chufen ?? rec.koufen_chufen);
  r.koufen_richang = num(ko.richang ?? rec.koufen_richang);
  return r;
}
function jsonSafe(v) { try { const p = JSON.parse(v || '[]'); return Array.isArray(p) ? p : []; } catch (e) { return []; } }

/** JSON 全量导入：按备份格式还原学生及其五育 / 扣分明细（覆盖式写入） */
async function importJson(d, ctx, env) {
  const { db } = ctx;
  const teacherAccount = (ctx.user.role === 'admin' && d.teacher_account) ? d.teacher_account : ctx.user.account;
  const teacher = await db.queryOne('SELECT account, name FROM users WHERE account = ? AND role = ?', [teacherAccount, 'teacher']);
  if (!teacher) return fail('教师号不存在：' + teacherAccount, 400, env);

  const records = (d.json || []).map(normalizeStudentRecord).filter(r => r.xh);
  if (!records.length) return fail('没有可导入的数据', 400, env);

  const updateExisting = !!d.update_existing;
  const hash = bcrypt.hashSync(DEFAULT_STUDENT_PASSWORD, 10);
  const created = [], updated = [], skipped = [];

  for (const r of records) {
    const className = r.bj || String(d.class_name || '').trim();
    const major = r.zhuanye || String(d.major || '').trim();
    const grade = String(d.grade || '').trim();

    // 班级：以记录自带 bj 优先，否则用表单班级；找不到则新建（归属当前教师）
    let cls = null;
    if (className) {
      cls = await db.queryOne('SELECT * FROM classes WHERE name = ?', [className]);
      if (!cls) {
        const ins = await db.insert(
          'INSERT INTO classes (name, teacher_account, major, grade, created_at) VALUES (?, ?, ?, ?, ?)',
          [className, teacherAccount, major, grade, now()]
        );
        cls = { id: ins.insertId, name: className, teacher_account: teacherAccount };
      } else if (cls.teacher_account !== teacherAccount && ctx.user.role !== 'admin') {
        skipped.push({ xh: r.xh, reason: '班级「' + className + '」归属其他辅导员' }); continue;
      }
    }

    const existed = await db.queryOne('SELECT id, fdy, class_id FROM students WHERE xh = ?', [r.xh]);
    if (existed) {
      if (!updateExisting) { skipped.push({ xh: r.xh, reason: '学号已存在' }); continue; }
      if (ctx.user.role !== 'admin' && existed.fdy !== teacherAccount) {
        skipped.push({ xh: r.xh, reason: '该生不属于本人班级' }); continue;
      }
      const params = [
        r.xm, r.zhuanye, r.bj || (cls ? cls.name : ''), r.status, r.zhuanye_score,
        r.deyu_sixiang, r.deyu_biaozhang, r.deyu_ganbu, r.deyu_rongyu, r.deyu_custom,
        r.zhiyu_jingsai, r.zhiyu_jineng, r.zhiyu_chuangye, r.zhiyu_custom,
        r.tiyu_chengji, r.tiyu_tice, r.tiyu_jiangli, r.tiyu_custom,
        r.meiyu_jiangli, r.meiyu_custom,
        r.laoyu_zhiyuanCishu, r.laoyu_xianxue, r.laoyu_qinshi, r.laoyu_shehui, r.laoyu_custom,
        r.koufen_chufen, r.koufen_richang,
        existed.fdy || teacherAccount, cls ? cls.id : existed.class_id, r.xh
      ];
      await db.update(`UPDATE students SET xm=?,zhuanye=?,bj=?,status=?,zhuanye_score=?,
        deyu_sixiang=?,deyu_biaozhang=?,deyu_ganbu=?,deyu_rongyu=?,deyu_custom=?,
        zhiyu_jingsai=?,zhiyu_jineng=?,zhiyu_chuangye=?,zhiyu_custom=?,
        tiyu_chengji=?,tiyu_tice=?,tiyu_jiangli=?,tiyu_custom=?,
        meiyu_jiangli=?,meiyu_custom=?,
        laoyu_zhiyuanCishu=?,laoyu_xianxue=?,laoyu_qinshi=?,laoyu_shehui=?,laoyu_custom=?,
        koufen_chufen=?,koufen_richang=?, fdy=?, class_id=? WHERE xh=?`, params);
      if (r.xm) await db.update('UPDATE users SET name = ? WHERE account = ? AND role = ?', [r.xm, r.xh, 'student']);
      updated.push(r.xh);
      continue;
    }

    if (!r.xm) { skipped.push({ xh: r.xh, reason: '缺少姓名' }); continue; }
    if (!cls) { skipped.push({ xh: r.xh, reason: '未指定班级，无法新建' }); continue; }

    await db.insert(
      'INSERT OR IGNORE INTO users (role, account, password_hash, name, status, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      ['student', r.xh, hash, r.xm, now()]
    );
    await db.insert(`INSERT INTO students (xh,xm,zhuanye,bj,fdy,class_id,zhuanye_score,
        tiyu_chengji,tiyu_tice,deyu_sixiang,deyu_biaozhang,deyu_ganbu,deyu_rongyu,deyu_custom,
        zhiyu_jingsai,zhiyu_jineng,zhiyu_chuangye,zhiyu_custom,tiyu_jiangli,tiyu_custom,
        meiyu_jiangli,meiyu_custom,laoyu_zhiyuanCishu,laoyu_xianxue,laoyu_qinshi,laoyu_shehui,laoyu_custom,
        koufen_chufen,koufen_richang,status)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [r.xh, r.xm, r.zhuanye, cls.name, teacherAccount, cls.id, r.zhuanye_score,
        r.tiyu_chengji, r.tiyu_tice, r.deyu_sixiang, r.deyu_biaozhang, r.deyu_ganbu, r.deyu_rongyu, r.deyu_custom,
        r.zhiyu_jingsai, r.zhiyu_jineng, r.zhiyu_chuangye, r.zhiyu_custom, r.tiyu_jiangli, r.tiyu_custom,
        r.meiyu_jiangli, r.meiyu_custom, r.laoyu_zhiyuanCishu, r.laoyu_xianxue, r.laoyu_qinshi, r.laoyu_shehui, r.laoyu_custom,
        r.koufen_chufen, r.koufen_richang, r.status]
    );
    created.push(r.xh);
  }

  return ok({ class_name: String(d.class_name || '').trim(), teacher_account: teacherAccount, created, updated, skipped }, env);
}

export async function handleTeacher(path, method, ctx) {
  const { request, env, db, searchParams } = ctx;

  // ===================== 班级管理 =====================
  if (path === CLASSES_PATH && method === 'GET') {
    const denied = requirePerm(ctx, 'class:read'); if (denied) return denied;
    let sql = `SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
               FROM classes c WHERE 1=1`;
    const params = [];
    if (ctx.user.role !== 'admin') {
      // 只列出「所带班级专业」下的全部班级（含其他辅导员的同专业班级）+ 本人所管班级
      sql += ` AND (c.major IN (${TAUGHT_MAJORS_SQL}) OR c.teacher_account = ?)`;
      params.push(ctx.user.account, ctx.user.account);
    }
    sql += ' ORDER BY c.name';
    return ok(await db.query(sql, params), env);
  }

  if (path === CLASSES_PATH && method === 'POST') {
    const denied = requirePerm(ctx, 'class:write'); if (denied) return denied;
    const d = await request.json();
    if (!d.name) return fail('班级名称不能为空', 400, env);
    const teacherAccount = ctx.user.role === 'admin' && d.teacher_account ? d.teacher_account : ctx.user.account;

    const exists = await db.queryOne('SELECT id FROM classes WHERE name = ?', [d.name]);
    if (exists) return fail('班级已存在', 400, env);

    const r = await db.insert(
      'INSERT INTO classes (name, teacher_account, major, grade, created_at) VALUES (?, ?, ?, ?, ?)',
      [d.name, teacherAccount, d.major || '', d.grade || '', now()]
    );
    return ok({ id: r.insertId }, env);
  }

  const cm = path.match(CLASS_RE);
  if (cm && (method === 'PUT' || method === 'DELETE')) {
    const denied = requirePerm(ctx, 'class:write'); if (denied) return denied;
    const { cls, error } = await assertOwnClass(ctx, cm[1]);
    if (error) return error;

    if (method === 'PUT') {
      const d = await request.json();
      const sets = [];
      const params = [];
      for (const f of ['name', 'major', 'grade']) {
        if (d[f] !== undefined) { sets.push(f + ' = ?'); params.push(d[f]); }
      }
      if (d.teacher_account && ctx.user.role === 'admin') { sets.push('teacher_account = ?'); params.push(d.teacher_account); }
      if (sets.length === 0) return fail('无更新字段', 400, env);
      params.push(cls.id);

      await db.update('UPDATE classes SET ' + sets.join(', ') + ' WHERE id = ?', params);
      if (d.name && d.name !== cls.name) {
        await db.update('UPDATE students SET bj = ? WHERE class_id = ?', [d.name, cls.id]);
      }
      return ok(null, env);
    }

    // 是否连同班级学生一并删除（教师端「一键删除本班及学生」传 cascade=1）
    const cascade = ['1', 'true', 'yes'].includes(String(searchParams.get('cascade') || '').toLowerCase());
    const roster = await db.query('SELECT id FROM students WHERE class_id = ?', [cls.id]);
    if (roster.length > 0 && !cascade) {
      return fail('该班级下还有学生，请先移除或转班；如需一并删除请使用「一键删除本班及学生」', 400, env);
    }

    // 级联删除：先逐个清空学生及其关联数据（账号 / 考勤 / 申请 / 证明材料），再删班级
    for (const stu of roster) await purgeStudent(db, stu.id, env);
    await db.run('DELETE FROM classes WHERE id = ?', [cls.id]);
    return ok({ deleted_students: roster.length }, env);
  }

  // ===================== 学生导入 =====================
  if (path === '/api/teacher/import' && method === 'POST') {
    const denied = requirePerm(ctx, 'student:write'); if (denied) return denied;
    const d = await request.json();

    // JSON 全量导入（支持「导出数据备份」格式还原）
    if (Array.isArray(d.json) && d.json.length) return importJson(d, ctx, env);

    // 教师号：辅导员只能用本人教师号导入，管理员可代指定
    const teacherAccount = (ctx.user.role === 'admin' && d.teacher_account) ? d.teacher_account : ctx.user.account;
    const teacher = await db.queryOne('SELECT account, name FROM users WHERE account = ? AND role = ?', [teacherAccount, 'teacher']);
    if (!teacher) return fail('教师号不存在：' + teacherAccount, 400, env);

    const rows = Array.isArray(d.rows) ? d.rows : parseImportRows(String(d.csv || ''));
    if (rows.length === 0) return fail('没有可导入的数据', 400, env);

    // update_existing：学号已存在时更新姓名 / 专业 / 学业成绩（用于批量导入成绩）
    const updateExisting = !!d.update_existing;
    const className = String(d.class_name || (rows.find(r => r.bj) || {}).bj || '').trim();

    // 找到或创建班级，并校验归属；「仅按学号更新已有学生」时允许不填班级
    let cls = null;
    if (className) {
      cls = await db.queryOne('SELECT * FROM classes WHERE name = ?', [className]);
      if (!cls) {
        const r = await db.insert(
          'INSERT INTO classes (name, teacher_account, major, grade, created_at) VALUES (?, ?, ?, ?, ?)',
          [className, teacherAccount, d.major || '', d.grade || '', now()]
        );
        cls = { id: r.insertId, name: className, teacher_account: teacherAccount, grade: d.grade || '' };
      } else {
        if (cls.teacher_account !== teacherAccount) {
          return fail(`班级「${className}」归属其他辅导员（${cls.teacher_account}）`, 403, env);
        }
        // 导入时若显式给出年级，则同步更新班级年级（首次导入或后续修正）
        if (d.grade && cls.grade !== d.grade) {
          await db.update('UPDATE classes SET grade = ? WHERE id = ?', [d.grade, cls.id]);
        }
      }
    } else if (!updateExisting) {
      return fail('请指定班级名称', 400, env);
    }

    const hash = bcrypt.hashSync(DEFAULT_STUDENT_PASSWORD, 10);
    const created = [];
    const updated = [];
    const skipped = [];

    for (const row of rows) {
      const xh = String(row.xh || row[0] || '').trim();
      const xm = String(row.xm || row[1] || '').trim();
      if (!xh) { skipped.push({ xh, reason: '学号为空' }); continue; }

      // 第 4 列为学业成绩，缺省时沿用 80 分基础分
      const rawScore = row.zhuanye_score !== undefined ? row.zhuanye_score : row[3];
      const score = rawScore === undefined || rawScore === null || rawScore === ''
        ? 80 : (Number(rawScore) || 0);

      const existed = await db.queryOne('SELECT id, fdy FROM students WHERE xh = ?', [xh]);
      if (existed) {
        if (!updateExisting) { skipped.push({ xh, reason: '学号已存在' }); continue; }
        if (ctx.user.role !== 'admin' && existed.fdy !== teacherAccount) {
          skipped.push({ xh, reason: '该生不属于本人班级' }); continue;
        }
        const zhuanye = String(row.zhuanye || row[2] || d.major || '').trim();
        const sets = ['zhuanye_score = ?'];
        const params = [score];
        if (xm) { sets.push('xm = ?'); params.push(xm); }
        if (zhuanye) { sets.push('zhuanye = ?'); params.push(zhuanye); }
        params.push(xh);
        await db.update('UPDATE students SET ' + sets.join(', ') + ' WHERE xh = ?', params);
        if (xm) await db.update('UPDATE users SET name = ? WHERE account = ? AND role = ?', [xm, xh, 'student']);
        updated.push(xh);
        continue;
      }

      if (!xm) { skipped.push({ xh, reason: '新生缺少姓名' }); continue; }
      if (!cls) { skipped.push({ xh, reason: '未指定班级，无法新建学生' }); continue; }

      const zhuanye = String(row.zhuanye || row[2] || d.major || '').trim();
      // 学号即账号，初始密码统一 123456
      await db.insert(
        'INSERT OR IGNORE INTO users (role, account, password_hash, name, status, created_at) VALUES (?, ?, ?, ?, 1, ?)',
        ['student', xh, hash, xm, now()]
      );
      await db.insert(
        `INSERT INTO students (xh, xm, zhuanye, bj, fdy, class_id, zhuanye_score, deyu_ganbu, deyu_rongyu, zhiyu_jineng)
         VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]')`,
        [xh, xm, zhuanye, className, teacherAccount, cls.id, score]
      );
      created.push(xh);
    }

    return ok({ class_id: cls ? cls.id : null, class_name: className, teacher_account: teacherAccount, created, updated, skipped }, env);
  }

  // ===================== 教学计划库（全院辅导员共用） =====================
  if (path === PLANS_PATH && method === 'GET') {
    const denied = requirePerm(ctx, 'student:read'); if (denied) return denied;
    const rows = await db.query('SELECT * FROM teaching_plans ORDER BY major, grade DESC, academic_year DESC');
    return ok(rows.map(planToApi), env);
  }

  /**
   * 写入教学计划：以「年级 + 专业 + 学年」为唯一键，重复导入（同一学年的不同学期文件、
   * 或再次上传同一学期）自动合并课程、累并学期。因此辅导员可按「分年级 / 分学期」多个文件上传。
   */
  if (path === PLANS_PATH && method === 'POST') {
    const denied = requirePerm(ctx, 'student:write'); if (denied) return denied;
    const d = await request.json();
    const incoming = Array.isArray(d.plans) ? d.plans : (Array.isArray(d) ? d : [d]);
    if (!incoming.length) return fail('没有可导入的教学计划', 400, env);

    const results = [];
    for (const p of incoming) {
      const grade = String(p.grade || '').trim();
      const major = String(p.major || '').trim();
      const academicYear = String(p.academic_year || p.year || '').trim();
      const termsRaw = Array.isArray(p.terms) ? p.terms : (p.term ? [p.term] : []);
      const terms = Array.from(new Set(termsRaw.map(t => String(t || '').trim()).filter(Boolean)));
      const courses = Array.isArray(p.courses) ? p.courses : [];
      if (!grade && !major && !academicYear) continue;

      const file = String(p.file || p.source_file || '').trim();
      const exist = await db.queryOne(
        'SELECT * FROM teaching_plans WHERE grade = ? AND major = ? AND academic_year = ?',
        [grade, major, academicYear]
      );

      if (exist) {
        const oldTerms = (() => { try { return JSON.parse(exist.terms || '[]'); } catch (e) { return []; } })();
        const oldCourses = (() => { try { return JSON.parse(exist.courses || '[]'); } catch (e) { return []; } })();
        const merged = mergePlanCourses(oldCourses, courses);
        const finalTerms = Array.from(new Set(oldTerms.concat(terms)));
        const cnt = countPlanProps(merged);
        const files = Array.from(new Set((exist.source_files || '').split('、').concat(file).filter(Boolean)));
        await db.update(
          'UPDATE teaching_plans SET terms = ?, courses = ?, n_req = ?, n_sel = ?, source_files = ?, updated_at = ? WHERE id = ?',
          [JSON.stringify(finalTerms), JSON.stringify(merged), cnt.nReq, cnt.nSel, files.join('、'), now(), exist.id]
        );
        results.push({ id: exist.id, grade, major, academic_year: academicYear, created: false, courses: merged.length, terms: finalTerms.length });
      } else {
        const merged = mergePlanCourses([], courses);
        const cnt = countPlanProps(merged);
        const r = await db.insert(
          'INSERT INTO teaching_plans (grade, major, academic_year, terms, courses, n_req, n_sel, source_files, created_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [grade, major, academicYear, JSON.stringify(terms), JSON.stringify(merged), cnt.nReq, cnt.nSel, file, ctx.user.account, now()]
        );
        results.push({ id: r.insertId, grade, major, academic_year: academicYear, created: true, courses: merged.length, terms: terms.length });
      }
    }
    if (!results.length) return fail('没有有效的教学计划数据（缺少年级 / 专业 / 学年）', 400, env);
    return ok(results, env);
  }

  const pm = path.match(PLAN_RE);
  if (pm && method === 'DELETE') {
    const denied = requirePerm(ctx, 'student:write'); if (denied) return denied;
    const row = await db.queryOne('SELECT * FROM teaching_plans WHERE id = ?', [pm[1]]);
    if (!row) return fail('教学计划不存在', 404, env);
    if (ctx.user.role !== 'admin' && row.created_by !== ctx.user.account) {
      return fail('只能删除自己上传的教学计划（该计划由 ' + row.created_by + ' 上传）', 403, env);
    }
    await db.run('DELETE FROM teaching_plans WHERE id = ?', [pm[1]]);
    return ok(null, env);
  }

  // ===================== 学生信息与成绩 =====================
  if (path === STUDENTS_PATH && method === 'GET') {
    const denied = requirePerm(ctx, 'student:read'); if (denied) return denied;
    const { bj, xh, xm, class_id } = Object.fromEntries(searchParams);
    let sql = 'SELECT s.*, COALESCE(c.grade, \'\') AS grade FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE 1=1';
    const params = [];
    const scope = ownerScope(ctx);
    sql += scope.sql; params.push(...scope.params);
    if (bj) { sql += ' AND s.bj = ?'; params.push(bj); }
    if (class_id) { sql += ' AND s.class_id = ?'; params.push(class_id); }
    if (xh) { sql += ' AND s.xh = ?'; params.push(xh); }
    if (xm) { sql += ' AND s.xm LIKE ?'; params.push('%' + xm + '%'); }
    sql += ' ORDER BY s.xh';
    return ok(await db.query(sql, params), env);
  }

  if (path === STUDENTS_PATH && method === 'POST') {
    const denied = requirePerm(ctx, 'student:write'); if (denied) return denied;
    const d = await request.json();
    if (!d.xh || !d.xm) return fail('学号和姓名必填', 400, env);
    if (await db.queryOne('SELECT id FROM students WHERE xh = ?', [d.xh])) return fail('学号已存在', 400, env);

    const classId = d.class_id ? Number(d.class_id) : null;
    let className = d.bj || '';
    let teacherAccount = ctx.user.account;
    if (classId) {
      const { cls, error } = await assertOwnClass(ctx, classId);
      if (error) return error;
      className = cls.name;
      teacherAccount = cls.teacher_account;
    }

    const hash = bcrypt.hashSync(DEFAULT_STUDENT_PASSWORD, 10);
    await db.insert(
      'INSERT OR IGNORE INTO users (role, account, password_hash, name, status, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      ['student', d.xh, hash, d.xm, now()]
    );
    const r = await db.insert(
      `INSERT INTO students (xh, xm, zhuanye, bj, fdy, class_id, zhuanye_score, deyu_ganbu, deyu_rongyu, zhiyu_jineng)
       VALUES (?, ?, ?, ?, ?, ?, ?, '[]', '[]', '[]')`,
      [d.xh, d.xm, d.zhuanye || '', className, teacherAccount, classId, Number(d.zhuanye_score) || 80]
    );
    return ok({ id: r.insertId }, env);
  }

  // 批量操作：多选学生删除 / 修改学籍状态 / 重置密码（同一条路径，按 action 区分）
  if (path === STUDENTS_PATH + '/batch' && method === 'POST') {
    const denied = requirePerm(ctx, 'student:write'); if (denied) return denied;
    const d = await request.json();
    const ids = Array.isArray(d.ids) ? d.ids.map(Number).filter(n => !isNaN(n)) : [];
    if (!ids.length) return fail('请先选择学生', 400, env);
    if (d.action !== 'delete' && d.action !== 'reset_password' && !STUDENT_STATUS_ALLOWED.includes(d.status)) {
      return fail('无效的学生状态', 400, env);
    }
    let deleted = 0, updated = 0, reset = 0;
    for (const id of ids) {
      const stu = await db.queryOne('SELECT * FROM students WHERE id = ?', [id]);
      if (!stu) continue;
      if (ctx.user.role !== 'admin' && stu.fdy !== ctx.user.account) continue;
      if (d.action === 'delete') {
        await purgeStudent(db, stu.id, env); deleted++;
      } else if (d.action === 'reset_password') {
        await resetStudentPassword(db, stu.xh); reset++;
      } else {
        await db.update('UPDATE students SET status = ? WHERE id = ?', [d.status, stu.id]); updated++;
      }
    }
    return ok({ deleted, updated, reset }, env);
  }

  // 单个学生重置密码（须在 STUDENT_RE 之前匹配，否则会被当成 /students/:xh）
  const spm = path.match(STUDENT_PWD_RE);
  if (spm && method === 'POST') {
    const denied = requirePerm(ctx, 'student:write'); if (denied) return denied;
    const { stu, error } = await assertOwnStudent(ctx, spm[1]);
    if (error) return error;
    await resetStudentPassword(db, stu.xh);
    return ok({ xh: stu.xh, password: DEFAULT_STUDENT_PASSWORD }, env);
  }

  const sm = path.match(STUDENT_RE);
  if (sm && method === 'GET') {
    const denied = requirePerm(ctx, 'student:read'); if (denied) return denied;
    const { stu, error } = await assertOwnStudent(ctx, sm[1]);
    if (error) return error;
    return ok(stu, env);
  }

  if (sm && method === 'PUT') {
    const denied = requirePerm(ctx, 'student:write'); if (denied) return denied;
    const { stu, error } = await assertOwnStudent(ctx, sm[1]);
    if (error) return error;

    const d = await request.json();
    const sets = [];
    const params = [];
    for (const f of INFO_FIELDS) {
      if (d[f] !== undefined) { sets.push(f + ' = ?'); params.push(d[f]); }
    }
    for (const f of NUM_FIELDS) {
      if (d[f] !== undefined) { sets.push(f + ' = ?'); params.push(Number(d[f]) || 0); }
    }
    for (const f of JSON_FIELDS) {
      if (d[f] !== undefined) { sets.push(f + ' = ?'); params.push(JSON.stringify(d[f])); }
    }
    if (d.class_id !== undefined) {
      const { cls, error: ce } = await assertOwnClass(ctx, d.class_id);
      if (ce) return ce;
      sets.push('class_id = ?'); params.push(cls.id);
      sets.push('bj = ?'); params.push(cls.name);
      sets.push('fdy = ?'); params.push(cls.teacher_account);
    }
    if (sets.length === 0) return fail('无更新字段', 400, env);

    params.push(sm[1]);
    await db.update('UPDATE students SET ' + sets.join(', ') + ' WHERE xh = ?', params);
    if (d.xm && d.xm !== stu.xm) await db.update('UPDATE users SET name = ? WHERE account = ?', [d.xm, sm[1]]);
    return ok(null, env);
  }

  if (sm && method === 'DELETE') {
    const denied = requirePerm(ctx, 'student:write'); if (denied) return denied;
    const { stu, error } = await assertOwnStudent(ctx, sm[1]);
    if (error) return error;

    await purgeStudent(db, stu.id, env);
    return ok(null, env);
  }

  // ===================== 考勤 =====================
  if (path === ATTENDANCE_PATH && method === 'GET') {
    const denied = requirePerm(ctx, 'attendance:read'); if (denied) return denied;
    const { date, from, to, class_id, xh } = Object.fromEntries(searchParams);
    let sql = `SELECT a.id, a.student_id, a.date, a.status, a.remark, a.created_by,
                      s.xh, s.xm, s.bj
               FROM attendance a JOIN students s ON a.student_id = s.id WHERE 1=1`;
    const params = [];
    const scope = ownerScope(ctx, 's');
    sql += scope.sql; params.push(...scope.params);
    if (date) { sql += ' AND a.date = ?'; params.push(date); }
    if (from) { sql += ' AND a.date >= ?'; params.push(from); }
    if (to) { sql += ' AND a.date <= ?'; params.push(to); }
    if (class_id) { sql += ' AND s.class_id = ?'; params.push(class_id); }
    if (xh) { sql += ' AND s.xh = ?'; params.push(xh); }
    sql += ' ORDER BY a.date DESC, s.xh';
    return ok(await db.query(sql, params), env);
  }

  if (path === ATTENDANCE_PATH && method === 'POST') {
    const denied = requirePerm(ctx, 'attendance:write'); if (denied) return denied;
    const d = await request.json();
    if (!d.date || !Array.isArray(d.records)) return fail('缺少日期或考勤明细', 400, env);

    const createdAt = now();
    let affected = 0;
    for (const rec of d.records) {
      if (!rec.xh) continue;
      const status = ATTENDANCE_STATUS.includes(rec.status) ? rec.status : 'present';
      const stu = await db.queryOne('SELECT * FROM students WHERE xh = ?', [rec.xh]);
      if (!stu) continue;
      if (ctx.user.role !== 'admin' && stu.fdy !== ctx.user.account) continue;

      await db.run(
        `INSERT INTO attendance (student_id, date, status, remark, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(student_id, date) DO UPDATE SET
           status = excluded.status, remark = excluded.remark,
           created_by = excluded.created_by, created_at = excluded.created_at`,
        [stu.id, d.date, status, rec.remark || '', ctx.user.account, createdAt]
      );
      affected++;
    }
    return ok({ affected }, env);
  }

  const am = path.match(ATTENDANCE_RE);
  if (am && (method === 'PUT' || method === 'DELETE')) {
    const denied = requirePerm(ctx, 'attendance:write'); if (denied) return denied;
    const row = await db.queryOne(
      'SELECT a.*, s.fdy FROM attendance a JOIN students s ON a.student_id = s.id WHERE a.id = ?',
      [am[1]]
    );
    if (!row) return fail('考勤记录不存在', 404, env);
    if (ctx.user.role !== 'admin' && row.fdy !== ctx.user.account) return fail('只能操作自己班级的考勤', 403, env);

    if (method === 'DELETE') {
      await db.run('DELETE FROM attendance WHERE id = ?', [am[1]]);
      return ok(null, env);
    }
    const d = await request.json();
    const status = ATTENDANCE_STATUS.includes(d.status) ? d.status : row.status;
    await db.update('UPDATE attendance SET status = ?, remark = ? WHERE id = ?', [status, d.remark ?? row.remark, am[1]]);
    return ok(null, env);
  }

  // ===================== 综测申请审核 =====================
  if (path === APPS_PATH && method === 'GET') {
    const denied = requirePerm(ctx, 'application:read'); if (denied) return denied;
    const status = searchParams.get('status');
    let sql = `SELECT a.*, s.xh, s.xm, s.bj, s.zhuanye
               FROM applications a JOIN students s ON a.student_id = s.id WHERE 1=1`;
    const params = [];
    const scope = ownerScope(ctx, 's');
    sql += scope.sql; params.push(...scope.params);
    if (status) { sql += ' AND a.status = ?'; params.push(status); }
    sql += ' ORDER BY a.created_at DESC';
    return ok(await db.query(sql, params), env);
  }

  const appMatch = path.match(APP_RE);
  if (appMatch && method === 'GET') {
    const denied = requirePerm(ctx, 'application:read'); if (denied) return denied;
    const app = await db.queryOne(
      `SELECT a.*, s.xh, s.xm, s.bj, s.zhuanye, s.fdy FROM applications a
       JOIN students s ON a.student_id = s.id WHERE a.id = ?`,
      [appMatch[1]]
    );
    if (!app) return fail('申请不存在', 404, env);
    if (ctx.user.role !== 'admin' && app.fdy !== ctx.user.account) return fail('只能查看本班学生的申请', 403, env);

    const item = await db.queryOne('SELECT * FROM application_items WHERE application_id = ?', [app.id]);
    const proofs = await db.query('SELECT * FROM proofs WHERE application_id = ?', [app.id]);

    return ok({
      ...app,
      detail: item ? JSON.parse(item.detail) : null,
      scores: item ? {
        deyu_score: item.deyu_score, zhiyu_reward: item.zhiyu_reward, tiyu_reward: item.tiyu_reward,
        meiyu_reward: item.meiyu_reward, laoyu_reward: item.laoyu_reward, koufen: item.koufen,
      } : null,
      proofs: proofs.map(p => ({
        id: p.id, item_key: p.item_key, file_name: p.file_name,
        file_type: p.file_type, size: p.size, file_path: p.file_path,
      })),
    }, env);
  }

  const rm = path.match(REVIEW_RE);
  if (rm && method === 'PUT') {
    const denied = requirePerm(ctx, 'application:review'); if (denied) return denied;
    const appId = rm[1];
    const { action, reject_reason } = await request.json();

    const app = await db.queryOne(
      'SELECT a.*, s.fdy FROM applications a JOIN students s ON a.student_id = s.id WHERE a.id = ?',
      [appId]
    );
    if (!app) return fail('申请不存在', 404, env);
    if (ctx.user.role !== 'admin' && app.fdy !== ctx.user.account) return fail('只能审核本班学生的申请', 403, env);
    if (app.status !== 'pending') return fail('该申请已处理', 400, env);

    const reviewedAt = now();
    const reviewerId = ctx.user.id;

    if (action === 'approve') {
      await db.update(
        'UPDATE applications SET status = ?, reviewed_at = ?, reviewer_id = ? WHERE id = ?',
        ['approved', reviewedAt, reviewerId, appId]
      );
      await applyScores(db, app);
      return ok(null, env);
    }

    if (action === 'reject') {
      await db.update(
        'UPDATE applications SET status = ?, reviewed_at = ?, reviewer_id = ?, reject_reason = ? WHERE id = ?',
        ['rejected', reviewedAt, reviewerId, reject_reason || '未填写原因', appId]
      );
      return ok(null, env);
    }

    return fail('无效操作', 400, env);
  }

  return null;
}

/**
 * 彻底删除一名学生：考勤 / 证明材料 / 申请明细 / 申请 / 学生档案 / 登录账号。
 * 删除单个学生与「一键删除本班及学生」共用此逻辑，避免遗漏关联表。
 */
async function purgeStudent(db, studentId, env) {
  const stu = await db.queryOne('SELECT xh FROM students WHERE id = ?', [studentId]);
  await db.run('DELETE FROM attendance WHERE student_id = ?', [studentId]);
  // 先删除 KV 中的证明文件内容，再删 D1 记录，避免 KV 残留占用
  const proofRows = await db.query(
    'SELECT id, file_path FROM proofs WHERE application_id IN (SELECT id FROM applications WHERE student_id = ?)',
    [studentId]
  );
  const kv = env && env.FILES;
  for (const p of proofRows) {
    if (kv && p.file_path) {
      try { await kv.delete(p.file_path); } catch (e) { /* 值可能已过期，忽略 */ }
    }
  }
  await db.run('DELETE FROM proofs WHERE application_id IN (SELECT id FROM applications WHERE student_id = ?)', [studentId]);
  await db.run('DELETE FROM application_items WHERE application_id IN (SELECT id FROM applications WHERE student_id = ?)', [studentId]);
  await db.run('DELETE FROM applications WHERE student_id = ?', [studentId]);
  await db.run('DELETE FROM students WHERE id = ?', [studentId]);
  if (stu && stu.xh) await db.run('DELETE FROM users WHERE account = ? AND role = ?', [stu.xh, 'student']);
}

/** 把某学生的登录密码重置为初始密码（学号即账号） */
async function resetStudentPassword(db, xh) {
  const hash = hashPassword(DEFAULT_STUDENT_PASSWORD);
  const r = await db.update(
    "UPDATE users SET password_hash = ? WHERE account = ? AND role = 'student'",
    [hash, xh]
  );
  // 极少数情况可能缺账号记录，这里补建一条，保证学生能登录
  if (!r.affectedRows) {
    const stu = await db.queryOne('SELECT xm FROM students WHERE xh = ?', [xh]);
    await db.insert(
      'INSERT OR IGNORE INTO users (role, account, password_hash, name, status, created_at) VALUES (?, ?, ?, ?, 1, ?)',
      ['student', xh, hash, stu ? stu.xm : xh, now()]
    );
  }
}

/** 解析以 JSON 数组存储的字段，异常时回落为空数组 */
function jsonArray(raw) {
  try {
    const arr = JSON.parse(raw || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}

/** 审核通过后把奖励分累加进学生成绩表 */
async function applyScores(db, app) {
  const item = await db.queryOne('SELECT * FROM application_items WHERE application_id = ?', [app.id]);
  if (!item) return;

  const stu = await db.queryOne('SELECT * FROM students WHERE id = ?', [app.student_id]);
  if (!stu) return;

  const sets = [];
  const params = [];

  // 德育：按申报明细拆成「思想进步 / 表彰 / 干部任职 / 荣誉表彰」分项累加。
  // 不可直接累加 application_items.deyu_score（那是奖励分，且若误存为总分会导致 80 分基础分被重复计入）。
  const detail = (() => { try { return JSON.parse(item.detail || '{}'); } catch (e) { return {}; } })();
  const d = detail.deyu || {};
  const sixiang = Number(d.sixiang) || 0;
  const biaozhang = Number(d.biaozhang) || 0;
  const ganbu = Array.isArray(d.ganbu) ? d.ganbu : [];
  const rongyu = Array.isArray(d.rongyu) ? d.rongyu : [];
  if (sixiang) { sets.push('deyu_sixiang = ?'); params.push((Number(stu.deyu_sixiang) || 0) + sixiang); }
  if (biaozhang) { sets.push('deyu_biaozhang = ?'); params.push((Number(stu.deyu_biaozhang) || 0) + biaozhang); }
  if (ganbu.length) {
    sets.push('deyu_ganbu = ?');
    params.push(JSON.stringify(jsonArray(stu.deyu_ganbu).concat(ganbu)));
  }
  if (rongyu.length) {
    sets.push('deyu_rongyu = ?');
    params.push(JSON.stringify(jsonArray(stu.deyu_rongyu).concat(rongyu)));
  }

  // 其余维度：奖励分增量累加
  for (const { item: key, column } of SCORE_FIELDS) {
    const value = Number(item[key]) || 0;
    if (value > 0) { sets.push(column + ' = ?'); params.push((Number(stu[column]) || 0) + value); }
  }
  if (item.koufen < 0) {
    sets.push('koufen_chufen = ?');
    params.push((Number(stu.koufen_chufen) || 0) + Math.abs(item.koufen));
  }
  if (sets.length === 0) return;

  params.push(stu.id);
  await db.update('UPDATE students SET ' + sets.join(', ') + ' WHERE id = ?', params);
}
