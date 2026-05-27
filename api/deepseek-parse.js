export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { rawText, apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({ error: "缺少 DeepSeek API Key" });
    }

    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [
          {
            role: "system",
            content:
              "你是教培机构课后点评记录助手。请把用户输入的一段口语化中文课堂反馈抽取成严格 JSON，不要输出解释。字段必须是 date, student, subject, content, issue, homework, evaluation, score, status。抽取规则：1. content 只放本节课学习内容/知识点，例如"二次函数、圆的综合"。遇到"这节课学习的是/学习了/今天学习的是"等作为内容起点。2. issue 只放反映问题/薄弱点/错误表现。遇到"反映的情况/反馈的情况/反应的情况/反框的情况/反映问题/问题就是"等作为问题起点，"反框"按"反馈/反映"理解。3. homework 只放课后作业，遇到"课后作业呢/课后作业/作业就是"等作为作业起点。4. evaluation 放老师对本节课的总结评价、后续建议、表现判断。遇到"这节课的评价就是/这节课的评价是/评价就是/评价是/对应评价"等作为评价起点；评价起点之后的"然后"如果仍在描述表现或建议，也属于 evaluation，不要截走。5. 如果 content、issue、homework 中出现"以及/并且/同时/、/；"连接多个项目，请在同一个字符串里按"a. ...\\nb. ...\\nc. ..."分点输出，做到字段对仗，不要把作业放进问题，不要把评价放进作业。6. 如果学生姓名没有显式写"学生"，也要从句子中识别，例如"晓晴部分计算不行""小琴很认真"中的姓名。subject 只能是 数学/英语/语文/物理/化学/素养。status 只能是 进行中/需跟进/已完成。score 是 1 到 5 的数字。缺失日期留空。"
          },
          {
            role: "user",
            content: String(rawText || "")
          }
        ],
        thinking: { type: "disabled" },
        response_format: { type: "json_object" },
        stream: false
      })
    });

    const payload = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: payload?.error?.message || "DeepSeek 请求失败" });
    }

    return res.status(200).json({ content: payload?.choices?.[0]?.message?.content || "" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "DeepSeek 解析失败" });
  }
}
