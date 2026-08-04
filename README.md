# FUMI数学能力地图

面向北京中考要求、人教版七至八年级已学内容的匿名数学诊断网站。

## 已实现

- 40分钟、26道诊断题，覆盖20个教材章节
- 章节掌握度、八领域雷达图、统计区间与复习优先级
- 图形题SVG作图，讲解步骤可点击并逐层呈现
- 学生思维导图：自主编辑中心主题和分支，也可从诊断报告生成薄弱章节地图
- ORID学习反思：按客观事实、感受反应、意义解释、决定行动四层完成复盘
- 思维导图和ORID内容自动保存在浏览器，并可分别导出PDF
- FUMI AI悬浮侧栏，模型为阿里云百炼千问
- 交卷前AI只给一步提示，交卷后才允许完整讲解
- 作答、计分、报告、学习作品和聊天记录默认只保存在学生浏览器
- 不收集姓名、学校、性别

## 阿里云ESA部署（推荐）

仓库已同时包含静态网站和ESA边缘函数：

- 静态资源：`public`
- 函数入口：`esa-functions/index.js`
- AI接口：`/api/ai-tutor`
- ESA配置：`esa.jsonc`
- 生产分支：`main`

### 1. 导入仓库

1. 登录阿里云控制台。
2. 进入 **边缘安全加速 ESA → 边缘计算和 AI → 函数和Pages**。
3. 选择 **创建 → 导入 GitHub 仓库**。
4. 授权并选择 `yooshifumig2-tech/nieMathDiag`。
5. 生产分支选择 `main`。
6. 仓库中的 `esa.jsonc` 会自动指定 `public` 和 `esa-functions/index.js`，安装命令、构建命令均留空。
7. 开始部署。

阿里云官方导入说明：
https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/connect-pages-to-github

### 2. 配置千问密钥

函数支持两种读取方式，优先读取构建环境变量，其次读取 Edge KV。

#### 方式A：构建环境变量

在Pages项目的构建配置中添加：

```text
DASHSCOPE_API_KEY=你的阿里云百炼API密钥
DASHSCOPE_MODEL=qwen-plus
```

`DASHSCOPE_MODEL` 可省略，默认是 `qwen-plus`。修改后需要重新部署。

#### 方式B：Edge KV（ESA运行时备用方案）

1. 进入 **ESA → 边缘计算和 AI → KV存储**。
2. 创建存储空间，名称必须为 `fumi-secrets`。
3. 添加KV数据：
   - Key：`DASHSCOPE_API_KEY`
   - Value：你的阿里云百炼API密钥
4. 可选添加：
   - `DASHSCOPE_MODEL` → `qwen-plus`
   - `DASHSCOPE_BASE_URL` → 百炼兼容模式接口地址
5. 等待KV同步后重新测试AI。

Edge KV官方说明：
https://help.aliyun.com/zh/edge-security-acceleration/esa/user-guide/get-started-with-edge-kv

API密钥不能写入 `public/index.html`、`esa.jsonc`、GitHub提交或聊天消息。

### 3. 长期公开访问

ESA生成的公共预览域名仅供测试，鉴权Token有效期有限。正式给学生使用时需要绑定自定义域名；若选择中国内地或全球含中国内地节点，域名需要完成ICP备案。

## Netlify兼容

原Netlify函数与配置继续保留。网页统一请求 `/api/ai-tutor`，`netlify.toml` 会把该地址重写到原Netlify Function，因此仓库仍可部署到Netlify，但不再是推荐方案。

## PDF导出

在“思维导图”或“ORID反思”页面点击“导出PDF”，浏览器会打开专用打印版；在打印面板中选择“保存为PDF”即可。思维导图使用A4横向版式，ORID使用A4纵向版式。

## 本地HTML

直接下载 `public/index.html` 也可以完成测验、制作思维导图和填写ORID。本地文件使用AI时，需要在FUMI AI面板中填写已经部署的函数地址：

```text
https://你的域名/api/ai-tutor
```

除主动向AI提问时发送当前匿名题目上下文外，作答数据和学习作品不会上传。

## 测评边界

掌握度只反映本次40分钟样本下的七、八年级已学内容表现，不直接换算成未来中考分数。网站不伪造北京近三年逐题正确率。
