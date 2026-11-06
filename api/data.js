const https = require("https");

// 支持 Vercel KV 和 Upstash 两种环境变量命名
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

function redisRequest(command, args) {
  return new Promise((resolve, reject) => {
    const path = `/${command}/${args.map((a) => encodeURIComponent(a)).join("/")}`;
    const host = REDIS_URL.replace(/^https?:\/\//, "");
    const req = https.request(
      {
        hostname: host,
        path,
        method: "POST",
        headers: {
          Authorization: `Bearer ${REDIS_TOKEN}`,
        },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch (e) {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  if (!REDIS_URL || !REDIS_TOKEN) {
    return res.status(503).json({
      error: "云端同步未配置",
      hint: "请在 Vercel 项目里创建 Upstash Redis 并连接项目",
    });
  }

  try {
    if (req.method === "GET") {
      const user = req.query?.user || "";
      if (!user) return res.status(400).json({ error: "缺少 user 参数" });

      const result = await redisRequest("get", [`sync_${user}`]);
      const raw = result.body?.result;
      if (!raw) return res.status(200).json({ data: null });

      let parsed;
      try {
        parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch {
        return res.status(200).json({ data: null });
      }
      return res.status(200).json({ data: parsed });
    }

    if (req.method === "POST") {
      const { user, data } = req.body || {};
      if (!user) return res.status(400).json({ error: "缺少 user 参数" });
      if (!data) return res.status(400).json({ error: "缺少 data 参数" });

      const payload = JSON.stringify(data);
      const result = await redisRequest("set", [`sync_${user}`, payload]);

      if (result.status !== 200) {
        return res.status(500).json({ error: "云端保存失败" });
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "云端操作失败" });
  }
};
