-- 增量迁移 0004：AI 综测咨询知识库（向量检索分块表）
-- 适用于已执行过 0001（schema.sql）与 0002/0003 的库；全新安装直接执行 schema.sql 后再执行本文件。
-- 执行（生产库）：
--   wrangler d1 execute zongce-db --config backend/wrangler.toml --file backend/migrations/0004_ai_knowledge.sql --remote
-- 本地预览库：
--   wrangler d1 execute zongce-db --config backend/wrangler.toml --file backend/migrations/0004_ai_knowledge.sql

-- 知识库分块：正文来自《湖南民族职业学院学生综合素质测评实施办法》，
-- 由 Worker 内置的 ai/knowledge.json 在首次问答时自动向量化写入。
CREATE TABLE IF NOT EXISTS ai_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  embedding TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT ''
);
