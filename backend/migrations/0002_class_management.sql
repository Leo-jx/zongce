-- 增量迁移 0002：班级学生信息管理（班级 / 考勤 / 角色权限 / 账号权限覆盖 / 账号状态）
-- 适用于已经执行过 0001（原始 schema.sql）的库。全新安装直接执行 schema.sql 即可。
-- 执行：wrangler d1 execute zongce-db --config backend/wrangler.toml --file backend/migrations/0002_class_management.sql --remote

CREATE TABLE IF NOT EXISTS classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  teacher_account TEXT NOT NULL,
  major TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  created_at TEXT DEFAULT NULL
);

-- 学生归属班级 + 归属辅导员
ALTER TABLE students ADD COLUMN class_id INTEGER DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_fdy ON students(fdy);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL,
  remark TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT NULL,
  UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

CREATE TABLE IF NOT EXISTS role_permissions (
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (role, permission_key)
);

CREATE TABLE IF NOT EXISTS user_permissions (
  user_id INTEGER NOT NULL,
  permission_key TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, permission_key)
);

-- 账号启用状态（SQLite 不支持 ADD COLUMN IF NOT EXISTS，重复执行报错可忽略）
ALTER TABLE users ADD COLUMN status INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN created_at TEXT DEFAULT NULL;

-- 依据现有 students.bj / students.fdy 回填班级，并把学生挂到对应班级
INSERT OR IGNORE INTO classes (name, teacher_account, major, grade, created_at)
SELECT DISTINCT s.bj, COALESCE(NULLIF(s.fdy, ''), 'admin'), COALESCE(s.zhuanye, ''), '', datetime('now')
FROM students s WHERE s.bj IS NOT NULL AND s.bj <> '';

UPDATE students
SET class_id = (SELECT c.id FROM classes c WHERE c.name = students.bj)
WHERE class_id IS NULL AND bj <> '';

-- 角色默认权限（与 backend/src/rbac.js 的 ROLE_DEFAULTS 保持一致）
INSERT OR IGNORE INTO role_permissions (role, permission_key, granted) VALUES
  ('student', 'application:read', 1),
  ('teacher', 'application:read', 1),
  ('teacher', 'application:review', 1),
  ('teacher', 'class:read', 1),
  ('teacher', 'class:write', 1),
  ('teacher', 'student:read', 1),
  ('teacher', 'student:write', 1),
  ('teacher', 'attendance:read', 1),
  ('teacher', 'attendance:write', 1),
  ('admin', 'application:read', 1),
  ('admin', 'application:review', 1),
  ('admin', 'class:read', 1),
  ('admin', 'class:write', 1),
  ('admin', 'student:read', 1),
  ('admin', 'student:write', 1),
  ('admin', 'attendance:read', 1),
  ('admin', 'attendance:write', 1),
  ('admin', 'teacher:read', 1),
  ('admin', 'teacher:write', 1),
  ('admin', 'user:manage', 1),
  ('admin', 'permission:manage', 1);
