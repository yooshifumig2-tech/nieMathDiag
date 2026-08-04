import { NextResponse } from "next/server";

type TutorRequest = {
  message?: string;
  submitted?: boolean;
  question?: {
    stem?: string;
    point?: string;
    chapter?: string;
    options?: string[];
    hint?: string;
    answer?: string | string[];
    steps?: string[];
  };
  history?: Array<{ role?: string; text?: string }>;
};

export async function POST(request: Request) {
  const apiKey = process.env.DASHSCOPE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "AI tutor is not configured" }, { status: 503 });
  }

  let body: TutorRequest;
  try {
    body = (await request.json()) as TutorRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const message = body.message?.trim().slice(0, 800);
  if (!message || !body.question?.stem) {
    return NextResponse.json({ error: "Missing message or question" }, { status: 400 });
  }

  const submitted = Boolean(body.submitted);
  const system = submitted
    ? `你是FUMI AI，一位严谨、耐心的北京初中数学导师。学生已经交卷。请围绕当前题目解释概念、错因和步骤，可以给出正确答案。每次控制在220个汉字内，先指出关键关系，再逐步解释；不要夸张评价学生。若学生要求变式题，只给一道并在学生作答前隐藏答案。`
    : `你是FUMI AI，一位严谨、耐心的北京初中数学导师。学生正在40分钟诊断且尚未交卷。你只能提供一个方向或一步提示，绝不能透露正确选项、关键数值结果、完整解法或答案。不要代算；用一个短问题引导学生继续思考。每次控制在100个汉字内。`;

  const context = {
    chapter: body.question.chapter,
    point: body.question.point,
    stem: body.question.stem,
    options: body.question.options,
    hint: body.question.hint,
    ...(submitted ? { answer: body.question.answer, explanationSteps: body.question.steps } : {}),
  };
  const history = (body.history ?? [])
    .slice(-6)
    .filter((item) => item.text)
    .map((item) => ({ role: item.role === "assistant" ? "assistant" : "user", content: String(item.text).slice(0, 600) }));

  const endpoint = process.env.DASHSCOPE_BASE_URL ?? "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.DASHSCOPE_MODEL ?? "qwen-plus",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `当前题目上下文：${JSON.stringify(context)}` },
          ...history,
          { role: "user", content: message },
        ],
        temperature: submitted ? 0.35 : 0.2,
        max_tokens: 450,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Model request failed" }, { status: 502 });
    }
    const result = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const reply = result.choices?.[0]?.message?.content?.trim();
    if (!reply) return NextResponse.json({ error: "Empty model response" }, { status: 502 });
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: "Model request timed out" }, { status: 504 });
  }
}

