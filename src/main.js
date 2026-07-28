const initialRecords = [
  {
    id: 1,
    date: "2026-05-13",
    student: "林可",
    subject: "数学",
    grade: "DP1",
    duration: "60",
    classStatuses: ["专注认真"],
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
    grade: "DP2",
    duration: "45",
    classStatuses: ["互动积极"],
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
    grade: "MYP5",
    duration: "90",
    classStatuses: ["专注认真"],
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

const currentUser = localStorage.getItem("currentUser") || "";

const state = {
  user: currentUser,
  records: [...initialRecords],
  query: "",
  subject: "全部",
  status: "全部",
  sortKey: "date",
  selectedId: initialRecords[0].id,
  deepseekKey: localStorage.getItem(uk("deepseekApiKey")) || "",
  aiStatus: "",
  storageStatus: "正在读取本地保存的学生记录...",
  isAiParsing: false,
  editingId: null,
  batchSelectedIds: new Set(),
  composing: false,
  groupBy: "无",
  classStatusOptions: loadClassStatusOptions(),
  newStatusInput: "",
  activeTab: "archive",
  showAdmin: false,
  schedule: loadSchedule(),
  feedback: {
    date: new Date().toISOString().slice(0, 10),
    time: "",
    durations: [],
    student: "",
    subject: "数学",
    content: "",
    strengths: [],
    weaknesses: [],
    homework: [],
    customStrengths: [],
    customWeaknesses: [],
    customHomework: [],
    evaluation: "",
    nextLesson: "",
    generated: "",
  },
  draft: createEmptyDraft()
};

const root = document.getElementById("root");

function createEmptyDraft() {
  return {
    date: new Date().toISOString().slice(0, 10),
    student: "",
    subject: "数学",
    grade: "",
    duration: "",
    classStatuses: [],
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

function uk(key) {
  return state.user ? `u_${state.user}_${key}` : key;
}

function getAllowedUsers() {
  try {
    return JSON.parse(localStorage.getItem("allowedUsers") || "[]");
  } catch { return []; }
}

function isAdmin() {
  const users = getAllowedUsers();
  return users.length === 0 || users[0] === state.user;
}

function loadClassStatusOptions() {
  const defaults = ["专注认真", "互动积极", "偶尔走神", "需要提醒"];
  try {
    const custom = JSON.parse(localStorage.getItem(uk("classStatusCustom")) || "[]");
    return [...defaults, ...custom.filter((s) => !defaults.includes(s))];
  } catch {
    return defaults;
  }
}

function saveClassStatusOptions(options) {
  const defaults = ["专注认真", "互动积极", "偶尔走神", "需要提醒"];
  const custom = options.filter((s) => !defaults.includes(s));
  localStorage.setItem(uk("classStatusCustom"), JSON.stringify(custom));
  state.classStatusOptions = [...defaults, ...custom];
}

function toStatusArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) return value.split(/[,，、\s]+/).filter(Boolean);
  return [];
}

function statusArrayToString(arr) {
  return Array.isArray(arr) ? arr.filter(Boolean).join("，") : "";
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
      const text = `${record.student} ${record.subject} ${record.grade || ""} ${record.content} ${record.issue} ${record.homework} ${record.evaluation}`.toLowerCase();
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

function splitEvaluation(evalText) {
  const text = String(evalText || "");
  const cleaned = text.replace(/^课堂状态[：:]\s*/, "").replace(/[；;]\s*下节课[计划继续学习内容]*[：:]?\s*/g, "").trim();
  const parts = text.split(/[；;]\s*下节课/);
  const nextPlan = parts.length > 1 ? parts[1].replace(/^(计划|继续学习内容)[：:]\s*/, "").trim() : cleaned;
  if (parts.length <= 1 && text.includes("课堂状态")) {
    return { nextPlan: "" };
  }
  return { nextPlan };
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
  drawRecordImageCard(ctx, "本节课所学内容", selected.content, 34, 406, cardWidth, cardHeight, true);
  drawRecordImageCard(ctx, "掌握情况", selected.issue, 740, 406, cardWidth, cardHeight);
  drawRecordImageCard(ctx, "课后作业", selected.homework, 34, 746, cardWidth, cardHeight);
  drawRecordImageCard(ctx, "综合评价", selected.evaluation, 740, 746, cardWidth, cardHeight, true);

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
        <h2>本节课所学内容</h2>
        ${paragraphList(record.content, "暂无内容")}
      </section>
      <section>
        <h2>掌握情况</h2>
        ${paragraphList(record.issue, "暂无反馈")}
      </section>
      <section>
        <h2>课后作业</h2>
        ${paragraphList(record.homework, "暂无作业")}
      </section>
      <section>
        <h2>综合评价</h2>
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
      grade: String(record.grade || ""),
      duration: String(record.duration || ""),
      classStatuses: toStatusArray(record.classStatuses || record.classStatus || ""),
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
    const raw = localStorage.getItem(uk("trainingReviewRecords"));
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
    localStorage.setItem(uk("trainingReviewRecords"), JSON.stringify(state.records));
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
  const sections = firstSection(text, [
    { key: "content", starts: ["本节课所学内容"] },
    { key: "mastery", starts: ["掌握情况"] },
    { key: "homework", starts: ["课后作业"] },
    { key: "nextPlan", starts: ["下节课计划"] },
    { key: "classStatus", starts: ["学生上课状态"] },
  ]);

  const dateMatch = text.match(/\d{4}-\d{1,2}-\d{1,2}/);

  const durationMatch = text.match(/上课时长[：:]\s*(\d+)\s*分/);
  const duration = durationMatch ? durationMatch[1] : "";

  const content = cleanField(sections.content) ||
    extractByLabel(text, "本节课所学内容") ||
    text;

  const mastery = cleanField(sections.mastery) ||
    extractByLabel(text, "掌握情况");

  const homework = cleanField(sections.homework) ||
    extractByLabel(text, "课后作业");

  const classStatus = cleanField(sections.classStatus) ||
    extractByLabel(text, "学生上课状态");

  const nextPlan = cleanField(sections.nextPlan) ||
    extractByLabel(text, "下节课计划");

  const evaluationParts = [];
  if (classStatus) evaluationParts.push("课堂状态：" + classStatus);
  if (nextPlan) evaluationParts.push("下节课计划：" + nextPlan);
  const evaluation = evaluationParts.join("；") || "已根据课堂描述生成评价。";

  return {
    date: dateMatch ? dateMatch[0] : state.draft.date,
    student: "",
    subject: pickSubject(text, state.draft.subject),
    grade: "",
    duration,
    classStatuses: [],
    content: splitItems(content),
    issue: mastery ? splitItems(mastery) : "暂无明显问题，继续观察课堂表现和作业完成度。",
    homework: homework ? splitItems(homework) : "本次未布置额外作业。",
    evaluation: cleanSection(evaluation),
    score: pickScore(text),
    status: pickStatus(text),
    rawNote: rawText
  };
}

function cleanField(value) {
  return String(value || "").replace(/^[：:\s]+/, "").trim();
}

function extractByLabel(text, label) {
  const lines = text.split(/[\n]+/);
  for (const line of lines) {
    if (line.includes(label)) {
      const parts = line.split(label);
      if (parts.length > 1) return cleanField(parts[1]);
    }
  }
  return "";
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
    grade: "",
    duration: String(data.duration || fallback.duration || ""),
    classStatuses: toStatusArray(data.classStatuses || data.classStatus || ""),
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
    grade: state.draft.grade || "",
    duration: state.draft.duration || "",
    classStatuses: [...(state.draft.classStatuses || [])],
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
    grade: record.grade || "",
    duration: record.duration || "",
    classStatuses: toStatusArray(record.classStatuses || record.classStatus || ""),
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

function renderRecordItem(record, selected) {
  return `
    <div class="record-item ${record.id === selected?.id ? "active" : ""}">
      <input class="record-checkbox" type="checkbox" data-record-id="${record.id}" ${state.batchSelectedIds.has(record.id) ? "checked" : ""} />
      <button class="record-item-btn" data-record-id="${record.id}">
        <span>
          <strong>${escapeHtml(record.student)}</strong>
          <small>${escapeHtml(record.date)} · ${escapeHtml(record.subject)}${record.grade ? ` · ${escapeHtml(record.grade)}` : ""} · ${escapeHtml(record.status)}</small>
        </span>
        <b>${record.score.toFixed(1)}</b>
      </button>
    </div>
  `;
}

function renderRecordList(filteredRecords, selected) {
  if (!filteredRecords.length) return "";

  if (state.groupBy === "无") {
    return filteredRecords.map((r) => renderRecordItem(r, selected)).join("");
  }

  const groups = new Map();
  const groupKey = state.groupBy === "按学生" ? "student" : state.groupBy === "按科目" ? "subject" : "grade";

  filteredRecords.forEach((r) => {
    const key = r[groupKey] || "未分类";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  });

  const groupNames = [...groups.keys()].sort((a, b) =>
    a.localeCompare(b, "zh-CN")
  );

  return groupNames
    .map((name) => {
      const items = groups.get(name);
      return `
        <div class="record-group">
          <div class="group-header">
            <span class="group-name">${escapeHtml(name)}</span>
            <span class="group-count">${items.length} 条</span>
          </div>
          ${items.map((r) => renderRecordItem(r, selected)).join("")}
        </div>
      `;
    })
    .join("");
}

function loadSchedule() {
  try {
    const raw = localStorage.getItem(uk("classSchedule"));
    const data = raw ? JSON.parse(raw) : {};
    if (!data.year) {
      const t = new Date();
      data.year = t.getFullYear();
      data.month = t.getMonth() + 1;
      data.viewMode = "teacher";
    }
    if (!data.viewMode) data.viewMode = "teacher";
    if (data.showFees === undefined) data.showFees = true;
    if (!data.defaultFee) data.defaultFee = 0;
    // Sort all date arrays
  Object.keys(data).forEach(date => {
    if (Array.isArray(data[date]) && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
      data[date].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    }
  });
  return data;
  } catch {
    const t = new Date();
    return { year: t.getFullYear(), month: t.getMonth() + 1, viewMode: "teacher", showFees: true, defaultFee: 0 };
  }
}

function saveSchedule() {
  localStorage.setItem(uk("classSchedule"), JSON.stringify(state.schedule));
}

function getMonthDays(year, month) {
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const startDow = firstDay.getDay();
  const days = [];
  for (let i = 0; i < startDow; i++) days.push(null);
  for (let d = 1; d <= lastDay.getDate(); d++) days.push(d);
  return days;
}

function renderScheduleTab() {
  const today = new Date();
  const year = state.schedule.year || today.getFullYear();
  const month = state.schedule.month || today.getMonth() + 1;
  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const days = getMonthDays(year, month);
  const weekHeaders = ["日", "一", "二", "三", "四", "五", "六"];

  return `
    <main class="schedule-app">
      <header class="sched-header">
        <button id="schedPrev" class="sched-nav">◀</button>
        <h2>${year}年${month}月</h2>
        <button id="schedNext" class="sched-nav">▶</button>
        <button id="schedToday" class="sched-today">今天</button>
        <div class="sched-view-toggle">
          <button class="sched-view-btn ${state.schedule.viewMode === "teacher" ? "active" : ""}" data-view="teacher">👩‍🏫 总表</button>
          <button class="sched-view-btn ${state.schedule.viewMode === "student" ? "active" : ""}" data-view="student">👨‍🎓 分表</button>
        </div>
        ${state.schedule.viewMode === "student" ? `
        <select id="schedStudentFilter" class="sched-student-filter">
          <option value="">选择学生...</option>
          ${getScheduleStudents().map((s) => `<option value="${escapeHtml(s)}" ${state.schedule.filterStudent === s ? "selected" : ""}>${escapeHtml(s)}</option>`).join("")}
        </select>
        ` : ""}
      </header>

      <div class="sched-weekdays">
        ${weekHeaders.map((w) => `<span>${w}</span>`).join("")}
      </div>

      <div class="sched-grid">
        ${days.map((d) => {
          if (d === null) return `<div class="sched-day empty"></div>`;
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const entries = (state.schedule[dateStr] || []).filter((e) =>
            state.schedule.viewMode !== "student" || !state.schedule.filterStudent || e.student === state.schedule.filterStudent
          );
          const isToday = year === today.getFullYear() && month === today.getMonth() + 1 && d === today.getDate();
          const isWeekend = new Date(year, month - 1, d).getDay() % 6 === 0;
          return `
            <div class="sched-day ${isToday ? "today" : ""} ${isWeekend ? "weekend" : ""}" data-date="${dateStr}">
              <div class="sched-day-num">
                <span>${d}</span>
                <button class="sched-add-btn" data-date="${dateStr}">+</button>
              </div>
              <div class="sched-entries">
                ${entries.map((e, i) => `
                  <div class="sched-entry ${e.color ? `sched-color-${e.color}` : ""}" data-date="${dateStr}" data-idx="${i}" draggable="true" title="点击编辑 | 拖拽复制">
                    <div class="sched-entry-row">
                      <span class="sched-time">${escapeHtml(e.time)}</span>
                      <span class="sched-student">${escapeHtml(e.student || "?")}</span>
                      ${state.schedule.showFees && e.fee ? `<span class="sched-fee">¥${e.fee}</span>` : ""}
                      <i class="sched-del-entry" data-date="${dateStr}" data-idx="${i}">×</i>
                      <i class="sched-move-entry" data-date="${dateStr}" data-idx="${i}" title="移到下个月">⤵️</i>
                      <i class="sched-copy-entry" data-date="${dateStr}" data-idx="${i}" title="复制到下个月">📋</i>
                    </div>
                    <div class="sched-content">${escapeHtml(e.content || "")}</div>
                  </div>
                `).join("")}
              </div>
            </div>
          `;
        }).join("")}
      </div>

      <div class="sched-summary-bar">
        <label class="sched-fee-switch">
          <input id="schedFeeToggle" type="checkbox" ${state.schedule.showFees ? "checked" : ""} />
          <span>显示课时费</span>
        </label>
        <label class="sched-default-fee">
          默认课时费 <input id="schedDefaultFee" type="number" value="${state.schedule.defaultFee || ""}" placeholder="0" min="0" step="10" />
        </label>
        ${(() => {
          const stats = getMonthStats(year, month);
          return `
            <span class="sched-stat">📅 总课时：<b>${stats.totalClasses}</b> 节</span>
            <span class="sched-stat">⏱️ 总小时：<b>${stats.totalHours.toFixed(1)}</b> 小时</span>
            <span class="sched-stat sched-legend">
              <i class="sched-dot c1"></i>${stats.color1h.toFixed(1)}h
              <i class="sched-dot c2"></i>${stats.color2h.toFixed(1)}h
              <i class="sched-dot c3"></i>${stats.color3h.toFixed(1)}h
            </span>
            ${state.schedule.showFees ? `<span class="sched-stat">💰 总课时费：<b>${stats.totalFee}</b></span>` : ""}
            <details class="sched-student-stats">
              <summary>👨‍🎓 学生明细</summary>
              <div class="sched-stats-grid">
                ${Object.entries(stats.perStudent).map(([name, s]) => `
                  <div class="sched-student-stat">
                    <strong>${escapeHtml(name)}</strong>
                    <span>${s.count} 节 · ${s.totalHours.toFixed(1)}h</span>
                    ${state.schedule.showFees ? `<span>¥${s.totalFee}</span>` : ""}
                  </div>
                `).join("") || "<p>暂无数据</p>"}
              </div>
            </details>
          `;
        })()}
      </div>

      ${state.schedule.editing ? `
      <div class="sched-modal-overlay" id="schedModalOverlay">
        <div class="sched-modal">
          <h3>${state.schedule.editIdx != null ? "编辑" : "添加"}课程 — ${state.schedule.editing}</h3>
          <label>开始时间 <input id="schedTimeStart" type="time" value="${escapeHtml(state.schedule.editTimeStart || "")}" /></label>
          <label>结束时间 <input id="schedTimeEnd" type="time" value="${escapeHtml(state.schedule.editTimeEnd || "")}" /></label>
          <label>学生 <input id="schedStudent" type="text" value="${escapeHtml(state.schedule.editStudent || "")}" placeholder="学生姓名" /></label>
          <label>内容 <input id="schedContent" type="text" value="${escapeHtml(state.schedule.editContent || "")}" placeholder="学习内容" /></label>
          <label>课时费 <input id="schedFee" type="number" value="${escapeHtml(state.schedule.editFee != null ? state.schedule.editFee : (state.schedule.defaultFee || ""))}" placeholder="单节课时费" min="0" step="10" /></label>
          <label>着色标记</label>
          <div class="sched-color-pick">
            <button class="sched-color-btn c1 ${(state.schedule.editColor || 0) === 1 ? "active" : ""}" data-color="1">🟢</button>
            <button class="sched-color-btn c2 ${(state.schedule.editColor || 0) === 2 ? "active" : ""}" data-color="2">🔵</button>
            <button class="sched-color-btn c3 ${(state.schedule.editColor || 0) === 3 ? "active" : ""}" data-color="3">🟠</button>
          </div>
          <div class="sched-modal-actions">
            <button id="schedSave">保存</button>
            <button id="schedCancel" class="alt">取消</button>
          </div>
        </div>
      </div>
      ` : ""}
    </main>
  `;
}

function renderFeedbackTab() {
  const fb = state.feedback;
  const strengths = ["头脑清醒", "逻辑清晰", "配合度高", "计算过程较严谨", "能够主动思考问题", "能够完成大部分题目", "订正和复盘意识较强", "某类题型理解较为深入"];
  const weaknesses = ["计算准确度需要加强", "做题粗心", "审题不够详细", "解题步骤不够规范", "检查意识需要加强", "学习速度较快"];
  const homeworkOpts = ["重做与复盘错题", "完成课堂上布置的作业"];

  return `
    <main class="feedback-app">
      <section class="feedback-form">
        <header class="fb-header">
          <h2>家长反馈生成器</h2>
          <p>填写课堂信息，一键生成发送给家长的消息。</p>
        </header>

        <div class="fb-row">
          <label>日期 <input id="fbDate" type="date" value="${escapeHtml(fb.date)}" /></label>
          <label>科目
            <select id="fbSubject">
              ${["数学","英语","语文","物理","化学","素养"].map((s) => `<option value="${s}" ${fb.subject === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
          </label>
          <label>学生姓名 <input id="fbStudent" type="text" value="${escapeHtml(fb.student)}" placeholder="张三" /></label>
        </div>

        <div class="fb-section">
          <h3>⏱️ 上课时长 <small>（可多选）</small></h3>
          <div class="fb-chips">
            ${["30分钟", "60分钟", "90分钟", "120分钟"].map((d) => `<button class="fb-chip ${fb.durations.includes(d) ? "active" : ""}" data-fb="duration" data-val="${d}">${d}</button>`).join("")}
          </div>
        </div>

        <div class="fb-section">
          <h3>📖 课堂内容</h3>
          <textarea id="fbContent" placeholder="每行一个知识点，例如：&#10;二次函数的图像和性质&#10;分层作业与跟踪训练">${escapeHtml(fb.content)}</textarea>
        </div>

        <div class="fb-section">
          <h3>✅ 课堂优点 <small>（可多选 + 自定义）</small></h3>
          <div class="fb-chips">
            ${strengths.map((s) => `<button class="fb-chip ${fb.strengths.includes(s) ? "active" : ""}" data-fb="strength" data-val="${escapeHtml(s)}">${s}</button>`).join("")}
            ${fb.customStrengths.map((s) => `<button class="fb-chip custom active" data-fb="strength" data-val="${escapeHtml(s)}">${escapeHtml(s)}<i class="chip-del" data-fb="del-strength" data-val="${escapeHtml(s)}">×</i></button>`).join("")}
            <input class="fb-chip-input" id="fbCustomStrength" placeholder="+自定义" maxlength="8" />
          </div>
        </div>

        <div class="fb-section">
          <h3>⚠️ 课堂不足 <small>（选1-2项 + 自定义）</small></h3>
          <div class="fb-chips">
            ${weaknesses.map((s) => `<button class="fb-chip ${fb.weaknesses.includes(s) ? "active" : ""}" data-fb="weakness" data-val="${escapeHtml(s)}">${s}</button>`).join("")}
            ${fb.customWeaknesses.map((s) => `<button class="fb-chip custom active" data-fb="weakness" data-val="${escapeHtml(s)}">${escapeHtml(s)}<i class="chip-del" data-fb="del-weakness" data-val="${escapeHtml(s)}">×</i></button>`).join("")}
            <input class="fb-chip-input" id="fbCustomWeakness" placeholder="+自定义" maxlength="8" />
          </div>
        </div>

        <div class="fb-section">
          <h3>📝 课后作业 <small>（可多选 + 自定义）</small></h3>
          <div class="fb-chips">
            ${homeworkOpts.map((s) => `<button class="fb-chip ${fb.homework.includes(s) ? "active" : ""}" data-fb="homework" data-val="${escapeHtml(s)}">${s}</button>`).join("")}
            ${fb.customHomework.map((s) => `<button class="fb-chip custom active" data-fb="homework" data-val="${escapeHtml(s)}">${escapeHtml(s)}<i class="chip-del" data-fb="del-homework" data-val="${escapeHtml(s)}">×</i></button>`).join("")}
            <input class="fb-chip-input" id="fbCustomHomework" placeholder="+自定义" maxlength="12" />
          </div>
        </div>

        <div class="fb-section">
          <h3>💬 课程反馈</h3>
          <textarea id="fbEvaluation" placeholder="描述本节课孩子的表现、进步和需要注意的地方..." rows="4">${escapeHtml(fb.evaluation)}</textarea>
        </div>

        <div class="fb-section">
          <h3>📅 下节课计划</h3>
          <textarea id="fbNextLesson" placeholder="预告下节课内容和重点..." rows="2">${escapeHtml(fb.nextLesson)}</textarea>
        </div>

        <button id="fbGenerate" class="fb-generate-btn">✨ 生成家长消息</button>
        <button id="fbReset" class="fb-reset-btn">🔄 重置表单</button>
      </section>

      ${fb.generated ? `
      <section class="feedback-output">
        <div class="fb-output-header">
          <h3>生成结果</h3>
          <button id="fbCopy" class="fb-copy-btn">📋 一键复制</button>
        </div>
        <div class="fb-message" id="fbMessage">${escapeHtml(fb.generated).replace(/\n/g, "<br>")}</div>
      </section>
      ` : ""}
    </main>
  `;
}

function bindFeedbackEvents() {
  document.querySelectorAll(".fb-chip[data-fb]").forEach((chip) => {
    chip.addEventListener("click", (e) => {
      if (e.target.classList.contains("chip-del")) return;
      const type = chip.dataset.fb;
      const val = chip.dataset.val;
      let arr;
      if (type === "strength") arr = state.feedback.strengths;
      else if (type === "weakness") arr = state.feedback.weaknesses;
      else if (type === "homework") arr = state.feedback.homework;
      else if (type === "duration") arr = state.feedback.durations;
      else return;

      const idx = arr.indexOf(val);
      if (idx >= 0) { arr.splice(idx, 1); chip.classList.remove("active"); }
      else {
        if (type === "weakness" && arr.length >= 2) return;
        if (type === "duration") {
          document.querySelectorAll('.fb-chip[data-fb="duration"]').forEach(c => c.classList.remove("active"));
          state.feedback.durations = [val];
        } else arr.push(val);
        chip.classList.add("active");
      }
    });
  });

  document.querySelectorAll(".chip-del[data-fb]").forEach((del) => {
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      const type = del.dataset.fb.replace("del-", "");
      const val = del.dataset.val;
      if (type === "strength") state.feedback.customStrengths = state.feedback.customStrengths.filter((s) => s !== val);
      else if (type === "weakness") state.feedback.customWeaknesses = state.feedback.customWeaknesses.filter((s) => s !== val);
      else state.feedback.customHomework = state.feedback.customHomework.filter((s) => s !== val);
      state.feedback.strengths = state.feedback.strengths.filter((s) => s !== val);
      state.feedback.weaknesses = state.feedback.weaknesses.filter((s) => s !== val);
      state.feedback.homework = state.feedback.homework.filter((s) => s !== val);
      del.parentElement.remove();
    });
  });

  ["fbCustomStrength", "fbCustomWeakness", "fbCustomHomework"].forEach((id) => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const val = input.value.trim();
        if (!val) return;
        if (id === "fbCustomStrength") {
          if (!state.feedback.customStrengths.includes(val)) state.feedback.customStrengths.push(val);
        } else if (id === "fbCustomWeakness") {
          if (!state.feedback.customWeaknesses.includes(val)) state.feedback.customWeaknesses.push(val);
        } else {
          if (!state.feedback.customHomework.includes(val)) state.feedback.customHomework.push(val);
        }
        input.value = "";
        render();
      }
    });
  });

  document.getElementById("fbGenerate")?.addEventListener("click", () => {
    syncFeedbackFromForm();
    generateFeedbackMessage();
    render();
  });

  document.getElementById("fbCopy")?.addEventListener("click", () => {
    const msg = document.getElementById("fbMessage")?.innerText;
    if (msg) navigator.clipboard.writeText(msg).then(() => alert("已复制到剪贴板"));
  });

  document.getElementById("fbReset")?.addEventListener("click", () => {
    state.feedback = {
      date: new Date().toISOString().slice(0, 10),
      durations: [],
      student: "",
      subject: "数学",
      content: "",
      strengths: [],
      weaknesses: [],
      homework: [],
      customStrengths: [],
      customWeaknesses: [],
      customHomework: [],
      evaluation: "",
      nextLesson: "",
      generated: "",
    };
    render();
  });
}

function syncFeedbackFromForm() {
  const fb = state.feedback;
  fb.date = document.getElementById("fbDate")?.value || fb.date;
  fb.subject = document.getElementById("fbSubject")?.value || "数学";
  fb.student = document.getElementById("fbStudent")?.value || "";
  fb.content = document.getElementById("fbContent")?.value || "";
  fb.evaluation = document.getElementById("fbEvaluation")?.value || "";
  fb.nextLesson = document.getElementById("fbNextLesson")?.value || "";
}

function generateFeedbackMessage() {
  const fb = state.feedback;
  const lines = [];
  const salutation = fb.student ? `${fb.student}家长您好` : "家长您好";
  lines.push(`${salutation}，今天的课程结束了，这是今天的课堂反馈：`);

  const parts = [];
  if (fb.date) parts.push(fb.date);
  if (fb.durations.length) parts.push(`上课时长${fb.durations.join("+")}`);
  if (parts.length) lines.push(`\n上课时间：${parts.join("  ")}`);

  if (fb.content.trim()) {
    lines.push("\n📖 课堂内容：");
    fb.content.split("\n").filter(Boolean).forEach((line, i) => {
      lines.push(`   ${i + 1}. ${line.trim()}`);
    });
  }

  const allStrengths = [...fb.strengths, ...fb.customStrengths];
  if (allStrengths.length) {
    lines.push(`\n✅ 课堂表现：${allStrengths.join("、")}。`);
  }

  const allWeaknesses = [...fb.weaknesses, ...fb.customWeaknesses];
  if (allWeaknesses.length) {
    lines.push(`\n⚠️ 需要注意：${allWeaknesses.join("、")}。`);
  }

  if (fb.evaluation.trim()) {
    lines.push(`\n💬 课程反馈：${fb.evaluation.trim()}`);
  }

  const allHomework = [...fb.homework, ...fb.customHomework];
  if (allHomework.length) {
    lines.push("\n📝 课后作业：");
    allHomework.forEach((h, i) => {
      lines.push(`   ${i + 1}. ${h}`);
    });
  }

  if (fb.nextLesson.trim()) {
    lines.push(`\n📅 下节课计划：${fb.nextLesson.trim()}`);
  }

  fb.generated = lines.join("\n");

  // 自动存入学生档案
  if (fb.student.trim() && fb.content.trim()) {
    const record = {
      id: Date.now(),
      date: fb.date,
      student: fb.student.trim(),
      subject: fb.subject,
      grade: "",
      duration: fb.durations.map((d) => d.replace("分钟", "")).join("+"),
      classStatuses: allStrengths.slice(0, 2),
      content: fb.content.trim(),
      issue: allWeaknesses.join("、") || "暂无记录",
      homework: allHomework.join("；") || "未布置",
      evaluation: [fb.evaluation.trim(), fb.nextLesson.trim() ? `下节课：${fb.nextLesson.trim()}` : ""].filter(Boolean).join(" ") || "暂无评价",
      score: 4.5,
      status: "已完成",
    };
    state.records = [record, ...state.records];
    state.selectedId = record.id;
    persistRecords();
  }
}

function getScheduleStudents() {
  const students = new Set();
  Object.values(state.schedule).forEach((arr) => {
    if (Array.isArray(arr)) arr.forEach((e) => { if (e.student) students.add(e.student); });
  });
  return [...students].sort((a, b) => a.localeCompare(b, "zh-CN"));
}

function getMonthStats(year, month) {
  const yearStr = String(year);
  const monthStr = String(month).padStart(2, "0");
  const perStudent = {};
  let totalClasses = 0;
  let totalFee = 0;
  let totalHours = 0;
  let color1 = 0, color2 = 0, color3 = 0;
  let color1h = 0, color2h = 0, color3h = 0;

  Object.entries(state.schedule).forEach(([date, entries]) => {
    if (!Array.isArray(entries)) return;
    if (!date.startsWith(`${yearStr}-${monthStr}`)) return;
    entries.forEach((e) => {
      totalClasses++;
      totalFee += e.fee || 0;
      const hours = calcHours(e.time);
      totalHours += hours;
      if (e.color === 1) { color1++; color1h += hours; }
      else if (e.color === 2) { color2++; color2h += hours; }
      else if (e.color === 3) { color3++; color3h += hours; }
      const name = e.student || "未知";
      if (!perStudent[name]) perStudent[name] = { count: 0, totalFee: 0, totalHours: 0 };
      perStudent[name].count++;
      perStudent[name].totalFee += e.fee || 0;
      perStudent[name].totalHours += hours;
    });
  });

  return { totalClasses, totalFee, totalHours, color1, color2, color3, color1h, color2h, color3h, perStudent };
}

function calcHours(timeStr) {
  const parts = (timeStr || "").split("-");
  if (parts.length < 2) return 0;
  const [h1, m1] = (parts[0] || "").split(":").map(Number);
  const [h2, m2] = (parts[1] || "").split(":").map(Number);
  if (isNaN(h1) || isNaN(h2)) return 0;
  return (h2 + (m2 || 0) / 60) - (h1 + (m1 || 0) / 60);
}

function getDurationColor(timeStr) {
  const h = calcHours(timeStr);
  if (h <= 0) return "0";
  if (h < 1) return "1";
  if (h <= 2) return "2";
  return "3";
}

function moveEntryToMonth(date, idx, deleteSource) {
  const entry = state.schedule[date]?.[idx];
  if (!entry) return;
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1);
  const newDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (!state.schedule[newDate]) state.schedule[newDate] = [];
  state.schedule[newDate].push({ ...entry });
  state.schedule[newDate].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  if (deleteSource) {
    state.schedule[date].splice(idx, 1);
    if (state.schedule[date].length === 0) delete state.schedule[date];
  }
  saveSchedule();
  render();
}

function bindScheduleEvents() {
  document.querySelectorAll(".sched-view-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.schedule.viewMode = btn.dataset.view;
      state.schedule.filterStudent = "";
      saveSchedule();
      render();
    });
  });

  document.getElementById("schedStudentFilter")?.addEventListener("change", (e) => {
    state.schedule.filterStudent = e.target.value;
    saveSchedule();
    render();
  });

  document.querySelectorAll(".sched-color-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.schedule.editColor = Number(btn.dataset.color);
      document.querySelectorAll(".sched-color-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  document.getElementById("schedFeeToggle")?.addEventListener("change", (e) => {
    state.schedule.showFees = e.target.checked;
    saveSchedule();
    render();
  });

  document.getElementById("schedDefaultFee")?.addEventListener("change", (e) => {
    state.schedule.defaultFee = Number(e.target.value) || 0;
    saveSchedule();
  });

  document.getElementById("schedPrev")?.addEventListener("click", () => {
    let m = state.schedule.month - 1;
    let y = state.schedule.year;
    if (m < 1) { m = 12; y--; }
    state.schedule.month = m;
    state.schedule.year = y;
    render();
  });

  document.getElementById("schedNext")?.addEventListener("click", () => {
    let m = state.schedule.month + 1;
    let y = state.schedule.year;
    if (m > 12) { m = 1; y++; }
    state.schedule.month = m;
    state.schedule.year = y;
    render();
  });

  document.getElementById("schedToday")?.addEventListener("click", () => {
    const t = new Date();
    state.schedule.month = t.getMonth() + 1;
    state.schedule.year = t.getFullYear();
    render();
  });

  document.querySelectorAll(".sched-add-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      state.schedule.editing = btn.dataset.date;
      state.schedule.editTimeStart = "";
      state.schedule.editTimeEnd = "";
      state.schedule.editStudent = "";
      state.schedule.editContent = "";
      state.schedule.editFee = 0;
      state.schedule.editColor = 0;
      render();
    });
  });

  document.querySelectorAll(".sched-del-entry").forEach((del) => {
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      const date = del.dataset.date;
      const idx = Number(del.dataset.idx);
      if (state.schedule[date]) {
        state.schedule[date].splice(idx, 1);
        if (state.schedule[date].length === 0) delete state.schedule[date];
      }
      saveSchedule();
      render();
    });
  });

  document.getElementById("schedSave")?.addEventListener("click", () => {
    const date = state.schedule.editing;
    const startT = document.getElementById("schedTimeStart")?.value || "";
    const endT = document.getElementById("schedTimeEnd")?.value || "";
    const timeStr = startT && endT ? `${startT}-${endT}` : (startT || endT || "");
    const entry = {
      time: timeStr,
      student: document.getElementById("schedStudent")?.value || "",
      content: document.getElementById("schedContent")?.value || "",
      fee: Number(document.getElementById("schedFee")?.value) || 0,
      color: state.schedule.editColor || 0,
    };
    if (!entry.time && !entry.student && !entry.content) return;
    if (!state.schedule[date]) state.schedule[date] = [];
    if (state.schedule.editIdx != null) {
      state.schedule[date][state.schedule.editIdx] = entry;
      state.schedule.editIdx = null;
    } else {
      state.schedule[date].push(entry);
    state.schedule[date].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
    }
    state.schedule.editing = null;
    saveSchedule();
    render();
  });

  document.querySelectorAll(".sched-move-entry").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveEntryToMonth(btn.dataset.date, Number(btn.dataset.idx), true);
    });
  });

  document.querySelectorAll(".sched-copy-entry").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      moveEntryToMonth(btn.dataset.date, Number(btn.dataset.idx), false);
    });
  });

  document.getElementById("schedCancel")?.addEventListener("click", () => {
    state.schedule.editing = null;
    state.schedule.editIdx = null;
    render();
  });

  document.getElementById("schedModalOverlay")?.addEventListener("click", (e) => {
    if (e.target.id === "schedModalOverlay") {
      state.schedule.editing = null;
      state.schedule.editIdx = null;
      render();
    }
  });

  // Click entry to edit
  document.querySelectorAll(".sched-entry").forEach((entryEl) => {
    entryEl.addEventListener("click", (e) => {
      if (e.target.classList.contains("sched-del-entry")) return;
      const date = entryEl.dataset.date;
      const idx = Number(entryEl.dataset.idx);
      const entry = state.schedule[date]?.[idx];
      if (!entry) return;
      state.schedule.editIdx = idx;
      state.schedule.editing = date;
      const times = (entry.time || "").split("-");
      state.schedule.editTimeStart = times[0] || "";
      state.schedule.editTimeEnd = times[1] || "";
      state.schedule.editStudent = entry.student || "";
      state.schedule.editContent = entry.content || "";
      state.schedule.editFee = entry.fee || 0;
      state.schedule.editColor = entry.color || 0;
      render();
    });
  });

  // Drag to copy
  let dragData = null;
  document.querySelectorAll(".sched-entry[draggable]").forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      dragData = { date: el.dataset.date, idx: Number(el.dataset.idx) };
      e.dataTransfer.effectAllowed = "copy";
      e.dataTransfer.setData("text/plain", "");
      el.style.opacity = "0.4";
    });
    el.addEventListener("dragend", (e) => {
      el.style.opacity = "1";
    });
  });

  document.querySelectorAll(".sched-day:not(.empty)").forEach((dayEl) => {
    dayEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      dayEl.style.background = "#dceef8";
    });
    dayEl.addEventListener("dragleave", () => {
      dayEl.style.background = "";
    });
    dayEl.addEventListener("drop", (e) => {
      e.preventDefault();
      dayEl.style.background = "";
      if (!dragData) return;
      const srcEntry = state.schedule[dragData.date]?.[dragData.idx];
      if (!srcEntry) return;
      const targetDate = dayEl.dataset.date;
      if (!state.schedule[targetDate]) state.schedule[targetDate] = [];
      state.schedule[targetDate].push({ ...srcEntry });
      state.schedule[targetDate].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
      saveSchedule();
      render();
    });
  });
}

function render() {
  const filteredRecords = getFilteredRecords();
  const selected = getSelectedRecord(filteredRecords);
  const selectedScore = selected?.score || 0;
  const evalSplit = splitEvaluation(selected?.evaluation || "");

  root.innerHTML = `
    ${!state.user ? `
    <div class="login-screen">
      <div class="login-card">
        <h1>📚 学生记录档案</h1>
        <p>输入你的账号名进入工作台，不同账号数据互不影响。</p>
        <input id="loginInput" type="text" placeholder="输入账号名" autofocus maxlength="20" />
        <button id="loginBtn">进入</button>
      </div>
    </div>
    ` : `
    <nav class="tab-nav">
      <button class="tab-btn ${state.activeTab === "archive" ? "active" : ""}" data-tab="archive">📋 学生档案</button>
      <button class="tab-btn ${state.activeTab === "feedback" ? "active" : ""}" data-tab="feedback">✉️ 家长反馈</button>
      <button class="tab-btn ${state.activeTab === "schedule" ? "active" : ""}" data-tab="schedule">📅 课表安排</button>
      <span class="user-badge">👤 ${escapeHtml(state.user)} ${isAdmin() ? "🔑" : ""}</span>
      ${isAdmin() ? `<button id="adminBtn" class="logout-btn">用户管理</button>` : ""}
      <button id="logoutBtn" class="logout-btn">退出</button>
    </nav>
    ${state.showAdmin ? `
    <div class="admin-modal-overlay" id="adminModalOverlay">
      <div class="admin-modal">
        <h3>👥 用户管理</h3>
        <div class="admin-list">
          ${getAllowedUsers().map((u) => `
            <div class="admin-user-row">
              <span>${escapeHtml(u)} ${u === getAllowedUsers()[0] ? "🔑" : ""}</span>
              ${u !== getAllowedUsers()[0] ? `<button class="admin-del-user" data-user="${escapeHtml(u)}">×</button>` : ""}
            </div>
          `).join("")}
        </div>
        <div class="admin-add-row">
          <input id="adminAddInput" placeholder="输入新用户名" maxlength="20" />
          <button id="adminAddBtn">添加</button>
        </div>
        <button id="adminClose" class="admin-close-btn">关闭</button>
      </div>
    </div>
    ` : ""}
    ${state.activeTab === "archive" ? `
    <main class="app-shell">
      <section class="workspace">
        <aside class="sidebar">
          <div class="brand">
            <span class="brand-mark">${icon("book")}</span>
            <div>
              <h1>学生记录档案</h1>
              <p>学生成长记录、成绩跟踪、查缺补漏</p>
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
            <label>
              <span>${icon("clipboard")}分组</span>
              <select id="groupBySelect">
                <option value="无" ${state.groupBy === "无" ? "selected" : ""}>不分组</option>
                <option value="按学生" ${state.groupBy === "按学生" ? "selected" : ""}>按学生</option>
                <option value="按科目" ${state.groupBy === "按科目" ? "selected" : ""}>按科目</option>
                <option value="按年级" ${state.groupBy === "按年级" ? "selected" : ""}>按年级</option>
              </select>
            </label>
          </div>

          <div class="batch-bar">
            <label class="batch-check">
              <input id="selectAllCheckbox" type="checkbox" ${filteredRecords.length > 0 && filteredRecords.every((r) => state.batchSelectedIds.has(r.id)) ? "checked" : ""} />
              全选 (${filteredRecords.length})
            </label>
            <button id="batchDeleteButton" class="batch-delete-btn" type="button" ${state.batchSelectedIds.size === 0 ? "disabled" : ""}>${icon("delete")}删除选中 (${state.batchSelectedIds.size})</button>
          </div>
          <div class="record-list">
            ${renderRecordList(filteredRecords, selected) || `<p class="empty-state">没有匹配的课后点评记录</p>`}
          </div>
        </aside>

        <section class="content">
          <header class="topbar hero-panel">
            <div>
              <span class="eyebrow">${icon("spark")}学生成长档案</span>
              <h2>${escapeHtml(selected?.student || "暂无记录")}的学习记录</h2>
              <p>课堂内容、掌握情况、作业表现、成长轨迹一目了然。</p>
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
              ${selected?.grade ? `<span>${escapeHtml(selected.grade)}</span>` : ""}
              ${selected?.duration ? `<span>${escapeHtml(selected.duration)}分钟</span>` : ""}
              ${(selected?.classStatuses || []).length ? `<span class="meta-status">${selected.classStatuses.join(" · ")}</span>` : ""}
              <span>评价 ${selected ? selected.score.toFixed(1) : "-"}/5.0</span>
            </div>

            <div class="score-row showcase-score">
              <span>表现</span>
              <div class="score-track">
                <i style="width: ${(selectedScore / 5) * 100}%"></i>
              </div>
              <b>${selected ? selected.score.toFixed(1) : "-"}</b>
            </div>

            <div class="story-flow">
              <article class="story-block">
                <small>本节课所学内容</small>
                ${paragraphList(selected?.content, "暂无内容")}
                ${selected?.issue && selected.issue !== "暂无反馈" ? `<div class="mastery-note"><small>掌握情况</small>${paragraphList(selected.issue, "")}</div>` : ""}
              </article>
              <article class="story-block">
                <small>课后作业</small>
                ${paragraphList(selected?.homework, "暂无作业")}
              </article>
              <article class="story-block">
                <small>课堂状态</small>
                ${(selected?.classStatuses || []).length ? `<p>${(selected.classStatuses).map(s => escapeHtml(s)).join(" · ")}</p>` : `<p>暂无记录</p>`}
              </article>
              <article class="story-block">
                <small>下节课继续学习内容</small>
                ${paragraphList(evalSplit.nextPlan, "暂无记录")}
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
                <textarea id="rawNote" placeholder="按右侧模板逐项填写课后反馈...">${escapeHtml(state.draft.rawNote)}</textarea>
                <aside class="speech-template" aria-label="课后反馈模板">
                  <strong>课后反馈模板</strong>
                  <p>家长您好！xxxx课堂小结</p>
                  <p>上课时长：x分钟</p>
                  <p>学生姓名：xxx</p>
                  <p>所授科目：</p>
                  <p>学生上课状态：<em>下方按钮点选</em></p>
                  <p>本节课所学内容：<em>如：二次函数顶点式、圆的综合题</em></p>
                  <p>掌握情况：<em>如：已掌握、部分掌握（具体薄弱点）、未掌握</em></p>
                  <p>课后作业：<em>如：完成练习册第x页、整理错题</em></p>
                  <p>下节课计划：<em>如：复习巩固xx、进入新章节xx</em></p>
                  <em>复制到左侧输入框，逐项填写后点击 AI 拆分。</em>
                </aside>
              </div>
              <p class="parse-hint">按模板逐项填写后点击 AI 拆分，系统会自动识别各字段。</p>
              <div class="quick-actions">
                <button id="parseButton" class="primary-button" type="button" ${state.isAiParsing ? "disabled" : ""}>${icon("spark")}${state.isAiParsing ? "解析中..." : "AI 拆分到下方字段"}</button>
                <button id="parseSaveButton" class="primary-button alt" type="button" ${state.isAiParsing ? "disabled" : ""}>${icon("plus")}${state.isAiParsing ? "解析中..." : "AI 拆分并保存"}</button>
              </div>
            </div>
            <form id="recordForm" class="review-form">
              <input name="date" type="date" value="${escapeHtml(state.draft.date)}" />
              <input name="student" value="${escapeHtml(state.draft.student)}" placeholder="学生姓名" />
              <input name="subject" value="${escapeHtml(state.draft.subject)}" placeholder="科目" />
              <input name="grade" value="${escapeHtml(state.draft.grade)}" placeholder="年级（如DP1、高一）" list="gradeList" autocomplete="off" />
              <input name="duration" value="${escapeHtml(state.draft.duration)}" placeholder="上课时长（分钟）" type="number" min="1" max="240" />
              <datalist id="gradeList">
                <option value="DP1"><option value="DP2"><option value="MYP4"><option value="MYP5">
                <option value="高一"><option value="高二"><option value="高三">
                <option value="初一"><option value="初二"><option value="初三">
                <option value="IGCSE"><option value="A-Level">
              </datalist>
              <label class="range-field">
                <span>对应评价 <output id="scoreOutput">${escapeHtml(state.draft.score)}</output></span>
                <input name="score" type="range" min="1" max="5" step="0.1" value="${escapeHtml(state.draft.score)}" />
              </label>
              <div class="status-buttons">
                <span>课堂状态</span>
                ${state.classStatusOptions.map((s) => `
                  <button class="status-chip ${(state.draft.classStatuses || []).includes(s) ? "active" : ""}" type="button" data-status="${escapeHtml(s)}">${escapeHtml(s)}${!["专注认真","互动积极","偶尔走神","需要提醒"].includes(s) ? `<i class="chip-del" data-del="${escapeHtml(s)}">×</i>` : ""}</button>
                `).join("")}
                <input class="status-add-input" value="${escapeHtml(state.newStatusInput)}" placeholder="+自定义" maxlength="8" />
              </div>
              <input type="hidden" name="classStatus" value="${(state.draft.classStatuses || []).join(",")}" />
              <textarea name="content" placeholder="本节课所学内容">${escapeHtml(state.draft.content)}</textarea>
              <textarea name="issue" placeholder="掌握情况">${escapeHtml(state.draft.issue)}</textarea>
              <textarea name="homework" placeholder="课后作业">${escapeHtml(state.draft.homework)}</textarea>
              <textarea name="evaluation" placeholder="综合评价">${escapeHtml(state.draft.evaluation)}</textarea>
              <div class="form-actions">
                <button class="primary-button submit-button" type="submit">${icon("plus")}${state.editingId ? "保存修改" : "保存点评"}</button>
                ${state.editingId ? `<button id="cancelEditButton" class="icon-button text-button" type="button">取消修改</button>` : ""}
              </div>
            </form>
          </section>
        </section>
      </section>
    </main>
    ` : state.activeTab === "feedback" ? renderFeedbackTab() : renderScheduleTab()}
    ${renderPrintSheet(selected)}
    `}
  `;

  bindEvents();
  if (state.activeTab === "feedback") bindFeedbackEvents();
  if (state.activeTab === "schedule") bindScheduleEvents();
}

function syncDraftFromForm(form) {
  const formData = new FormData(form);
  state.draft.date = String(formData.get("date") || state.draft.date);
  state.draft.student = String(formData.get("student") || "");
  state.draft.subject = String(formData.get("subject") || "").trim() || "数学";
  state.draft.grade = String(formData.get("grade") || "").trim();
  state.draft.duration = String(formData.get("duration") || "").trim();
  state.draft.classStatuses = (formData.get("classStatus") || "").split(",").filter(Boolean);
  state.draft.status = String(formData.get("status") || state.draft.status || "进行中");
  state.draft.score = String(formData.get("score") || "4.5");
  state.draft.content = String(formData.get("content") || "");
  state.draft.issue = String(formData.get("issue") || "");
  state.draft.homework = String(formData.get("homework") || "");
  state.draft.evaluation = String(formData.get("evaluation") || "");
}

function bindEvents() {
  document.getElementById("loginBtn")?.addEventListener("click", () => {
    const name = document.getElementById("loginInput")?.value.trim();
    if (!name) return;
    const allowed = getAllowedUsers();
    if (allowed.length === 0) {
      allowed.push(name);
      localStorage.setItem("allowedUsers", JSON.stringify(allowed));
    } else if (!allowed.includes(name)) {
      alert("账号未授权，请联系管理员。");
      return;
    }
    state.user = name;
    localStorage.setItem("currentUser", name);
    loadPersistentRecords();
    state.activeTab = "archive";
    render();
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    state.user = "";
    localStorage.removeItem("currentUser");
    state.schedule = loadSchedule();
    render();
  });

  document.getElementById("adminBtn")?.addEventListener("click", () => {
    state.showAdmin = true;
    render();
  });

  document.getElementById("adminClose")?.addEventListener("click", () => {
    state.showAdmin = false;
    render();
  });

  document.getElementById("adminAddBtn")?.addEventListener("click", () => {
    const input = document.getElementById("adminAddInput");
    const name = input?.value.trim();
    if (!name) return;
    const users = getAllowedUsers();
    if (!users.includes(name)) {
      users.push(name);
      localStorage.setItem("allowedUsers", JSON.stringify(users));
    }
    input.value = "";
    render();
  });

  document.querySelectorAll(".admin-del-user").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const name = btn.dataset.user;
      let users = getAllowedUsers();
      users = users.filter((u) => u !== name);
      localStorage.setItem("allowedUsers", JSON.stringify(users));
      render();
    });
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeTab = btn.dataset.tab;
      render();
    });
  });

  document.getElementById("queryInput")?.addEventListener("compositionstart", () => {
    state.composing = true;
  });

  document.getElementById("queryInput")?.addEventListener("compositionend", (event) => {
    state.composing = false;
    state.query = event.target.value;
    render();
  });

  document.getElementById("queryInput")?.addEventListener("input", (event) => {
    if (state.composing) return;
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

  document.getElementById("groupBySelect")?.addEventListener("change", (event) => {
    state.groupBy = event.target.value;
    state.batchSelectedIds.clear();
    render();
  });

  document.querySelectorAll(".status-chip").forEach((chip) => {
    chip.addEventListener("click", (event) => {
      if (event.target.classList.contains("chip-del")) return;
      const status = chip.dataset.status;
      const arr = [...(state.draft.classStatuses || [])];
      const idx = arr.indexOf(status);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(status);
      state.draft.classStatuses = arr;
      render();
    });
  });

  document.querySelectorAll(".chip-del").forEach((del) => {
    del.addEventListener("click", (event) => {
      event.stopPropagation();
      const toRemove = del.dataset.del;
      state.classStatusOptions = state.classStatusOptions.filter((s) => s !== toRemove);
      saveClassStatusOptions(state.classStatusOptions);
      if (state.draft.classStatuses && state.draft.classStatuses.includes(toRemove)) {
        state.draft.classStatuses = state.draft.classStatuses.filter((s) => s !== toRemove);
      }
      render();
    });
  });

  const statusAddInput = document.querySelector(".status-add-input");
  statusAddInput?.addEventListener("input", (event) => {
    state.newStatusInput = event.target.value;
  });

  statusAddInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const val = state.newStatusInput.trim();
      if (val && !state.classStatusOptions.includes(val)) {
        state.classStatusOptions = [...state.classStatusOptions, val];
        saveClassStatusOptions(state.classStatusOptions);
      }
      state.newStatusInput = "";
      render();
    }
  });

  document.getElementById("selectAllCheckbox")?.addEventListener("change", (event) => {
    const filtered = getFilteredRecords();
    if (event.target.checked) {
      filtered.forEach((r) => state.batchSelectedIds.add(r.id));
    } else {
      filtered.forEach((r) => state.batchSelectedIds.delete(r.id));
    }
    render();
  });

  document.querySelectorAll(".record-checkbox").forEach((checkbox) => {
    checkbox.addEventListener("click", (event) => {
      event.stopPropagation();
      const id = Number(checkbox.dataset.recordId);
      if (checkbox.checked) {
        state.batchSelectedIds.add(id);
      } else {
        state.batchSelectedIds.delete(id);
      }
      render();
    });
  });

  document.getElementById("batchDeleteButton")?.addEventListener("click", () => {
    if (state.batchSelectedIds.size === 0) return;
    state.records = state.records.filter((r) => !state.batchSelectedIds.has(r.id));
    if (!state.records.find((r) => r.id === state.selectedId)) {
      state.selectedId = state.records[0]?.id;
    }
    state.batchSelectedIds.clear();
    state.editingId = null;
    state.draft = createEmptyDraft();
    state.storageStatus = `已批量删除记录，正在保存...`;
    render();
    persistRecords();
    render();
  });

  document.querySelectorAll(".record-item-btn").forEach((button) => {
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
      localStorage.setItem(uk("deepseekApiKey"), state.deepseekKey);
      state.aiStatus = "DeepSeek 已启用，解析时会优先调用 AI。";
    } else {
      localStorage.removeItem(uk("deepseekApiKey"));
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

if (state.user) loadPersistentRecords(); else render();
