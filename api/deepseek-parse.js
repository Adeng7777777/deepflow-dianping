const https = require("https");

const SYSTEM_PROMPT = [
  "你是教培机构课后点评记录助手。请把用户输入的一段课后反馈文本抽取成严格 JSON，不要输出解释。",
  "字段必须是 date, student, subject, content, issue, homework, evaluation, score, status。",
  "字段映射规则：",
  "1. 学生姓名 → student。",
  "2. 所授科目 → subject，只能是 数学/英语/语文/物理/化学/素养。",
  '3. 本节课所学内容 → content，如"二次函数顶点式、圆的综合题"。多个知识点按 a. ...\\nb. ...\\nc. ... 分点输出。',
  "4. 掌握情况 → issue。记录未掌握或薄弱的部分，如\"计算顶点坐标容易符号出错\"。已掌握则填\"已掌握\"。",
  "5. 课后作业 → homework。",
  "6. 学生上课状态 + 下节课计划合并为 evaluation。格式如\"课堂状态：xxx；下节课计划：xxx\"。",
  '7. student 字段始终输出空字符串 ""，不要从文本中提取任何姓名，留给用户手动填写。',
  "8. status 只能是 进行中/需跟进/已完成。score 是 1 到 5 的数字。",
  "9. 缺失的日期留空。上课时长、家长您好等开头问候语不需要存入 JSON。",
].join("");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { rawText, apiKey } = req.body || {};

  if (!apiKey) {
    return res.status(400).json({ error: "缺少 DeepSeek API Key" });
  }

  const requestBody = JSON.stringify({
    model: "deepseek-v4-pro",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: String(rawText || "") },
    ],
    thinking: { type: "disabled" },
    response_format: { type: "json_object" },
    stream: false,
  });

  try {
    const result = await new Promise((resolve, reject) => {
      const apiReq = https.request(
        {
          hostname: "api.deepseek.com",
          path: "/chat/completions",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + apiKey,
          },
        },
        (apiRes) => {
          let data = "";
          apiRes.on("data", (chunk) => { data += chunk; });
          apiRes.on("end", () => {
            try {
              resolve({ status: apiRes.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: apiRes.statusCode, body: data });
            }
          });
        }
      );

      apiReq.on("error", (e) => { reject(new Error(e.message)); });
      apiReq.write(requestBody);
      apiReq.end();
    });

    if (result.status !== 200) {
      return res.status(result.status).json({
        error: result.body?.error?.message || "DeepSeek 请求失败",
      });
    }

    return res.status(200).json({
      content: result.body?.choices?.[0]?.message?.content || "",
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
