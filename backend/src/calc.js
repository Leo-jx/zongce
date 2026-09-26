/**
 * 综测加分计算口径（德 / 智 / 体 / 美 / 劳 / 扣分）。
 * 分数规则与原系统保持一致，任何改动都会影响历史申请数据，请勿随意调整。
 */

function sum(arr) {
  return Array.isArray(arr) ? arr.reduce((s, v) => s + Number(v || 0), 0) : 0;
}

function cap(v, max = Infinity) {
  return Math.max(0, Math.min(Number(v || 0), max));
}

/**
 * 根据学生提交的申报明细计算各维度奖励分。
 * @param {object} detail 学生端 collect() 出来的明细对象
 */
export function calcScores(detail) {
  const deyu = detail.deyu || {};
  const zhiyu = detail.zhiyu || {};
  const tiyu = detail.tiyu || {};
  const meiyu = detail.meiyu || {};
  const laoyu = detail.laoyu || {};
  const koufen = detail.koufen || {};

  // 德育：基础 80 分 + 奖励分（干部/荣誉各封顶 10），总分封顶 100
  const deyuJL = (Number(deyu.sixiang) || 0) + (Number(deyu.biaozhang) || 0)
    + Math.min(sum(deyu.ganbu), 10) + Math.min(sum(deyu.rongyu), 10);
  const deyuScore = Math.min(80 + cap(deyuJL), 100);

  // 智育：竞赛 + 技能证书（封顶 20）+ 创业
  const zhiyuReward = cap((Number(zhiyu.jingsai) || 0) + Math.min(sum(zhiyu.jineng), 20) + (Number(zhiyu.chuangye) || 0));

  const tiyuReward = cap(Number(tiyu.jiangli) || 0);
  const meiyuReward = cap(Number(meiyu.jiangli) || 0);

  // 劳育：志愿服务次数封顶 10 次、献血每次 5 分
  const laoyuReward = cap(Math.min(Number(laoyu.zhiyuanCishu) || 0, 10) + (Number(laoyu.xianxue) || 0) * 5 + (Number(laoyu.shehui) || 0));

  const koufenVal = -(Number(koufen.chufen) || 0);

  return { deyuScore, zhiyuReward, tiyuReward, meiyuReward, laoyuReward, koufenVal };
}

/**
 * 审核通过后，把申请的各维度奖励分写回学生成绩表时使用的字段映射。
 * 顺序即 SQL SET 子句顺序，勿随意调整。
 */
export const SCORE_FIELDS = [
  { item: 'deyu_score', column: 'deyu_sixiang' },
  { item: 'zhiyu_reward', column: 'zhiyu_jingsai' },
  { item: 'tiyu_reward', column: 'tiyu_jiangli' },
  { item: 'meiyu_reward', column: 'meiyu_jiangli' },
  { item: 'laoyu_reward', column: 'laoyu_shehui' },
];
