# 综测加分申报与审核系统

学生在线填报德 / 智 / 体 / 美 / 劳加分明细并上传证明材料，辅导员在线审核（通过 / 驳回），通过后奖励分自动累加进学生成绩表。

- **前端**：纯静态页面，部署到 **Cloudflare Pages**
- **后端**：Cloudflare **Worker**（ESM），数据存 **D1**，证明材料存 **R2**
- 无 Node 服务进程、无 MySQL、无 Docker，全部运行在 Cloudflare 平台上

---

## 1. 目录结构

```
综测系统/
├── frontend/                  # 前端 —— Cloudflare Pages 静态站点（构建输出目录）
│   ├── index.html             #   登录首页：输入学号 / 工号 → 按角色跳转专属页面
│   ├── auth.js                #   会话存取、账号性质识别、角色→页面路由表、页面守卫
│   ├── student.html           #   学生专属页（填报 + 上传证明 + 查看审核状态）
│   ├── teacher.html           #   教职工专属页（审核 + 成绩 + 班级管理 + 考勤）
│   ├── admin.html             #   超级管理员专属页（权限 / 班级 / 教师 / 学生 / 账号）
│   ├── guest.html             #   访客专属页（免登录浏览计分规则与流程）
│   ├── 404.html               #   Cloudflare Pages 未匹配路径的兜底页
│   └── config.js              #   后端地址配置（API_BASE）
│
├── backend/                   # 后端 —— Cloudflare Worker
│   ├── wrangler.toml          #   Worker 配置：D1 / R2 / 环境变量绑定
│   ├── schema.sql             #   D1 建表脚本（全新安装）
│   ├── seed.sql               #   D1 种子数据（管理员 / 教师 / 学生 / 班级 / 权限）
│   ├── migrations/            #   已上线库的增量迁移脚本
│   ├── .dev.vars.example      #   本地开发环境变量样例
│   └── src/
│       ├── index.js           #   fetch 入口：CORS + 路由分发 + 统一异常处理
│       ├── http.js            #   JSON 响应与 CORS 工具
│       ├── db.js              #   D1 封装（query / queryOne / insert / update）
│       ├── auth.js            #   bcrypt 密码校验 + JWT 签发/校验
│       ├── rbac.js            #   角色 / 权限点模型与权限解析
│       ├── calc.js            #   综测计分口径（唯一分数规则来源）
│       └── routes/
│           ├── auth.js        #   POST /api/auth/login
│           ├── student.js     #   /api/student/applications
│           ├── teacher.js     #   班级、学生、考勤、综测申请（按归属隔离）
│           ├── admin.js       #   角色权限、账号管理、全局概览
│           └── files.js       #   POST /api/upload、GET /api/files/:key
│
├── package.json               # wrangler + 运行时依赖，以及全部部署脚本
└── README.md
```

## 2. 接口一览

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | 公开 | 登录，返回 JWT |
| GET | `/api/student/applications` | 学生 | 本人申请列表 |
| POST | `/api/student/applications` | 学生 | 提交申请（含各维度奖励分计算） |
| GET | `/api/student/applications/:id` | 学生 | 申请详情（明细 + 证明） |
| GET | `/api/teacher/classes` | `class:read` | 班级列表（辅导员只看自己的） |
| POST | `/api/teacher/classes` | `class:write` | 新建班级 |
| PUT / DELETE | `/api/teacher/classes/:id` | `class:write` | 修改 / 删除班级（有学生不可删） |
| POST | `/api/teacher/import` | `student:write` | 按教师号导入学生（CSV / rows） |
| GET | `/api/teacher/students` | `student:read` | 学生列表（支持 bj/xh/xm/class_id 过滤） |
| POST | `/api/teacher/students` | `student:write` | 新增学生（自动建学生账号） |
| GET / PUT / DELETE | `/api/teacher/students/:xh` | `student:read` / `student:write` | 查看 / 改信息与成绩 / 删除 |
| GET | `/api/teacher/attendance` | `attendance:read` | 考勤查询（date / from / to / class_id / xh） |
| POST | `/api/teacher/attendance` | `attendance:write` | 批量登记考勤（按 学生+日期 覆盖） |
| PUT / DELETE | `/api/teacher/attendance/:id` | `attendance:write` | 修改 / 删除单条考勤 |
| GET | `/api/teacher/applications` | `application:read` | 申请列表（?status=pending/approved/rejected） |
| GET | `/api/teacher/applications/:id` | `application:read` | 申请详情 |
| PUT | `/api/teacher/applications/:id/review` | `application:review` | 审核（approve / reject） |
| GET | `/api/admin/overview` | 管理员 | 全局统计 |
| GET / PUT | `/api/admin/permissions` | 管理员 | 查看 / 修改各角色权限 |
| GET / POST | `/api/admin/accounts` | 管理员 | 账号列表 / 新建账号（可分配权限） |
| PUT / DELETE | `/api/admin/accounts/:id` | 管理员 | 改角色 / 状态 / 密码 / 权限，删除账号 |
| POST | `/api/upload` | 登录用户 | 上传证明材料到 R2 |
| GET | `/api/files/:key` | 公开只读 | 下载证明材料 |

