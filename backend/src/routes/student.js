/**
 * 学生端接口（/api/student/**），仅 role=student 可访问。
 */
import { ok, fail } from '../http.js';
import { now } from '../db.js';
import { calcScores } from '../calc.js';

const LIST_PATH = '/api/student/applications';
const DETAIL_RE = /^\/api\/student\/applications\/(\d+)$/;

export async function handleStudent(path, method, ctx) {
  const { request, env, db, user } = ctx;

  if (path === LIST_PATH && method === 'GET') {
    const stu = await db.queryOne('SELECT id FROM students WHERE xh = ?', [user.account]);
    if (!stu) return ok([], env);
    const apps = await db.query(
      `SELECT a.*, (SELECT COUNT(*) FROM proofs WHERE application_id = a.id) AS proof_count
       FROM applications a WHERE a.student_id = ? ORDER BY a.created_at DESC`,
      [stu.id]
    );
    return ok(apps, env);
  }

  if (path === LIST_PATH && method === 'POST') {
    const detail = await request.json();
    if (!detail.xh || !detail.xm) return fail('学号和姓名必填', 400, env);

    const stu = await db.queryOne('SELECT id FROM students WHERE xh = ?', [detail.xh]);
    if (!stu) return fail('学生档案不存在，请联系辅导员', 400, env);
    if (user.account !== detail.xh) return fail('只能提交本人的申请', 403, env);

    const scores = calcScores(detail);
    const createdAt = now();

    const app = await db.insert(
      'INSERT INTO applications (student_id, status, created_at) VALUES (?, ?, ?)',
      [stu.id, 'pending', createdAt]
    );
    await db.insert(
      `INSERT INTO application_items
        (application_id, detail, deyu_score, zhiyu_reward, tiyu_reward, meiyu_reward, laoyu_reward, koufen)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [app.insertId, JSON.stringify(detail), scores.deyuScore, scores.zhiyuReward,
        scores.tiyuReward, scores.meiyuReward, scores.laoyuReward, scores.koufenVal]
    );

    return ok({ id: app.insertId }, env);
  }

  const m = path.match(DETAIL_RE);
  if (m && method === 'GET') {
    const stu = await db.queryOne('SELECT id FROM students WHERE xh = ?', [user.account]);
    if (!stu) return fail('学生档案不存在', 400, env);

    const app = await db.queryOne('SELECT * FROM applications WHERE id = ? AND student_id = ?', [m[1], stu.id]);
    if (!app) return fail('申请不存在', 404, env);

    const item = await db.queryOne('SELECT * FROM application_items WHERE application_id = ?', [app.id]);
    const proofs = await db.query('SELECT * FROM proofs WHERE application_id = ?', [app.id]);

    return ok({
      ...app,
      detail: item ? JSON.parse(item.detail) : null,
      scores: item ? {
        deyu_score: item.deyu_score, zhiyu_reward: item.zhiyu_reward, tiyu_reward: item.tiyu_reward,
        meiyu_reward: item.meiyu_reward, laoyu_reward: item.laoyu_reward, koufen: item.koufen,
      } : null,
      proofs: proofs.map(p => ({ id: p.id, item_key: p.item_key, file_name: p.file_name, file_type: p.file_type, size: p.size })),
    }, env);
  }

  return null;
}
