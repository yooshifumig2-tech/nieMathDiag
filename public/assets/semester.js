(function () {
  "use strict";
  const app=document.getElementById("semester-app"),D=window.SemesterData,S=window.SemesterStore;
  const reviewPage=document.body.dataset.semesterPage==="review";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const question=id=>D.questions.find(q=>q.id===id);
  const scopes={review:"position:review",practice:"position:practice"};
  let current=D.modules[0].id,view={mode:"bank",chapter:"all",level:"all",qid:D.questions[0].id},wrongIds=[],scrollTimer=0;
  let restoreY=0, restoring=false;
  function answer(key){const paper=S.get("paper:finished",false);const qid=key.startsWith("answer:paper:")?key.slice("answer:paper:".length):null;const local=S.get(key,{});const r=qid&&paper?.answers?.[qid]?{...paper.answers[qid],step:local?.step??paper.answers[qid].step}:local;return r&&typeof r==="object"&&!Array.isArray(r)?r:{};}
  function progress(id){const r=answer("review:"+id);return {step:Math.min(4,Math.max(1,Number(r.step)||1)),visited:Array.isArray(r.visited)?r.visited.filter(n=>[1,2,3,4].includes(n)):[1],done:r.done===true};}
  function quizKey(m,q){return "answer:check:"+m.id+":"+q.id;}
  function bankKey(q){return "answer:bank:"+q.id;}
  function paperKey(q){return "answer:paper:"+q.id;}
  const validPick=(r,q)=>Number.isInteger(r.selected)&&r.selected>=0&&r.selected<q.options.length;
  function moduleDone(m){const p=progress(m.id);return p.done&&[1,2,3,4].every(n=>p.visited.includes(n))&&m.refs.every(id=>{const q=question(id),r=answer(quizKey(m,q));return r.submitted&&validPick(r,q);});}
  function completed(){return D.modules.filter(moduleDone).length;}
  function savePosition(scroll=true){
    if(restoring)return;
    S.set(reviewPage?scopes.review:scopes.practice,reviewPage?{id:current,y:scroll?window.scrollY:0}:{...view,y:scroll?window.scrollY:0});
  }
  function toolsHTML(){return `<details class="semester-tools"><summary>进度备份与恢复</summary><p>答案、完成标记、笔记与当前题目保存在这台电脑的当前浏览器中。网页完整加载后可离线做题，AI辅导需要联网。更换电脑、切换浏览器配置或清理网站数据前，请下载进度备份；这份备份可以导入恢复。</p><div class="semester-actions"><button class="button" data-action="export">下载进度备份</button><button class="button" data-action="retry-save">重试保存</button><label>导入备份 <input id="import-progress" type="file" accept="application/json,.json" aria-label="导入总复习进度备份"></label></div><p id="backup-message" role="status"></p></details>`;}
  function header(title,subtitle,big,label){return `<div class="semester-heading"><div><span class="eyebrow">八年级上册 · 第13—18章</span><h1>${title}</h1><p>${subtitle}</p></div><div class="summary-chip"><b>${big}</b><span>${label}</span></div></div>`;}
  function svgDiagram(id,step){
    const start='<svg viewBox="0 0 620 320" role="img" aria-label="根据例题条件绘制的分步示意图"><style>text{font:16px sans-serif;fill:#253464}.edge{fill:none;stroke:#253464;stroke-width:3}.help{fill:none;stroke:#365bd6;stroke-width:3}.mark{fill:none;stroke:#be5a71;stroke-width:3}</style>';
    if(["unit-14-2","unit-19-1","unit-13-2"].includes(id)){
      const median=id==="unit-13-2",ax=median?230:310;
      return start+`<path class="edge" d="M${ax} 45L130 260H490Z"/><text x="${ax-8}" y="30">A</text><text x="108" y="281">B</text><text x="500" y="281">C</text><path class="help" d="M${ax} 45L310 260"/><text x="303" y="287">D</text><path class="mark" d="M216 252v16M396 252v16"/>${median?`<circle cx="270" cy="152.5" r="5" fill="#365bd6"/><text x="280" y="153">E</text>${step>=2?'<path class="help" d="M130 260L270 152.5"/>':''}${step>=3?'<text x="165" y="218">等底等高</text>':''}`:`<path class="mark" d="M211 150l14 12M217 144l14 12M395 150l14 -12M401 156l14 -12"/>${step>=3?'<text x="223" y="218">SSS</text><text x="354" y="218">SSS</text>':''}${id==="unit-19-1"&&step>=4?'<path class="mark" d="M310 242h18v18"/>':''}`}<text x="310" y="315" text-anchor="middle">${median?"BD=DC，AE=ED；图形用于表示题设关系":"AB=AC，BD=DC；AD是公共边"}</text></svg>`;
    }
    if(id==="unit-15-1")return start+`<path class="edge" d="M80 160H540M310 20V300"/><text x="544" y="151">x</text><text x="321" y="28">y</text><text x="320" y="180">O</text><circle cx="190" cy="80" r="6" fill="#365bd6"/><text x="110" y="62">P(−3, 2)</text>${step>=2?'<circle cx="190" cy="240" r="6" fill="#be5a71"/><path class="help" stroke-dasharray="6 6" d="M190 80V240"/><text x="92" y="267">P′(−3, −2)</text>':''}${step>=3?'<circle cx="430" cy="240" r="6" fill="#277e65"/><path class="help" stroke-dasharray="6 6" d="M190 240H430"/><text x="433" y="270">P″(3, −2)</text>':''}</svg>`;
    return "";
  }
  function analysisSteps(q){
    const first=q.chapterNumber<=15?"先把题设中的边、角、点的位置关系和要求的结论分开写清楚。":"先辨认算式结构与运算顺序；涉及分母或除法时，记下原式的取值限制。";
    const strategy=q.chapterNumber===13?"检查是否使用三边关系、等底等高、内角和或外角性质。":q.chapterNumber===14?"先确定对应顶点；逐一核对SSS、SAS、ASA、AAS或HL的适用条件。":q.chapterNumber===15?"判断要用对称、垂直平分线还是特殊三角形性质；必要时分类讨论。":q.chapterNumber===16?"根据结构选择幂的法则、分配律或乘法公式，按顺序处理每一项。":q.chapterNumber===17?"先找公因式，再看公式或分组，最后检查能否继续分解。":"按题目目标选择约分、通分、指数法则或去分母，保留中间步骤。";
    return [first,strategy,q.explain,q.chapterNumber<=15?"回看每一步的依据：对应顺序是否正确？角、边、垂直和中点的条件是否都已具备？":"用展开、数值代入或原方程验算；检查负号、漏项、原分母限制与最终结果形式。"];
  }
  function questionHTML(q,key,{paper=false,number=null,quiz=false}={}){
    const r=answer(key),picked=validPick(r,q),finished=paper?!!S.get("paper:finished",false):!!r.submitted;
    const revealed=finished&&picked,ok=r.selected===q.answer,steps=analysisSteps(q),step=Math.min(4,Math.max(1,Number(r.step)||1));
    // Only geometry diagrams from the matching source question are reused.
    const diagram=q.chapterNumber<=15&&q.diagram?MathDiagrams.render(q.diagram,revealed?step:1,q.originId):"";
    return `<section class="semester-card" id="question-${q.id}" data-question="${q.id}"><span class="eyebrow">${quiz?"随堂检测":number?`第 ${number} 题 · `:""}${quiz?" · ":""}${esc(q.point)} · ${q.required?esc(q.difficulty):"选做提高"}</span><h2 class="example-title">${esc(q.prompt)}</h2>${diagram?`<div class="diagram">${diagram}</div>`:""}<div class="choices" role="group" aria-label="本题选项">${q.options.map((o,i)=>`<button class="choice ${revealed?(i===q.answer?"correct":i===r.selected?"wrong":""):i===r.selected?"selected":""}" data-pick="${i}" data-key="${key}" data-q="${q.id}" aria-pressed="${i===r.selected}" ${finished?"disabled":""}><b>${"ABCD"[i]}.</b><span>${esc(o)}</span></button>`).join("")}</div>${revealed?`<div class="feedback ${ok?"":"bad"}"><b>${ok?"回答正确":"这题再想一想"}</b> · 正确选项 ${"ABCD"[q.answer]}${r.first!==undefined&&r.first!==r.selected?" · 已保留首次作答记录":""}</div><h3 style="margin-top:20px">分步解析</h3><div class="step-tabs">${[1,2,3,4].map(n=>`<button class="${step===n?"active":""}" data-analysis="${n}" data-key="${key}">${n}. ${["读题","方法","推导","检查"][n-1]}</button>`).join("")}</div><div class="step-copy">${esc(steps[step-1])}</div>`:paper?'<p class="muted" style="margin-top:14px">选择后自动记录；整份检测交卷后查看答案与解析。</p>':'<p class="muted" style="margin-top:14px">先独立思考，提交后查看分步解析。</p>'}<div class="semester-actions">${!paper&&!finished?`<button class="button primary" data-submit="${q.id}" data-key="${key}" ${!picked?"disabled":""}>提交本题</button>`:""}${!paper&&finished?`<button class="button" data-redo="${q.id}" data-key="${key}">再做一次</button>`:""}<button class="button" data-tutor="${q.id}" data-key="${key}" data-revealed="${revealed}">${revealed?"请AI分析思路":"向AI要提示"}</button></div>${!quiz?`<label for="question-note">我的思路 / 错因笔记</label><textarea id="question-note" maxlength="3000" data-note="note:${paper?"paper":"bank"}:${q.id}" placeholder="例如：通分后漏改了第二个分子的符号。">${esc(S.get("note:"+(paper?"paper":"bank")+":"+q.id,""))}</textarea><p class="muted">${esc(q.source)}</p>`:""}</section>`;
  }
  function renderReview(){
    const m=D.modules.find(x=>x.id===current)||D.modules[0],p=progress(m.id),index=D.modules.indexOf(m);
    const allowed=m.refs.every(id=>{const q=question(id),r=answer(quizKey(m,q));return r.submitted&&validPick(r,q);})&&[1,2,3,4].every(n=>p.visited.includes(n));
    app.innerHTML=header("八年级上册总复习","先回忆知识，再拆解例题，最后用两道题检查理解。",`${completed()} / ${D.modules.length}`,"专题已完成")+`<div class="review-layout"><aside class="review-index"><h2>复习目录</h2><div class="review-meter"><i style="width:${completed()/D.modules.length*100}%"></i></div>${Object.entries(D.names).map(([n,name])=>`<h3>${n==="19"?"跨章串联":"第"+n+"章 · "+name}</h3>${D.modules.filter(x=>x.chapterNumber===Number(n)).map(x=>`<button data-unit="${x.id}" class="${x.id===m.id?"active":""}" ${x.id===m.id?'aria-current="step"':''}><span class="mark">${moduleDone(x)?"✓":"○"}</span><span>${esc(x.title)}</span></button>`).join("")}`).join("")}</aside><div class="review-body"><section class="semester-card"><span class="eyebrow">专题 ${String(index+1).padStart(2,"0")} / ${D.modules.length} · ${m.chapterNumber===19?"跨章综合":"第"+m.chapterNumber+"章"}</span><h2>${esc(m.title)}</h2><ol class="knowledge-list">${m.knowledge.map(t=>`<li>${esc(t)}</li>`).join("")}</ol><div class="misconception"><b>容易混淆的地方</b>${esc(m.trap)}</div><div class="module-links"><a href="semester-practice.html#${m.chapterNumber}">做这一章的分层练习</a>${m.chapterNumber<19?`<span>·</span><a href="math-learn.html#${m.chapterNumber}">回到章节学习</a>`:""}</div></section><section class="semester-card"><h3>例题 · 分四步想清楚</h3><p class="example-title">${esc(m.example)}</p>${svgDiagram(m.id,p.step)?`<div class="diagram">${svgDiagram(m.id,p.step)}</div>`:""}<div class="step-tabs">${[1,2,3,4].map(n=>`<button data-example="${n}" class="${p.step===n?"active":""}">${n}. ${["观察","转化","求解","检验"][n-1]}${p.visited.includes(n)?" ✓":""}</button>`).join("")}</div><div class="step-copy">${esc(m.steps[p.step-1])}</div></section>${m.refs.map(id=>{const q=question(id);return questionHTML(q,quizKey(m,q),{quiz:true});}).join("")}<section class="semester-card"><h3>用自己的话总结</h3><label for="module-note">这一专题，我最需要记住什么？</label><textarea id="module-note" data-note="note:${m.id}" maxlength="3000" placeholder="写下定理的使用条件，或者本次发现的一个易错点。">${esc(S.get("note:"+m.id,""))}</textarea><p class="muted">看完四步例题并提交两道检测后，即可完成本专题。答错的检测可以重新练习。</p><div class="semester-actions"><button class="button primary" data-complete="${m.id}" ${!allowed?"disabled":""}>${moduleDone(m)?"✓ 本专题已完成":"完成本专题"}</button>${index>0?`<button class="button" data-unit="${D.modules[index-1].id}">上一专题</button>`:""}${index<D.modules.length-1?`<button class="button" data-unit="${D.modules[index+1].id}">下一专题</button>`:'<a class="button" href="semester-practice.html#paper">开始综合检测</a>'}</div></section><section class="semester-card"><h3>把六章知识连起来</h3><div class="knowledge-tree"><details><summary>几何：边角关系 → 全等 → 对称</summary><ul><li>三角形：三边范围、重要线段、内外角</li><li>全等：对应关系、判定条件、推理依据</li><li>轴对称：等距、等腰等边、最短路径</li></ul></details><details><summary>代数：展开 → 分解 → 分式</summary><ul><li>整式乘法：幂、分配律、乘法公式</li><li>因式分解：提公因式、公式、分组</li><li>分式：非零条件、约分通分、方程检验</li></ul></details></div></section></div></div>`+toolsHTML();
  }
  function refreshWrong(){wrongIds=D.questions.filter(q=>{const r=answer(bankKey(q));return r.submitted&&validPick(r,q)&&r.selected!==q.answer;}).map(q=>q.id);}
  function listed(){
    if(view.mode==="paper")return D.paperIds.map(question);
    return D.questions.filter(q=>(view.mode!=="wrong"||wrongIds.includes(q.id))&&(view.chapter==="all"||q.chapterNumber===Number(view.chapter))&&(view.level==="all"||(view.level==="required"?q.required:view.level==="challenge"?!q.required:q.difficulty===view.level)));
  }
  function summary(qs,keyFn){const done=qs.filter(q=>{const r=answer(keyFn(q));return r.submitted&&validPick(r,q);});return {total:qs.length,done:done.length,first:done.filter(q=>answer(keyFn(q)).first===q.answer).length,right:done.filter(q=>answer(keyFn(q)).selected===q.answer).length};}
  function renderReport(){
    const req=D.questions.filter(q=>q.required),stats=summary(req,bankKey),challenge=summary(D.questions.filter(q=>!q.required),bankKey);
    const paper=D.paperIds.map(question),paperDone=!!S.get("paper:finished",false),paperRight=paper.filter(q=>answer(paperKey(q)).selected===q.answer).length;
    const weak=Object.keys(D.names).map(n=>({n,qs:req.filter(q=>q.chapterNumber===Number(n))})).map(row=>({...row,stats:summary(row.qs,bankKey)})).filter(row=>row.stats.done&&row.stats.right<row.stats.done);
    return `<div class="report-cards"><div class="semester-card"><b>${stats.done}/${stats.total}</b><span>必做题已提交</span></div><div class="semester-card"><b>${stats.done?Math.round(stats.first/stats.done*100)+"%":"—"}</b><span>首次正确率 · 仅统计已提交</span></div><div class="semester-card"><b>${completed()}/${D.modules.length}</b><span>复习专题完成数</span></div></div><section class="semester-card"><h2>六章学习报告</h2><p class="muted">首次结果和订正后结果分别保留。选做提高题单独统计；未作答不计为答错。</p><div class="table-wrap"><table class="semester-report"><thead><tr><th>章节</th><th>必做进度</th><th>首次答对</th><th>当前答对</th><th>下一步</th></tr></thead><tbody>${Object.entries(D.names).map(([n,name])=>{const s=summary(req.filter(q=>q.chapterNumber===Number(n)),bankKey);return `<tr><td>${n==="19"?"跨章综合":n+" · "+esc(name)}</td><td>${s.done}/${s.total}</td><td>${s.first}/${s.done}</td><td>${s.right}/${s.done}</td><td><button class="button" data-chapter="${n}">${s.done<s.total?"继续练习":"巩固本章"}</button></td></tr>`;}).join("")}</tbody></table></div><p class="muted" style="margin-top:18px">选做提高：已提交 ${challenge.done}/${challenge.total} 题，当前答对 ${challenge.right} 题。</p><div class="link-panel"><b>24题综合检测</b><p>${paperDone?`已交卷，答对 ${paperRight}/24 题。检测结果与分章练习独立。`:`尚未交卷，已选择 ${paper.filter(q=>validPick(answer(paperKey(q)),q)).length}/24 题。`}</p><button class="button" data-mode="paper">${paperDone?"查看检测解析":"继续综合检测"}</button></div></section><section class="semester-card" style="margin-top:20px"><h3>接下来复习什么</h3>${weak.length?`<ul>${weak.map(row=>`<li>${esc(D.names[row.n])}：${row.stats.done-row.stats.right} 道已提交必做题仍需订正。先回顾对应专题，再到错题回练独立作答。</li>`).join("")}</ul>`:`<p>${stats.done?"目前已提交的必做题均已答对。可以继续未完成的题目，或用综合检测检查知识迁移。":"先完成一组分章练习，报告会根据真实作答显示下一步建议。"}</p>`}<div class="semester-actions"><button class="button primary" data-mode="wrong">去错题回练</button><button class="button" data-action="sync-map">同步到思维导图</button><button class="button" data-action="print">打印 / 保存报告为PDF</button></div><p id="map-message" role="status"></p></section>`;
  }
  function renderPractice(){
    const req=D.questions.filter(q=>q.required),stats=summary(req,bankKey),qs=listed();
    if(!qs.some(q=>q.id===view.qid))view.qid=qs[0]?.id||"";
    const q=question(view.qid),idx=qs.indexOf(q),paper=view.mode==="paper",paperDone=!!S.get("paper:finished",false);
    const pickedPaper=D.paperIds.map(question).filter(q=>validPick(answer(paperKey(q)),q)).length;
    app.innerHTML=header("八年级上册综合练习",`${D.questions.length}道分层题 · 逐题保存 · 错题回练 · 综合检测`,`${stats.done}/${stats.total}`,"必做题已提交")+`<section class="practice-toolbar"><div class="mode-tabs" aria-label="练习模式">${[["bank","分章练习"],["wrong","错题回练"],["paper","24题综合检测"],["report","学习报告"]].map(([k,l])=>`<button data-mode="${k}" class="${view.mode===k?"active":""}">${l}</button>`).join("")}</div>${!["paper","report"].includes(view.mode)?`<div class="filter-row"><label>章节<select id="chapter-filter"><option value="all">全部章节</option>${Object.entries(D.names).map(([n,t])=>`<option value="${n}" ${view.chapter===n?"selected":""}>${n==="19"?"跨章综合":"第"+n+"章 "+t}</option>`).join("")}</select></label><label>难度<select id="level-filter">${[["all","全部题目"],["required","必做题"],["基础","基础"],["中等","中等"],["challenge","选做提高"]].map(([v,t])=>`<option value="${v}" ${view.level===v?"selected":""}>${t}</option>`).join("")}</select></label><span class="muted">本组 ${qs.length} 题${view.mode==="wrong"?" · 再做一次可独立订正":""}</span></div>`:""}</section>`+(view.mode==="report"?renderReport():`${paper?`<div class="paper-note">六章各4题，结果独立保存。${paperDone?"已交卷，可逐题查看分步解析。":"已选择 "+pickedPaper+"/24 题；完成全部选择后统一交卷。中途可以退出，回来继续。"}</div>`:""}${qs.length?`<div class="practice-layout"><div>${questionHTML(q,paper?paperKey(q):bankKey(q),{paper,number:idx+1})}<div class="semester-actions"><button class="button" data-question-id="${qs[idx-1]?.id||""}" ${idx===0?"disabled":""}>上一题</button><button class="button primary" data-question-id="${qs[idx+1]?.id||""}" ${idx===qs.length-1?"disabled":""}>下一题</button>${paper&&!paperDone?`<button class="button" data-action="submit-paper" ${pickedPaper!==24?"disabled":""}>完成并交卷（${pickedPaper}/24）</button>`:""}</div></div><aside class="question-index"><h2>题目导航</h2><div class="number-grid">${qs.map((item,i)=>{const r=answer(paper?paperKey(item):bankKey(item)),reveal=paper?paperDone:r.submitted;return `<button data-question-id="${item.id}" aria-label="第${i+1}题，${reveal?(r.selected===item.answer?"答对":"待订正"):validPick(r,item)?"已选未提交":"未作答"}" class="${q.id===item.id?"active":""} ${reveal?(r.selected===item.answer?"answered":"missed"):validPick(r,item)?"selected-only":""}">${i+1}</button>`;}).join("")}</div><p class="muted" style="margin-top:12px">蓝色：已选<br>绿色：答对<br>红色：待订正</p><a class="text-link" href="semester-review.html#${q.chapterNumber}">回顾相关知识</a></aside></div>`:`<section class="semester-card empty"><h2>${view.mode==="wrong"?"这一组暂无待订正题目":"当前筛选下没有题目"}</h2><p>${view.mode==="wrong"?"只收录分章练习中已提交且仍未答对的题。可以继续练习，再回来检查。":"换一个章节或难度继续练习。"}</p><button class="button" data-mode="bank">返回分章练习</button></section>`}`)+toolsHTML();
  }
  function render(){reviewPage?renderReview():renderPractice();}
  function rerender(){const y=window.scrollY;render();window.scrollTo(0,y);}
  function navigate(){clearTimeout(scrollTimer);restoring=true;render();window.scrollTo(0,0);restoring=false;savePosition(false);}
  function chooseUnit(id){if(!D.modules.some(m=>m.id===id))return;current=id;history.replaceState(null,"","#"+id);navigate();}
  function setMode(mode){if(!["bank","wrong","paper","report"].includes(mode))return;view.mode=mode;if(mode==="wrong"){refreshWrong();view.chapter="all";view.level="all";}history.replaceState(null,"","#"+mode);navigate();}
  function syncMap(){
    try {
      const key="fumi-math-map:learning-tools:v1",raw=localStorage.getItem(key);
      const map=raw?JSON.parse(raw):{mindmap:{center:"我的数学知识地图",branches:[]},orid:{o:"",r:"",i:"",d:""}};
      if(!map.mindmap||!Array.isArray(map.mindmap.branches))return false;
      let root=map.mindmap.branches.find(n=>n.id==="semester-review-root");
      if(!root){root={id:"semester-review-root",title:"八年级上册总复习",color:"#365bd6",children:[],autoSync:true};map.mindmap.branches.push(root);}
      if(root.autoSync===false)return true;
      root.note=`专题完成 ${completed()}/${D.modules.length}；来自独立总复习记录。`;
      if(!Array.isArray(root.children))root.children=[];
      for(const [n,title] of Object.entries(D.names)){
        const id="semester-chapter-"+n;let child=root.children.find(c=>c.id===id);
        if(!child){child={id,title:(n==="19"?"":"第"+n+"章 ")+title,children:[],autoSync:true,color:"#365bd6"};root.children.push(child);}
        if(child.autoSync===false)continue;
        const qs=D.questions.filter(q=>q.chapterNumber===Number(n)&&q.required),st=summary(qs,bankKey);
        child.note=`必做已提交${st.done}/${st.total}，首次答对${st.first}，当前答对${st.right}。`;
        if(!Array.isArray(child.children))child.children=[];
        for(const m of D.modules.filter(m=>m.chapterNumber===Number(n))){
          const nid="semester-map-"+m.id;let node=child.children.find(c=>c.id===nid);
          if(!node){node={id:nid,title:m.title,color:"#365bd6",children:[],autoSync:true};child.children.push(node);}
          if(node.autoSync!==false)node.note=(moduleDone(m)?"已完成":"待复习")+"；"+String(S.get("note:"+m.id,"")).slice(0,1000);
        }
      }
      const text=JSON.stringify(map);localStorage.setItem(key,text);return localStorage.getItem(key)===text;
    }catch{return false;}
  }
  app.addEventListener("click",e=>{
    const b=e.target.closest("button");if(!b||b.disabled)return;
    if(b.dataset.unit){chooseUnit(b.dataset.unit);return;}
    if(b.dataset.mode){setMode(b.dataset.mode);return;}
    if(b.dataset.chapter){view.mode="bank";view.chapter=b.dataset.chapter;view.level="all";navigate();return;}
    if(b.dataset.questionId){view.qid=b.dataset.questionId;navigate();return;}
    if(b.dataset.example){const p=progress(current),step=Number(b.dataset.example);S.set("review:"+current,{...p,step,visited:[...new Set([...p.visited,1,step])]});rerender();savePosition();return;}
    if(b.dataset.pick!==undefined){const q=question(b.dataset.q),r=answer(b.dataset.key),selected=Number(b.dataset.pick);if(!q||selected<0||selected>=q.options.length||r.submitted||(b.dataset.key.startsWith("answer:paper:")&&S.get("paper:finished",false)))return;S.set(b.dataset.key,{...r,selected});rerender();savePosition();return;}
    if(b.dataset.submit){const q=question(b.dataset.submit),r=answer(b.dataset.key);if(!q||!validPick(r,q)||r.submitted)return;S.set(b.dataset.key,{...r,first:r.first??r.selected,submitted:true,step:1,attempts:[...(Array.isArray(r.attempts)?r.attempts:[]),{selected:r.selected,at:Date.now()}].slice(-20)});rerender();syncMap();savePosition();return;}
    if(b.dataset.redo){const r=answer(b.dataset.key);delete r.selected;r.submitted=false;r.step=1;S.set(b.dataset.key,r);rerender();savePosition();return;}
    if(b.dataset.analysis){const r=answer(b.dataset.key);S.set(b.dataset.key,{...r,step:Number(b.dataset.analysis)});rerender();savePosition();return;}
    if(b.dataset.complete){const m=D.modules.find(x=>x.id===b.dataset.complete),p=progress(m.id);if(![1,2,3,4].every(n=>p.visited.includes(n))||!m.refs.every(id=>answer(quizKey(m,question(id))).submitted))return;S.set("review:"+m.id,{...p,done:true});rerender();syncMap();savePosition();return;}
    if(b.dataset.tutor){const q=question(b.dataset.tutor),r=answer(b.dataset.key),canReveal=b.dataset.revealed==="true";window.FumiMathAI?.setContext({page:reviewPage?"八年级上册总复习":"八年级上册综合练习",canReveal,question:{prompt:q.prompt,options:q.options,studentAnswer:validPick(r,q)?q.options[r.selected]:"未选择",correctAnswer:canReveal?q.options[q.answer]:undefined,explanation:canReveal?q.explain:undefined}});return;}
    switch(b.dataset.action){
      case "submit-paper":{
        const qs=D.paperIds.map(question);if(!qs.every(q=>validPick(answer(paperKey(q)),q)))return;
        const answers=Object.fromEntries(qs.map(q=>{const r=answer(paperKey(q));return [q.id,{...r,submitted:true,first:r.first??r.selected,step:1}];}));
        S.set("paper:finished",{at:Date.now(),answers});rerender();savePosition();break;
      }
      case "retry-save":S.retry();document.getElementById("backup-message").textContent="已重试，请查看顶部的保存状态。";break;
      case "export":{
        const blob=new Blob([JSON.stringify(S.exportData(),null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),link=document.createElement("a");link.href=url;link.download="FUMI-八上总复习进度-"+new Date().toISOString().slice(0,10)+".json";link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.getElementById("backup-message").textContent="已生成备份下载，请保留浏览器下载的文件。";break;
      }
      case "sync-map":document.getElementById("map-message").textContent=syncMap()?"已同步，原有手动分支继续保留。":"思维导图保存未成功；总复习记录仍可通过进度备份下载。";break;
      case "print":window.print();break;
    }
  });
  app.addEventListener("input",e=>{if(e.target.dataset.note){S.set(e.target.dataset.note,e.target.value);}});
  app.addEventListener("change",async e=>{
    if(e.target.id==="chapter-filter"){view.chapter=e.target.value;navigate();}
    if(e.target.id==="level-filter"){view.level=e.target.value;navigate();}
    if(e.target.id==="import-progress"){
      const f=e.target.files?.[0];if(!f)return;
      try{if(f.size>5000000)throw new Error("文件过大，请选择本网站导出的进度备份。");const n=S.importData(JSON.parse(await f.text()));refreshWrong();render();document.querySelector(".semester-tools").open=true;document.getElementById("backup-message").textContent=`已恢复 ${n} 条较新的记录，当前较新的记录继续保留。`;syncMap();}
      catch(err){document.getElementById("backup-message").textContent=err.message||"导入失败，原有记录保留。";}
    }
  });
  S.subscribe(status=>{
    const node=document.getElementById("save-status");if(!node)return;
    node.dataset.state=status.unsaved?"error":"ok";
    node.textContent=!status.ready?"正在恢复进度…":status.unsaved?`有 ${status.unsaved} 条记录未保存，请下载备份`:status.secondaryPending?"已保存到本机 · 备用保存待重试":"进度已保存到本机";
  });
  window.addEventListener("scroll",()=>{if(restoring)return;clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>savePosition(),250);},{passive:true});
  window.addEventListener("pagehide",()=>{clearTimeout(scrollTimer);savePosition();});
  window.addEventListener("semester-progress-updated",()=>{refreshWrong();rerender();});
  function applyHash(){
    const hash=decodeURIComponent(location.hash.slice(1));
    if(reviewPage){
      if(D.modules.some(m=>m.id===hash))current=hash;
      else if(D.names[hash]){const existing=D.modules.find(m=>m.id===current);if(existing?.chapterNumber!==Number(hash))current=D.modules.find(m=>m.chapterNumber===Number(hash)).id;}
    }else if(["bank","wrong","paper","report"].includes(hash)){view.mode=hash;}
    else if(D.names[hash]){view.mode="bank";view.chapter=hash;view.level="all";}
  }
  window.addEventListener("hashchange",()=>{applyHash();refreshWrong();navigate();});
  S.ready.then(()=>{
    const saved=S.get(reviewPage?scopes.review:scopes.practice,{});
    if(saved&&typeof saved==="object"){
      if(reviewPage&&D.modules.some(m=>m.id===saved.id))current=saved.id;
      if(!reviewPage){view={...view,...saved};if(!["bank","wrong","paper","report"].includes(view.mode))view.mode="bank";if(view.chapter!=="all"&&!D.names[view.chapter])view.chapter="all";if(!["all","required","challenge","基础","中等"].includes(view.level))view.level="all";}
      restoreY=Math.max(0,Number(saved.y)||0);
    }
    const before=reviewPage?current:JSON.stringify(view);applyHash();if(before!==(reviewPage?current:JSON.stringify(view)))restoreY=0;
    refreshWrong();render();restoring=true;requestAnimationFrame(()=>{window.scrollTo(0,restoreY);restoring=false;});
    if("serviceWorker" in navigator&&location.protocol==="https:")navigator.serviceWorker.register("/service-worker.js",{scope:"/",updateViaCache:"none"}).catch(()=>{});
    document.addEventListener("pointerdown",()=>{navigator.storage?.persist?.().catch(()=>{});},{once:true});
  }).catch(()=>{app.innerHTML='<section class="semester-card"><h1>进度暂时未能读取</h1><p>请关闭此标签页后重新打开。不要清理浏览器数据，以便保留已有记录。</p></section>';});
})();