---

## 2.1 角色与权限模型

系统采用「**角色 + 权限点 + 账号级覆盖**」三层模型，定义在 `backend/src/rbac.js`：

1. **权限点（PERMISSION_DEFS）**：按功能模块划分的最小操作单元，如 `class:write`、`attendance:write`。
2. **角色默认权限（ROLE_DEFAULTS）**：`student` / `teacher` / `admin` 的内置默认值。
3. **角色配置（role_permissions 表）**：管理员在管理端调整，覆盖代码默认值。
4. **账号级覆盖（user_permissions 表）**：给单个账号单独授权或收回，优先级最高。

内置角色默认权限：

| 角色 | 默认权限 |
| --- | --- |
| 学生 | 查看本人加分申请 |
| 辅导员 / 教师 | 查看与审核申请、班级管理、学生信息与成绩、考勤 |
| 超级管理员 | 全部权限（含教师账号管理、账号管理、角色权限管理） |

**数据归属**：`students.fdy` 记录辅导员教师号、`classes.teacher_account` 记录班级归属。
辅导员的所有查询都会自动附加归属过滤，只能查看/修改自己负责的班级与学生；超级管理员不受限制。

**安全兜底**：超级管理员的 `permission:manage` 不可被剥夺；系统必须保留至少一个可用的超级管理员账号。

### 扩展方式

- **新增功能模块**：在 `PERMISSION_DEFS` 加一个权限点，路由里用 `requirePerm(ctx, 'xxx')` 校验，管理端权限矩阵会自动出现该选项。
- **新增角色**：往 `users.role` 写新角色名即可（未知角色默认无任何权限，必须在管理端显式授权，避免越权），管理端会自动列出该角色。
- **新增数据模块**：参照 `backend/src/routes/teacher.js` 的 `ownerScope()` / `assertOwnClass()` 复用归属过滤逻辑。

---

## 3. 部署到 Cloudflare

### 3.0 前置准备

```bash
npm install
npx wrangler login          # 首次使用需授权 Cloudflare 账号
```

### 3.1 创建 D1 数据库与 R2 存储桶

```bash
npm run d1:create           # wrangler d1 create zongce-db
npm run r2:create           # wrangler r2 bucket create zongce-proofs
```

`d1:create` 会输出 `database_id`，把它填到 `backend/wrangler.toml` 的 `[[d1_databases]].database_id`。

### 3.2 初始化数据库

```bash
npm run d1:schema           # 全新库：建表
npm run d1:seed             # 全新库：插入账号、班级与初始成绩
```

> 已经部署过旧版本（无班级/考勤/权限表）的库，改用增量迁移，不要重复执行 `d1:schema`（会清库）：
> ```bash
> npm run d1:migrate        # backend/migrations/0002_class_management.sql
> ```

### 3.3 设置密钥

```bash
npm run secret:jwt          # wrangler secret put JWT_SECRET
```

> 生产环境务必设置高强度 `JWT_SECRET`；未设置时会回退到内置默认密钥，存在安全风险。

### 3.4 部署后端 Worker

```bash
npm run deploy              # wrangler deploy --config backend/wrangler.toml
```

部署完成后得到后端地址，例如 `https://zongce-api.<your-subdomain>.workers.dev`。

### 3.5 部署前端 Pages

**方式 A：命令行部署**

```bash
npm run deploy:pages        # wrangler pages deploy frontend --project-name zongce-system
```

**方式 B：Git 连接（推荐，推送即部署）**

1. Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git
2. 选择本仓库，构建配置填写：

| 配置项 | 值 |
| --- | --- |
| Framework preset | None |
| Build command | 留空 |
| Build output directory | `frontend` |

