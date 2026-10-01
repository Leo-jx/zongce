/**
 * 综测计分口径 —— 学生端与教师端共用的唯一数据源。
 *
 * 历史教训：德育曾因「总分被当成奖励分累加」导致恒为 100，根源就是多处各写一套算法。
 * 因此这里集中定义：数据库扁平列 → 嵌套结构、五个维度的得分、综测总分。
 * 任何口径调整只需改本文件，学生端与教师端自动一致。
 *
 * 官方口径（湖南民族职业学院）：
 *   德育 100 = 基础 80 + 奖励 20（干部任职、荣誉表彰各封顶 10）
 *   智育 100 = 专业成绩(80 分制) + 奖励 20（技能证书封顶 20）
 *   体育 100 = 期末体育 50 + 体质测试 30 + 奖励 20
 *   美育 100 = 基础 80 + 奖励 20
 *   劳育 100 = 基础 80 + 奖励 20（志愿服务封顶 10 次、献血每次 5 分）
 *   综测 = 德×20% + 智×50% + 体×10% + 美×10% + 劳×10% + 扣分
 */
(function (global) {
  /** 各维度奖励分上限 */
  var CAP = 20;

  function toNum(v) { var n = Number(v); return isNaN(n) ? 0 : n; }
  function toArr(v) {
    try {
      var p = typeof v === 'string' ? JSON.parse(v || '[]') : v;
      return Array.isArray(p) ? p : [];
    } catch (e) { return []; }
  }
  function sum(vals) { return (vals || []).reduce(function (a, b) { return a + (Number(b) || 0); }, 0); }
  function cap(v) { return Math.min(Math.max(v || 0, 0), CAP); }

  // 德育 = 基础 80 + 奖励分（干部 / 荣誉各封顶 10，奖励合计封顶 20）
  function calcDeyu(s) {
    var d = s.deyu || {};
    var reward = Math.min(cap(
      (Number(d.sixiang) || 0) + (Number(d.biaozhang) || 0)
      + Math.min(sum(d.ganbu), 10) + Math.min(sum(d.rongyu), 10)
      + (Number(d.custom) || 0)
    ), 20);
    return 80 + reward;
  }
  // 智育 = 专业成绩（80 分制）+ 奖励分（技能证书封顶 20），上限 100
  function calcZhiyu(s) {
    var z = s.zhiyu || {};
    var jl = cap((Number(z.jingsai) || 0) + Math.min(sum(z.jineng), 20) + (Number(z.chuangye) || 0) + (Number(z.custom) || 0));
    return Math.min((Number(z.zhuanye) || 0) + jl, 100);
  }
  // 体育 = 期末成绩 + 体质测试 + 奖励分，上限 100
  function calcTiyu(s) {
    var t = s.tiyu || {};
    var jl = cap((Number(t.jiangli) || 0) + (Number(t.custom) || 0));
    return Math.min((Number(t.chengji) || 0) + (Number(t.tice) || 0) + jl, 100);
  }
  // 美育 / 劳育 = 基础 80 + 奖励分，上限 100
  function calcMeiyu(s) {
    var m = s.meiyu || {};
    return Math.min(80 + cap((Number(m.jiangli) || 0) + (Number(m.custom) || 0)), 100);
  }
  function calcLaoyu(s) {
    var l = s.laoyu || {};
    var zhiyuan = Math.min(Number(l.zhiyuanCishu) || 0, 10);
    var xianxue = (Number(l.xianxue) || 0) * 5;
    var jl = cap(zhiyuan + xianxue + (Number(l.qinshi) || 0) + (Number(l.shehui) || 0) + (Number(l.custom) || 0));
    return Math.min(80 + jl, 100);
  }
  function calcKoufen(s) {
    var k = s.koufen || {};
    return -((Number(k.chufen) || 0) + (Number(k.richang) || 0));
  }
  function calcZongce(s) {
    var de = calcDeyu(s), zhi = calcZhiyu(s), ti = calcTiyu(s), mei = calcMeiyu(s), lao = calcLaoyu(s);
    return Math.max(0, de * 0.20 + zhi * 0.50 + ti * 0.10 + mei * 0.10 + lao * 0.10 + calcKoufen(s));
  }

  /** 数据库行（deyu_sixiang…）→ 上述 calc* 使用的嵌套结构 */
  function toStudent(row) {
    return Object.assign({}, row, {
      id: row.id != null ? row.id : row.xh,
      status: row.status || '在读',
      deyu: {
        sixiang: toNum(row.deyu_sixiang), biaozhang: toNum(row.deyu_biaozhang),
        ganbu: toArr(row.deyu_ganbu), rongyu: toArr(row.deyu_rongyu), custom: toNum(row.deyu_custom)
      },
      zhiyu: {
        zhuanye: toNum(row.zhuanye_score), jingsai: toNum(row.zhiyu_jingsai),
        jineng: toArr(row.zhiyu_jineng), chuangye: toNum(row.zhiyu_chuangye), custom: toNum(row.zhiyu_custom)
      },
      tiyu: {
        chengji: toNum(row.tiyu_chengji), tice: toNum(row.tiyu_tice),
        jiangli: toNum(row.tiyu_jiangli), custom: toNum(row.tiyu_custom)
      },
      meiyu: { jiangli: toNum(row.meiyu_jiangli), custom: toNum(row.meiyu_custom) },
      laoyu: {
        zhiyuanCishu: toNum(row.laoyu_zhiyuanCishu), xianxue: toNum(row.laoyu_xianxue),
        qinshi: toNum(row.laoyu_qinshi), shehui: toNum(row.laoyu_shehui), custom: toNum(row.laoyu_custom)
      },
      koufen: { chufen: toNum(row.koufen_chufen), richang: toNum(row.koufen_richang) }
    });
  }

  global.ZCScore = {
    CAP: CAP, toNum: toNum, toArr: toArr, sum: sum, cap: cap,
    calcDeyu: calcDeyu, calcZhiyu: calcZhiyu, calcTiyu: calcTiyu,
    calcMeiyu: calcMeiyu, calcLaoyu: calcLaoyu, calcKoufen: calcKoufen,
    calcZongce: calcZongce, toStudent: toStudent
  };
})(window);
