# DeepFlow 点评

教培课后点评记录工具，面向国际课程（IB Math AAHL）教师的课后反馈工作台。

把口语化的课堂反馈一键拆分为结构化的点评记录：学习内容、反映问题、课后作业、对应评价。支持 AI 智能解析（DeepSeek）和本地规则解析两种模式，数据保存在浏览器中，无需服务器。

---

## 功能

- **结构化记录**：每条点评包含日期、学生、科目、学习内容、反映问题、课后作业、评价、评分（1-5）、跟进状态
- **AI 智能拆分**：在输入框用自然语言描述课堂情况，AI 自动拆分为结构化字段（需填入 DeepSeek API Key）
- **本地规则回退**：未填 API Key 时自动使用规则匹配解析
- **筛选与搜索**：按科目、状态、日期排序筛选记录
- **导出图片**：选中记录生成精美卡片图片，可直接分享给家长
- **打印导出**：支持浏览器打印和 A4 排版输出

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | 原生 HTML/CSS/JS，无框架 |
| 数据存储 | 浏览器 localStorage |
| AI 代理 | Vercel Serverless Function（Node.js） |
| AI 引擎 | DeepSeek v4-pro |
| 部署 | Vercel（CDN + 自动 SSL） |

## 使用方式

1. 打开 https://deepflow-dianping.vercel.app
2. （可选）在左侧填入 DeepSeek API Key 启用 AI 解析
3. 在输入框按模板描述课堂情况，点击「AI 拆分」
4. 校对拆分结果，手动填入学生姓名，点击「保存点评」
5. 左侧列表可筛选、搜索、排序，右侧卡片可导出图片

## 本地开发

```bash
# 启动本地静态服务
python3 -m http.server 8765

# 浏览器打开
open http://localhost:8765
```

注意：本地运行时 AI 解析走规则匹配模式。完整 AI 功能需部署到 Vercel。

## 部署

项目已配置为 Vercel 一键部署：

1. Fork 本仓库
2. 在 [Vercel](https://vercel.com) 导入仓库
3. 无需任何配置，直接 Deploy

## 目录结构

```
deepflow-dianping/
├── api/
│   └── deepseek-parse.js   # Vercel Serverless Function（AI 代理）
├── src/
│   ├── main.js             # 前端核心逻辑
│   └── styles.css          # 样式
├── index.html              # 入口页面
├── vercel.json             # Vercel 部署配置
├── package.json
└── README.md
```

## 许可

MIT
