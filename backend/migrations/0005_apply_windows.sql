-- 增量迁移 0005：分学年度 / 学期的申报填报时间窗口
-- 适用于已执行过 0001（schema.sql）与 0002~0004 的库；全新安装直接执行 schema.sql 即可（已含本表）。
-- 执行（生产库）：
--   wrangler d1 execute zongce-db --config backend/wrangler.toml --file backend/migrations/0005_apply_windows.sql --remote
-- 本地预览库：
--   wrangler d1 execute zongce-db --config backend/wrangler.toml --file backend/migrations/0005_apply_windows.sql

-- 填报时间窗口：超级管理员按「角色 / 单个账号」×「学年度 + 学期」配置可填报申请的开放区间。
-- 时间统一存北京时间字符串 YYYY-MM-DD HH:MM:SS（校验时以 UTC+8 计算当前时间）。
CREATE TABLE IF NOT EXISTS apply_windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL DEFAULT 'role',        -- role 按角色 / account 按账号
  role TEXT DEFAULT '',                      -- scope=role 时：student / teacher
  account TEXT DEFAULT '',                   -- scope=account 时：学号 / 教师号
  academic_year TEXT NOT NULL DEFAULT '',    -- 学年度，如 2026-2027
  term INTEGER NOT NULL DEFAULT 1,           -- 学期：1 第一学期（9~1月）/ 2 第二学期（2~8月）
  start_at TEXT NOT NULL,                    -- 开放时间
  end_at TEXT NOT NULL,                      -- 截止时间
  enabled INTEGER NOT NULL DEFAULT 1,        -- 1 启用 / 0 停用
  remark TEXT DEFAULT '',                    -- 备注
  created_by TEXT DEFAULT '',                -- 创建人（管理员账号）
  created_at TEXT DEFAULT NULL,
  updated_at TEXT DEFAULT NULL
);
