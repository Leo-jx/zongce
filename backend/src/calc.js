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

/** 德育基础分（官方口径：德育 100 分 = 基础分 80 + 奖励分 20） */
export const DEYU_BASE = 80;
/** 德育奖励分上限 */
export const DEYU_REWARD_MAX = 20;
/** 德育「干部任职」「荣誉表彰」两类各自的上限 */
export const DEYU_CATEGORY_MAX = 10;

/**
 * 德育奖励分（增量，不含 80 分基础分）。
 * 口径：思想进步 + 表彰 + 干部任职（封顶 10）+ 荣誉表彰（封顶 10）+ 辅导员补充，合计封顶 20。
 *
 * 注意：这里返回的是「奖励分」而非「德育总分」，审核写回时只能累加奖励分，
 * 否则 80 分基础分会被重复计入，导致德育恒为 100。
 *
 * @param {object} deyu 申报明细中的 deyu 段 {sixiang,biaozhang,ganbu[],rongyu[]}
 * @param {number} custom 辅导员手工补充分（deyu_custom）
 */
export function calcDeyuReward(deyu, custom = 0) {
  const d = deyu || {};
  const reward = (Number(d.sixiang) || 0) + (Number(d.biaozhang) || 0)
    + Math.min(sum(d.ganbu), DEYU_CATEGORY_MAX)
    + Math.min(sum(d.rongyu), DEYU_CATEGORY_MAX)
    + (Number(custom) || 0);
  return Math.max(0, Math.min(reward, DEYU_REWARD_MAX));
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

  // 德育：奖励分封顶 20，总分为「基础 80 + 奖励分」
  const deyuReward = calcDeyuReward(deyu);
  const deyuScore = DEYU_BASE + deyuReward;

  // 智育：竞赛 + 技能证书（封顶 20）+ 创业
  const zhiyuReward = cap((Number(zhiyu.jingsai) || 0) + Math.min(sum(zhiyu.jineng), 20) + (Number(zhiyu.chuangye) || 0));

  const tiyuReward = cap(Number(tiyu.jiangli) || 0);
  const meiyuReward = cap(Number(meiyu.jiangli) || 0);

  // 劳育：志愿服务次数封顶 10 次、献血每次 5 分
  const laoyuReward = cap(Math.min(Number(laoyu.zhiyuanCishu) || 0, 10) + (Number(laoyu.xianxue) || 0) * 5 + (Number(laoyu.shehui) || 0));

  const koufenVal = -(Number(koufen.chufen) || 0);

  return { deyuScore, deyuReward, zhiyuReward, tiyuReward, meiyuReward, laoyuReward, koufenVal };
}

/**
 * 审核通过后，把申请的「奖励分增量」写回学生成绩表时使用的字段映射。
 * 顺序即 SQL SET 子句顺序，勿随意调整。
 *
 * 德育不在此列：它需要按申报明细拆成 思想进步 / 表彰 / 干部任职 / 荣誉表彰 分项累加
 * （见 teacher.js 的 applyScores），因为 application_items.deyu_score 记录的是奖励分，
 * 直接累加到单一字段会丢失分项结构。
 */
export const SCORE_FIELDS = [
  { item: 'zhiyu_reward', column: 'zhiyu_jingsai' },
  { item: 'tiyu_reward', column: 'tiyu_jiangli' },
  { item: 'meiyu_reward', column: 'meiyu_jiangli' },
  { item: 'laoyu_reward', column: 'laoyu_shehui' },
];
