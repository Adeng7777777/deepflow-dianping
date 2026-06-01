const https = require("https");

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
      {
        role: "system",
        content:
          "你是教培机构课后点评记录助手。请把用户输入的一段口语化中文课堂反馈抽取成严格 JSON，不要输出解释。字段必须是 date, student, subject, content, issue, homework, evaluation, score, status。抽取规则：1. content 只放本节课学习内容/知识点。2. issue 只放反映问题/薄弱点/错误表现。3. homework 只放课后作业。4. evaluation 放老师对本节课的总结评价、后续建议、表现判断。5. 如果 content、issue、homework 中出现多个项目，在同一字符串里按 a. ...\\nb. ...\\nc. ... 分点输出。6. student 字段始终输出空字符串，不要提取任何姓名。subject 只能是 数学/英语/语文/物理/化学/素养。status 只能是 进行中/需跟进/已完成。score 是 1 到 5 的数字。缺失日期留空。",
      },
      {
        role: "user",
        content: String(rawText || ""),
      },
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
          apiRes.on("data", (chunk) => {
            data += chunk;
          });
          apiRes.on("end", () => {
            try {
              resolve({ status: apiRes.statusCode, body: JSON.parse(data) });
            } catch (e) {
              resolve({ status: apiRes.statusCode, body: data });
            }
          });
        }
      );

      apiReq.on("error", (e) => {
        reject(new Error(e.message));
      });

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
