/**
 * HTTP 响应与跨域（CORS）工具。
 * 前端部署在 Cloudflare Pages、后端部署为独立 Worker 时属于跨源调用，
 * 因此所有响应都必须带上 CORS 头。
 */

const ALLOWED_METHODS = 'GET, POST, PUT, DELETE, OPTIONS';
const ALLOWED_HEADERS = 'Content-Type, Authorization';

export function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': ALLOWED_METHODS,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
  };
}

/** 统一 JSON 响应：{ code, msg, data } */
export function json(data, status = 200, env = null) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(env ? corsHeaders(env) : { 'Access-Control-Allow-Origin': '*' }),
    },
  });
}

export function ok(data, env) {
  return json({ code: 0, msg: 'ok', data }, 200, env);
}

export function fail(msg, status = 400, env = null) {
  return json({ code: status === 401 ? 401 : 1, msg, data: null }, status, env);
}

export function notFound(env) {
  return fail('接口不存在', 404, env);
}

export function preflight(env) {
  return new Response(null, { status: 204, headers: corsHeaders(env) });
}
