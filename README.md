# FUMI数学能力地图

面向北京中考要求、人教版七至八年级已学内容的匿名数学诊断网站。

## 核心功能

- 40分钟主诊断，26道任务覆盖20个教材章节
- 章节掌握度、八领域雷达图、证据题数与置信度
- 图形题使用SVG作图，讲解步骤可点击并动态呈现
- 交卷前FUMI AI只给一步提示，交卷后提供完整讲解与变式思路
- 进度、答案和聊天只保存在学生浏览器
- 可下载匿名HTML报告、打印为PDF或复制无服务器存储的匿名报告链接
- “真实可核验模式”：不伪造北京近三年逐题正确率

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

## FUMI AI配置

复制 `.env.example` 为 `.env.local`，在部署平台的环境变量中配置：

```text
DASHSCOPE_API_KEY=你的百炼API密钥
DASHSCOPE_MODEL=qwen-plus
```

也可以设置 `DASHSCOPE_BASE_URL` 为百炼业务空间专属的完整 `chat/completions` 地址。API密钥只能保存在部署平台环境变量中，不能写入前端代码或提交到GitHub。

未配置密钥时，网站仍可正常完成诊断，并自动使用本地预设的一步提示和逐题步骤。

## 部署

- Sites：`npm run build`
- Netlify：连接本仓库后使用 `npm run build:netlify`

Netlify连接仓库后，需要在项目环境变量中加入 `DASHSCOPE_API_KEY`，才能启用真实千问对话。

## 数据与测评边界

网站不收集姓名、学校、性别等身份字段。掌握度只反映本次40分钟样本下的七、八年级已学内容表现，不直接换算为未来中考分数。
