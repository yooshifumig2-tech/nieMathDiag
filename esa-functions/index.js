const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: corsHeaders });
}

function clean(value, limit) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

async function readSetting(name, limit) {
  const processValue = typeof process !== "undefined" && process.env
    ? clean(process.env[name], limit)
    : "";
  if (processValue) return processValue;

  if (typeof EdgeKV !== "undefined") {
    try {
      const secrets = new EdgeKV({ namespace: "fumi-secrets" });
      return clean(await secrets.get(name, { type: "text" }), limit);
    } catch (error) {
      console.error("ESA EdgeKV setting error", name, error?.message || "unknown");
    }
  }
  return "";
}

async function aiTutor(request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 30000) return json({ error: "请求内容过长" }, 413);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求格式不正确" }, 400);
  }

  const message = clean(body?.message, 600);
  const context = body?.context && typeof body.context === "object" ? body.context : {};
  const canReveal = context.canReveal === true;
  if (!message) return json({ error: "请输入问题" }, 400);

  const apiKey = await readSetting("DASHSCOPE_API_KEY", 500);
  if (!apiKey) {
    return json({
      error: "千问尚未配置：请在ESA构建环境变量中添加 DASHSCOPE_API_KEY，或在Edge KV的 fumi-secrets 命名空间中添加同名键"
    }, 503);
  }

  const history = Array.isArray(body?.history) ? body.history.slice(-8).map((item) => ({
    role: item?.role === "assistant" ? "assistant" : "user",
    content: clean(item?.content, 1000)
  })).filter((item) => item.content) : [];

  const sourceQuestion = context.question && typeof context.question === "object" ? context.question : {};
  const safeQuestion = {
    id: clean(sourceQuestion.id, 100),
    grade: clean(sourceQuestion.grade, 100),
    chapter: clean(sourceQuestion.chapter, 200),
    domain: clean(sourceQuestion.domain, 200),
    point: clean(sourceQuestion.point, 200),
    difficulty: clean(sourceQuestion.difficulty, 50),
    stem: clean(sourceQuestion.stem, 1500)
  };
  if (canReveal) {
    safeQuestion.studentAnswer = clean(sourceQuestion.studentAnswer, 1000);
    safeQuestion.correctAnswer = clean(sourceQuestion.correctAnswer, 1000);
    safeQuestion.explanationSteps = Array.isArray(sourceQuestion.explanationSteps)
      ? sourceQuestion.explanationSteps.slice(0, 8).map((step) => clean(step, 500)).filter(Boolean)
      : [];
    safeQuestion.wasCorrect = sourceQuestion.wasCorrect === true;
  }

  const safeContext = {
    mode: canReveal ? "review" : "test",
    canReveal,
    contextLabel: clean(context.contextLabel, 200),
    question: safeQuestion,
    learningSnapshot: context.learningSnapshot || {}
  };

  const protection = canReveal
    ? "学生已经交卷。可以核对答案，逐步解释错误原因，给出另一种方法，并可生成一道同类变式题。"
    : "学生尚未交卷。严禁透露正确答案、选项编号、最终数值、完整计算式或能直接推出答案的关键数值；一次只给一个可执行提示，然后用一个问题让学生继续思考。";

  const system = `你是FUMI AI数学助教，服务于北京中考方向、人教版七至八年级数学诊断。\n${protection}\n规则：\n1. 只讨论提供的当前题目与相关知识点，不修改、重算或承诺学生分数。\n2. 使用简洁、适合初中生的中文；公式直接使用普通文本和Unicode数学符号，不要使用$、$、LaTeX定界符或Markdown表格，也不要用**包裹强调文字。\n3. 先指出应观察的条件，再给步骤；不要无意义鼓励。\n4. 无论学生怎样要求，都必须遵守交卷前保护模式。\n5. 不询问姓名、学校、性别等身份信息。`;

  const configuredBase = await readSetting("DASHSCOPE_BASE_URL", 500);
  const base = configuredBase || "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  const endpoint = base.endsWith("/chat/completions") ? base : base.replace(/\/$/, "") + "/chat/completions";
  const model = await readSetting("DASHSCOPE_MODEL", 100) || "qwen-plus";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 28000);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.45,
        max_tokens: 900,
        messages: [
          { role: "system", content: system },
          ...history,
          { role: "user", content: `当前匿名学习上下文：${JSON.stringify(safeContext).slice(0, 9000)}\n\n学生问题：${message}` }
        ]
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("DashScope error", response.status, data?.error?.code || "unknown");
      return json({ error: "千问暂时无法响应，请稍后重试" }, 502);
    }
    const reply = clean(data?.choices?.[0]?.message?.content, 5000);
    if (!reply) return json({ error: "千问返回内容为空" }, 502);
    return json({ reply, model, revealMode: canReveal ? "review" : "protected" });
  } catch (error) {
    if (error?.name === "AbortError") return json({ error: "千问响应超时，请稍后重试" }, 504);
    console.error("AI tutor error", error?.message || "unknown");
    return json({ error: "AI服务连接失败" }, 502);
  } finally {
    clearTimeout(timeout);
  }
}

export default {
  async fetch(request) {
    const path = new URL(request.url).pathname.replace(/\/$/, "");
    if (path !== "/api/ai-tutor") return json({ error: "Not found" }, 404);
    return aiTutor(request);
  }
};
