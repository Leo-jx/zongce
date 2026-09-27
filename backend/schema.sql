-- 综测加分 / 班级学生信息管理系统 · D1 建表脚本（全新安装）
-- 已部署过的库请改用 backend/migrations/ 下的增量脚本。

DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS user_permissions;
DROP TABLE IF EXISTS role_permissions;
DROP TABLE IF EXISTS classes;
DROP TABLE IF EXISTS proofs;
DROP TABLE IF EXISTS application_items;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS students;
DROP TABLE IF EXISTS users;

-- 账号表：学生 / 辅导员教师 / 超级管理员共用
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL,                -- student / teacher / admin，新增角色直接写入新值
  account TEXT NOT NULL UNIQUE,      -- 学号 / 教师号 / 管理员账号
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  status INTEGER NOT NULL DEFAULT 1, -- 1 启用 / 0 停用
  created_at TEXT DEFAULT NULL
);

-- 班级表：teacher_account 决定归属，辅导员只能操作自己的班级
CREATE TABLE classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,         -- 班级名称，如 护理2301
  teacher_account TEXT NOT NULL,     -- 辅导员教师号
  major TEXT DEFAULT '',             -- 所属专业
  grade TEXT DEFAULT '',             -- 年级
  created_at TEXT DEFAULT NULL
);

CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  xh TEXT NOT NULL UNIQUE,
  xm TEXT NOT NULL,
  zhuanye TEXT DEFAULT '',
  bj TEXT DEFAULT '',                -- 班级名称（与 classes.name 对应）
  fdy TEXT DEFAULT '',               -- 辅导员教师号（数据归属）
  class_id INTEGER DEFAULT NULL,     -- 所属班级 ID
  zhuanye_score REAL DEFAULT 80,
  tiyu_chengji REAL DEFAULT 50,
  tiyu_tice REAL DEFAULT 30,
  deyu_sixiang REAL DEFAULT 0,
  deyu_biaozhang REAL DEFAULT 0,
  deyu_ganbu TEXT DEFAULT NULL,
  deyu_rongyu TEXT DEFAULT NULL,
  deyu_custom REAL DEFAULT 0,
  zhiyu_jingsai REAL DEFAULT 0,
  zhiyu_jineng TEXT DEFAULT NULL,
  zhiyu_chuangye REAL DEFAULT 0,
  zhiyu_custom REAL DEFAULT 0,
  tiyu_jiangli REAL DEFAULT 0,
  tiyu_custom REAL DEFAULT 0,
  meiyu_jiangli REAL DEFAULT 0,
  meiyu_custom REAL DEFAULT 0,
  laoyu_zhiyuanCishu REAL DEFAULT 0,
  laoyu_xianxue REAL DEFAULT 0,
  laoyu_qinshi REAL DEFAULT 0,
  laoyu_shehui REAL DEFAULT 0,
  laoyu_custom REAL DEFAULT 0,
  koufen_chufen REAL DEFAULT 0,
  koufen_richang REAL DEFAULT 0,
  status TEXT NOT NULL DEFAULT '在读'  -- 学籍状态：在读 / 休学 / 退学 / 转学 / 保留学籍 / 毕业
);

CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
CREATE INDEX IF NOT EXISTS idx_students_fdy ON students(fdy);

CREATE TABLE applications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  reviewed_at TEXT DEFAULT NULL,
  reviewer_id INTEGER DEFAULT NULL,
  reject_reason TEXT DEFAULT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id)
);

CREATE TABLE application_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL,
  detail TEXT NOT NULL,
  deyu_score REAL DEFAULT 0,
  zhiyu_reward REAL DEFAULT 0,
  tiyu_reward REAL DEFAULT 0,
  meiyu_reward REAL DEFAULT 0,
  laoyu_reward REAL DEFAULT 0,
  koufen REAL DEFAULT 0,
  FOREIGN KEY (application_id) REFERENCES applications(id)
);

CREATE TABLE proofs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER DEFAULT NULL,
  item_key TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  size INTEGER NOT NULL
);

-- 考勤记录：一个学生一天一条
CREATE TABLE attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  date TEXT NOT NULL,                -- YYYY-MM-DD
  status TEXT NOT NULL,              -- present 出勤 / late 迟到 / absent 缺勤 / leave 请假
  remark TEXT DEFAULT '',
  created_by TEXT DEFAULT '',
  created_at TEXT DEFAULT NULL,
  UNIQUE (student_id, date)
);

CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);

-- 角色权限：新增角色或模块只需插入记录
CREATE TABLE role_permissions (
  role TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (role, permission_key)
);

-- 账号级权限覆盖：给单个账号单独授权 / 收回，优先级高于角色配置
CREATE TABLE user_permissions (
  user_id INTEGER NOT NULL,
  permission_key TEXT NOT NULL,
  granted INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, permission_key)
);
