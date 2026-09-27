-- 增量迁移 0003：学生学籍状态（在读 / 休学 / 退学 / 转学 / 保留学籍 / 毕业）
-- 适用于已执行过 0001（schema.sql）与 0002 的库；全新安装直接执行 schema.sql 即可。
-- 执行（生产库）：
--   wrangler d1 execute zongce-db --config backend/wrangler.toml --file backend/migrations/0003_student_status.sql --remote
-- 本地预览库：
--   wrangler d1 execute zongce-db --config backend/wrangler.toml --file backend/migrations/0003_student_status.sql

-- 学生学籍状态：测评仅针对具有正式学籍的在校学生（休学 / 退学等不参与排名与统计）
ALTER TABLE students ADD COLUMN status TEXT NOT NULL DEFAULT '在读';

-- 状态可选值：在读 / 休学 / 退学 / 转学 / 保留学籍 / 毕业
