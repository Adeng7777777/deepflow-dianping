const initialRecords = [
  {
    id: 1,
    date: "2026-05-13",
    student: "林可",
    subject: "数学",
    content: "一次函数图像与实际应用题，重点训练斜率、截距和条件提取。",
    issue: "读题时容易漏掉单位换算，列式后没有主动检查变量含义。",
    homework: "完成一次函数应用题 12 题，整理 3 道错题的题眼和订正步骤。",
    evaluation: "课堂专注度高，方法理解到位；下次重点观察独立审题稳定性。",
    score: 4.6,
    status: "需跟进"
  },
  {
    id: 2,
    date: "2026-05-12",
    student: "周安",
    subject: "英语",
    content: "阅读理解主旨题和细节题区分，练习定位关键词与段落归纳。",
    issue: "能找到原文信息，但表达答案时句子不够完整。",
    homework: "精读一篇 300 词短文，标注主题句，完成 5 个完整句回答。",
    evaluation: "词汇基础较稳，回答规范性还有提升空间。",
    score: 4.2,
    status: "进行中"
  },
  {
    id: 3,
    date: "2026-05-10",
    student: "陈一诺",
    subject: "语文",
    content: "记叙文人物描写赏析，拆解动作、语言、心理描写的作用。",
    issue: "答题能说出方向，但缺少结合文本的具体词句。",
    homework: "完成两篇阅读赏析题，每题按观点、文本、效果三步作答。",
    evaluation: "课堂参与积极，表达欲强；需要把口头理解沉淀成书面答案。",
    score: 4.4,
    status: "已完成"
  }
];

const defaultSubjects = ["数学", "英语", "语文", "物理", "化学", "素养"];
const subjects = ["全部", ...defaultSubjects];
const statuses = ["全部", "进行中", "需跟进", "已完成"];

const state = {
  records: [...initialRecords],
  query: "",
  subject: "全部",
  status: "全部",
  sortKey: "date",
  selectedId: initialRecords[0].id,
  deepseekKey: localStorage.getItem("deepseekApiKey") || "",
  aiStatus: "",
  storageStatus: "正在读取本地保存的学生记录...",
  isAiParsing: false,
  editingId: null,
  draft: createEmptyDraft()
};

const root = document.getElementById("root");

