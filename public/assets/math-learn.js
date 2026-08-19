(function () {
  const app = document.getElementById("app");
  const D = MathCourseData.lessons;
  const S = MathCore.state;
  const chapters = [
    { key: "13", name: "第13章 三角形", short: "第13章" },
    { key: "14", name: "第14章 全等三角形", short: "第14章" },
    { key: "15", name: "第15章 轴对称", short: "第15章" },
    { key: "16", name: "第16章 整式的乘法", short: "第16章" }
  ];
  const hashKey = () => (location.hash.replace("#", "").match(/13|14|15|16/) || ["13"])[0];
  let chapter = (chapters.find((item) => item.key === hashKey()) || chapters[0]).name;
  let current = (D.find((item) => item.chapter === chapter) || D[0]).id;
  const steps = {};

  function requiredQuestions(lesson) {
    return [lesson.inquiry, ...(lesson.checks || [])].filter(Boolean);
  }

  function isAnswered(lessonState, questionItem) {
    return lessonState?.answers?.[questionItem.id] !== undefined;
  }

  function isLessonComplete(lesson) {
    const lessonState = S.lesson[lesson.id];
    return Boolean(lessonState?.done && requiredQuestions(lesson).every((item) => isAnswered(lessonState, item)));
  }

  function lessons() {
    return D.filter((item) => item.chapter === chapter);
  }

  function progress() {
    const rows = lessons();
    return rows.length ? Math.round(rows.filter(isLessonComplete).length / rows.length * 100) : 0;
  }

  function question(q, inquiry = false) {
    const lessonState = S.lesson[current] || (S.lesson[current] = { answers: {} });
    lessonState.answers = lessonState.answers || {};
    const answer = lessonState.answers[q.id];
    const submitted = answer !== undefined;
    const ok = answer === q.answer;
    return `<section class="card question" id="learn-q-${q.id}"><span class="kicker">${inquiry ? "苏格拉底追问 · 先判断易错概念" : q.difficulty + "即时检测"}</span><h3>${q.prompt}</h3><div class="choices" role="group" aria-label="${inquiry ? "苏格拉底追问选项" : "即时检测选项"}">${q.options.map((option, index) => `<button class="choice ${submitted ? (index === q.answer ? "correct" : index === answer ? "wrong" : "") : ""}" data-answer="${q.id}" data-index="${index}" aria-pressed="${answer === index}" ${submitted ? "disabled" : ""}><b>${"ABCD"[index]}.</b><span>${option}</span></button>`).join("")}</div>${submitted ? `<div class="feedback ${ok ? "" : "bad"}" role="status"><b>${ok ? "判断正确" : "这正是容易混淆的地方"}</b><br>${q.explain}</div><div class="analysis"><button class="button" data-ask-ai="${q.id}" data-reveal="true" data-student="${MathCore.escape(q.options[answer])}">让 FUMI AI 继续追问</button></div>` : `<p class="feedback">先选出最有依据的一项。选错后系统会指出混淆点，再进入定义或定理。</p><button class="button" data-ask-ai="${q.id}">我需要一个提示</button>`}</section>`;
  }

  function render() {
    const lesson = D.find((item) => item.id === current);
    if (!lesson) return;
    const lessonState = S.lesson[lesson.id] || (S.lesson[lesson.id] = { answers: {} });
    lessonState.answers = lessonState.answers || {};
    const required = requiredQuestions(lesson);
    const answeredCount = required.filter((item) => isAnswered(lessonState, item)).length;
    const allAnswered = answeredCount === required.length;
    const completed = Boolean(lessonState.done && allAnswered);
    const inquiryAnswered = isAnswered(lessonState, lesson.inquiry);
    const checksAnswered = lesson.checks.filter((item) => isAnswered(lessonState, item)).length;
    const step = steps[lesson.id] || 1;
    const currentConfig = chapters.find((item) => item.name === chapter) || chapters[0];
    const instantCount = D.reduce((sum, item) => sum + item.checks.length, 0);
    app.innerHTML = `<section class="hero"><div><span class="kicker" style="color:#d9d3ff">人教版八年级上册 · 教学设计驱动</span><h1>第13—16章<br>数学学习工坊</h1><p>按“观察—追问—形成概念—即时检测—逐步图解”推进。学习证据会同步到思维导图，且不记录姓名、学校或性别。</p></div><div class="hero-stats"><span><b>${D.length}</b>个教学课时</span><span><b>${instantCount}</b>道即时题</span><span><b>${progress()}%</b>${currentConfig.short}进度</span><span><b>本地</b>自动保存</span></div></section>
      <div class="chapter-tabs">${chapters.map((item) => `<button data-chapter="${item.name}" data-key="${item.key}" class="${chapter === item.name ? "active" : ""}">${item.name}</button>`).join("")}</div>
      <div class="layout"><aside class="side">${lessons().map((item, index) => `<button data-lesson="${item.id}" class="${item.id === current ? "active" : ""} ${isLessonComplete(item) ? "done" : ""}"><small>课时 ${index + 1} · ${item.section}</small><b>${item.title}</b></button>`).join("")}</aside><article class="lesson">
      <section class="card lesson-head"><div><span class="kicker">${lesson.chapter} · ${lesson.section}</span><h2>${lesson.title}</h2><ul class="objectives">${lesson.objectives.map((item) => `<li>${item}</li>`).join("")}</ul></div><div><b>建议 ${lesson.minutes} 分钟</b><div class="progressbar"><i style="width:${progress()}%"></i></div></div></section>
      ${question(lesson.inquiry, true)}
      <section class="card"><span class="kicker">动态推演</span><h3>点击步骤，让关系或算理逐层出现</h3><div class="diagram">${MathDiagrams.render(lesson.inquiry.diagram, step, lesson.inquiry.id)}</div><div class="step-row">${[1, 2, 3, 4].map((number) => `<button data-step="${number}" class="${step === number ? "active" : ""}">步骤 ${number}</button>`).join("")}</div></section>
      <section class="card"><span class="kicker">形成概念</span><div class="concept-grid">${lesson.cards.map((card) => `<div class="concept"><b>${card[0]}</b><span>${card[1]}</span></div>`).join("")}</div></section>
      ${lesson.checks.map((item) => question(item)).join("")}
      <section class="card"><div class="lesson-head"><div><span class="kicker">课时小结</span><h3>${completed ? "本课时已完成" : allAnswered ? "学习证据已齐全，可以完成课时" : `还需完成 ${required.length - answeredCount} 道学习任务`}</h3><p>完成要求：苏格拉底追问 ${inquiryAnswered ? 1 : 0}/1 · 即时检测 ${checksAnswered}/${lesson.checks.length}；即时检测答对 ${lesson.checks.filter((item) => lessonState.answers?.[item.id] === item.answer).length}/${lesson.checks.length}。全部作答后才可完成，结果会自动同步到思维导图。</p></div><button class="button primary" data-done aria-disabled="${!allAnswered || completed}" ${allAnswered && !completed ? "" : "disabled"}>${completed ? "已完成 ✓" : "完成本课时"}</button></div><div class="footer-actions"><a class="button" href="math-practice.html#${currentConfig.key}">去做本章练习 →</a></div></section>
      </article></div>`;
  }

  document.addEventListener("click", (event) => {
    const chapterButton = event.target.closest("[data-chapter]");
    if (chapterButton) {
      chapter = chapterButton.dataset.chapter;
      current = (lessons()[0] || D[0]).id;
      location.hash = chapterButton.dataset.key;
      render();
      return;
    }
    const lessonButton = event.target.closest("[data-lesson]");
    if (lessonButton) {
      current = lessonButton.dataset.lesson;
      render();
      document.querySelector(".lesson > .lesson-head")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const stepButton = event.target.closest("[data-step]");
    if (stepButton) {
      steps[current] = +stepButton.dataset.step;
      render();
      return;
    }
    const answerButton = event.target.closest("[data-answer]");
    if (answerButton) {
      const questionId = answerButton.dataset.answer;
      const lessonState = S.lesson[current] || (S.lesson[current] = { answers: {} });
      lessonState.answers = lessonState.answers || {};
      lessonState.answers[questionId] = +answerButton.dataset.index;
      MathCore.save();
      render();
      document.getElementById(`learn-q-${questionId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (event.target.closest("[data-done]")) {
      const lesson = D.find((item) => item.id === current);
      const lessonState = S.lesson[current] || (S.lesson[current] = { answers: {} });
      lessonState.answers = lessonState.answers || {};
      const firstPending = requiredQuestions(lesson).find((item) => !isAnswered(lessonState, item));
      if (firstPending) {
        render();
        document.getElementById(`learn-q-${firstPending.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      lessonState.done = true;
      lessonState.completedAt = Date.now();
      MathCore.save();
      render();
    }
  });

  window.addEventListener("hashchange", () => {
    const next = chapters.find((item) => item.key === hashKey());
    if (next && next.name !== chapter) {
      chapter = next.name;
      current = (lessons()[0] || D[0]).id;
      render();
    }
  });

  render();
})();
