/**
 * 前端运行配置 —— 由 index.html / teacher.html 在业务脚本之前加载。
 *
 * 后端地址解析优先级：
 *   1. localStorage 中的 zongce_api_base（运行时覆盖，便于本地联调）
 *   2. 下方 REMOTE_API_BASE 常量（部署到 Cloudflare Pages 时填写 Worker 域名）
 *   3. 同源（后端以 Cloudflare Pages Functions 方式部署，或本地 wrangler dev 同源）
 */
(function () {
  // 后端部署为独立 Cloudflare Worker 时，改为 https://<worker-name>.<subdomain>.workers.dev
  // 留空表示同源调用。
  var REMOTE_API_BASE = '';

  var saved = '';
  try {
    saved = localStorage.getItem('zongce_api_base') || '';
  } catch (e) {
    saved = '';
  }

  window.API_BASE = saved || REMOTE_API_BASE || '';
})();