### 3.6 打通前后端

前端与后端不同源，需要把后端地址告诉前端。编辑 `frontend/config.js`：

```js
var REMOTE_API_BASE = 'https://zongce-api.<your-subdomain>.workers.dev';
```

重新部署 Pages 即可（Git 连接时推送一次提交）。

同时建议把 `backend/wrangler.toml` 的 `ALLOWED_ORIGIN` 改为 Pages 域名（如 `https://zongce-system.pages.dev`），收紧 CORS 白名单，然后 `npm run deploy` 使配置生效。

### 3.7 访问地址

| 页面 | 地址 |
| --- | --- |
| **登录首页** | `https://<pages-domain>/`（即 `index.html`） |
| 学生专属页 | `https://<pages-domain>/student.html` |
| 教职工专属页 | `https://<pages-domain>/teacher.html` |
| 超级管理员专属页 | `https://<pages-domain>/admin.html` |
| 访客专属页 | `https://<pages-domain>/guest.html` |

Cloudflare Pages 会同时提供 `/student.html` 与 `/student` 两种写法。所有页面均为同目录下的静态文件，
无需 `_redirects` 即可直接访问；未匹配的路径由 `404.html` 兜底并自动返回登录页。

直接访问任意专属页时：未登录 → 跳转 `index.html`；已登录但角色不符 → 回到该角色自己的专属页。

初始账号（部署后请立即修改密码）：

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 超级管理员 | `admin` | `admin888` |
| 教师 | `T001` / `T002` | `123456` |
| 学生 | `2023010101` ~ `2023010108`、`2023020101` ~ `2023020105`、`2023030101` ~ `2023030102` | `123456` |

---

## 4. 本地开发

后端（`http://localhost:8787`）：

```bash
cp backend/.dev.vars.example backend/.dev.vars   # 可选，用于覆盖 JWT_SECRET 等
npm run d1:schema:local
npm run d1:seed:local
npm run dev
```

前端（`http://localhost:8788`）：

```bash
npm run dev:pages
```

两端端口不同，浏览器控制台执行一次即可联通：

```js
localStorage.setItem('zongce_api_base', 'http://localhost:8787');
```

（该值优先级高于 `frontend/config.js` 中的 `REMOTE_API_BASE`，仅存在当前浏览器。）

---

## 5. 环境变量与绑定

| 名称 | 位置 | 说明 |
| --- | --- | --- |
| `JWT_SECRET` | Worker Secret / `.dev.vars` | JWT 签名密钥 |
| `ALLOWED_ORIGIN` | `wrangler.toml` `[vars]` | CORS 允许的来源，`*` 为不限制 |
| `DB` | `[[d1_databases]]` | D1 数据库绑定 |
| `R2` | `[[r2_buckets]]` | 证明材料存储桶绑定 |

---

## 5.1 登录首页与角色跳转（index.html）

站点首页 `index.html` 即登录页，一个入口分流四类账号性质。

### 账号性质 → 目标页面映射表

映射关系集中定义在 `frontend/auth.js` 的 `ROLE_ROUTES`（唯一数据源，登录页的映射表格也由它渲染）：

| 账号性质（role） | 账号外观 | 目标页面 | 页面能力 |
| --- | --- | --- | --- |
| 超级管理员 `admin` | 工号（字母开头），如 `admin` | `admin.html` | 角色权限配置 · 全量数据管理 · 账号管理 |
| 辅导员 / 教职工 `teacher` | 工号，如 `T001` | `teacher.html` | 加分申请审核 · 班级管理 · 学生成绩 · 考勤登记 |
| 学生 `student` | 学号（8~12 位数字），如 `2023010101` | `student.html` | 综测加分申报 · 上传证明材料 · 查看审核状态 |
| 访客 `guest` | 免登录入口 | `guest.html` | 浏览综测计分规则与角色使用流程（只读） |

### 跳转链路

```
访问 /  →  index.html 登录页
   ├─ 已登录           → 直接回到该角色的专属页
   ├─ 点「访客浏览」    → 写入受限本地会话 → guest.html
   └─ 输入账号密码提交  → POST /api/auth/login
                         → 以服务端 role 判定身份
                         → 展示角色 + 目标页面 + 可用功能模块
                         → 3 秒倒计时自动跳转（可手动进入）
```

