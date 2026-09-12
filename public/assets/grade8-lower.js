(function(){
  'use strict';
  const D=window.Grade8Lower,S=window.SemesterStore,app=document.getElementById('lower-app');
  const page=document.body.dataset.lowerPage==='practice'?'practice':'learn';
  const all=D.lessons.flatMap(l=>[...l.inquiry,...l.checks,...l.practice]);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const answer=q=>S.get('answer:'+q.id,{});
  const correct=q=>answer(q).submitted&&answer(q).correct===true;
  const lessonBy=id=>D.lessons.find(l=>l.id===id)||D.lessons[0];
  const posKey='position:'+page;
  let state={lesson:D.lessons[0].id,stage:0,view:page,question:D.practice[0].id,filter:'all'},message='',rendering=false;
  const complete=l=>!!S.get('review:'+l.id,{}).done&&[...l.inquiry,...l.checks].every(correct)&&S.get('review:read-'+l.id,false)&&S.get('review:example-'+l.id,false);
  function updateComplete(l){
    if([...l.inquiry,...l.checks].every(correct)&&S.get('review:read-'+l.id,false)&&S.get('review:example-'+l.id,false))S.set('review:'+l.id,{done:true});
  }
  function savePosition(){S.set(posKey,state);}
  function status(s){
    const el=document.getElementById('lower-save');if(!el)return;
    el.dataset.state=s.unsaved?'error':'ok';
    el.textContent=!s.ready?'正在恢复本机进度…':s.unsaved?`还有${s.unsaved}条未保存，请下载备份`:s.secondaryPending?'已保存到本机 · 备用存储待同步':'已保存到本机';
  }
  function questionCard(q){
    const a=answer(q),submitted=a.submitted===true,step=Math.min(4,Math.max(1,Number(S.get('position:solution-'+q.id,1))||1));
    return `<section class="lower-card question-card" data-question="${q.id}"><div class="card-label">${q.kind==='inquiry'?'想一想':q.kind==='check'?'即时检测':esc(q.level)+'练习'}</div><h3>${esc(q.prompt)}</h3><div class="lower-choices" role="group" aria-label="答案选项">${q.options.map((o,i)=>`<button class="lower-choice ${a.choice===i?'selected':''} ${submitted&&i===q.answer?'correct':''} ${submitted&&a.choice===i&&!a.correct?'wrong':''}" data-choice="${q.id}" data-index="${i}" aria-pressed="${a.choice===i}" ${submitted?'disabled':''}><b>${'ABCD'[i]}</b><span>${esc(o)}</span></button>`).join('')}</div><div class="actions"><button class="button" data-submit="${q.id}" ${!Number.isInteger(a.choice)||submitted?'disabled':''}>${submitted?'已提交':'提交答案'}</button>${submitted?`<button class="button secondary" data-retry="${q.id}">${a.correct?'再做一次':'订正这道题'}</button>`:''}<button class="text-button" data-lower-ai="${q.id}">${submitted?'请AI解释':'请AI给提示'}</button><span class="muted">${!submitted&&Number.isInteger(a.choice)?'已记住所选答案，尚未提交':''}</span></div>${submitted?`<div class="answer-feedback ${a.correct?'good':'bad'}" role="status"><strong>${a.correct?'答对了。':'这次还需要订正。'}</strong> ${esc(q.feedback[a.choice]||q.steps[q.steps.length-1])}</div><div class="worked"><p class="muted">分步解析 · ${step}/4</p><ol>${q.steps.slice(0,step).map(t=>`<li>${esc(t)}</li>`).join('')}</ol><button class="button secondary" data-solution="${q.id}" ${step===4?'disabled':''}>${step===4?'解析已看完':'看下一步'}</button></div>`:''}</section>`;
  }
  function visual(l){
    const n=Math.max(-6,Math.min(6,Number(S.get('position:slider-'+l.id,-3))||0));
    const svg=(content,label)=>`<svg viewBox="0 0 600 185" role="img" aria-label="${esc(label)}">${content}</svg>`;
    const rect=(x,y,w,h,color)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5" fill="${color}" stroke="#18756d" stroke-width="2"/>`;
    const text=(x,y,t)=>`<text x="${x}" y="${y}" text-anchor="middle" fill="#164e49" font-size="20">${esc(t)}</text>`;
    let content='';
    if(l.visual==='area')content=svg(rect(75,20,135,135,'#d4eee7')+text(142,93,'面积 3')+text(285,98,'边长 √3')+text(428,67,'边长的平方为3')+text(428,122,'长度取正值'),'面积3的正方形，边长为根号3');
    if(l.visual==='absolute')content=`<label class="slider-label">拖动数轴上的数：a = <output id="number-output">${n}</output><input id="root-slider" data-slider="${l.id}" type="range" min="-6" max="6" step="1" value="${n}"></label><div id="root-visual">${numberLine(n)}</div><p class="muted">从负数拖到零，再到正数：结果始终是到零的距离。</p>`;
    if(l.visual==='product')content=svg(rect(80,30,220,110,'#d4eee7')+text(190,22,'长 √8')+text(40,100,'√2')+text(190,95,'面积 √8 × √2')+text(452,78,'√(8×2)')+text(452,125,'= √16 = 4'),'根式乘法的长方形面积模型，长宽比二比一');
    if(l.visual==='quotient')content=svg(rect(50,45,230,95,'#d4eee7')+text(165,32,'长 = 面积 ÷ 宽')+text(165,102,'面积 √18')+text(320,102,'宽 √2')+text(475,80,'√18 ÷ √2')+text(475,128,'= √9 = 3'),'由面积与宽求长的根式除法模型');
    if(l.visual==='like')content=svg([0,1,2,3,4].map((k)=>rect(50+100*k,50,88,65,k<2?'#c0e9dc':'#dce7ff')+text(94+100*k,91,'√2')).join('')+text(145,35,'√8 = 2份√2')+text(396,35,'√18 = 3份√2')+text(300,158,'2份 + 3份 = 5份√2'),'两份根号2与三份根号2合并为五份，色块表示相同的代数单位');
    if(l.visual==='mixed')content=svg(text(300,38,'(√5 + 2)(√5 − 2)')+`<path d="M240 55L240 78M360 55L360 78" stroke="#18756d" stroke-width="2"/>`+text(240,104,'同：√5')+text(385,104,'反：+2、−2')+text(300,160,'平方差：5 − 4 = 1'),'观察相同项与互为相反数的项，使用平方差公式');
    return `<div class="concept-visual">${content}</div>`;
  }
  function numberLine(n){return `<svg viewBox="0 0 600 150" role="img" aria-label="a为${n}，到零的距离为${Math.abs(n)}"><line x1="55" y1="55" x2="545" y2="55" stroke="#769b96" stroke-width="2"/><line x1="300" y1="55" x2="${300+n*38}" y2="55" stroke="#147c6b" stroke-width="7"/>${[-6,-3,0,3,6].map(v=>`<path d="M${300+v*38} 48v14" stroke="#426d67"/><text x="${300+v*38}" y="85" text-anchor="middle" font-size="17">${v}</text>`).join('')}<circle cx="${300+n*38}" cy="55" r="8" fill="#147c6b"/><text x="300" y="129" text-anchor="middle" font-size="22" fill="#164e49">√((${n})²) = |${n}| = ${Math.abs(n)}</text></svg>`;}
  function learn(){
    const l=lessonBy(state.lesson),s=state.stage,step=Math.min(4,Math.max(1,Number(S.get('position:example-'+l.id,1))||1));
    let body='';
    if(s===0)body=`<section class="lower-card"><div class="card-label">从一个具体问题开始</div><p class="scene">${esc(l.scene)}</p>${l.inquiry.every(q=>answer(q).submitted)?visual(l):'<p class="model-note">先完成下面两道追问，再展开模型核对思路。</p>'}</section>${l.inquiry.map(questionCard).join('')}`;
    if(s===1)body=`<section class="lower-card"><div class="card-label">例题 · 一步一步推理</div><h3>${esc(l.example.prompt)}</h3><div class="step-dots">${[1,2,3,4].map(x=>`<span class="${step>=x?'reached':''}">${x}</span>`).join('')}</div><ol class="example-steps">${l.example.steps.slice(0,step).map(t=>`<li>${esc(t)}</li>`).join('')}</ol><div class="actions"><button class="button secondary" data-example-back ${step===1?'disabled':''}>上一步</button><button class="button" data-example-next ${step===4?'disabled':''}>${step===4?'例题已完成':'推到下一步'}</button></div><p class="muted">每看一步，就在纸上补写这一行。</p></section>`;
    if(s===2)body=`<section class="lower-card"><div class="card-label">把规律说清楚</div><h3>这一课，记住这三点</h3><ol class="concept-list">${l.concepts.map(x=>`<li>${esc(x)}</li>`).join('')}</ol><div class="pitfalls"><strong>重点检查</strong><ul>${l.traps.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></div><label class="note-label" for="lesson-note">用自己的话写一句总结（会保存到思维导图）</label><textarea id="lesson-note" data-note="${l.id}" maxlength="5000" placeholder="例如：先判断根号内和分母的条件，再取它们的公共部分。">${esc(S.get('note:'+l.id,''))}</textarea></section>`;
    if(s===3)body=l.checks.map(questionCard).join('')+`<section class="lower-card"><h3>${complete(l)?'本课已完成，继续巩固。':'完成前，检查这些环节'}</h3><ul class="checklist"><li>${l.inquiry.every(correct)?'✓':'○'} 两道追问已答对</li><li>${S.get('review:example-'+l.id,false)?'✓':'○'} 例题四步已看完</li><li>${S.get('review:read-'+l.id,false)?'✓':'○'} 知识总结已阅读</li><li>${l.checks.every(correct)?'✓':'○'} 两道检测已答对</li></ul><a class="button" href="lower-practice.html#${l.code}">做本课配套练习 →</a></section>`;
    return `<div class="learning-layout"><aside class="lesson-index"><h2>第16章 · 二次根式</h2>${D.lessons.map((x,i)=>`<button data-lesson="${x.id}" class="${x.id===l.id?'active':''}" ${x.id===l.id?'aria-current="step"':''}><span class="lesson-number">${complete(x)?'✓':String(i+1).padStart(2,'0')}</span><span><small>${x.code}</small>${esc(x.title)}</span></button>`).join('')}<a href="lower-practice.html">进入本章分层练习 →</a></aside><div class="lesson-body"><section class="lesson-title"><p class="eyebrow">课时 ${D.lessons.indexOf(l)+1} / 6 · ${l.code}</p><h2>${esc(l.title)}</h2><p>${esc(l.goal)}</p></section><nav class="stage-tabs" aria-label="本课学习步骤">${['观察与追问','分步例题','知识总结','即时检测'].map((x,i)=>`<button data-stage="${i}" class="${s===i?'active':''}" ${s===i?'aria-current="step"':''}>${i+1} ${x}</button>`).join('')}</nav>${body}<div class="actions lesson-bottom">${s>0?`<button class="button secondary" data-stage="${s-1}">← 上一环节</button>`:''}${s<3?`<button class="button" data-stage="${s+1}">下一环节 →</button>`:D.lessons.indexOf(l)<5?`<button class="button" data-lesson="${D.lessons[D.lessons.indexOf(l)+1].id}">下一课 →</button>`:`<button class="button" data-view="report">查看学习报告 →</button>`}</div></div></div>`;
  }
  function filtered(){return D.practice.filter(q=>(state.lesson==='all'||q.lesson===state.lesson)&&(state.filter==='all'||state.filter==='required'&&q.level!=='提高'||state.filter==='higher'&&q.level==='提高'||state.filter==='wrong'&&answer(q).firstCorrect===false&&!correct(q)));}
  function practice(){
    const list=filtered();let q=list.find(x=>x.id===state.question)||list[0];if(q)state.question=q.id;
    return `<section class="practice-controls"><label>按课时 <select id="lesson-filter"><option value="all" ${state.lesson==='all'?'selected':''}>全部课时</option>${D.lessons.map(l=>`<option value="${l.id}" ${state.lesson===l.id?'selected':''}>${l.code} ${esc(l.title)}</option>`).join('')}</select></label><label>练习范围 <select id="level-filter">${[['all','全部练习'],['required','基础与巩固（必做）'],['higher','提高题（选做）'],['wrong','待订正错题']].map(([v,t])=>`<option value="${v}" ${v===state.filter?'selected':''}>${t}</option>`).join('')}</select></label><span class="muted">30道必做 + 6道提高 · 先在纸上写过程</span></section><div class="practice-layout"><aside class="question-index"><h2>题目导航</h2><div class="number-grid">${list.map((x,i)=>{const a=answer(x);return `<button data-question-nav="${x.id}" class="${x.id===q?.id?'active':''} ${a.submitted?(a.correct?'done':'missed'):Number.isInteger(a.choice)?'picked':''}" aria-label="第${i+1}题，${correct(x)?'已答对':a.submitted?'待订正':Number.isInteger(a.choice)?'已选未提交':'未作答'}">${i+1}${correct(x)?'✓':''}</button>`;}).join('')}</div><p class="muted">绿色：已答对<br>橙色：待订正<br>蓝色：已选未提交</p></aside><div class="lesson-body">${q?`<div class="question-context"><span>${lessonBy(q.lesson).code} · ${esc(lessonBy(q.lesson).title)} · ${list.indexOf(q)+1}/${list.length}</span><a href="lower-learn.html#${lessonBy(q.lesson).code}">回看本课</a></div>${questionCard(q)}<div class="actions"><button class="button secondary" data-question-nav="${list[list.indexOf(q)-1]?.id||''}" ${list.indexOf(q)===0?'disabled':''}>← 上一题</button><button class="button" data-question-nav="${list[list.indexOf(q)+1]?.id||''}" ${list.indexOf(q)===list.length-1?'disabled':''}>下一题 →</button></div>`:'<section class="lower-card"><h2>这个范围暂时没有题目</h2><p>可以切换到全部练习，继续巩固。</p></section>'}</div></div>`;
  }
  function report(){
    const required=D.practice.filter(q=>q.level!=='提高'),submitted=required.filter(q=>answer(q).attempts>0),first=submitted.filter(q=>answer(q).firstCorrect===true).length;
    return `<section class="report-stats"><article><strong>${D.lessons.filter(complete).length}/6</strong><span>已完成课时</span></article><article><strong>${submitted.length}/30</strong><span>必做题已提交</span></article><article><strong>${submitted.length?Math.round(first/submitted.length*100)+'%':'—'}</strong><span>已提交必做题首答正确率</span></article><article><strong>${D.practice.filter(q=>q.level==='提高'&&correct(q)).length}/6</strong><span>提高题已答对</span></article></section><section class="lower-card"><h2>知识与作答证据 · 可编辑思维导图</h2><p class="muted">展开“课时 → 知识点 → 我的补充”。统计来自本机记录；订正不改写首答表现。</p><div class="lower-map"><div class="map-root">八年级下学期<br><b>第16章 二次根式</b></div><div class="map-branches">${D.lessons.map(l=>{const submitted=l.practice.filter(q=>answer(q).attempts>0);return `<details open><summary>${l.code} ${esc(l.title)} · ${complete(l)?'课时完成':'继续学习'}</summary><p class="muted">追问与检测 ${[...l.inquiry,...l.checks].filter(correct).length}/4 已答对；配套练习 ${submitted.length}/6 已提交，${l.practice.filter(correct).length}/6 当前答对</p><ul>${l.concepts.map((c,i)=>`<li><details><summary>${esc(c)}</summary><label class="note-label">我的补充<textarea data-note="branch-${l.id}-${i}" maxlength="5000">${esc(S.get('note:branch-'+l.id+'-'+i,''))}</textarea></label></details></li>`).join('')}</ul><label class="note-label">本课总结<textarea data-note="${l.id}" maxlength="5000">${esc(S.get('note:'+l.id,''))}</textarea></label><div class="actions"><a href="lower-learn.html#${l.code}">回看课程</a><a href="lower-practice.html#${l.code}">回练题目</a></div></details>`;}).join('')}</div></div></section><section class="lower-card"><h2>把错题变成下一次的提醒</h2>${all.filter(q=>answer(q).firstCorrect===false).map(q=>`<p><strong>${correct(q)?'已订正':'待订正'}</strong> · ${esc(q.prompt)} <button class="text-button" data-open-question="${q.id}">回到题目</button></p>`).join('')||'<p>还没有记录到首答错误。完成练习后，这里会按实际作答更新。</p>'}</section><section class="lower-card"><h2>四步学习反思</h2>${[['o','今天完成了哪些内容？'],['r','哪一步最有把握，哪一步卡住了？'],['i','这次弄懂了什么，错误原因是什么？'],['d','下次准备怎样检查？']].map(([id,t])=>`<label class="note-label">${t}<textarea data-note="orid-${id}" maxlength="5000">${esc(S.get('note:orid-'+id,''))}</textarea></label>`).join('')}<button class="button secondary" data-print>打印报告 / 保存PDF</button></section>`;
  }
  function toolsPanel(){return `<details class="backup-tools" ${message?'open':''}><summary>进度备份与恢复</summary><p>选择答案、提交、课时完成、笔记和学习位置都会自动保存在本机。本页使用下学期的独立记录。断网后已缓存的课程仍可继续，AI辅导需要网络。</p><p>请定期下载备份。清除网站数据、更换浏览器或电脑后，需要导入备份才能恢复；浏览器内的保存不会自动跨设备同步。</p><div class="actions"><button class="button secondary" data-export>下载下学期进度备份</button><label class="import-label">导入备份 <input id="import-progress" type="file" accept=".json,application/json"></label><button class="text-button" data-save-retry>重试保存</button></div><p id="backup-message" role="status">${esc(message)}</p></details>`;}
  function render(){
    if(rendering)return;rendering=true;
    app.innerHTML=`<div class="lower-heading"><div><p class="eyebrow">八年级下学期 · 第二学期</p><h1>第16章 <span>二次根式</span></h1><p>${page==='learn'?'6个课时，从观察到独立解题。':'按课时分层练习，先写过程，再提交答案。'}</p></div><div class="chapter-progress"><b>${D.lessons.filter(complete).length}<small> / 6</small></b><span>课时完成</span></div></div><div class="view-tabs"><button data-view="${page}" class="${state.view!=='report'?'active':''}">${page==='learn'?'继续学习':'继续练习'}</button><button data-view="report" class="${state.view==='report'?'active':''}">报告与思维导图</button><a href="${page==='learn'?'lower-practice.html':'lower-learn.html'}">${page==='learn'?'配套练习 →':'课程学习 →'}</a></div>${state.view==='report'?report():page==='learn'?learn():practice()}${toolsPanel()}<p class="source-note">课程依据所提供的人教版八年级下册教材、6份教学设计、6份导学案及4份分层作业改编。课时16.3的练习由对应教学设计与导学案编排。</p>`;
    status(S.status());rendering=false;
  }
  function changeStage(stage){state.stage=Math.max(0,Math.min(3,stage));S.set('position:stage-'+state.lesson,state.stage);if(state.stage===2)S.set('review:read-'+state.lesson,true);updateComplete(lessonBy(state.lesson));savePosition();render();}
  function selectLesson(id){const l=lessonBy(id);state.lesson=l.id;state.view=page;state.stage=Number(S.get('position:stage-'+l.id,0))||0;savePosition();render();}
  app.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled)return;const d=b.dataset;
    if(d.choice){const q=all.find(q=>q.id===d.choice);if(!q||answer(q).submitted)return;S.set('answer:'+q.id,{...answer(q),choice:Number(d.index),submitted:false});render();return;}
    if(d.submit){const q=all.find(q=>q.id===d.submit),a=q&&answer(q);if(!q||!Number.isInteger(a.choice)||a.submitted)return;const ok=a.choice===q.answer;S.set('answer:'+q.id,{...a,submitted:true,correct:ok,firstCorrect:typeof a.firstCorrect==='boolean'?a.firstCorrect:ok,attempts:(a.attempts||0)+1});updateComplete(lessonBy(q.lesson));render();return;}
    if(d.retry){const a=S.get('answer:'+d.retry,{});S.set('answer:'+d.retry,{...a,submitted:false,correct:false});S.set('position:solution-'+d.retry,1);render();return;}
    if(d.solution){const q=all.find(q=>q.id===d.solution);if(q&&answer(q).submitted)S.set('position:solution-'+q.id,Math.min(4,(Number(S.get('position:solution-'+q.id,1))||1)+1));render();return;}
    if(d.lowerAi){const q=all.find(q=>q.id===d.lowerAi),a=q&&answer(q);if(!q)return;window.FumiMathAI?.setContext({page:'八年级下学期 二次根式',canReveal:a.submitted===true,question:{prompt:q.prompt,options:q.options,studentAnswer:q.options[a.choice]||'未选择',correctAnswer:a.submitted?q.options[q.answer]:undefined,explanation:a.submitted?q.steps.join('\n'):undefined}});return;}
    if(d.lesson){selectLesson(d.lesson);return;}
    if(d.stage!==undefined){changeStage(Number(d.stage));return;}
    if(d.view){state.view=d.view;savePosition();render();return;}
    if(d.exampleNext!==undefined||d.exampleBack!==undefined){const key='position:example-'+state.lesson;S.set(key,Math.max(1,Math.min(4,(Number(S.get(key,1))||1)+(d.exampleNext!==undefined?1:-1))));if(S.get(key,1)===4)S.set('review:example-'+state.lesson,true);updateComplete(lessonBy(state.lesson));render();return;}
    if(d.questionNav){state.question=d.questionNav;savePosition();render();return;}
    if(d.openQuestion){const q=all.find(x=>x.id===d.openQuestion);if(q.kind==='practice'){location.href='lower-practice.html#q-'+q.id;}else{location.href='lower-learn.html#q-'+q.id;}return;}
    if(d.export!==undefined){const blob=new Blob([JSON.stringify(S.exportData(),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='FUMI-八年级下学期进度-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message='备份下载已发起，请保留下载的JSON文件。';render();return;}
    if(d.saveRetry!==undefined){S.retry();return;}
    if(d.print!==undefined){window.print();return;}
  });
  app.addEventListener('input',e=>{
    if(e.target.dataset.note){S.set('note:'+e.target.dataset.note,e.target.value);return;}
    if(e.target.dataset.slider){const n=Number(e.target.value);S.set('position:slider-'+e.target.dataset.slider,n);document.getElementById('number-output').textContent=n;document.getElementById('root-visual').innerHTML=numberLine(n);}
  });
  app.addEventListener('change',async e=>{
    if(e.target.id==='lesson-filter'||e.target.id==='level-filter'){if(e.target.id==='lesson-filter')state.lesson=e.target.value;else state.filter=e.target.value;state.question=filtered()[0]?.id||'';savePosition();render();return;}
    if(e.target.id==='import-progress'){
      const file=e.target.files[0];if(!file)return;
      try{if(file.size>5*1024*1024)throw new Error('文件过大，请选择本页下载的进度备份。');const count=S.importData(JSON.parse(await file.text()));state=normalizeState(S.get(posKey,state));message=`已恢复${count}条较新的记录。`;render();}catch(err){message=err instanceof SyntaxError?'文件无法读取，请选择完整的JSON备份。':err.message;render();}
    }
  });
  function normalizeState(value){const v=value&&typeof value==='object'?value:{};return {lesson:v.lesson==='all'&&page==='practice'?'all':lessonBy(v.lesson).id,stage:[0,1,2,3].includes(v.stage)?v.stage:0,view:v.view==='report'?'report':page,question:D.practice.some(q=>q.id===v.question)?v.question:D.practice[0].id,filter:['all','required','higher','wrong'].includes(v.filter)?v.filter:'all'};}
  function readHash(){let h='';try{h=decodeURIComponent(location.hash.slice(1));}catch{return;}const q=h.startsWith('q-')?all.find(x=>x.id===h.slice(2)):null;const l=q?lessonBy(q.lesson):D.lessons.find(l=>l.code===h||l.id===h);if(!l)return;const changed=state.lesson!==l.id;state.lesson=l.id;state.view=page;if(changed)state.stage=Number(S.get('position:stage-'+l.id,0))||0;if(q){state.question=q.id;state.stage=q.kind==='inquiry'?0:3;}else if(page==='practice'&&!l.practice.some(x=>x.id===state.question))state.question=l.practice[0].id;if(page==='practice')state.filter='all';savePosition();history.replaceState(null,'',location.pathname+(location.search||''));}
  window.addEventListener('hashchange',()=>{readHash();render();});
  window.addEventListener('semester-progress-updated',()=>{if(document.activeElement?.tagName==='TEXTAREA')return;render();});
  S.subscribe(status);
  S.ready.then(()=>{state=normalizeState(S.get(posKey,state));readHash();render();});
  if('serviceWorker' in navigator)navigator.serviceWorker.register('/service-worker.js').catch(()=>{});
  // Read-only diagnostic hooks also keep independent tests tied to public behavior.
  window.Grade8LowerApp={complete,questionCard,normalizeState};
})();
