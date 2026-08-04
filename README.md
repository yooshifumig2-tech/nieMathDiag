# FUMI数学能力地图

面向北京中考要求、人教版七至八年级已学内容的匿名数学诊断网站。

## 已实现

- 40分钟、26道诊断题，覆盖20个教材章节
- 章节掌握度、八领域雷达图、统计区间与复习优先级
- 图形题SVG作图，讲解步骤可点击并逐层呈现
- FUMI AI悬浮侧栏，模型为阿里云百炼千问
- 交卷前AI只给一步提示，交卷后才允许完整讲解
- 作答、计分、报告和聊天记录默认只保存在学生浏览器
- 可下载匿名HTML报告或打印为PDF
- 不收集姓名、学校、性别

## Netlify部署

在Netlify中导入本仓库。仓库内的 `netlify.toml` 已设置：

- Publish directory：`public`
- Functions directory：`netlify/functions`
- 不需要填写额外Build command

部署后，在 Netlify 项目的 Environment variables 中添加：

```text
DASHSCOPE_API_KEY=你的阿里云百炼API密钥
DASHSCOPE_MODEL=qwen-plus
```

`DASHSCOPE_MODEL` 可省略，默认即为 `qwen-plus`。如使用百炼专属业务空间地址，可额外设置 `DASHSCOPE_BASE_URL`。

API密钥只能存放在Netlify环境变量中，不能写进 `public/index.html`、提交到GitHub或发送到聊天。

## 本地HTML

直接下载 `public/index.html` 也可以完成测验。由于本地文件不能自动找到Netlify函数，需要在FUMI AI面板中填写已部署的函数地址：

```text
https://你的站点.netlify.app/.netlify/functions/ai-tutor
```

除主动向AI提问时发送当前匿名题目上下文外，作答数据不会上传。

## 测评边界

掌握度只反映本次40分钟样本下的七、八年级已学内容表现，不直接换算成未来中考分数。网站不伪造北京近三年逐题正确率。
