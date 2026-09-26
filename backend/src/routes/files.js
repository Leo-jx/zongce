/**
 * 证明材料上传与下载。
 *
 * 文件以 base64 存入 Cloudflare Workers KV（绑定名 FILES），上传记录写 D1 的 proofs 表；
 * 下载为公开只读（key 为随机串不可枚举，教师端用 <a target="_blank"> 直接打开）。
 *
 * KV 限制：单值上限 25 MiB，故这里对单文件额外限制 10 MB（base64 后约 13.4 MB）。
 */
import { ok, fail, json, corsHeaders } from '../http.js';

const FILE_RE = /^\/api\/files\/(.+)$/;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const CHUNK = 8192;

/** ArrayBuffer → base64（纯 Web API，不依赖 nodejs 兼容层） */
function toBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let out = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(out);
}

/** base64 → Uint8Array */
function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/** POST /api/upload —— 需登录 */
export async function handleUpload(path, method, ctx) {
  if (path !== '/api/upload' || method !== 'POST') return null;
  const { request, env, db } = ctx;

  const kv = env.FILES;
  if (!kv) return fail('未绑定 KV 命名空间 FILES，请检查 wrangler.toml 的 [[kv_namespaces]] 配置', 500, env);

  const formData = await request.formData();
  const applicationId = formData.get('application_id') ? Number(formData.get('application_id')) : null;
  const itemKey = formData.get('item_key') || 'general';
  const files = formData.getAll('files');
  if (files.length === 0) return fail('没有收到文件', 400, env);

  const results = [];
  for (const file of files) {
    if (file.size > MAX_FILE_SIZE) {
      return fail('文件「' + file.name + '」超过 10MB 上限，请压缩后重试', 400, env);
    }
    const key = Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '_' + file.name;
    const type = file.type || 'application/octet-stream';

    await kv.put(key, JSON.stringify({ t: type, d: toBase64(await file.arrayBuffer()) }));

    const r = await db.insert(
      'INSERT INTO proofs (application_id, item_key, file_path, file_name, file_type, size) VALUES (?, ?, ?, ?, ?, ?)',
      [applicationId, itemKey, key, file.name, type, file.size]
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
  const kv = env.FILES;
  if (!kv) return fail('未绑定 KV 命名空间 FILES', 500, env);

  let key = m[1];
  try { key = decodeURIComponent(key); } catch { /* 保持原样 */ }

  const raw = await kv.get(key);
  if (!raw) return json({ code: 1, msg: '文件不存在', data: null }, 404, env);

  let envelope;
  try { envelope = JSON.parse(raw); } catch { return json({ code: 1, msg: '文件数据损坏', data: null }, 500, env); }

  return new Response(fromBase64(envelope.d), {
    headers: {
      'Content-Type': envelope.t || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
      ...corsHeaders(env),
    },
  });
}
