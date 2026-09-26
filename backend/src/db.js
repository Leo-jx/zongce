/**
 * Cloudflare D1 数据库薄封装。
 * 把 D1 的 prepare/bind/all/run 收敛成和业务逻辑一致的 query/queryOne/insert/update。
 */

export function createDb(binding) {
  if (!binding) {
    throw new Error('未绑定 D1 数据库，请检查 wrangler.toml 的 [[d1_databases]] 配置');
  }

  async function query(sql, params = []) {
    const result = await binding.prepare(sql).bind(...params).all();
    return result.results || [];
  }

  async function queryOne(sql, params = []) {
    const rows = await query(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async function run(sql, params = []) {
    return binding.prepare(sql).bind(...params).run();
  }

  async function insert(sql, params = []) {
    const result = await run(sql, params);
    return { insertId: result.meta.last_row_id, affectedRows: result.meta.changes };
  }

  async function update(sql, params = []) {
    const result = await run(sql, params);
    return { affectedRows: result.meta.changes };
  }

  return { query, queryOne, insert, update, run };
}

/** SQLite/D1 常用的当前时间字符串：YYYY-MM-DD HH:MM:SS */
export function now() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}
