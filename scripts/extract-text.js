// 临时脚本：从 docx 的 document.xml 提取正文段落文本
const fs = require('fs');
const path = require('path');
const TMP = path.join(__dirname, '..', '.tmp-docx');
const xml = fs.readFileSync(path.join(TMP, 'word', 'document.xml'), 'utf8');

// 按段落切块
const paras = [];
const re = /<w:p[ >].*?<\/w:p>|<w:p\/>/gs;
let m;
const textOf = s => {
  // 每个 <w:t> 的文本拼接；单元格间加制表符
  const out = [];
  const tre = /<w:t(?: [^>]*)?>(.*?)<\/w:t>|<\/w:tc>/gs;
  let t;
  while ((t = tre.exec(s))) {
    if (t[0] === '</w:tc>') { out.push('\t'); continue; }
    out.push(t[1]
      .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
      .replace(/&#x2018;|&#8216;/g, "'").replace(/&#x2019;|&#8217;/g, "'")
      .replace(/&#x201C;|&#8220;/g, '"').replace(/&#x201D;|&#8221;/g, '"'));
  }
  return out.join('').replace(/\t+/g, ' | ').trim();
};
while ((m = re.exec(xml))) {
  const txt = textOf(m[0]);
  if (txt) paras.push(txt);
}
fs.writeFileSync(path.join(__dirname, 'paragraphs.txt'), paras.join('\n'), 'utf8');
console.log('paragraphs:', paras.length, 'chars:', paras.join('').length);
