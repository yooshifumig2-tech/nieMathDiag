(function () {
  const C = { ink: "#202039", purple: "#6c55df", blue: "#4f7ee8", pink: "#ef6e9a", mint: "#35aa97", gold: "#e5a72f", pale: "#f6f4ff" };
  const show = (n, step) => `class="layer ${step >= n ? "is-visible" : ""}"`;
  const showAs = (n, step, kind) => `class="${kind} layer ${step >= n ? "is-visible" : ""}"`;
  const base = (label, body) => `<svg viewBox="0 0 620 360" role="img" aria-label="${label}" xmlns="http://www.w3.org/2000/svg"><defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8z" fill="${C.purple}"/></marker><filter id="shadow"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#392b7b" flood-opacity=".12"/></filter></defs><rect x="2" y="2" width="616" height="356" rx="22" fill="#fcfbff" stroke="#e4dffd"/>${body}</svg>`;
  const labels = `<text x="300" y="42" class="dg-title">观察图中已知与目标</text>`;
  function triangle(type, step) {
    let extra = "";
    if (type === "triangle-basic") extra = `<path ${showAs(1,step,"main")} d="M140 286L310 66L510 286Z"/><g ${show(2,step)}><text x="300" y="58">A</text><text x="120" y="310">B</text><text x="520" y="310">C</text><text x="208" y="171" class="tag">边 AB</text><text x="395" y="171" class="tag">边 AC</text><path d="M282 101A42 42 0 0 1 338 100" class="arc"/></g><g ${show(3,step)}><rect x="190" y="313" width="240" height="30" rx="15" class="note"/><text x="310" y="334" text-anchor="middle" class="small">三条线段 · 首尾相接 · 三点不共线</text></g>`;
    if (type === "inequality") extra = `<g ${show(1,step)}><circle cx="115" cy="280" r="7"/><circle cx="500" cy="280" r="7"/><text x="95" y="310">B</text><text x="508" y="310">C</text><path d="M115 280L300 72L500 280Z" class="main"/></g><g ${show(2,step)}><path d="M115 280Q300 35 500 280" class="measure"/><text x="303" y="55" text-anchor="middle" class="tag">AB + AC</text></g><g ${show(3,step)}><path d="M115 300L500 300" class="goal" marker-end="url(#arr)"/><text x="310" y="334" text-anchor="middle" class="small">两边之和 ＞ 第三边；两边之差 ＜ 第三边</text></g>`;
    if (type === "cevians") extra = `<path ${showAs(1,step,"main")} d="M130 288L305 58L520 288Z"/><g ${show(2,step)}><circle cx="325" cy="288" r="5" class="pink"/><path d="M305 58L325 288" class="pinkline"/><path d="M313 282v-12h12" class="right"/><text x="340" y="270" class="tag">高：垂直</text></g><g ${show(3,step)}><circle cx="217.5" cy="173" r="5" class="mint"/><path d="M520 288L217.5 173" class="mintline"/><path d="M176 214l13 11M188 198l13 11" class="tick"/><text x="105" y="150" class="tag">中线：中点</text></g><g ${show(4,step)}><path d="M130 288L408 177" class="measure"/><path d="M148 268A30 30 0 0 1 158 276M158 254A47 47 0 0 1 177 269" class="arc"/><text x="110" y="238" class="tag">角平分线</text></g>`;
    return base("三角形关系图", labels + extra);
  }
  function angles(type, step) {
    let x = "";
    if (type === "angle-sum") x = `<g ${show(1,step)}><path d="M145 285L310 88L500 285Z" class="main"/><text x="300" y="80">A</text><text x="125" y="310">B</text><text x="510" y="310">C</text></g><g ${show(2,step)}><path d="M65 88H555" class="measure"/><path d="M95 108l18-18 18 18M490 108l18-18 18 18" class="parallel"/><text x="535" y="75" class="tag">过A作BC的平行线</text></g><g ${show(3,step)}><path d="M274 112A46 46 0 0 1 237 92M344 108A48 48 0 0 0 385 91" class="arc"/><text x="205" y="130" class="tag">∠B</text><text x="390" y="130" class="tag">∠C</text></g><g ${show(4,step)}><rect x="196" y="315" width="250" height="30" rx="15" class="note"/><text x="321" y="336" text-anchor="middle" class="small">∠A + ∠B + ∠C = 180°</text></g>`;
    if (type === "right-triangle") x = `<path ${showAs(1,step,"main")} d="M145 290L145 75L505 290Z"/><path ${showAs(2,step,"right")} d="M145 268h22v22"/><text x="108" y="302">C</text><text x="128" y="66">A</text><text x="516" y="310">B</text><g ${show(3,step)}><path d="M145 117A42 42 0 0 1 174 105M462 290A43 43 0 0 1 470 266" class="arc"/><text x="220" y="125" class="tag">∠A</text><text x="431" y="255" class="tag">∠B</text></g><g ${show(4,step)}><text x="320" y="335" text-anchor="middle" class="small">∠A + ∠B = 90°</text></g>`;
    if (type === "exterior-angle") x = `<g ${show(1,step)}><path d="M120 285L310 80L470 285Z" class="main"/><path d="M470 285H570" class="main"/><text x="105" y="310">B</text><text x="300" y="70">A</text><text x="463" y="310">C</text><text x="573" y="310">D</text></g><g ${show(2,step)}><path d="M470 240A45 45 0 0 1 510 285" class="goal"/><text x="505" y="230" class="tag">外角∠ACD</text></g><g ${show(3,step)}><path d="M285 105A34 34 0 0 1 333 108M145 285A35 35 0 0 1 151 259" class="arc"/><text x="305" y="140" class="tag">∠A</text><text x="150" y="246" class="tag">∠B</text></g><g ${show(4,step)}><text x="320" y="337" text-anchor="middle" class="small">∠ACD = ∠A + ∠B</text></g>`;
    return base("角关系分步图", labels + x);
  }
  function congruence(type, step) {
    const common = `<g ${show(1,step)}><path d="M70 285L200 85L310 285Z" class="main"/><path d="M330 285L450 85L560 285Z" class="main"/><text x="192" y="73">A</text><text x="53" y="310">B</text><text x="312" y="310">C</text><text x="443" y="73">D</text><text x="315" y="310">E</text><text x="565" y="310">F</text></g>`;
    let marks = "";
    if (type === "congruence") marks = `<g ${show(2,step)}><path d="M127 190l15 10M390 188l15 10" class="tick"/><path d="M252 180l15-9M503 180l15-9" class="tick"/><path d="M175 285v-16M438 285v-16" class="tick"/></g><g ${show(3,step)}><path d="M200 112A32 32 0 0 1 226 119M450 112A32 32 0 0 1 476 119" class="arc"/><text x="315" y="337" text-anchor="middle" class="small">对应顶点按书写位置一一对应</text></g>`;
    if (type === "sas") marks = `<g ${show(2,step)}><path d="M127 190l15 10M390 188l15 10M252 180l15-9M503 180l15-9" class="tick"/></g><g ${show(3,step)}><path d="M174 118A38 38 0 0 1 229 122M424 118A38 38 0 0 1 479 122" class="goal"/><text x="315" y="337" text-anchor="middle" class="small">两边与它们的夹角对应相等（SAS）</text></g>`;
    if (type === "asa") marks = `<g ${show(2,step)}><path d="M175 285v-16M438 285v-16" class="tick"/></g><g ${show(3,step)}><path d="M174 118A38 38 0 0 1 229 122M424 118A38 38 0 0 1 479 122M90 285A34 34 0 0 1 96 260M350 285A34 34 0 0 1 356 260" class="goal"/><text x="315" y="337" text-anchor="middle" class="small">两角与夹边（ASA）或一角对边（AAS）</text></g>`;
    if (type === "sss") marks = `<g ${show(2,step)}><path d="M127 190l15 10M390 188l15 10M252 180l15-9M503 180l15-9" class="tick"/></g><g ${show(3,step)}><path d="M175 285v-16M438 285v-16" class="tick"/><text x="315" y="337" text-anchor="middle" class="small">三组对应边相等（SSS）</text></g>`;
    return base("全等条件对应图", labels + common + marks);
  }
  function construction(step) {
    return base("尺规作图步骤", `${labels}<g ${show(1,step)}><path d="M90 285H530" class="main"/><circle cx="150" cy="285" r="5"/><circle cx="470" cy="285" r="5"/><text x="140" y="315">B</text><text x="468" y="315">C</text></g><g ${show(2,step)}><path d="M150 285A245 245 0 0 1 350 70" class="compass"/><text x="160" y="95" class="tag">以B为圆心作弧</text></g><g ${show(3,step)}><path d="M470 285A225 225 0 0 0 350 70" class="compass"/><text x="405" y="105" class="tag">以C为圆心作弧</text></g><g ${show(4,step)}><circle cx="350" cy="70" r="6" class="pink"/><path d="M150 285L350 70L470 285" class="goal"/><text x="356" y="60">A</text><text x="310" y="338" text-anchor="middle" class="small">两弧交点确定第三个顶点，保留作图痕迹</text></g>`);
  }
  function right(type, step) {
    if (type === "hl") return base("HL判定条件图", `${labels}<g ${show(1,step)}><path d="M80 285L80 100L285 285ZM335 285L335 100L540 285Z" class="main"/><path d="M80 263h22v22M335 263h22v22" class="right"/></g><g ${show(2,step)}><path d="M80 100L285 285M335 100L540 285" class="goal"/><text x="180" y="170" class="tag">斜边</text><text x="438" y="170" class="tag">斜边</text></g><g ${show(3,step)}><path d="M80 185h14M335 185h14" class="tick"/><text x="310" y="338" text-anchor="middle" class="small">两个直角三角形：斜边 + 一条直角边</text></g>`);
    const converse = type === "bisector-converse";
    return base("角平分线性质图", `${labels}<g ${show(1,step)}><path d="M105 300L540 80M105 300L540 300" class="main"/><text x="82" y="324">O</text><text x="548" y="75">A</text><text x="548" y="324">B</text></g><g ${show(2,step)}><path d="M105 300L390 225" class="measure"/><circle cx="390" cy="225" r="7" class="pink"/><text x="400" y="217">P</text></g><g ${show(3,step)}><path d="M390 225L345 248M390 225V300" class="goal"/><path d="M348 241l8 16M390 282h18v18" class="right"/><text x="355" y="276" class="tag">PM</text><text x="410" y="275" class="tag">PN</text></g><g ${show(4,step)}><text x="320" y="338" text-anchor="middle" class="small">${converse ? "PM = PN ⇒ OP平分∠AOB（角内点）" : "OP平分∠AOB ⇒ PM = PN"}</text></g>`);
  }
  function render(type, step = 4) {
    if (["triangle-basic", "inequality", "cevians"].includes(type)) return triangle(type, step);
    if (["angle-sum", "right-triangle", "exterior-angle"].includes(type)) return angles(type, step);
    if (["congruence", "sas", "asa", "sss"].includes(type)) return congruence(type, step);
    if (type === "construction") return construction(step);
    return right(type, step);
  }
  window.MathDiagrams = { render };
})();
