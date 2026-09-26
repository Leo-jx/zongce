/**
 * 组装 Cloudflare Pages 的部署目录 .pages-dist：
 *
 *   frontend/**                → 静态页面（登录 / 学生 / 教师 / 管理员 / 访客）
 *   backend/src/**             → functions/_api/**（下划线前缀目录不参与路由，仅作模块）
 *   functions/api/[[path]].js  → 把 /api/** 请求转交给后端代码
 *
 * 前后端由此共用同一个 Pages 域名（同源，无需 CORS，也不依赖 workers.dev）。
 * 源码仍按 frontend/ 与 backend/ 分开维护。
 *
 * 说明：这里逐个文件复制而不用 cpSync / rmSync，以兼容受限的沙箱环境。
 */
import { readdirSync, statSync, mkdirSync, copyFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, '.pages-dist');

// Pages 高级模式入口：/api/** 交给后端代码，其余交给静态资源
const ENTRY = `/**
 * Cloudflare Pages 高级模式入口（_worker.js）
 * /api/**  → 后端 Worker 代码（./_api）
 * 其他路径 → 静态资源（env.ASSETS）
 *
 * 采用高级模式而非 functions/[[path]].js，是为了让前后端共用一个 Pages 域名，
 * 既免去跨域配置，也不依赖在国内常常访问不通的 workers.dev。
 */
import worker from './_api/index.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) {
      return worker.fetch(request, env, ctx);
    }
    return env.ASSETS.fetch(request);
  },
};
`;

function copyDir(src, dest) {
  if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const s = join(src, entry);
    const d = join(dest, entry);
    if (statSync(s).isDirectory()) copyDir(s, d);
    else copyFileSync(s, d);
  }
}

function cleanDir(dir) {
  if (!existsSync(dir)) return;
  try { rmSync(dir, { recursive: true, force: true }); } catch { /* 受限环境下忽略，直接覆盖即可 */ }
}

cleanDir(out);
mkdirSync(out, { recursive: true });

copyDir(join(root, 'frontend'), out);
copyDir(join(root, 'backend', 'src'), join(out, '_api'));
writeFileSync(join(out, '_worker.js'), ENTRY);

let count = 0;
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = join(d, e);
    if (statSync(p).isDirectory()) walk(p); else count++;
  }
})(out);

console.log('已生成 Pages 部署目录 .pages-dist（共 ' + count + ' 个文件）');
console.log('  frontend/**     → 静态页面');
console.log('  backend/src/**  → _api/**');
console.log('  _worker.js      → /api/** 走后端，其余走静态资源');