function createEmptyDraft() {
  return {
    date: new Date().toISOString().slice(0, 10),
    student: "",
    subject: "数学",
    content: "",
    issue: "",
    homework: "",
    evaluation: "",
    score: "4.5",
    status: "进行中",
    rawNote: ""
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function icon(name) {
  const icons = {
    chart: "#",
    clipboard: "[]",
    delete: "X",
    edit: "E",
    export: "↓",
    filter: ">",
    marker: "*",
    plus: "+",
    search: "?",
    spark: "*",
    star: "*",
    book: "书"
  };
  return `<span class="text-icon" aria-hidden="true">${icons[name] || "*"}</span>`;
}

function scoreTone(score) {
  if (score >= 4.7) return "excellent";
  if (score >= 4.4) return "good";
  return "watch";
}

function getFilteredRecords() {
  const normalizedQuery = state.query.trim().toLowerCase();

  return [...state.records]
    .filter((record) => {
      const text = `${record.student} ${record.subject} ${record.content} ${record.issue} ${record.homework} ${record.evaluation}`.toLowerCase();
      return (
        (!normalizedQuery || text.includes(normalizedQuery)) &&
        (state.subject === "全部" || record.subject === state.subject) &&
        (state.status === "全部" || record.status === state.status)
      );
    })
    .sort((a, b) => {
      if (state.sortKey === "score") return b.score - a.score;
      if (state.sortKey === "student") return a.student.localeCompare(b.student, "zh-CN");
      return new Date(b.date) - new Date(a.date);
    });
}

function getSelectedRecord(filteredRecords) {
  return (
    state.records.find((record) => record.id === state.selectedId) ||
    filteredRecords[0] ||
    state.records[0]
  );
}

function optionList(items, selectedValue, skipAll = false) {
  return items
    .filter((item) => !skipAll || item !== "全部")
    .map((item) => `<option value="${escapeHtml(item)}" ${item === selectedValue ? "selected" : ""}>${escapeHtml(item)}</option>`)
    .join("");
}

function getSubjectOptions() {
  const customSubjects = state.records
    .map((record) => record.subject)
    .concat(state.draft.subject)
    .map((subject) => String(subject || "").trim())
    .filter(Boolean);

  return ["全部", ...new Set([...defaultSubjects, ...customSubjects])];
}

function metric(iconName, label, value, note) {
  return `
    <article class="metric-card">
      <span>${icon(iconName)}</span>
      <div>
        <small>${escapeHtml(label)}</small>
        <strong>${escapeHtml(value)}</strong>
        <em>${escapeHtml(note)}</em>
      </div>
    </article>
  `;
}

function summaryMetrics(records) {
  const followCount = records.filter((record) => record.status === "需跟进").length;
  const activeCount = records.filter((record) => record.status === "进行中").length;
  const averageScore = records.length
    ? (records.reduce((total, record) => total + record.score, 0) / records.length).toFixed(1)
    : "-";

  return [
    metric("clipboard", "点评记录", records.length, "当前筛选结果"),
    metric("marker", "需跟进", followCount, "优先回访"),
    metric("chart", "进行中", activeCount, "持续观察"),
    metric("star", "平均评价", averageScore, "满分 5.0")
  ].join("");
}

function paragraphList(value, fallback) {
  const text = String(value || fallback || "").trim();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

function drawRoundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, fill, stroke) {
  drawRoundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 8) {
  const normalized = String(text || "").replace(/\n+/g, " ").trim();
  const characters = [...normalized];
  let line = "";
  let lineCount = 0;

  characters.forEach((character, index) => {
    const testLine = `${line}${character}`;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      y += lineHeight;
      line = character;
      lineCount += 1;
    } else {
      line = testLine;
    }

    if (index === characters.length - 1 && line && lineCount < maxLines) {
      ctx.fillText(line, x, y);
    }
  });
}

function drawPill(ctx, text, x, y) {
  ctx.font = "700 24px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  const width = Math.ceil(ctx.measureText(text).width) + 34;
  fillRoundRect(ctx, x, y, width, 56, 28, "#e8f0f4");
  ctx.fillStyle = "#1f668c";
  ctx.fillText(text, x + 17, y + 36);
  return width;
}

function drawRecordImageCard(ctx, title, content, x, y, width, height, highlighted = false) {
  fillRoundRect(ctx, x, y, width, height, 10, highlighted ? "#eef4f1" : "#fbf7f0", "#ded6c7");
  ctx.fillStyle = "#6f3f31";
  ctx.font = "700 24px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(title, x + 32, y + 56);
  ctx.fillStyle = "#1f2933";
  ctx.font = "28px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  drawWrappedText(ctx, content, x + 32, y + 116, width - 64, 44, 4);
}

function exportCurrentRecordImage() {
  const selected = getSelectedRecord(getFilteredRecords());
  if (!selected) return;

  const scale = 2;
  const width = 1450;
  const height = 1050;
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);

  ctx.fillStyle = "#fffdfa";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#7d4b38";
  ctx.font = "700 24px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(`${selected.date} · ${selected.subject}`, 34, 66);

  ctx.fillStyle = "#17202a";
  ctx.font = "700 56px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(selected.student, 34, 146);

  const subjectWidth = drawPill(ctx, selected.subject, 34, 206);
  drawPill(ctx, `评价 ${Number(selected.score || 0).toFixed(1)}/5.0`, 34 + subjectWidth + 18, 206);

  ctx.fillStyle = "#17202a";
  ctx.font = "700 26px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText("表现", 34, 358);

  fillRoundRect(ctx, 170, 336, 1068, 18, 9, "#ede8df");
  fillRoundRect(ctx, 170, 336, Math.max(0, Math.min(1068, (Number(selected.score || 0) / 5) * 1068)), 18, 9, "#2e718d");
  ctx.fillStyle = "#17202a";
  ctx.font = "700 28px Arial, 'PingFang SC', 'Microsoft YaHei', sans-serif";
  ctx.fillText(Number(selected.score || 0).toFixed(1), 1262, 358);

  const cardWidth = 676;
  const cardHeight = 312;
  drawRecordImageCard(ctx, "学习内容", selected.content, 34, 406, cardWidth, cardHeight, true);
  drawRecordImageCard(ctx, "反映问题", selected.issue, 740, 406, cardWidth, cardHeight);
  drawRecordImageCard(ctx, "课后作业", selected.homework, 34, 746, cardWidth, cardHeight);
  drawRecordImageCard(ctx, "对应评价", selected.evaluation, 740, 746, cardWidth, cardHeight, true);

  const link = document.createElement("a");
  const safeName = selected.student.replace(/[\\/:*?"<>|]/g, "_") || "课后点评";
  link.download = `${safeName}-课后点评.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function renderPrintSheet(record) {
  if (!record) {
    return `
      <article id="printArea" class="print-sheet">
        <h1>课后点评记录</h1>
        <p>暂无可导出的记录</p>
      </article>
    `;
  }

  return `
    <article id="printArea" class="print-sheet">
      <header>
        <small>课后点评记录</small>
        <h1>${escapeHtml(record.student)}</h1>
        <div>
          <span>${escapeHtml(record.date)}</span>
          <span>${escapeHtml(record.subject)}</span>
          <span>${escapeHtml(record.status)}</span>
          <span>评价 ${Number(record.score || 0).toFixed(1)}/5.0</span>
        </div>
      </header>

      <section>
        <h2>学习内容</h2>
        ${paragraphList(record.content, "暂无学习内容")}
      </section>
      <section>
        <h2>反映问题</h2>
        ${paragraphList(record.issue, "暂无反馈问题")}
      </section>
      <section>
        <h2>课后作业</h2>
        ${paragraphList(record.homework, "暂无课后作业")}
      </section>
      <section>
        <h2>对应评价</h2>
        ${paragraphList(record.evaluation, "暂无评价")}
      </section>
    </article>
  `;
}

function normalizeRecords(records) {
  return records
    .filter((record) => record && record.student && record.content)
    .map((record) => ({
      id: Number(record.id) || Date.now(),
      date: String(record.date || "").slice(0, 10) || new Date().toISOString().slice(0, 10),
      student: String(record.student || ""),
      subject: String(record.subject || "数学").trim() || "数学",
      content: String(record.content || ""),
      issue: String(record.issue || "暂无明显问题，继续观察课堂表现和作业完成度。"),
      homework: String(record.homework || "本次未布置额外作业。"),
      evaluation: String(record.evaluation || "已完成课堂记录，待后续补充阶段性评价。"),
      score: Number(record.score || 4.5),
      status: statuses.includes(record.status) && record.status !== "全部" ? record.status : "进行中"
    }));
}

function loadPersistentRecords() {
  try {
    const raw = localStorage.getItem("trainingReviewRecords");
    const savedRecords = raw ? normalizeRecords(JSON.parse(raw)) : [];

    if (savedRecords.length) {
      state.records = savedRecords;
      state.selectedId = savedRecords[0].id;
      state.storageStatus = `已读取 ${savedRecords.length} 条本地学生记录。`;
    } else {
      state.records = [...initialRecords];
      state.selectedId = initialRecords[0].id;
      state.storageStatus = "当前使用示例记录；保存新点评后会永久保存在浏览器中。";
    }
  } catch {
    state.records = [...initialRecords];
    state.selectedId = initialRecords[0].id;
    state.storageStatus = "读取本地记录失败，暂时显示示例记录。";
  }

  render();
}

function persistRecords() {
  try {
    localStorage.setItem("trainingReviewRecords", JSON.stringify(state.records));
    state.storageStatus = `已保存 ${state.records.length} 条记录到浏览器本地存储。`;
  } catch {
    state.storageStatus = "保存失败，浏览器存储空间可能已满。";
  }
}

function pickSubject(text, fallback = "数学") {
  const candidates = defaultSubjects;
  const direct = candidates.find((item) => text.includes(item));
  if (direct) return direct;
  if (/方程|平行线|计算|四则运算|加减法|除法|几何|代数|应用题/.test(text)) return "数学";
  if (/单词|阅读|语法|作文|听力|口语|英语/.test(text)) return "英语";
  if (/阅读理解|作文|古诗|文言文|语文/.test(text)) return "语文";
  return fallback;
}

function pickScore(text) {
  const explicit = text.match(/(?:评价|评分|得分|表现)[：:\s]*(\d(?:\.\d)?)/);
  if (explicit) return Math.min(5, Math.max(1, Number(explicit[1]))).toFixed(1);
  if (/优秀|很好|很棒|掌握好|进步明显|积极/.test(text)) return "4.7";
  if (/一般|还需|需要|不够|薄弱|问题|困难/.test(text)) return "4.2";
  return "4.5";
}

function pickStatus(text) {
  if (/跟进|需要关注|下次重点|待观察|薄弱|问题|困难|未完成/.test(text)) return "需跟进";
  if (/完成|已掌握|表现好|优秀/.test(text)) return "已完成";
  return "进行中";
}

function extractByLabels(text, labels) {
  const labelPattern = labels.join("|");
  const allLabels = "学习内容|内容|反馈问题|反映问题|反映的情况|问题|课后作业|作业|对应评价|评价|学生|姓名|科目|日期";
  const pattern = new RegExp(`(?:${labelPattern})[：:]?\\s*([\\s\\S]*?)(?=\\n?\\s*(?:${allLabels})[：:]|$)`);
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

function extractBetween(text, startPatterns, endPatterns) {
  const startHits = startPatterns
    .map((marker) => {
      const index = text.indexOf(marker);
      return index >= 0 ? { index, marker } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);

  if (!startHits.length) return "";

  const start = startHits[0].index + startHits[0].marker.length;
  const endHits = endPatterns
    .map((marker) => {
      const index = text.indexOf(marker, start);
      return index >= 0 ? index : null;
    })
    .filter((index) => index !== null)
    .sort((a, b) => a - b);

  const end = endHits.length ? endHits[0] : text.length;
  return cleanSection(text.slice(start, end));
}

function firstSection(text, sections) {
  const hits = sections
    .flatMap((section) =>
      section.starts.map((marker) => {
        const index = text.indexOf(marker);
        return index >= 0 ? { ...section, marker, index } : null;
      })
    )
    .filter(Boolean)
    .sort((a, b) => a.index - b.index);

  const result = {};
  hits.forEach((hit, position) => {
    if (result[hit.key]) return;
    const start = hit.index + hit.marker.length;
    const nextHit = hits.slice(position + 1).find((item) => item.index > hit.index);
    const end = nextHit ? nextHit.index : text.length;
    result[hit.key] = cleanSection(text.slice(start, end));
  });

  return result;
}

function cleanSection(text) {
  return text
    .replace(/^[。；;，,：:\s]+/g, "")
    .replace(/^(就是|是|为|呢|然后|主要是|这节课主要是)[，,：:\s]*/g, "")
    .replace(/^[。；;，,：:\s]+/g, "")
    .replace(/^(就是|是|为|呢|然后|主要是|这节课主要是)[，,：:\s]*/g, "")
    .replace(/[。；;，,\s]+$/g, "")
    .trim();
}

function splitItems(text) {
  const cleaned = cleanSection(text);
  const parts = cleaned
    .split(/(?:以及|并且|同时|另外|；|;|、)/)
    .map((item) => cleanSection(item))
    .filter(Boolean);

  if (parts.length <= 1) return cleaned;

  return parts
    .map((item, index) => `${String.fromCharCode(97 + index)}. ${item}`)
    .join("\n");
}

function splitSentences(text) {
  return text
    .split(/[。；;！!\n]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function findSentence(sentences, keywords) {
  return sentences.find((sentence) => keywords.some((keyword) => sentence.includes(keyword))) || "";
}

function parseRawNote(rawText) {
  const text = rawText.trim();
  const sentences = splitSentences(text);
  const sections = firstSection(text, [
    {
      key: "content",
      starts: ["这节课学习的是", "这节课学习了", "本节课学习的是", "本节课学习了", "今天学习的是", "今天学习了", "学习的是", "学习了", "学习内容"]
    },
    {
      key: "issue",
      starts: ["反映的情况", "反应的情况", "反馈的情况", "反框的情况", "反馈情况", "反映问题", "反馈问题", "问题就是"]
    },
    {
      key: "homework",
      starts: ["课后作业呢", "课后作业", "作业呢", "作业就是", "作业"]
    },
    {
      key: "evaluation",
      starts: ["这节课的评价就是", "这节课的评价是", "这节课评价就是", "这节课评价是", "本节课的评价就是", "本节课的评价是", "评价就是", "评价是", "对应评价", "评价"]
    }
  ]);
  const studentMatch =
    text.match(/(?:学生|姓名)[：:\s]*([\u4e00-\u9fa5A-Za-z0-9]{1,12})/) ||
    text.match(/^([\u4e00-\u9fa5]{2,4})[，,：:\s]/) ||
    text.match(/([\u4e00-\u9fa5]{2,4})(?:部分)?(?:计算|对于|基础|作业|课堂|表现|解题|很认真)/);
  const dateMatch = text.match(/\d{4}-\d{1,2}-\d{1,2}/);

  const content =
    sections.content ||
    extractBetween(text, ["这节课学习了", "本节课学习了", "今天学习了", "学习了", "学习内容"], ["反映的情况", "反映问题", "反馈问题", "问题", "课后作业", "作业", "然后"]) ||
    extractByLabels(text, ["学习内容", "内容"]) ||
    findSentence(sentences, ["学习", "复习", "讲解", "训练", "练习", "掌握", "课堂"]) ||
    text;
  const issue =
    sections.issue ||
    extractBetween(text, ["反映的情况", "反映问题", "反馈问题", "问题"], ["课后作业", "作业", "然后", "评价", "对应评价"]) ||
    extractByLabels(text, ["反馈问题", "反映问题", "反映的情况", "问题"]) ||
    findSentence(sentences, ["问题", "不足", "薄弱", "错误", "不会", "不够", "困难", "需要"]);
  const homework =
    sections.homework ||
    extractBetween(text, ["课后作业", "作业"], ["然后", "评价", "对应评价", "这节课主要是"]) ||
    extractByLabels(text, ["课后作业", "作业"]) ||
    findSentence(sentences, ["作业", "完成", "练习", "整理", "背诵", "预习", "订正"]);
  const evaluation =
    sections.evaluation ||
    extractBetween(text, ["然后", "这节课主要是", "主要是", "评价"], ["$"]) ||
    extractByLabels(text, ["对应评价", "评价"]) ||
    findSentence(sentences, ["评价", "表现", "积极", "专注", "进步", "优秀", "稳定", "掌握"]) ||
    "已根据课堂描述生成评价，建议后续继续补充具体表现。";

  return {
    date: dateMatch ? dateMatch[0] : state.draft.date,
    student: "",
    subject: pickSubject(text, state.draft.subject),
    content: splitItems(content),
    issue: issue ? splitItems(issue) : "暂无明显问题，继续观察课堂表现和作业完成度。",
    homework: homework ? splitItems(homework) : "本次未布置额外作业。",
    evaluation: cleanSection(evaluation),
    score: pickScore(text),
    status: pickStatus(text),
    rawNote: rawText
  };
}

function safeJsonFromText(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return JSON.parse(trimmed);
  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("DeepSeek 未返回 JSON");
  return JSON.parse(match[0]);
}

function normalizeAiRecord(data, rawText) {
  const fallback = parseRawNote(rawText);
  const subject = String(data.subject || fallback.subject || "数学").trim() || "数学";
  const status = statuses.includes(data.status) && data.status !== "全部" ? data.status : fallback.status;
  const score = Number(data.score);

  return {
    date: String(data.date || fallback.date).slice(0, 10),
    student: "",
    subject,
    content: splitItems(String(data.content || fallback.content || "").trim()),
    issue: splitItems(String(data.issue || fallback.issue || "").trim()),
    homework: splitItems(String(data.homework || fallback.homework || "").trim()),
    evaluation: String(data.evaluation || fallback.evaluation || "").trim(),
    score: Number.isFinite(score) ? Math.min(5, Math.max(1, score)).toFixed(1) : fallback.score,
    status,
    rawNote: rawText
  };
}

async function parseRawNoteWithDeepSeek(rawText) {
  const apiKey = state.deepseekKey.trim();
  if (!apiKey) return parseRawNote(rawText);

  const response = await fetch("/api/deepseek-parse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      rawText,
      apiKey
    })
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error || `DeepSeek 请求失败：${response.status}`);
  }

  const content = payload?.content;
  if (!content) throw new Error("DeepSeek 没有返回可解析内容");
  return normalizeAiRecord(safeJsonFromText(content), rawText);
}

function createRecordFromDraft() {
  const student = state.draft.student.trim();
  const content = state.draft.content.trim();
  if (!student || !content) return null;

  return {
    id: Date.now(),
    date: state.draft.date,
    student,
    subject: state.draft.subject,
    content,
    issue: state.draft.issue.trim() || "暂无明显问题，继续观察课堂表现和作业完成度。",
    homework: state.draft.homework.trim() || "本次未布置额外作业。",
    evaluation: state.draft.evaluation.trim() || "已完成课堂记录，待后续补充阶段性评价。",
    score: Number(state.draft.score || 4.5),
    status: state.draft.status
  };
}

function startEditingSelectedRecord() {
  const record = state.records.find((item) => item.id === state.selectedId);
  if (!record) return;

  state.editingId = record.id;
  state.draft = {
    date: record.date,
    student: record.student,
    subject: record.subject,
    content: record.content,
    issue: record.issue,
    homework: record.homework,
    evaluation: record.evaluation,
    score: String(record.score || 4.5),
    status: record.status || "进行中",
    rawNote: ""
  };
  state.storageStatus = `正在修改 ${record.student} 的课后反馈。`;
  render();
}

function cancelEditing() {
  state.editingId = null;
  state.draft = createEmptyDraft();
  state.storageStatus = "已取消修改。";
  render();
}

async function saveCurrentDraft() {
  const newRecord = createRecordFromDraft();
  if (!newRecord) return;

  if (state.editingId) {
    newRecord.id = state.editingId;
    state.records = state.records.map((record) => (record.id === state.editingId ? newRecord : record));
    state.selectedId = state.editingId;
    state.editingId = null;
    state.storageStatus = "正在保存修改后的学生记录...";
  } else {
    state.records = [newRecord, ...state.records];
    state.selectedId = newRecord.id;
    state.storageStatus = "正在永久保存学生记录...";
  }

  state.draft = createEmptyDraft();
  render();
  persistRecords();
  render();
}

function render() {
  const filteredRecords = getFilteredRecords();
  const selected = getSelectedRecord(filteredRecords);
  const selectedScore = selected?.score || 0;

  root.innerHTML = `
    <main class="app-shell">
      <section class="workspace">
        <aside class="sidebar">
          <div class="brand">
            <span class="brand-mark">${icon("book")}</span>
            <div>
              <h1>课后点评台</h1>
              <p>学生反馈、作业记录、评价沉淀</p>
            </div>
          </div>

          <div class="search-box">
            ${icon("search")}
            <input id="queryInput" value="${escapeHtml(state.query)}" placeholder="搜索学生、内容或问题" />
          </div>

          <div class="filter-stack">
            <label>
              <span>${icon("filter")}科目</span>
              <select id="subjectFilter">${optionList(getSubjectOptions(), state.subject)}</select>
            </label>
            <label>
              <span>${icon("marker")}状态</span>
              <select id="statusFilter">${optionList(statuses, state.status)}</select>
            </label>
            <label>
              <span>${icon("chart")}排序</span>
              <select id="sortSelect">
                <option value="date" ${state.sortKey === "date" ? "selected" : ""}>日期最新</option>
                <option value="score" ${state.sortKey === "score" ? "selected" : ""}>评价最高</option>
                <option value="student" ${state.sortKey === "student" ? "selected" : ""}>学生姓名</option>
              </select>
            </label>
          </div>

          <div class="record-list">
            ${filteredRecords.map((record) => `
              <button class="record-item ${record.id === selected?.id ? "active" : ""}" data-record-id="${record.id}">
                <span>
                  <strong>${escapeHtml(record.student)}</strong>
                  <small>${escapeHtml(record.date)} · ${escapeHtml(record.subject)} · ${escapeHtml(record.status)}</small>
                </span>
                <b>${record.score.toFixed(1)}</b>
              </button>
            `).join("") || `<p class="empty-state">没有匹配的课后点评记录</p>`}
          </div>
        </aside>

        <section class="content">
          <header class="topbar hero-panel">
            <div>
              <span class="eyebrow">${icon("spark")}课后反馈工作台</span>
              <h2>${escapeHtml(selected?.student || "暂无记录")}的课堂复盘</h2>
              <p>把学习内容、课堂问题、作业安排和评价建议放在同一张清晰的记录卡里。</p>
              <small class="storage-status">${escapeHtml(state.storageStatus)}</small>
            </div>
            <div class="topbar-actions">
              <button id="editButton" class="primary-button alt" type="button">${icon("edit")}修改</button>
              <button id="deleteButton" class="icon-button" aria-label="删除当前记录" title="删除当前记录">${icon("delete")}</button>
              <button id="printButton" class="primary-button">${icon("export")}导出图片</button>
            </div>
          </header>

          <div class="metric-grid">
            ${summaryMetrics(filteredRecords)}
          </div>

          <section class="record-showcase">
            <div class="record-headline">
              <div>
                <span class="eyebrow">${escapeHtml(selected?.date || "-")} · ${escapeHtml(selected?.subject || "-")}</span>
                <h3>${escapeHtml(selected?.student || "暂无记录")}</h3>
              </div>
            </div>

            <div class="record-meta">
              <span>${escapeHtml(selected?.subject || "-")}</span>
              <span>评价 ${selected ? selected.score.toFixed(1) : "-"}/5.0</span>
            </div>

            <div class="score-row showcase-score">
              <span>表现</span>
              <div class="score-track">
                <i style="width: ${(selectedScore / 5) * 100}%"></i>
              </div>
              <b>${selected ? selected.score.toFixed(1) : "-"}</b>
            </div>

            <div class="story-grid">
              <article class="story-block primary">
                <small>学习内容</small>
                ${paragraphList(selected?.content, "暂无学习内容")}
              </article>
              <article class="story-block">
                <small>反映问题</small>
                ${paragraphList(selected?.issue, "暂无反馈问题")}
              </article>
              <article class="story-block">
                <small>课后作业</small>
                ${paragraphList(selected?.homework, "暂无课后作业")}
              </article>
              <article class="story-block primary">
                <small>对应评价</small>
                ${paragraphList(selected?.evaluation, "暂无评价")}
              </article>
            </div>
          </section>

          <section class="panel form-panel">
            <div class="panel-title">
              <h3>${state.editingId ? "修改点评" : "总体输入"}</h3>
              ${icon("clipboard")}
            </div>
            <div class="ai-config">
              <label>
                <span>DeepSeek API Key</span>
                <input id="deepseekKey" type="password" value="${escapeHtml(state.deepseekKey)}" placeholder="填入 sk-... 后启用智能解析" autocomplete="off" />
              </label>
              <small>${escapeHtml(state.aiStatus || "未填写时使用本地规则解析，填写后优先使用 DeepSeek。")}</small>
              <details class="api-help">
                <summary>如何获取自己的 DeepSeek API Key</summary>
                <ol>
                  <li>打开 <a href="https://platform.deepseek.com/" target="_blank" rel="noreferrer">DeepSeek Platform</a> 并登录账号。</li>
                  <li>进入 API Keys 页面，点击创建新的 API Key。</li>
                  <li>复制以 sk- 开头的密钥，只复制一次并妥善保存。</li>
                  <li>如账号没有余额，先在平台完成充值或额度配置。</li>
                  <li>回到这里粘贴密钥，再点击 AI 拆分按钮。</li>
                </ol>
              </details>
            </div>
            <div class="quick-note">
              <div class="raw-note-layout">
                <textarea id="rawNote" placeholder="把课堂反馈直接写在这里，按右侧模板说即可。">${escapeHtml(state.draft.rawNote)}</textarea>
                <aside class="speech-template" aria-label="话术断点模板">
                  <strong>话术断点模板</strong>
                  <p>这节课学习的是：...</p>
                  <p>反映的情况是：...</p>
                  <p>课后作业是：...</p>
                  <p>这节课的评价是：...</p>
                  <em>多个知识点或问题可用“以及”连接，会自动分成 a、b、c。</em>
                </aside>
              </div>
              <p class="parse-hint">按模板里的四个断点说，系统会更稳定地拆成内容、反映问题、课后作业和评价。</p>
              <div class="quick-actions">
                <button id="parseButton" class="primary-button" type="button" ${state.isAiParsing ? "disabled" : ""}>${icon("spark")}${state.isAiParsing ? "解析中..." : "AI 拆分到下方字段"}</button>
                <button id="parseSaveButton" class="primary-button alt" type="button" ${state.isAiParsing ? "disabled" : ""}>${icon("plus")}${state.isAiParsing ? "解析中..." : "AI 拆分并保存"}</button>
              </div>
            </div>
            <form id="recordForm" class="review-form">
              <input name="date" type="date" value="${escapeHtml(state.draft.date)}" />
              <input name="student" value="${escapeHtml(state.draft.student)}" placeholder="学生姓名" />
              <input name="subject" value="${escapeHtml(state.draft.subject)}" placeholder="科目" />
              <label class="range-field">
                <span>对应评价 <output id="scoreOutput">${escapeHtml(state.draft.score)}</output></span>
                <input name="score" type="range" min="1" max="5" step="0.1" value="${escapeHtml(state.draft.score)}" />
              </label>
              <textarea name="content" placeholder="学习内容">${escapeHtml(state.draft.content)}</textarea>
              <textarea name="issue" placeholder="反映问题">${escapeHtml(state.draft.issue)}</textarea>
              <textarea name="homework" placeholder="课后作业">${escapeHtml(state.draft.homework)}</textarea>
              <textarea name="evaluation" placeholder="对应评价">${escapeHtml(state.draft.evaluation)}</textarea>
              <div class="form-actions">
                <button class="primary-button submit-button" type="submit">${icon("plus")}${state.editingId ? "保存修改" : "保存点评"}</button>
                ${state.editingId ? `<button id="cancelEditButton" class="icon-button text-button" type="button">取消修改</button>` : ""}
              </div>
            </form>
          </section>
        </section>
      </section>
    </main>
    ${renderPrintSheet(selected)}
  `;

  bindEvents();
}

function syncDraftFromForm(form) {
  const formData = new FormData(form);
  state.draft.date = String(formData.get("date") || state.draft.date);
  state.draft.student = String(formData.get("student") || "");
  state.draft.subject = String(formData.get("subject") || "").trim() || "数学";
  state.draft.status = String(formData.get("status") || state.draft.status || "进行中");
  state.draft.score = String(formData.get("score") || "4.5");
  state.draft.content = String(formData.get("content") || "");
  state.draft.issue = String(formData.get("issue") || "");
  state.draft.homework = String(formData.get("homework") || "");
  state.draft.evaluation = String(formData.get("evaluation") || "");
}

function bindEvents() {
  document.getElementById("queryInput")?.addEventListener("input", (event) => {
    state.query = event.target.value;
    render();
  });

  document.getElementById("subjectFilter")?.addEventListener("change", (event) => {
    state.subject = event.target.value;
    render();
  });

  document.getElementById("statusFilter")?.addEventListener("change", (event) => {
    state.status = event.target.value;
    render();
  });

  document.getElementById("sortSelect")?.addEventListener("change", (event) => {
    state.sortKey = event.target.value;
    render();
  });

  document.querySelectorAll(".record-item").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedId = Number(button.dataset.recordId);
      if (state.editingId && state.editingId !== state.selectedId) {
        state.editingId = null;
        state.draft = createEmptyDraft();
      }
      render();
    });
  });

  document.getElementById("editButton")?.addEventListener("click", startEditingSelectedRecord);
  document.getElementById("cancelEditButton")?.addEventListener("click", cancelEditing);

  document.getElementById("deleteButton")?.addEventListener("click", async () => {
    if (state.records.length <= 1) return;
    state.records = state.records.filter((record) => record.id !== state.selectedId);
    state.selectedId = state.records[0]?.id;
    state.editingId = null;
    state.draft = createEmptyDraft();
    state.storageStatus = "正在更新本地保存的学生记录...";
    render();
    persistRecords();
    render();
  });

  document.getElementById("printButton")?.addEventListener("click", exportCurrentRecordImage);

  document.getElementById("rawNote")?.addEventListener("input", (event) => {
    state.draft.rawNote = event.target.value;
  });

  document.getElementById("deepseekKey")?.addEventListener("input", (event) => {
    state.deepseekKey = event.target.value.trim();
    if (state.deepseekKey) {
      localStorage.setItem("deepseekApiKey", state.deepseekKey);
      state.aiStatus = "DeepSeek 已启用，解析时会优先调用 AI。";
    } else {
      localStorage.removeItem("deepseekApiKey");
      state.aiStatus = "已切回本地规则解析。";
    }
  });

  document.getElementById("parseButton")?.addEventListener("click", async () => {
    const rawText = document.getElementById("rawNote").value;
    if (!rawText.trim()) return;
    await parseAndApply(rawText, false);
  });

  document.getElementById("parseSaveButton")?.addEventListener("click", async () => {
    const rawText = document.getElementById("rawNote").value;
    if (!rawText.trim()) return;
    await parseAndApply(rawText, true);
  });

  const form = document.getElementById("recordForm");

  form?.addEventListener("input", (event) => {
    syncDraftFromForm(form);
    if (event.target.name === "score") {
      document.getElementById("scoreOutput").textContent = event.target.value;
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    syncDraftFromForm(form);
    await saveCurrentDraft();
  });
}

async function parseAndApply(rawText, shouldSave) {
  state.isAiParsing = true;
  state.aiStatus = state.deepseekKey ? "正在调用 DeepSeek 智能解析..." : "正在使用本地规则解析...";
  render();

  try {
    const parsed = await parseRawNoteWithDeepSeek(rawText);
    state.draft = { ...state.draft, ...parsed };
    state.aiStatus = state.deepseekKey ? "DeepSeek 解析完成，可校对后保存。" : "本地规则解析完成。";
  } catch (error) {
    state.draft = { ...state.draft, ...parseRawNote(rawText) };
    state.aiStatus = `${error.message}，已自动改用本地规则解析。`;
  } finally {
    state.isAiParsing = false;
  }

  if (shouldSave) {
    await saveCurrentDraft();
    return;
  }

  render();
}

loadPersistentRecords();
