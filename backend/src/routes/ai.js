/**
 * AI 综测咨询助手（教师端 / 学生端共用）。
 *
 * 知识库：《湖南民族职业学院学生综合素质测评实施办法》——
 * 正文按章节语义分块内置于 ./ai/knowledge.json，首次使用时自动调用
 * 智谱 Embedding 向量化并存入 D1（ai_chunks 表）。
 *
 * 问答流程：问题向量化 → 余弦相似度检索最相关条款（RAG）
 *   → （可选）web-search-pro 联网检索 → glm-4-flash 依据「办法原文 + 网络参考」作答。
 */
import knowledge from '../ai/knowledge.json';
import { ok, fail } from '../http.js';
import { now } from '../db.js';

const ZHIPU_BASE = 'https://open.bigmodel.cn/api/paas/v4';
const CHAT_MODEL = 'glm-4-flash';
const EMBED_MODEL = 'embedding-2';
const TOP_K = 4;

/** 调用智谱开放平台接口（Bearer 认证） */
async function zhipu(env, apiPath, body) {
  const key = env.ZHIPU_API_KEY;
  if (!key) throw new Error('服务端未配置 ZHIPU_API_KEY，请联系管理员');
  const res = await fetch(ZHIPU_BASE + apiPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error('智谱接口错误 ' + res.status + '：' + ((data.error && data.error.message) || '').slice(0, 200));
  }
  return data;
}

/** 文本向量化：返回与输入等长的向量数组 */
export async function embedTexts(env, texts) {
  const data = await zhipu(env, '/embeddings', { model: EMBED_MODEL, input: texts });
  const sorted = (data.data || []).slice().sort((a, b) => a.index - b.index);
  return sorted.map(d => d.embedding);
}

function cosine(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) || 1);
}

/** 知识库为空时，用内置分块自动初始化（向量化后写入 D1）；Embedding 配额不足时降级为关键词检索 */
async function ensureKnowledge(db, env) {
  const row = await db.queryOne('SELECT COUNT(*) AS n FROM ai_chunks');
  if (row && Number(row.n) > 0) return Number(row.n);
  let vectors = null;
  try {
    vectors = await embedTexts(env, knowledge.map(c => c.title + '\n' + c.content));
  } catch (e) {
    // embedding-2 需单独的资源包/余额；失败不阻塞初始化，检索自动降级为关键词匹配
    console.log('knowledge embed failed, fallback to keyword mode:', e.message);
  }
  for (let i = 0; i < knowledge.length; i++) {
    await db.insert(
      'INSERT INTO ai_chunks (title, content, embedding, created_at) VALUES (?, ?, ?, ?)',
      [knowledge[i].title, knowledge[i].content, JSON.stringify(vectors ? vectors[i] : []), now()]
    );
  }
  return knowledge.length;
}

