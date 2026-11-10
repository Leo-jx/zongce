-- 增量迁移 0006：填报权限开关（一键开启 / 关闭填报、申请、审核等操作）
-- 适用于已执行过 0001（schema.sql）与 0002~0005 的库；全新安装直接执行 schema.sql 即可（已含本表）。
-- 执行（生产库）：
--   wrangler d1 execute zongce-db --config backend/wrangler.toml --file backend/migrations/0006_system_switches.sql --remote

-- 系统开关表：key 缺行视为开启（默认全开），关闭即禁止对应写操作。
CREATE TABLE IF NOT EXISTS system_switches (
  key TEXT PRIMARY KEY,              -- apply_submit / apply_review / apply_edit / attendance_write
  enabled INTEGER NOT NULL DEFAULT 1,-- 1 开启 / 0 关闭
  remark TEXT DEFAULT '',            -- 最近操作备注（保留）
  updated_by TEXT DEFAULT '',        -- 最近操作人（管理员账号）
  updated_at TEXT DEFAULT NULL       -- 最近操作时间
);
