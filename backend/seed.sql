-- 种子数据（Cloudflare D1 / SQLite）
-- 说明：先执行 schema.sql 建表，再执行本文件。使用 INSERT OR IGNORE，可重复执行。
-- 密码：管理员 admin888，教师与学生统一 123456（部署后请立即修改）。

-- 超级管理员
INSERT OR IGNORE INTO users (role, account, password_hash, name) VALUES
  ('admin', 'admin', '$2a$10$yR342QNei7V/YQGcm7O8B..dzjQkEWzSCv5w2wAcbBQ9/1/bWFNBC', '姜霞');

-- 教师 / 辅导员
INSERT OR IGNORE INTO users (role, account, password_hash, name) VALUES
  ('teacher', 'T001', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '王老师'),
  ('teacher', 'T002', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '刘老师');

-- 学生账号
INSERT OR IGNORE INTO users (role, account, password_hash, name) VALUES
  ('student', '2023010101', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '张三'),
  ('student', '2023010102', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '李四'),
  ('student', '2023010103', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '王五'),
  ('student', '2023010104', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '赵六'),
  ('student', '2023010105', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '钱七'),
  ('student', '2023010106', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '孙八'),
  ('student', '2023010107', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '周九'),
  ('student', '2023010108', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '吴十'),
  ('student', '2023020101', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '郑芳'),
  ('student', '2023020102', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '陈静'),
  ('student', '2023020103', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '林慧'),
  ('student', '2023020104', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '黄敏'),
  ('student', '2023020105', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '杨丽'),
  ('student', '2023030101', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '徐磊'),
  ('student', '2023030102', '$2a$10$QjBSBWDzreE/SzUKQyAPIeT0ifXIZS/a1nvuqxy8n8l7GZqwbAbKK', '马超');

-- 学生档案（zhuanye_score 为学业成绩，其余加分项默认为 0）
INSERT OR IGNORE INTO students (xh, xm, zhuanye, bj, fdy, zhuanye_score, deyu_ganbu, deyu_rongyu, zhiyu_jineng) VALUES
  ('2023010101', '张三', '护理',     '护理2301',   'T001', 72.5, '[]', '[]', '[]'),
  ('2023010102', '李四', '护理',     '护理2301',   'T001', 68.0, '[]', '[]', '[]'),
  ('2023010103', '王五', '护理',     '护理2301',   'T001', 75.2, '[]', '[]', '[]'),
  ('2023010104', '赵六', '护理',     '护理2301',   'T001', 64.8, '[]', '[]', '[]'),
  ('2023010105', '钱七', '护理',     '护理2301',   'T001', 70.1, '[]', '[]', '[]'),
  ('2023010106', '孙八', '护理',     '护理2302',   'T001', 66.3, '[]', '[]', '[]'),
  ('2023010107', '周九', '护理',     '护理2302',   'T001', 71.8, '[]', '[]', '[]'),
  ('2023010108', '吴十', '护理',     '护理2302',   'T001', 59.5, '[]', '[]', '[]'),
  ('2023020101', '郑芳', '学前教育', '学前2301',   'T002', 78.0, '[]', '[]', '[]'),
  ('2023020102', '陈静', '学前教育', '学前2301',   'T002', 73.5, '[]', '[]', '[]'),
  ('2023020103', '林慧', '学前教育', '学前2301',   'T002', 69.2, '[]', '[]', '[]'),
  ('2023020104', '黄敏', '学前教育', '学前2302',   'T002', 74.6, '[]', '[]', '[]'),
  ('2023020105', '杨丽', '学前教育', '学前2302',   'T002', 67.8, '[]', '[]', '[]'),
  ('2023030101', '徐磊', '计算机',   '计算机2301', 'T002', 76.0, '[]', '[]', '[]'),
  ('2023030102', '马超', '计算机',   '计算机2301', 'T002', 62.4, '[]', '[]', '[]');

-- 班级（teacher_account 决定归属辅导员）
INSERT OR IGNORE INTO classes (name, teacher_account, major, grade, created_at) VALUES
  ('护理2301',   'T001', '护理',     '2023', datetime('now')),
  ('护理2302',   'T001', '护理',     '2023', datetime('now')),
  ('学前2301',   'T002', '学前教育', '2023', datetime('now')),
  ('学前2302',   'T002', '学前教育', '2023', datetime('now')),
  ('计算机2301', 'T002', '计算机',   '2023', datetime('now'));

-- 把学生挂到对应班级
UPDATE students SET class_id = (SELECT c.id FROM classes c WHERE c.name = students.bj) WHERE class_id IS NULL;

-- 角色默认权限（与 backend/src/rbac.js 的 ROLE_DEFAULTS 保持一致，可在管理端调整）
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