/** 关键词检索降级：问题与分块的二元组（bigram）重合度打分 */
function keywordScore(question, text) {
  const q = String(question).replace(/[\s，。？！、：；"'()（）]/g, '');
  const grams = new Set();
  for (let i = 0; i < q.length - 1; i++) grams.add(q.slice(i, i + 2));
  if (!grams.size) return 0;
  let hit = 0;
  for (const g of grams) if (text.indexOf(g) >= 0) hit++;
  return hit / grams.size;
}

/** web-search-pro 联网检索：返回 [{title, link, content}]，失败不阻塞问答 */
async function webSearch(env, question) {
  try {
    const data = await zhipu(env, '/tools', {
      tool: 'web-search-pro',
      messages: [{ role: 'user', content: '湖南民族职业学院 综合素质测评 ' + question }],
      stream: false,
    });
    const content = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    return (parsed.search_result || []).slice(0, 5).map(r => ({
      title: r.title || '', link: r.link || '', content: String(r.content || '').slice(0, 300),
    }));
  } catch (e) {
    return [];
  }
}

const SYSTEM_PROMPT = [
  '你是「湖南民族职业学院学生综合素质测评（综测）」智能咨询助手，服务于学生、辅导员与班主任。',
  '回答依据按优先级排列：',
  '1)【测评办法原文】——《湖南民族职业学院学生综合素质测评实施办法》的检索片段（最权威，须注明依据，如「第十一条」「表4 学科技能竞赛加分明细表」）；',
  '2)【网络检索参考】——仅作辅助补充，引用时必须提醒「以学校最新文件或学院通知为准」。',
  '要求：',
  '- 用户问「某个证书/奖项/活动怎么加分」时：先判断属于哪个测评单项（德/智/体/美/劳），给出该单项的奖励分上限与可加分值、计分规则（如同一事迹只计一次、奖励分上限20分等），并给出申报参考建议（需要什么证明材料、向谁申报）。',
  '- 办法中没有明确对应的条目时，明确说明「办法未单独列明」，再给出最接近条款的类比参考与网络检索参考，并建议咨询辅导员或学生工作处。',
  '- 不编造分值；引用表格时逐项列清。回答用简体中文、分点简洁，可用 markdown。',
].join('\n');

/** 拼装检索到的办法原文与网络参考，调用 glm-4-flash 生成回答 */
async function askLLM(env, question, history, chunks, web) {
  let context = '';
  if (chunks.length) {
    context += '【测评办法原文】\n' + chunks.map((c, i) => `[片段${i + 1}] ${c.title}\n${c.content}`).join('\n\n') + '\n';
  }
  if (web.length) {
    context += '\n【网络检索参考】\n' + web.map((r, i) => `[网${i + 1}] ${r.title}（${r.link}）\n${r.content}`).join('\n') + '\n';
  }
  const msgs = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + (context || '（未检索到相关片段，请如实说明并给出一般性建议）') },
    ...history.slice(-6),
    { role: 'user', content: question },
  ];
  const data = await zhipu(env, '/chat/completions', {
    model: CHAT_MODEL,
    messages: msgs,
    temperature: 0.3,
    max_tokens: 2048,
  });
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

export async function handleAi(path, method, ctx) {
  const { db, env, user } = ctx;

  // 问答（学生 / 辅导员 / 管理员均可）
  if (path === '/api/ai/ask' && method === 'POST') {
    const d = await ctx.request.json();
    const question = String(d.question || '').trim();
    if (!question) return fail('请输入问题', 400, env);
    if (question.length > 2000) return fail('问题过长，请精简后重试', 400, env);

    await ensureKnowledge(db, env);

    // 1) 检索最相关条款：优先向量余弦（Embedding 可用时），否则关键词重合度降级
    let qv = null;
    try {
      qv = (await embedTexts(env, [question]))[0];
    } catch (e) {
      console.log('question embed failed, fallback to keyword mode:', e.message);
    }
    const rows = await db.query('SELECT id, title, content, embedding FROM ai_chunks');
    const hasVectors = !!qv && rows.every(r => {
      try { return JSON.parse(r.embedding || '[]').length > 0; } catch { return false; }
    });
    const chunks = rows
      .map(r => ({
        id: r.id, title: r.title, content: r.content,
        score: hasVectors ? cosine(qv, JSON.parse(r.embedding)) : keywordScore(question, r.title + ' ' + r.content),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, TOP_K);

    // 2) 联网检索（前端可关闭）
    const web = d.web === false ? [] : await webSearch(env, question);

    // 3) 生成回答；附带多轮历史（前端裁剪过）
    const history = Array.isArray(d.history)
      ? d.history.filter(m => m && (m.role === 'user' || m.role === 'assistant') && m.content)
        .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
      : [];
    const answer = await askLLM(env, question, history, chunks, web);

    return ok({
      answer,
      sources: chunks.map(c => ({ id: c.id, title: c.title, score: Math.round(c.score * 1000) / 1000 })),
      web,
      model: CHAT_MODEL,
    }, env);
  }

  // 知识库状态（教师 / 管理员可查看）
  if (path === '/api/ai/knowledge' && method === 'GET') {
    if (user.role === 'student') return fail('无权限', 403, env);
    const rows = await db.query('SELECT id, title, content, created_at FROM ai_chunks ORDER BY id');
    return ok({ count: rows.length, chunks: rows.map(r => ({ id: r.id, title: r.title, len: r.content.length, created_at: r.created_at })) }, env);
  }

  // 重建知识库（管理员）：清空后按内置分块重新向量化
  if (path === '/api/ai/knowledge/reseed' && method === 'POST') {
    if (user.role !== 'admin') return fail('仅管理员可重建知识库', 403, env);
    await db.run('DELETE FROM ai_chunks');
    const count = await ensureKnowledge(db, env);
    return ok({ count }, env);
  }

  return null;
}
