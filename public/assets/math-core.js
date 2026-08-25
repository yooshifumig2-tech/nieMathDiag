(function () {
  const printStyle = document.createElement("link");
  printStyle.rel = "stylesheet";
  printStyle.href = "assets/math-print.css";
  printStyle.media = "print";
  document.head.append(printStyle);
  const diagramStyle = document.createElement("link");
  diagramStyle.rel = "stylesheet";
  diagramStyle.href = "assets/math-diagram-contrast.css";
  document.head.append(diagramStyle);
  const KEY = "fumi-math-course:v1";
  const MAP_KEY = "fumi-math-map:learning-tools:v1";
  const REVIEW_CHAPTER = "第13·14章 复习练习";
  const REVIEW_CHAPTER_15_16 = "第15·16章 复习练习";
  const COLORS = {
    purple: "#6d5ce7",
    pink: "#ef6b8f",
    teal: "#23a6a1",
    blue: "#4f83e3",
    violet: "#8a67d5"
  };
  const chapters = [
    { number: 13, name: "第13章 三角形", domain: "三角形与全等", rootId: "domain-3", color: COLORS.purple },
    { number: 14, name: "第14章 全等三角形", domain: "三角形与全等", rootId: "domain-3", color: COLORS.blue },
    { number: 15, name: "第15章 轴对称", domain: "对称与特殊图形", rootId: "domain-4", color: COLORS.teal },
    { number: 16, name: "第16章 整式的乘法", domain: "代数变形", rootId: "domain-5", color: COLORS.violet },
    { number: 17, name: "第17章 因式分解", domain: "代数变形", rootId: "domain-5", color: COLORS.pink },
    { number: 18, name: "第18章 分式", domain: "数与式", rootId: "domain-0", color: COLORS.blue }
  ];
  const defaults = { lesson: {}, practice: { answers: {}, submitted: {}, step: {} }, updatedAt: null };

  function fresh() {
    return JSON.parse(JSON.stringify(defaults));
  }

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        lesson: saved.lesson && typeof saved.lesson === "object" ? saved.lesson : {},
        practice: {
          answers: saved.practice?.answers && typeof saved.practice.answers === "object" ? saved.practice.answers : {},
          submitted: saved.practice?.submitted && typeof saved.practice.submitted === "object" ? saved.practice.submitted : {},
          step: saved.practice?.step && typeof saved.practice.step === "object" ? saved.practice.step : {}
        },
        updatedAt: saved.updatedAt || null
      };
    } catch {
      return fresh();
    }
  }

  let state = load();

  function save() {
    state.updatedAt = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    syncMap();
  }

  function practiceStats(predicate) {
    const questions = MathCourseData.practice.filter((item) => item.required && predicate(item));
    const done = questions.filter((item) => state.practice.submitted[item.id]);
    const right = done.filter((item) => state.practice.answers[item.id] === item.answer);
    return { all: questions.length, done: done.length, right: right.length, pct: done.length ? Math.round(right.length / done.length * 100) : 0 };
  }

  function challengeStats(predicate) {
    const questions = MathCourseData.practice.filter((item) => !item.required && predicate(item));
    const done = questions.filter((item) => state.practice.submitted[item.id]);
    const right = done.filter((item) => state.practice.answers[item.id] === item.answer);
    return { all: questions.length, done: done.length, right: right.length };
  }

  function pct(section) {
    return practiceStats((item) => !section || item.chapter === section).pct;
  }

  function seedMap() {
    const domains = ["数与式", "方程与不等式", "几何基础与坐标", "三角形与全等", "对称与特殊图形", "代数变形", "勾股·四边形·函数", "统计与数据"];
    const colors = ["#6d5ce7", "#ef6b8f", "#23a6a1", "#f2a43a", "#4f83e3", "#8a67d5", "#e36e5b"];
    return {
      mindmap: {
        center: "我的北京中考数学能力地图",
        branches: domains.map((title, index) => ({ id: `domain-${index}`, title, note: "从章节学习与作答证据持续更新。", color: colors[index % colors.length], children: [], autoSync: true }))
      },
      orid: { o: "", r: "", i: "", d: "", updatedAt: null },
      socratic: {}
    };
  }

  function ensureNode(children, id, defaultsForNode) {
    let node = children.find((item) => item.id === id);
    if (!node) {
      node = { id, title: defaultsForNode.title, note: defaultsForNode.note || "", color: defaultsForNode.color, children: [], autoSync: true };
      children.push(node);
    }
    node.children = Array.isArray(node.children) ? node.children : [];
    if (node.autoSync !== false) {
      node.title = defaultsForNode.title;
      node.note = defaultsForNode.note || "";
      node.color = defaultsForNode.color || node.color;
    }
    return node;
  }

  function stableSlug(value) {
    const text = String(value || "").trim().toLowerCase();
    const slug = text.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 20) || "point";
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `${slug}-${(hash >>> 0).toString(36)}`;
  }

  function migrateStableNodeId(children, stableId, legacyId, title) {
    if (children.some((item) => item.id === stableId)) return;
    const sourceNumber = stableId.match(/^math-review-(\d+)-point-/)?.[1];
    const legacyPattern = sourceNumber ? new RegExp(`^math-review-${sourceNumber}-point-\\d+$`) : /^$/;
    const legacy = children.find((item) => item.id === legacyId)
      || children.find((item) => legacyPattern.test(item.id) && item.title === title);
    if (legacy) legacy.id = stableId;
  }

  function syncChallengeNode(parentNode, id, title, predicate, color) {
    const stats = challengeStats(predicate);
    if (!stats.all) return null;
    return ensureNode(parentNode.children, id, {
      title,
      note: `完成 ${stats.done}/${stats.all} · 正确 ${stats.right}/${stats.done}`,
      color
    });
  }

  function isLessonEvidenceComplete(lesson, lessonState = state.lesson[lesson.id]) {
    if (!lessonState?.done) return false;
    const answers = lessonState.answers || {};
    return [lesson.inquiry, ...(lesson.checks || [])]
      .filter(Boolean)
      .every((item) => answers[item.id] !== undefined);
  }

  function syncLessonNode(chapterNode, lesson, color) {
    const lessonState = state.lesson[lesson.id] || {};
    const answers = lessonState.answers || {};
    const asked = answers[lesson.inquiry.id] !== undefined;
    const inquiryRight = answers[lesson.inquiry.id] === lesson.inquiry.answer;
    const checksDone = lesson.checks.filter((item) => answers[item.id] !== undefined).length;
    const checksRight = lesson.checks.filter((item) => answers[item.id] === item.answer).length;
    const completed = isLessonEvidenceComplete(lesson, lessonState);
    const lessonNode = ensureNode(chapterNode.children, `course-${lesson.id}`, {
      title: `${lesson.section} ${lesson.title.replace(/^.*：/, "")}`,
      note: completed ? `已学 · 即时题 ${checksRight}/${lesson.checks.length}` : `学习中 · 已答 ${checksDone}/${lesson.checks.length}`,
      color
    });
    ensureNode(lessonNode.children, `course-socratic-${lesson.id}`, {
      title: "易错概念追问",
      note: !asked ? "尚未作答" : inquiryRight ? "概念判断正确" : `需要回看：${lesson.inquiry.explain}`,
      color
    });
    ensureNode(lessonNode.children, `course-evidence-${lesson.id}`, {
      title: "即时检测",
      note: `${checksRight}/${checksDone} 正确 · 共 ${lesson.checks.length} 题`,
      color
    });
  }

  function syncMap() {
    try {
      const mapData = JSON.parse(localStorage.getItem(MAP_KEY) || "null") || seedMap();
      if (!mapData?.mindmap?.branches) return;
      chapters.forEach((chapter) => {
        const root = mapData.mindmap.branches.find((item) => item.id === chapter.rootId) || mapData.mindmap.branches.find((item) => item.title === chapter.domain);
        if (!root) return;
        root.children = Array.isArray(root.children) ? root.children : [];
        const chapterLessons = MathCourseData.lessons.filter((item) => item.chapter === chapter.name);
        const completed = chapterLessons.filter((lesson) => isLessonEvidenceComplete(lesson)).length;
        const chapterNode = ensureNode(root.children, `math-course-${chapter.number}`, {
          title: `${chapter.name} · ${completed}/${chapterLessons.length}课时`,
          note: `学习完成 ${chapterLessons.length ? Math.round(completed / chapterLessons.length * 100) : 0}% · 必做练习掌握 ${pct(chapter.name)}%`,
          color: chapter.color
        });
        chapterLessons.forEach((lesson) => syncLessonNode(chapterNode, lesson, chapter.color));
        syncChallengeNode(
          chapterNode,
          `math-challenge-${chapter.number}`,
          "培优挑战（不计入必做掌握率）",
          (item) => item.chapter === chapter.name,
          chapter.color
        );
        const lessonOrder = new Map(chapterLessons.map((lesson, index) => [`course-${lesson.id}`, index]));
        lessonOrder.set(`math-challenge-${chapter.number}`, chapterLessons.length);
        chapterNode.children.sort((a, b) => (lessonOrder.get(a.id) ?? 100) - (lessonOrder.get(b.id) ?? 100));
      });

      const reviewQuestions = MathCourseData.practice.filter((item) => item.chapter === REVIEW_CHAPTER && item.required);
      if (reviewQuestions.length) {
        const root = mapData.mindmap.branches.find((item) => item.id === "domain-3") || mapData.mindmap.branches.find((item) => item.title === "三角形与全等");
        if (root) {
          root.children = Array.isArray(root.children) ? root.children : [];
          const reviewStats = practiceStats((item) => item.chapter === REVIEW_CHAPTER);
          const reviewNode = ensureNode(root.children, "math-review-13-14", {
            title: "第13·14章复习练习",
            note: `必做 ${reviewStats.done}/${reviewStats.all} · 掌握 ${reviewStats.pct}%`,
            color: COLORS.pink
          });
          ["第13章 三角形", "第14章 全等三角形"].forEach((source) => {
            const sourceNumber = source.startsWith("第13") ? "13" : "14";
            const sourceQuestions = reviewQuestions.filter((item) => item.sourceChapter === source);
            const done = sourceQuestions.filter((item) => state.practice.submitted[item.id]);
            const right = done.filter((item) => state.practice.answers[item.id] === item.answer);
            const sourceNode = ensureNode(reviewNode.children, `math-review-${sourceNumber}`, {
              title: source,
              note: `必做 ${done.length}/${sourceQuestions.length} · 正确 ${right.length}/${done.length} · 掌握 ${done.length ? Math.round(right.length / done.length * 100) : 0}%`,
              color: sourceNumber === "13" ? COLORS.purple : COLORS.blue
            });
            const points = [...new Set(sourceQuestions.map((item) => item.point))];
            points.forEach((point, index) => {
              const rows = sourceQuestions.filter((item) => item.point === point);
              const answered = rows.filter((item) => state.practice.submitted[item.id]);
              const correct = answered.filter((item) => state.practice.answers[item.id] === item.answer);
              const pointId = `math-review-${sourceNumber}-point-${stableSlug(point)}`;
              migrateStableNodeId(sourceNode.children, pointId, `math-review-${sourceNumber}-point-${index}`, point);
              ensureNode(sourceNode.children, pointId, {
                title: point,
                note: answered.length ? `${correct.length}/${answered.length} 正确` : "待复习",
                color: sourceNode.color
              });
            });
          });
          syncChallengeNode(
            reviewNode,
            "math-review-13-14-challenge",
            "培优挑战（不计入必做掌握率）",
            (item) => item.chapter === REVIEW_CHAPTER,
            COLORS.pink
          );
        }
      }

      const review1516Sources = [
        { source: "第15章 轴对称", number: "15", rootId: "domain-4", domain: "对称与特殊图形", color: COLORS.teal },
        { source: "第16章 整式的乘法", number: "16", rootId: "domain-5", domain: "代数变形", color: COLORS.violet }
      ];
      review1516Sources.forEach((sourceConfig) => {
        const sourceQuestions = MathCourseData.practice.filter((item) => (
          item.chapter === REVIEW_CHAPTER_15_16
          && item.sourceChapter === sourceConfig.source
          && item.required
        ));
        if (!sourceQuestions.length) return;
        const root = mapData.mindmap.branches.find((item) => item.id === sourceConfig.rootId)
          || mapData.mindmap.branches.find((item) => item.title === sourceConfig.domain);
        if (!root) return;
        root.children = Array.isArray(root.children) ? root.children : [];
        const sourceStats = practiceStats((item) => (
          item.chapter === REVIEW_CHAPTER_15_16
          && item.sourceChapter === sourceConfig.source
        ));
        const sourceNode = ensureNode(root.children, `math-review-${sourceConfig.number}`, {
          title: `第${sourceConfig.number}章复习练习`,
          note: `必做 ${sourceStats.done}/${sourceStats.all} · 掌握 ${sourceStats.pct}%`,
          color: sourceConfig.color
        });
        const points = [...new Set(sourceQuestions.map((item) => item.point))];
        points.forEach((point, index) => {
          const rows = sourceQuestions.filter((item) => item.point === point);
          const answered = rows.filter((item) => state.practice.submitted[item.id]);
          const correct = answered.filter((item) => state.practice.answers[item.id] === item.answer);
          const pointId = `math-review-${sourceConfig.number}-point-${stableSlug(point)}`;
          migrateStableNodeId(sourceNode.children, pointId, `math-review-${sourceConfig.number}-point-${index}`, point);
          ensureNode(sourceNode.children, pointId, {
            title: point,
            note: answered.length ? `${correct.length}/${answered.length} 正确` : "待复习",
            color: sourceConfig.color
          });
        });
        syncChallengeNode(
          sourceNode,
          `math-review-${sourceConfig.number}-challenge`,
          "培优挑战（不计入必做掌握率）",
          (item) => item.chapter === REVIEW_CHAPTER_15_16 && item.sourceChapter === sourceConfig.source,
          sourceConfig.color
        );
        const pointOrder = new Map(points.map((point, index) => [`math-review-${sourceConfig.number}-point-${stableSlug(point)}`, index]));
        pointOrder.set(`math-review-${sourceConfig.number}-challenge`, points.length);
        sourceNode.children.sort((a, b) => (pointOrder.get(a.id) ?? 100) - (pointOrder.get(b.id) ?? 100));
      });

      const priority = {
        "math-course-18": 0,
        "math-course-13": 0,
        "math-course-14": 1,
        "math-review-13-14": 2,
        "math-course-15": 0,
        "math-review-15": 1,
        "math-course-16": 0,
        "math-review-16": 1,
        "math-course-17": 2
      };
      mapData.mindmap.branches.forEach((branch) => {
        if (Array.isArray(branch.children)) branch.children.sort((a, b) => (priority[a.id] ?? 20) - (priority[b.id] ?? 20));
      });
      localStorage.setItem(MAP_KEY, JSON.stringify(mapData));
    } catch {}
  }

  function escape(s) {
    return String(s ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[char]);
  }

  syncMap();
  window.MathCore = { state, save, pct, practiceStats, escape, syncMap };
})();