| 环节 | 说明 |
| --- | --- |
| 账号输入 | 实时识别账号外观并显示徽标：`学号 · 学生端` / `工号 · 教职工端`，格式错误标红 |
| 表单校验 | 账号必填 + 格式校验、密码必填且不少于 6 位；回车逐级提交，密码可明文切换 |
| 身份判定 | **以服务端返回的 `role` 为准**，前端识别仅用于提示，防止伪造账号性质越权 |
| 登录后 | 显示「身份：超级管理员　页面：admin.html」及按权限点裁剪的功能模块清单；管理员额外提供「进入教职工端」 |
| 页面守卫 | 各专属页用 `requireRole([...])` 校验：无会话 → `index.html`；角色不符 → 该角色自己的专属页 |
| 会话 | 统一写入 `localStorage.zongce_token / zongce_user` |
| 响应式 | 卡片式布局 + `viewport` 适配，420px 以下收紧内边距，触控目标 ≥44px |

新增角色时：后端 `src/rbac.js` 加权限点 / `users.role` 用新角色名，前端 `ROLE_ROUTES` 加一行并新建对应页面即可，跳转与守卫自动生效。

---

## 6. 班级学生信息管理（功能说明）

### 6.1 辅导员 / 教师端（teacher.html → 班级管理）

- **按教师号导入学生**：填写教师号（默认本人）+ 班级名，粘贴 `学号,姓名[,专业]` 名单即可批量导入，
  自动创建班级、建立学生档案并生成学生登录账号（初始密码 `123456`）；已存在的学号自动跳过。
  班级已归属其他辅导员时会被拒绝，超级管理员可代指定教师号导入。
- **班级数据管理**：查看所带班级及人数，维护学生基本信息（姓名/专业/班级）与成绩。
- **考勤登记**：选择日期与班级载入名单，逐人标记出勤 / 迟到 / 缺勤 / 请假并填写备注，
  按「学生 + 日期」覆盖保存，可反复修改。
- **归属隔离**：所有查询自动带上 `fdy = 本人教师号` 过滤，越权访问返回 403。

### 6.2 超级管理员端（admin.html）

| 模块 | 能力 |
| --- | --- |
| 概览 | 班级 / 学生 / 教师 / 待审申请 / 今日考勤统计 |
| 角色权限 | 以矩阵形式勾选各角色权限点并保存，即时生效 |
| 班级管理 | 全量班级增删改，可指定归属辅导员 |
| 教师管理 | 新建辅导员账号、改名、重置密码、停用 / 启用、删除 |
| 学生管理 | 全量学生增删改与转班（转班后归属辅导员同步变更） |
| 账号管理 | 新建任意角色账号（含管理员）并单独分配权限，改角色 / 状态 / 密码 / 权限 |
| 考勤查询 | 按日期、学号跨班级查询全部考勤记录 |

---

## 7. 重构变更要点

- **目录按前后端拆分**：`frontend/`（Pages 静态站点）与 `backend/`（Worker）彻底分离，各自独立部署。
- **删除 Cloudflare 用不到的代码**：原 Express + MySQL 版本的 `server/`（含路由、鉴权、计分、本地磁盘上传）、MySQL 初始化脚本 `scripts/`、`worker.js` 单文件后端全部移除；后端逻辑按职责拆到 `backend/src` 各模块。
- **删除冗余依赖**：移除 `express`、`mysql2`、`jsonwebtoken`、`multer`、`cors`、`dotenv`，仅保留 Worker 运行时真正使用的 `bcryptjs` 与 `jose`，`wrangler` 作为开发依赖。
- **删除旧版纯静态页面** `综测加分学生填报.html` / `综测加分老师填报.html`（数据存 localStorage、靠手工传 JSON，已被在线版取代）与开发用提示词文档。
- **前端可配置后端地址**：新增 `frontend/config.js`，支持 `REMOTE_API_BASE` 常量与 `localStorage` 运行时覆盖，解决 Pages 与 Worker 跨域部署问题。
- **修正后端缺陷**：`JWT_SECRET` 改为从 `env` 读取（原实现引用了不存在的全局变量）；证明材料下载改为公开只读（教师端用 `<a target="_blank">` 打开，无法携带 Authorization 头）；补上 `jose` / `bcryptjs` 依赖声明；补齐所有响应的 CORS 头。
- **修正种子数据**：原 `seed.sql` 中的密码哈希对应的是 `password` 而非 `123456`，已按真实账号重新生成，并补全管理员、两名教师与 15 名学生。
