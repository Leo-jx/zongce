-- 教学计划库共享化（增量迁移：已部署过的库执行此脚本）
-- 目标：把教学计划从辅导员本地浏览器存储（localStorage）迁到数据库，供所有辅导员共用；
--       同一「年级 + 专业 + 学年」的教学计划合并为一条，多个学期 / 多个文件的课程自动整合。

CREATE TABLE IF NOT EXISTS teaching_plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade TEXT NOT NULL DEFAULT '',          -- 年级，如 2023
  major TEXT NOT NULL DEFAULT '',          -- 专业，如 软件技术
  academic_year TEXT NOT NULL DEFAULT '',  -- 学年，如 2023-2024（同一学年的各学期合并到一条）
  terms TEXT NOT NULL DEFAULT '[]',        -- 覆盖的学期 JSON 数组，如 ["2023-2024-1","2023-2024-2"]
  courses TEXT NOT NULL DEFAULT '[]',      -- 课程 JSON 数组 [{name,credit,prop}]
  n_req INTEGER NOT NULL DEFAULT 0,        -- 必修课程数
  n_sel INTEGER NOT NULL DEFAULT 0,        -- 限选课程数
  source_files TEXT NOT NULL DEFAULT '',   -- 来源文件名，顿号分隔
  created_by TEXT NOT NULL DEFAULT '',     -- 上传人（教师号 / 管理员账号）
  updated_at TEXT DEFAULT NULL
);

-- 唯一索引：保证「年级 + 专业 + 学年」只有一条，写入时自动合并（可反复上传同一学年的多个学期文件）
CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_key ON teaching_plans (grade, major, academic_year);
CREATE INDEX IF NOT EXISTS idx_plans_major ON teaching_plans (major);
