/**
 * 证明材料上传与下载。
 * 上传走 D1 记录 + R2 对象存储；下载为公开只读（R2 key 不可枚举，教师端用 <a target="_blank"> 直接打开）。
 */
import { ok, fail, json, corsHeaders } from '../http.js';

const FILE_RE = /^\/api\/files\/(.+)$/;

/** POST /api/upload —— 需登录 */
export async function handleUpload(path, method, ctx) {
  if (path !== '/api/upload' || method !== 'POST') return null;
  const { request, env, db } = ctx;

  const bucket = env.R2;
  if (!bucket) return fail('未绑定 R2 存储桶，请检查 wrangler.toml 的 [[r2_buckets]] 配置', 500, env);

  const formData = await request.formData();
  const applicationId = formData.get('application_id') ? Number(formData.get('application_id')) : null;
  const itemKey = formData.get('item_key') || 'general';
  const files = formData.getAll('files');
  if (files.length === 0) return fail('没有收到文件', 400, env);

  const results = [];
  for (const file of files) {
    const key = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + file.name;
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });
    const r = await db.insert(
      'INSERT INTO proofs (application_id, item_key, file_path, file_name, file_type, size) VALUES (?, ?, ?, ?, ?, ?)',
      [applicationId, itemKey, key, file.name, file.type || 'application/octet-stream', file.size]
    );
    results.push({ id: r.insertId, file_name: file.name, file_path: key });
  }

  return ok(results, env);
}

/** GET /api/files/:key —— 公开读取 */
export async function handleFileDownload(path, method, ctx) {
  if (method !== 'GET') return null;
  const m = path.match(FILE_RE);
  if (!m) return null;

  const { env } = ctx;
  const bucket = env.R2;
  if (!bucket) return fail('未绑定 R2 存储桶', 500, env);

  let key = m[1];
  try { key = decodeURIComponent(key); } catch { /* 保持原样 */ }

  const object = await bucket.get(key);
  if (!object) return json({ code: 1, msg: '文件不存在', data: null }, 404, env);

  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
      ...corsHeaders(env),
    },
  });
}
