# 版本记录

## v0.2.0 — 2026-05-27

### 架构变更

- **数据层从服务端 JSON 迁移到浏览器 localStorage**
  - 每人数据独立存储，换浏览器/清缓存会丢失
  - 移除 `data/records.json` 文件
- **部署方式从本地 Node.js 服务器改为 Vercel 静态部署**
  - 前端静态文件由 Vercel CDN 全球加速
  - API 代理改为 Vercel Serverless Function
  - 移除 `server.mjs`

### 新增

- `api/deepseek-parse.js`：Vercel Serverless Function，使用 Node.js 原生 `https` 模块代理 DeepSeek API
- `vercel.json`：Vercel 部署配置
- `.gitignore`
- `README.md`

### 修改

- `src/main.js`
  - `loadPersistentRecords()` 改为从 localStorage 读取记录
  - `persistRecords()` 改为写入 localStorage
  - AI 拆分后 `student` 字段强制为空，由用户手动填写
  - 本地规则解析同样不提取姓名
- `package.json` 精简，移除 `scripts` 和 `type: "module"`

### 移除

- `server.mjs`（原 Node.js HTTP 服务器）
- `data/` 目录（含 `records.json`）

---

## v0.1.0 — 2026-05 中旬

### 初始版本

- 单文件 Node.js HTTP 服务器（`server.mjs`）
- 前端纯 HTML/CSS/JS 单页应用
- 数据存储于 `data/records.json`
- 三条示例记录：林可（数学）、周安（英语）、陈一诺（语文）
- CRUD 完整流程：新增、修改、删除点评记录
- 筛选：按科目、状态、日期排序
- DeepSeek AI 智能解析（通过服务端代理 `/api/deepseek-parse`）
- 本地规则解析回退（`parseRawNote`）
- Canvas 导出图片卡片
- 打印样式支持
- DeepSeek API Key 存于 localStorage
- 话术断点模板引导输入
