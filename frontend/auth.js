/**
 * 统一会话、账号性质识别与角色跳转路由（全站共用）。
 *
 * 登录只在 index.html 进行；登录成功后按「账号性质 → 专属页面」的映射表
 * （ROLE_ROUTES）跳转。新增角色只需在 ROLE_ROUTES 里加一行即可。
 */
(function (global) {
  var TOKEN_KEY = 'zongce_token';
  var USER_KEY = 'zongce_user';

  /** 登录页（兼站点首页） */
  var LOGIN_PAGE = 'index.html';

  /**
   * 账号性质 → 目标页面映射表（唯一数据源）
   * role        服务端返回的角色标识
   * accountType 账号外观类型：student 学号 / staff 工号 / guest 免登录
   * page        该角色在 Cloudflare Pages 上的专属页面
   */
  var ROLE_ROUTES = [
    { role: 'admin', accountType: 'staff', label: '超级管理员', page: 'admin.html', desc: '角色权限配置 · 全量数据管理 · 账号管理' },
    { role: 'teacher', accountType: 'staff', label: '辅导员 / 教职工', page: 'teacher.html', desc: '加分申请审核 · 班级管理 · 学生成绩 · 考勤登记' },
    { role: 'student', accountType: 'student', label: '学生', page: 'student.html', desc: '综测加分申报 · 上传证明材料 · 查看审核状态' },
    { role: 'guest', accountType: 'guest', label: '访客', page: 'guest.html', desc: '免登录浏览综测计算规则与系统说明' },
  ];

  var ROLE_LABEL = {};
  var ROLE_HOME = {};
  ROLE_ROUTES.forEach(function (r) {
    ROLE_LABEL[r.role] = r.label;
    ROLE_HOME[r.role] = r.page;
  });

  /** 各角色可用的功能模块（need 为所需权限点，用于按权限裁剪展示） */
  var ROLE_MODULES = {
    student: [
      { name: '综测加分申报', desc: '填写德智体美劳加分明细并上传证明材料', need: 'application:read' },
      { name: '我的申请状态', desc: '查看审核结果与驳回理由', need: 'application:read' },
    ],
    teacher: [
      { name: '申请审核', desc: '审核所带班级学生的加分申请', need: 'application:review' },
      { name: '学生总表', desc: '查看综测总分排名并维护成绩', need: 'student:read' },
      { name: '班级管理', desc: '按教师号导入学生、维护班级与考勤', need: 'class:read' },
    ],
    admin: [
      { name: '角色权限', desc: '配置各角色可使用的功能权限', need: 'permission:manage' },
      { name: '班级 / 教师 / 学生管理', desc: '全量数据维护与转班', need: 'class:write' },
      { name: '账号管理', desc: '新建管理员账号并分配权限', need: 'user:manage' },
      { name: '考勤查询', desc: '跨班级查询全部考勤记录', need: 'attendance:read' },
    ],
    guest: [
      { name: '综测规则说明', desc: '查看德智体美劳计分口径与权重', need: '' },
      { name: '系统使用指南', desc: '了解各角色的填报与审核流程', need: '' },
    ],
  };

  /**
   * 账号外观识别：学号为纯数字，工号为字母开头
   * 学号位数放宽到 6~20 位，兼容不同院校的长学号（含年份+院系+班级+序号等编码）。
   */
  var PATTERNS = {
    student: /^\d{6,20}$/,
    staff: /^[A-Za-z][A-Za-z0-9_.-]{1,19}$/,
  };

  var ACCOUNT_HINT = '学号为 6~20 位纯数字，工号为字母开头';

  function detectAccountType(account) {
    var v = String(account || '').trim();
    if (!v) return '';
    if (PATTERNS.student.test(v)) return 'student';
    if (PATTERNS.staff.test(v)) return 'staff';
    return 'unknown';
  }

  /** 账号性质对应的候选角色（仅用于登录页提示，最终以服务端 role 为准） */
  function rolesOfType(type) {
    return ROLE_ROUTES.filter(function (r) { return r.accountType === type; });
  }

  function saveSession(data) {
    try {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify({
        role: data.role, name: data.name, account: data.account,
        permissions: data.permissions || [], bj: data.bj, zhuanye: data.zhuanye,
      }));
    } catch (e) { /* 隐私模式下忽略 */ }
  }

  /** 访客：不经过服务端，写入一个受限的本地会话 */
  function enterGuest() {
    saveSession({ token: 'guest', role: 'guest', name: '访客', account: 'guest', permissions: [] });
    global.location.href = home('guest');
  }

  function readSession() {
    var token = '';
    var raw = '';
    try {
      token = localStorage.getItem(TOKEN_KEY) || '';
      raw = localStorage.getItem(USER_KEY) || '';
    } catch (e) { return null; }
    if (!token || !raw) return null;
    try {
      return { token: token, user: JSON.parse(raw) };
    } catch (e) { return null; }
  }

  function clearSession() {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      // 兼容旧版本遗留的按角色存储的会话
      localStorage.removeItem('zongce_teacher_token');
      localStorage.removeItem('zongce_teacher_user');
      localStorage.removeItem('zongce_admin_token');
      localStorage.removeItem('zongce_admin_user');
    } catch (e) { /* ignore */ }
  }

  /** 角色 → 专属页面，未知角色回落到登录页 */
  function home(role) {
    return ROLE_HOME[role] || LOGIN_PAGE;
  }

  function goLogin() {
    global.location.href = LOGIN_PAGE;
  }

  function logout() {
    clearSession();
    goLogin();
  }

  /**
   * 页面启动守卫：恢复会话并校验角色。
   * - 无会话 → 去登录页 index.html
   * - 角色不在允许范围内 → 去该角色自己的专属页面
   * @returns {{token:string,user:object}|null}
   */
  function requireRole(roles) {
    var s = readSession();
    if (!s) { goLogin(); return null; }
    if (roles && roles.length && roles.indexOf(s.user.role) < 0) {
      global.location.href = home(s.user.role);
      return null;
    }
    return s;
  }

  global.ZCAuth = {
    TOKEN_KEY: TOKEN_KEY,
    USER_KEY: USER_KEY,
    LOGIN_PAGE: LOGIN_PAGE,
    ACCOUNT_HINT: ACCOUNT_HINT,
    ROLE_ROUTES: ROLE_ROUTES,
    ROLE_HOME: ROLE_HOME,
    ROLE_LABEL: ROLE_LABEL,
    ROLE_MODULES: ROLE_MODULES,
    detectAccountType: detectAccountType,
    rolesOfType: rolesOfType,
    saveSession: saveSession,
    enterGuest: enterGuest,
    readSession: readSession,
    clearSession: clearSession,
    home: home,
    goLogin: goLogin,
    logout: logout,
    requireRole: requireRole,
  };
})(window);
