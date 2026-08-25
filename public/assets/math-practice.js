(function () {
  const app = document.getElementById("app");
  const P = MathCourseData.practice;
  const S = MathCore.state.practice;
  const REVIEW_1314 = "第13·14章 复习练习";
  const REVIEW_1516 = "第15·16章 复习练习";
  const REVIEW_FILTERS = new Set([REVIEW_1314, REVIEW_1516]);
  const filters = [
    { key: "13", name: "第13章 三角形", label: "第13章" },
    { key: "14", name: "第14章 全等三角形", label: "第14章" },
    { key: "15", name: "第15章 轴对称", label: "第15章" },
    { key: "16", name: "第16章 整式的乘法", label: "第16章" },
    { key: "17", name: "第17章 因式分解", label: "第17章" },
    { key: "18", name: "第18章 分式", label: "第18章" },
    { key: "review", name: REVIEW_1314, label: "13·14复习" },
    { key: "review15-16", name: REVIEW_1516, label: "15·16复习" }
  ];
  const PAGE_SIZE = 8;
  const givenSteps = {
    "p-l1321b": 2, "p-l1322a": 2, "p-l1331aa": 2, "p-l1331ab": 3, "p-l1331ba": 2,
    "p-l1332a": 2, "p-l1332b": 2, "p-l141a": 2, "p-l142aa": 2, "p-l142sssb": 2,
    "p-l142hb": 2, "p-l1432b": 3,
    "challenge-1": 3, "challenge-2": 2, "challenge-3": 2, "challenge-4": 2, "challenge-5": 2,
    "challenge-6": 2, "challenge-7": 2, "challenge-8": 2, "challenge-9": 3, "challenge-10": 2,
    "challenge-15-1": 2, "challenge-15-5": 3, "challenge-15-6": 2,
    "review-13-03": 2, "review-13-06": 3, "review-13-07": 3, "review-13-08": 3,
    "review-13-10": 3, "review-13-11": 3, "review-13-12": 4, "review-13-c1": 3, "review-13-c2": 3,
    "review-14-01": 2, "review-14-04": 3, "review-14-05": 2, "review-14-06": 3,
    "review-14-07": 3, "review-14-08": 3, "review-14-09": 3, "review-14-10": 3,
    "review-14-11": 3, "review-14-12": 3, "review-14-c1": 4, "review-14-c2": 3,
    "review-15-05": 3, "review-15-06": 2, "review-15-07": 2,
    "review-15-10": 2, "review-15-12": 2
  };
  const hashKey = () => {
    const raw = location.hash.replace("#", "");
    if (raw.includes("review15-16")) return "review15-16";
    if (raw.includes("review")) return "review";
    return (raw.match(/13|14|15|16|17|18/) || ["13"])[0];
  };
  let filter = (filters.find((item) => item.key === hashKey()) || filters[0]).name;
  let view = "questions";
  let page = 0;

  function analysisSteps(q) {
    const map = {
      "triangle-basic": ["核对图形是否由三条线段首尾顺次连接，并明确顶点、边和角的对应关系。", "按题目要求选择按边或按角分类，注意特殊三角形同时具有多种特征。"],
      inequality: ["把三条边按从小到大排列，只需先检查两条短边之和是否严格大于最长边。", "范围题写成｜a−b｜＜x＜a+b；端点取等号时三点共线，必须排除。"],
      cevians: ["看到中线就标对边两段相等；看到高就补垂直与90°；看到角平分线就标两角相等。", "核对线段是否从顶点出发，以及终点是否落在对边或对边所在直线上。"],
      "angle-sum": ["把三个内角之和写成180°；比例题先求总份数，含字母题先设最简角为x。", "解出后检查每个角均大于0°，并判断最大角属于锐角、直角还是钝角。"],
      "right-triangle": ["先定位90°角，再把另外两个锐角写成和为90°。", "若由两个角互余反推，则第三角为90°，据此完成直角三角形判定。"],
      "exterior-angle": ["找出外角的相邻内角；另外两个角才是不相邻内角。", "使用外角等于两个不相邻内角之和，或与相邻内角和为180°交叉核验。"],
      congruence: ["按全等式的字母位置建立顶点对应，不能只凭图形朝向判断。", "由顶点对应推出边、角、周长或面积关系，并保持全等式顺序一致。"],
      sas: ["圈出两组对应边，并确认已知角恰好夹在这两边之间。", "如果角是其中一边的对角，就形成SSA，不能直接判定全等。"],
      asa: ["标出两组对应角，再判断已知边是不是两角之间的夹边。", "夹边用ASA；非夹边用AAS，书写全等式时保持顶点一一对应。"],
      sss: ["列出三组对应边；公共边要明确写成“公共边”。", "三组边齐全后用SSS，再由全等三角形对应元素相等推出结论。"],
      construction: ["先用无刻度直尺作基准射线或基准边，再用圆规转移相等长度。", "保留圆弧痕迹，并用“同圆或等半径”说明所作线段相等。"],
      hl: ["先确认两个三角形均为直角三角形，并准确找出各自斜边。", "斜边与一条对应直角边相等时用HL；不要把任意两边条件当成HL。"],
      "bisector-property": ["从点向角的两边作垂线；只有垂线段长度才表示点到直线的距离。", "点在角平分线上时，可推出到两边的距离相等。"],
      "bisector-converse": ["先确认点在角的内部，两条线段分别垂直于角的两边。", "两距离相等时，可用HL证明直角三角形全等，再推出点在角平分线上。"],
      "axis-symmetry": ["连接每一组对应点，检查连线是否被对称轴垂直平分。", "对称轴上的点保持不动；仅有全等不能保证两个图形成轴对称。"],
      "perpendicular-bisector": ["区分定理方向：在线上推出到两端等距；到两端等距反推点在线上。", "若要确定整条垂直平分线，需要找到两个到线段两端等距的点。"],
      "perpendicular-construction": ["分别以线段两端为圆心，用同一且大于半线段的半径画弧。", "连接两组圆弧交点；两个交点都到端点等距，故所得直线是垂直平分线。"],
      "reflection-draw": ["先找顶点等关键点，再逐点作对称轴的垂线。", "在轴另一侧截取相等距离，最后按原图连接顺序还原图形。"],
      "coordinate-reflection": ["关于x轴：横坐标不变、纵坐标变号；关于y轴正好相反。", "连续变换要逐步写出中间坐标，避免一次性猜最终符号。"],
      "isosceles-property": ["先确认哪两边相等，再找它们所对的两个底角。", "只有底边中线、底边高和顶角平分线可以使用“三线合一”。"],
      "isosceles-converse": ["先找三角形内的两个相等角，再准确找出它们各自的对边。", "使用“等角对等边”，不要在判定前把待证边预先称为腰。"],
      equilateral: ["等边三角形三边相等、三角均为60°，有三条对称轴。", "用“有一个60°角的等腰三角形”判定时，等腰条件不能遗漏。"],
      "right-30": ["先确认是直角三角形，并定位30°角所对的直角边。", "所对直角边等于斜边的一半；不要误把30°角邻边当成一半。"],
      "power-product": ["只有底数完全相同才能直接使用同底数幂法则；整体底数也要保持一致。", "相乘时底数不变、指数相加；单独一个字母的指数是1。"],
      "power-rules": ["幂的乘方用指数相乘；积的乘方要让每一个因式分别乘方。", "先判断运算结构，再处理负号、系数和每个字母的指数。"],
      "monomial-product": ["分三条轨道处理：系数相乘、同底数幂指数相加、独有字母保留。", "最后按规范单项式顺序整理，并再次核对积的符号。"],
      "mono-poly": ["把每一项连同前面的符号看成整体，让单项式逐项相乘。", "展开后的乘积项数量要与原多项式项数对应，再合并同类项。"],
      "poly-poly": ["一个多项式的每一项都要乘另一个多项式的每一项，可用乘法表防止漏项。", "展开后按字母与指数识别同类项，合并并按降幂排列。"],
      "polynomial-division": ["系数相除、同底数幂指数相减，并检查除数不为0。", "多项式除以单项式时，每一项都必须分别除，最后可用乘法逆向验算。"],
      "difference-squares": ["先识别“一项相同、一项相反”的两个二项式结构。", "结果是相同项的平方减相反项的平方，整体作为一项时必须加括号。"],
      "perfect-square": ["按“首平方、尾平方、二倍积在中央”逐项核对。", "差平方只改变中间项符号，首尾两个平方项仍为正。"],
      "grouping-formula": ["先判断想匹配哪条公式，再选择要作为整体的部分。", "负号前添括号时括号内每一项都要变号，随后把整体代入公式。"],
      "formula-mixed": ["先观察能否使用乘法公式缩短运算，再处理剩余的展开或合并。", "每使用一次公式都写清整体对应的a、b，避免平方或负号遗漏。"],
      "factorization-direction": ["先看变形方向：左边应是一个多项式，右边应是几个整式的乘积。", "把右边展开；若能还原左边且各因式都是整式，才是正确的因式分解。"],
      "common-factor": ["分别求系数的最大公因数，并找出各项共有字母的最低次幂。", "逐项除以公因式写入括号，特别检查某项除尽后留下的1。"],
      "common-factor-advanced": ["把重复出现的多项式看成一个整体，并判断是否需要先提出负号。", "提出公因式后逐项相除；若提出负号，括号内每一项的符号都要改变。"],
      "factor-difference": ["核对结构是否为两项、异号，且两项都能写成完整平方。", "确定两个平方底数A、B，再使用A²−B²=(A+B)(A−B)，最后检查能否继续分解。"],
      "factor-perfect": ["先找首尾两个平方项的底数，再计算它们乘积的2倍。", "中间项与二倍积的绝对值、符号都匹配后，写成和或差的完全平方。"],
      "factor-strategy": ["按“一提、二套、三查”处理：先提公因式，再看平方差或完全平方。", "检查每个多项式因式还能否继续分解，并用展开乘积逆向验算。"],
      "factor-grouping": ["按能产生相同括号的方式分组，每组先各自提出公因式。", "两组出现相同整体后再次提取；最后展开检查是否漏项或错号。"],
      "factor-parameter": ["把已知因式与另一个待定因式相乘，或代入该因式对应的零点。", "比较同次项系数求参数，再把结果代回原式验证。"],
      "factor-application": ["先识别平方、平方差或非负式等结构，把条件转化为更直接的关系。", "用分解后的关系求值，并检查是否满足原条件与取值限制。"],
      "rational-definition": ["先看分母是否含字母；判断有意义时令原分母不等于0。", "判断分式值为0时要同时满足分子等于0、分母不等于0。"],
      "rational-property": ["只有分子、分母同时乘或除同一个非零整式，分式的值才不变。", "整理负号时把分子、分母视为整体，并保留原分母不为0的限制。"],
      "rational-reduction": ["先把分子、分母因式分解，再寻找整体公因式；不能跨越加减号约项。", "通分时取各因式的最高次幂组成最简公分母，并同步补乘分子。"],
      "rational-product": ["先写出原式限制条件，再把分子、分母中的多项式因式分解。", "交叉约去公因式后相乘并整理成最简分式，不能约去加数。"],
      "rational-division": ["把除以一个分式改成乘它的倒数，并补充除式有意义且不为0。", "因式分解、约分后再相乘；乘方时分子、分母必须分别乘方。"],
      "rational-addition": ["同分母时分母不变、分子相加减；减式的整个分子要加括号。", "异分母先找最简公分母并通分，合并分子后还要约分。"],
      "rational-mixed": ["先辨认括号和分数线的层级，按先乘方、再乘除、后加减计算。", "每次除法先乘倒数，最终化到最简并保留原式全部限制条件。"],
      "rational-model": ["先统一路程、时间或工作量单位，用题意写出对应的分式关系。", "列式后检查平均量是否使用“总量÷总时间”，不能直接平均两个速度。"],
      "negative-exponent": ["先确认底数整体和括号；负指数表示倒数，不表示结果必为负。", "用a⁻ⁿ=1/aⁿ（a≠0）化成正整数指数，并按指数法则复核。"],
      "scientific-notation-small": ["把小数点移到首个非零数字之后，使系数满足1≤|a|＜10。", "数小于1时指数为负，绝对值等于小数点向右移动的位数。"],
      "rational-equation": ["先写最简公分母及禁值，再把方程两边同乘最简公分母去分母。", "解出整式方程后必须代入原分母检验；使原分母为0的候选解是增根。"],
      "rational-word-problem": ["设未知量并用速度、效率或价格关系表示各部分，先写清单位。", "解分式方程后既要检验分母，也要判断结果是否符合实际意义。"],
      "rational-sign": ["找出分子为0和分母为0的临界点，在数轴上分区间判断符号。", "不等式允许分子为0时保留该点，但分母为0的点始终排除。"],
      "rational-integer": ["先用整式除法把分式化成“整数部分＋常数/含x因式”。", "要使原式为整数，含x的分母应为常数分子的非零因数，并排除原分母为0。"],
      "rational-parameter": ["先按一般步骤解出含参数的候选解，并记录原方程的禁值。", "把题设对解的正负、唯一性或增根要求逐一转成参数条件，再取交集。"],
      "zero-exponent": ["先用括号确定负号是否属于底数，再使用a⁰=1（a≠0）。", "分别算完各项后再处理外面的负号与加减，避免把−a⁰误写成(−a)⁰。"],
      "coefficient-independent": ["先完整展开并合并同类项，把结果按x的次数排列。", "式子的值与x无关意味着所有含x项的系数都为0，据此求参数并代回检查。"],
      "review15-coordinate-x": ["关于x轴对称时，横坐标保持不变，纵坐标变为相反数。", "把原点和对称点连线，检查连线是否垂直于x轴且被x轴平分。"],
      "review15-coordinate-two": ["分两步记录中间坐标：先关于x轴变纵坐标符号，再关于y轴变横坐标符号。", "最终结果等价于关于原点对称，可用两个坐标都变号交叉检验。"],
      "review15-two-points-bisector": ["由MA=MB、NA=NB分别使用垂直平分线的判定，确定M、N都在线段AB的垂直平分线上。", "M、N是不同两点，两点确定一条直线，因此MN就是该垂直平分线。"],
      "review15-isosceles-100": ["先分类判断已知角是顶角还是底角；若作底角，要检查两个底角之和。", "排除内角和超过180°的情况，再用两个底角相等求值。"],
      "review15-isosceles-70": ["分别讨论70°是顶角和底角，两种情况都要计算其余角。", "用三角形内角和及等腰三角形两底角相等检验每一种答案。"],
      "review15-sides-4-9": ["分别把4和9作为腰列出候选三边，不要直接认定较长边是腰。", "对每组候选使用两短边之和严格大于最长边，排除不能成三角形的情况。"],
      "review15-right30-14": ["先定位斜边14和30°角所对的直角边。", "使用30°角所对直角边等于斜边一半，计算后再核对边的对应位置。"],
      "review15-point-on-median": ["由AB=AC且D为BC中点，使用等腰三角形“三线合一”说明AD垂直平分BC。", "P在AD上，再用垂直平分线性质推出PB=PC。"],
      "review15-perimeter-20": ["分别讨论已知边8作为腰或底边，并用周长20求出另外两边。", "每组结果都要检查三角形三边关系，保留所有有效答案。"],
      "review15-coordinate-shortest": ["把其中一点关于x轴对称，使折线路径转化为两点之间的直线段。", "用两点距离公式求对称点间距离，并确认连线与x轴的交点就是所求P。"]
    };
    return map[q.diagram] || ["圈出题目的已知条件与目标，在图上或式子中逐一做对应标记。", "选择条件完全匹配的定义、定理或运算法则，并检查使用方向。"];
  }

  function selected() {
    const rows = P.filter((item) => item.chapter === filter);
    return rows.filter((item) => item.required).concat(rows.filter((item) => !item.required));
  }

  function stats(chapter = filter) {
    const all = P.filter((item) => item.chapter === chapter && item.required);
    const done = all.filter((item) => S.submitted[item.id]);
    const right = done.filter((item) => S.answers[item.id] === item.answer);
    return { all: all.length, done: done.length, right: right.length, pct: done.length ? Math.round(right.length / done.length * 100) : 0 };
  }

  function qcard(q, index) {
    const submitted = Boolean(S.submitted[q.id]);
    const answer = S.answers[q.id];
    const step = S.step[q.id] || 1;
    const ok = answer === q.answer;
    const detail = analysisSteps(q);
    const chapterText = `${q.chapter || ""} ${q.sourceChapter || ""}`;
    const selfCheck = chapterText.includes("第18章")
      ? "最后核对原式的全部分母限制、除式不为0的条件与结果是否最简；方程题还要把解代回原方程检验。"
      : chapterText.includes("第17章")
        ? "把分解结果重新展开，检查是否回到原多项式；再确认每个多项式因式都不能继续分解。"
        : chapterText.includes("第16章")
          ? "检查每个系数、符号、指数和括号，再用展开或逆运算交叉验证。"
          : "把结论代回条件，检查点名、角的对应顺序、严格不等号、垂直条件或全等式顺序。";
    const diagramStep = submitted ? step : (givenSteps[q.id] || 1);
    return `<section class="card question" id="${q.id}"><span class="kicker">${q.required ? `第 ${index + 1} 题 · ${q.difficulty}` : "培优挑战 · " + q.difficulty} · ${q.sourceChapter ? q.sourceChapter + " · " : ""}${q.point || q.section}</span><h3>${q.prompt}</h3>${q.diagram ? `<div class="diagram">${MathDiagrams.render(q.diagram, diagramStep, q.id)}</div>` : ""}<div class="choices" role="group" aria-label="本题选项">${q.options.map((option, optionIndex) => `<button class="choice ${submitted ? (optionIndex === q.answer ? "correct" : optionIndex === answer ? "wrong" : "") : optionIndex === answer ? "selected" : ""}" data-pick="${q.id}" data-index="${optionIndex}" aria-pressed="${answer === optionIndex}" ${submitted ? "disabled" : ""}><b>${"ABCD"[optionIndex]}.</b><span>${option}</span></button>`).join("")}</div>${answer !== undefined && !submitted ? `<div class="footer-actions"><button class="button" data-ask-ai="${q.id}" data-student="${MathCore.escape(q.options[answer])}">提交前问AI</button><button class="button primary" data-submit="${q.id}">提交本题</button></div>` : ""}${submitted ? `<div class="feedback ${ok ? "" : "bad"}"><b>${ok ? "回答正确" : "回答有误"}</b> · ${q.explain}</div><div class="analysis"><h3>逐步解析</h3><ol><li>${detail[0]}</li><li>${detail[1]}</li><li>${q.explain}</li><li>${selfCheck}</li></ol>${q.diagram ? `<div class="step-row">${[1, 2, 3, 4].map((number) => `<button data-qstep="${q.id}" data-step="${number}" class="${step === number ? "active" : ""}">解析 ${number}</button>`).join("")}</div>` : ""}<button class="button" data-ask-ai="${q.id}" data-reveal="true" data-student="${MathCore.escape(q.options[answer])}">让 FUMI AI 分析错因/变式</button></div>` : `<p class="feedback">先独立作答。提交前只显示题设图，不公布推导结论。</p>`}</section>`;
  }

  function masteryBand(pctValue, done, all) {
    if (!done) return "尚无作答证据";
    if (done < Math.ceil(all * 0.5)) return "证据仍少，建议继续完成";
    if (pctValue >= 85) return "掌握稳定，可进入综合迁移";
    if (pctValue >= 60) return "基本掌握，建议针对错题回练";
    return "基础仍需加固，建议回到对应课时";
  }

  function meterCards(rows, groupField) {
    const groups = [...new Set(rows.map((item) => item[groupField] || item.section))];
    return groups.map((group) => {
      const questions = rows.filter((item) => (item[groupField] || item.section) === group);
      const done = questions.filter((item) => S.submitted[item.id]);
      const right = done.filter((item) => S.answers[item.id] === item.answer);
      const pctValue = done.length ? Math.round(right.length / done.length * 100) : 0;
      return `<div class="meter"><small>${group}</small><br><strong>${pctValue}%</strong><div class="progressbar"><i style="width:${pctValue}%"></i></div><span>${right.length}/${done.length} 正确 · 共 ${questions.length} 题</span><em>${masteryBand(pctValue, done.length, questions.length)}</em></div>`;
    }).join("");
  }

  function report() {
    const currentStats = stats();
    const rows = P.filter((item) => item.chapter === filter && item.required);
    const challengeRows = P.filter((item) => item.chapter === filter && !item.required);
    const challengeDone = challengeRows.filter((item) => S.submitted[item.id]);
    const challengeRight = challengeDone.filter((item) => S.answers[item.id] === item.answer);
    const isReview = REVIEW_FILTERS.has(filter);
    const groupField = isReview ? "sourceChapter" : "point";
    const title = filter === REVIEW_1314
      ? "第13·14章综合复习报告"
      : filter === REVIEW_1516
        ? "第15·16章综合复习报告"
        : `${filter}练习报告`;
    return `<section class="hero"><div><span class="kicker" style="color:#d9d3ff">${isReview ? "复习讲义主线 · 独立记录" : "章节练习报告"}</span><h1>${title}</h1><p>掌握度只根据必做题中已经提交的题目计算；未作答不会被算作错误。培优题单独记录，不改变基础掌握率。</p></div><div class="hero-stats"><span><b>${currentStats.pct}%</b>必做掌握</span><span><b>${currentStats.done}/${currentStats.all}</b>必做进度</span><span><b>${challengeDone.length}/${challengeRows.length}</b>培优完成</span><span><b>${challengeRight.length}</b>培优答对</span></div></section>
      <section class="card" style="margin-top:22px"><span class="kicker">${isReview ? "按原章节查看证据" : "分知识点掌握度"}</span><div class="report-grid">${meterCards(rows, groupField)}</div>${isReview ? `<h3 style="margin-top:24px">分板块掌握度</h3><div class="report-grid">${meterCards(rows, "section")}</div>` : ""}<div class="report-summary"><b>当前建议</b><p>${masteryBand(currentStats.pct, currentStats.done, currentStats.all)}。完成全部必做题后再把此百分比作为阶段性掌握证据。</p></div><div class="footer-actions"><button class="button" onclick="print()">导出 / 保存PDF</button><a class="button" href="index.html?view=mindmap">查看同步后的思维导图</a><button class="button primary" data-view="questions">返回练习</button></div></section>`;
  }

  function render() {
    const isReview = REVIEW_FILTERS.has(filter);
    const chapterNav = document.querySelector?.('.course-nav a[href="math-practice.html"]');
    const review1314Nav = document.querySelector?.('.course-nav a[href="math-practice.html#review"]');
    const review1516Nav = document.querySelector?.('.course-nav a[href="math-practice.html#review15-16"]');
    chapterNav?.classList.toggle("active", !isReview);
    review1314Nav?.classList.toggle("active", filter === REVIEW_1314);
    review1516Nav?.classList.toggle("active", filter === REVIEW_1516);
    if (view === "report") {
      app.innerHTML = report();
      return;
    }
    const currentStats = stats();
    const rows = selected();
    const challenges = rows.filter((item) => !item.required).length;
    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    page = Math.max(0, Math.min(page, totalPages - 1));
    const pageStart = page * PAGE_SIZE;
    const visibleRows = rows.slice(pageStart, pageStart + PAGE_SIZE);
    const requiredBefore = rows.slice(0, pageStart).filter((item) => item.required).length;
    const pagination = `<div class="pagination"><button class="button" data-page="${page - 1}" ${page === 0 ? "disabled" : ""}>← 上一组</button><span>第 ${page + 1} / ${totalPages} 组 · 每组最多${PAGE_SIZE}题</span><button class="button" data-page="${page + 1}" ${page === totalPages - 1 ? "disabled" : ""}>下一组 →</button></div>`;
    const reviewHeading = filter === REVIEW_1516 ? "第15·16章<br>复习练习" : "第13·14章<br>复习练习";
    const reviewCopy = filter === REVIEW_1516
      ? "用24道必做题系统复盘轴对称与整式乘法，再用4道培优题完成综合迁移。"
      : "用24道必做题系统复盘三角形与全等三角形，再用4道培优题完成综合迁移。";
    app.innerHTML = `<section class="hero"><div><span class="kicker" style="color:#d9d3ff">${isReview ? "以复习讲义为主 · 与原练习分别保存" : "基础 → 中等 → 提高"}</span><h1>${isReview ? reviewHeading : "第13—18章<br>分层练习"}</h1><p>${isReview ? reviewCopy : "每课时必做题覆盖教学流程，章末提高题用于综合迁移；提交后提供四步解析、动态图与AI追问。"}</p></div><div class="hero-stats"><span><b>${currentStats.done}/${currentStats.all}</b>必做进度</span><span><b>${currentStats.pct}%</b>已答掌握</span><span><b>${challenges}</b>培优挑战</span><span><b>逐题</b>图解与AI</span></div></section>
      <div class="practice-filter">${filters.map((item) => `<button data-filter="${item.name}" data-key="${item.key}" class="${filter === item.name ? "active" : ""}">${item.label}</button>`).join("")}<button data-view="report">查看掌握报告</button></div>
      ${pagination}<div class="practice-list">${(() => { let requiredIndex = requiredBefore; return visibleRows.map((item) => qcard(item, item.required ? requiredIndex++ : -1)).join(""); })()}</div>${pagination}<div class="footer-actions"><button class="button primary" data-view="report">生成${isReview ? "复习" : "章节"}报告</button></div>`;
  }

  document.addEventListener("click", (event) => {
    const filterButton = event.target.closest("[data-filter]");
    if (filterButton) {
      filter = filterButton.dataset.filter;
      view = "questions";
      page = 0;
      location.hash = filterButton.dataset.key;
      render();
      document.querySelector?.(".practice-filter")?.scrollIntoView({ block: "start" });
      return;
    }
    const viewButton = event.target.closest("[data-view]");
    if (viewButton) {
      view = viewButton.dataset.view;
      render();
      scrollTo(0, 0);
      return;
    }
    const pageButton = event.target.closest("[data-page]");
    if (pageButton && !pageButton.disabled) {
      page = +pageButton.dataset.page;
      render();
      document.querySelector?.(".pagination")?.scrollIntoView({ block: "start" });
      return;
    }
    const pickButton = event.target.closest("[data-pick]");
    if (pickButton) {
      S.answers[pickButton.dataset.pick] = +pickButton.dataset.index;
      MathCore.save();
      render();
      return;
    }
    const submitButton = event.target.closest("[data-submit]");
    if (submitButton) {
      S.submitted[submitButton.dataset.submit] = Date.now();
      S.step[submitButton.dataset.submit] = 1;
      MathCore.save();
      render();
      document.getElementById(submitButton.dataset.submit)?.scrollIntoView({ block: "center" });
      return;
    }
    const stepButton = event.target.closest("[data-qstep]");
    if (stepButton) {
      S.step[stepButton.dataset.qstep] = +stepButton.dataset.step;
      MathCore.save();
      render();
      document.getElementById(stepButton.dataset.qstep)?.scrollIntoView({ block: "center" });
    }
  });

  window.addEventListener("hashchange", () => {
    const next = filters.find((item) => item.key === hashKey());
    if (next && next.name !== filter) {
      filter = next.name;
      view = "questions";
      page = 0;
      render();
    }
  });

  render();
})();
