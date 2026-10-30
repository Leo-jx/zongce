// 一次性脚本：将 scripts/paragraphs.txt（测评办法正文）按语义分块，
// 生成 backend/src/ai/knowledge.json 供 Worker 内置并初始化 D1 知识库。
const fs = require('fs');
const path = require('path');

const paras = fs.readFileSync(path.join(__dirname, 'paragraphs.txt'), 'utf8').split('\n');
const seg = (a, b) => paras.slice(a - 1, b).join('\n');

// 与《湖南民族职业学院学生综合素质测评实施办法》章节/条款结构对应
const chunks = [
  { title: '第一章 总则（测评内容、总分构成、测评周期）', content: seg(1, 8) },
  { title: '第二章 考评组织及程序（自评/评议/核查/公示/审定）', content: seg(9, 27) },
  { title: '第三章 评分细则总则与德育基础分（80分构成）', content: seg(28, 39) },
  { title: '德育奖励分：入党加分、见义勇为表彰加分、团学干部任职加分（表2）', content: seg(40, 64) },
  { title: '德育奖励分：集体/个人荣誉加分（表3）、征兵入伍三支一扶西部计划', content: seg(65, 102) },
  { title: '智育：专业成绩计算公式、缓考补考休学处理', content: seg(103, 110) },
  { title: '智育奖励分：学科技能竞赛加分（表4，Ⅰ/Ⅱ/Ⅲ/Ⅳ类竞赛及校赛分值）', content: seg(111, 169) },
  { title: '智育奖励分：职业技能证书加分（表5，外语/计算机/普通话/职业技能等级）与创新创业加分', content: seg(170, 197) },
  { title: '体育素质测评：体育成绩50分、体质测试30分、体育奖励分20分', content: seg(198, 210) },
  { title: '美育素质测评：基础分80分与美育奖励分20分', content: seg(211, 222) },
  { title: '劳育素质测评：基础分80分、志愿服务/献血/最美寝室/社会实践加分（表6、表7）', content: seg(223, 276) },
  { title: '扣分项：遵纪守法处分扣分（表8）与日常表现扣分', content: seg(277, 302) },
  { title: '第四章 附则（适用范围、解释权）', content: seg(303, 307) },
].map((c, i) => ({ id: i + 1, title: c.title, content: c.content }));

const out = path.join(__dirname, '..', 'backend', 'src', 'ai', 'knowledge.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(chunks, null, 2), 'utf8');
console.log('chunks:', chunks.length, 'total chars:', chunks.reduce((s, c) => s + c.content.length, 0));
